import { useState, useEffect } from 'react'

interface WeatherData {
    temperature: number
    weatherCode: number
    isDay: boolean
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
                    const response = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
                    )

                    if (!response.ok) throw new Error('Failed to fetch weather')

                    const data = await response.json()
                    setWeather({
                        data: {
                            temperature: data.current_weather.temperature,
                            weatherCode: data.current_weather.weathercode,
                            isDay: data.current_weather.is_day === 1
                        },
                        loading: false,
                        error: null
                    })
                } catch (err) {
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
                    `https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true`
                )
                    .then(res => res.json())
                    .then(data => {
                        setWeather({
                            data: {
                                temperature: data.current_weather.temperature,
                                weatherCode: data.current_weather.weathercode,
                                isDay: data.current_weather.is_day === 1
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
