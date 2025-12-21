import { useState, useEffect } from 'react'

interface WeatherData {
    temperature: number
    weatherCode: number
    isDay: boolean
    locationName: string
    timePhase: 'morning' | 'day' | 'evening' | 'night'
}

interface WeatherState {
    data: WeatherData | null
    loading: boolean
    error: string | null
}

export function useWeather() {
    const [weather, setWeather] = useState<WeatherState>({
        data: null,
        loading: true,
        error: null,
    })

    useEffect(() => {
        if (!navigator.geolocation) {
            setWeather(prev => ({ ...prev, loading: false, error: 'Geolocation not supported' }))
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords

                    // Parallel fetch: Weather (JMA MSM Model) and Location Name
                    const [weatherRes, locationRes] = await Promise.all([
                        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=auto&models=jma_msm`),
                        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ja`)
                    ])

                    if (!weatherRes.ok) throw new Error('Failed to fetch weather')

                    const weatherData = await weatherRes.json()
                    const locationData = await locationRes.json()

                    // Construct a readable location name
                    // e.g., "東京都 新宿区" or just "新宿区"
                    let locationName = '現在地'
                    if (locationData.city || locationData.locality) {
                        locationName = locationData.city || locationData.locality || locationData.principalSubdivision || '現在地'
                    }

                    // Determine Time Phase
                    // Morning: 05-10
                    // Day: 10-16
                    // Evening: 16-19
                    // Night: 19-05
                    const hour = new Date().getHours() // Use local time for now, ideally strictly synced to location timezone
                    let timePhase: 'morning' | 'day' | 'evening' | 'night' = 'night'

                    if (hour >= 5 && hour < 10) timePhase = 'morning'
                    else if (hour >= 10 && hour < 16) timePhase = 'day'
                    else if (hour >= 16 && hour < 19) timePhase = 'evening'
                    else timePhase = 'night'

                    setWeather({
                        data: {
                            temperature: weatherData.current.temperature_2m,
                            weatherCode: weatherData.current.weather_code,
                            isDay: weatherData.current.is_day === 1,
                            locationName: locationName,
                            timePhase: timePhase
                        },
                        loading: false,
                        error: null
                    })
                } catch (err) {
                    console.error('Weather data fetch error:', err)
                    setWeather({
                        data: null,
                        loading: false,
                        error: 'Failed to fetch weather data'
                    })
                }
            },
            (error) => {
                console.error('Geolocation error:', error)
                // Fallback to Tokyo if location denied
                fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current=temperature_2m,weather_code,is_day&timezone=auto&models=jma_msm`
                )
                    .then(res => res.json())
                    .then(data => {
                        const hour = new Date().getHours()
                        let timePhase: 'morning' | 'day' | 'evening' | 'night' = 'night'
                        if (hour >= 5 && hour < 10) timePhase = 'morning'
                        else if (hour >= 10 && hour < 16) timePhase = 'day'
                        else if (hour >= 16 && hour < 19) timePhase = 'evening'

                        setWeather({
                            data: {
                                temperature: data.current.temperature_2m,
                                weatherCode: data.current.weather_code,
                                isDay: data.current.is_day === 1,
                                locationName: '東京都 (デフォルト)',
                                timePhase: timePhase
                            },
                            loading: false,
                            error: null // Technically not an error, just a fallback
                        })
                    })
                    .catch(() => {
                        setWeather(prev => ({ ...prev, loading: false, error: 'Location denied and fallback failed' }))
                    })
            }
        )
    }, [])

    return weather
}
