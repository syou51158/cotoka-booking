'use client'

import { useEffect, useState } from 'react'
import { useWeather } from '@/hooks/use-weather'
import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, Loader2, MapPin, Moon, Sun, Snowflake } from 'lucide-react'

export function WeatherCard() {
    const { data, loading } = useWeather()
    const [greeting, setGreeting] = useState('')
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000)

        const hour = new Date().getHours()
        if (hour >= 5 && hour < 11) setGreeting('おはようございます')
        else if (hour >= 11 && hour < 18) setGreeting('こんにちは')
        else setGreeting('こんばんは')

        return () => clearInterval(timer)
    }, [])

    const getWeatherType = () => {
        if (!data) return 'sunny' // default
        const { weatherCode } = data

        // 0,1: sunny
        // 2-48: cloudy (includes fog)
        // 51+: rainy (includes drizzle, snow, thunderstorm)
        if (weatherCode === 0 || weatherCode === 1) return 'sunny'
        if (weatherCode >= 2 && weatherCode <= 48) return 'cloudy'
        if (weatherCode >= 51) return 'rainy'

        return 'sunny'
    }

    const getBackgroundImage = (type: string, phase?: string) => {
        // if (type !== 'sunny') return `url('/weather/${type}.png')` // OLD LOGIC

        if (type === 'sunny') {
            switch (phase) {
                case 'morning': return `url('/weather/sunny-morning.png')`
                case 'day': return `url('/weather/sunny.png')`
                case 'evening': return `url('/weather/sunny-evening.png')`
                case 'night': return `url('/weather/clear-night.png')`
                default: return `url('/weather/sunny.png')`
            }
        }

        if (type === 'rainy') {
            switch (phase) {
                case 'morning': return `url('/weather/rainy-morning.png')`
                case 'day': return `url('/weather/rainy-day.png')`
                case 'evening': return `url('/weather/rainy-evening.png')`
                case 'night': return `url('/weather/rainy-night.png')`
                default: return `url('/weather/rainy-day.png')`
            }
        }

        if (type === 'cloudy') {
            switch (phase) {
                case 'morning': return `url('/weather/cloudy-morning.png')`
                case 'day': return `url('/weather/cloudy-day.png')`
                case 'evening': return `url('/weather/cloudy-evening.png')`
                case 'night': return `url('/weather/cloudy-night.png')`
                default: return `url('/weather/cloudy-day.png')`
            }
        }

        return `url('/weather/${type}.png')`
    }

    const getBrightness = (phase?: string) => {
        if (phase === 'night') return 'brightness(0.9)'
        if (phase === 'evening') return 'brightness(0.95)'
        return 'brightness(1.0)'
    }

    const getWeatherIcon = () => {
        if (!data) return Sun
        const { weatherCode, timePhase } = data
        const isNight = timePhase === 'night'

        // Rain
        if (weatherCode >= 51) {
            return CloudRain
        }

        // Cloudy
        if (weatherCode >= 2 && weatherCode <= 48) {
            if (isNight) return CloudMoon
            return CloudSun // Or just Cloud
        }

        // Sunny / Clear
        if (isNight) return Moon
        return Sun
    }

    const WeatherIcon = getWeatherIcon()

    const weatherType = getWeatherType()

    if (loading) {
        return (
            <div className="w-full h-32 flex items-center justify-center bg-white/50 backdrop-blur rounded-2xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-xl transition-all duration-500 group h-40">

            {/* 1. Realistic Background Layer */}
            {/* Time-based Background Switch for Sunny Weather */}
            {/* For non-sunny weather (rain/cloud), we might stick to standard images or add dimming */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                style={{
                    backgroundImage: getBackgroundImage(weatherType, data?.timePhase),
                    filter: getBrightness(data?.timePhase)
                }}
            />

            {/* 2. Animation Layers based on Time Phase */}

            {/* NIGHT: Stars & Mist */}
            {data?.timePhase === 'night' && (weatherType === 'sunny' || weatherType === 'cloudy') && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                    {/* Stars */}
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-white rounded-full animate-pulse-slow"
                            style={{
                                width: Math.random() * 1.5 + 'px',
                                height: Math.random() * 1.5 + 'px',
                                top: Math.random() * 100 + '%',
                                left: Math.random() * 100 + '%',
                                opacity: Math.random() * 0.5 + 0.2,
                                animationDuration: Math.random() * 4 + 2 + 's'
                            }}
                        />
                    ))}
                    {/* Shooting Stars */}
                    <div
                        className="absolute top-[10%] right-[-10%] w-[200px] h-[2px] bg-gradient-to-l from-transparent via-white to-transparent animate-shooting-star opacity-0"
                        style={{ animationDelay: '5s', animationDuration: '7s' }}
                    />
                    <div
                        className="absolute top-[30%] right-[-20%] w-[150px] h-[2px] bg-gradient-to-l from-transparent via-white to-transparent animate-shooting-star opacity-0"
                        style={{ animationDelay: '12s', animationDuration: '9s' }}
                    />
                </div>
            )}

            {/* NIGHT MIST (Separate layer for overlay) */}
            {data?.timePhase === 'night' && (weatherType === 'sunny' || weatherType === 'cloudy') && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-overlay">
                    <div
                        className="absolute inset-y-0 left-0 bg-repeat-x opacity-20 animate-clouds-drift-slow"
                        style={{
                            backgroundImage: `url('/weather/clouds-texture.png')`,
                            backgroundSize: 'auto 300%',
                        }}
                    />
                </div>
            )}

            {/* DAY: Massive Sun Rays */}
            {weatherType === 'sunny' && data?.timePhase === 'day' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
                    <div
                        className="absolute top-[-250%] right-[-250%] w-[600%] h-[600%] animate-spin-slow opacity-60"
                        style={{
                            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 230, 200, 0.4) 10deg, transparent 20deg, transparent 40deg, rgba(255, 200, 150, 0.3) 50deg, transparent 60deg, transparent 90deg, rgba(255, 230, 200, 0.4) 100deg, transparent 110deg, transparent 140deg, rgba(255, 200, 150, 0.3) 150deg, transparent 160deg, transparent 180deg, rgba(255, 230, 200, 0.4) 190deg, transparent 200deg, transparent 230deg, rgba(255, 200, 150, 0.3) 240deg, transparent 250deg, transparent 280deg, rgba(255, 230, 200, 0.4) 290deg, transparent 300deg, transparent 320deg, rgba(255, 200, 150, 0.3) 330deg, transparent 360deg)'
                        }}
                    />
                    <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[120%] bg-gradient-radial from-white/80 via-yellow-100/20 to-transparent opacity-90 animate-pulse-slow" />
                    <div className="absolute top-[20%] right-[30%] w-24 h-24 bg-yellow-200/20 rounded-full blur-2xl animate-float-slow" />
                </div>
            )}

            {/* MORNING: Soft Glow & Low Mist */}
            {weatherType === 'sunny' && data?.timePhase === 'morning' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Soft Rising Sun Glow */}
                    <div className="absolute bottom-0 right-0 w-[100%] h-[80%] bg-gradient-radial from-orange-100/40 via-transparent to-transparent opacity-60 animate-pulse-slow" />

                    {/* Morning Mist */}
                    <div
                        className="absolute inset-y-0 left-0 bg-repeat-x opacity-30 animate-clouds-drift-slow mix-blend-screen"
                        style={{
                            backgroundImage: `url('/weather/clouds-texture.png')`,
                            backgroundSize: 'auto 200%',
                        }}
                    />
                </div>
            )}

            {/* EVENING: Warm Sunset Overlay & Animation */}
            {weatherType === 'sunny' && data?.timePhase === 'evening' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-overlay">
                    {/* Sunset Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-600/40 via-purple-600/20 to-transparent" />

                    {/* Evening Rays: Slower, warmer, rotating opposite way? or just standard spin */}
                    <div
                        className="absolute bottom-[-100%] right-[-50%] w-[300%] h-[300%] animate-spin-slow opacity-40"
                        style={{
                            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 100, 50, 0.3) 10deg, transparent 20deg, transparent 40deg, rgba(255, 50, 50, 0.2) 50deg, transparent 60deg, transparent 90deg, rgba(255, 100, 50, 0.3) 100deg, transparent 110deg, transparent 140deg, rgba(255, 50, 50, 0.2) 150deg, transparent 160deg, transparent 180deg, rgba(255, 100, 50, 0.3) 190deg, transparent 200deg, transparent 230deg, rgba(255, 50, 50, 0.2) 240deg, transparent 250deg, transparent 280deg, rgba(255, 100, 50, 0.3) 290deg, transparent 300deg, transparent 320deg, rgba(255, 50, 50, 0.2) 330deg, transparent 360deg)',
                            animationDirection: 'reverse'
                        }}
                    />

                    {/* Deep Sunset Glow */}
                    <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-orange-500/50 to-transparent animate-pulse-slow" />
                </div>
            )}

            {/* Cloudy: Parallax Moving Mist */}
            {weatherType === 'cloudy' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* 
                       We use a 200% width container that slides left (-50%) 
                       Inside we repeat the cloud texture.
                    */}
                    <div
                        className="absolute inset-y-0 left-0 bg-repeat-x opacity-60 animate-clouds-drift-slow mix-blend-screen"
                        style={{
                            backgroundImage: `url('/weather/clouds-texture.png')`,
                            backgroundSize: 'auto 400%',
                            // Ensure the texture fills the height
                        }}
                    />
                </div>
            )}

            {/* Rainy: Realistic Rain Simulation */}
            {weatherType === 'rainy' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                    <div className="absolute inset-0 bg-black/30" />

                    {/* Multiple layers of rain using pseudo-elements via CSS or multiple divs */}
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-white/40 rounded-full animate-rain-fall"
                            style={{
                                width: '2px',
                                height: Math.random() * 20 + 10 + 'px',
                                left: Math.random() * 100 + '%',
                                top: '-20px',
                                animationDuration: Math.random() * 0.5 + 0.5 + 's',
                                animationDelay: Math.random() * 2 + 's',
                                opacity: Math.random() * 0.5 + 0.3
                            }}
                        />
                    ))}
                </div>
            )}

            {/* 3. Weather Icon Overlay */}
            <div className="absolute top-4 right-4 z-30 text-white/90 drop-shadow-md">
                <WeatherIcon className="w-8 h-8 animate-float-slow" />
            </div>

            {/* 4. Glassmorphism Content Overlay */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 bg-gradient-to-t from-black/70 via-black/10 to-transparent">
                <div className="text-white drop-shadow-md">
                    <h2 className="text-2xl font-bold tracking-tight mb-1">
                        {greeting}
                    </h2>
                    <div className="flex items-center gap-2 text-sm font-medium opacity-90">
                        <span>
                            {time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="w-1 h-1 bg-white rounded-full" />
                        <span>
                            {data && `${Math.round(data.temperature)}℃`}
                        </span>
                        <span className="w-1 h-1 bg-white rounded-full" />
                        <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{data?.locationName}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
