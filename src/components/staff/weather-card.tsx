'use client'

import { useEffect, useState } from 'react'
import { useWeather } from '@/hooks/use-weather'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function WeatherCard() {
    const { data, loading, error } = useWeather()
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
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                style={{
                    backgroundImage: `url('/weather/${weatherType}.png')`,
                    filter: 'brightness(0.9)'
                }}
            />

            {/* 2. Animation Layers */}

            {/* Sunny: Lens Flare / Glare effect */}
            {weatherType === 'sunny' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-radial from-white/40 to-transparent opacity-50 animate-pulse-slow" />
                    <div
                        className="absolute top-10 right-10 w-24 h-24 bg-white/30 rounded-full blur-2xl animate-float-slow"
                        style={{ animationDuration: '6s' }}
                    />
                </div>
            )}

            {/* Cloudy: Parallax Moving Clouds */}
            {weatherType === 'cloudy' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Layer 1: Slow, large clouds */}
                    <div
                        className="absolute inset-0 bg-repeat-x opacity-40 animate-clouds-drift-slow mix-blend-screen"
                        style={{
                            backgroundImage: `url('/weather/clouds-texture.png')`,
                            backgroundSize: '400px auto',
                        }}
                    />
                    {/* Layer 2: Faster, smaller clouds for depth */}
                    <div
                        className="absolute inset-0 bg-repeat-x opacity-20 animate-clouds-drift-fast mix-blend-screen"
                        style={{
                            backgroundImage: `url('/weather/clouds-texture.png')`,
                            backgroundSize: '250px auto',
                            backgroundPosition: '0 50px'
                        }}
                    />
                </div>
            )}

            {/* Rainy: Realistic Rain Simulation */}
            {weatherType === 'rainy' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                    {/* Darken overlay for mood */}
                    <div className="absolute inset-0 bg-black/20" />

                    {/* Raindrops on "glass" */}
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-noise" />

                    {/* Falling rain streaks - Layer 1 */}
                    <div
                        className="absolute inset-0 animate-rain-fall opacity-40"
                        style={{
                            backgroundImage: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4), transparent)',
                            backgroundSize: '2px 100px',
                            animationDuration: '0.8s'
                        }}
                    />
                    {/* Falling rain - Layer 2 (Offset) */}
                    <div
                        className="absolute inset-0 animate-rain-fall opacity-30"
                        style={{
                            backgroundImage: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent)',
                            backgroundSize: '2px 80px',
                            backgroundPosition: '50px -50px',
                            animationDuration: '0.6s'
                        }}
                    />
                </div>
            )}


            {/* 3. Glassmorphism Content Overlay */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 via-black/10 to-transparent">
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
                        <span>
                            {weatherType === 'sunny' && '晴れ'}
                            {weatherType === 'cloudy' && '曇り'}
                            {weatherType === 'rainy' && '雨'}
                        </span>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes clouds-drift-slow {
          from { background-position: 0 0; }
          to { background-position: 400px 0; }
        }
        @keyframes clouds-drift-fast {
          from { background-position: 0 50px; }
          to { background-position: 250px 50px; }
        }
        @keyframes rain-fall {
          from { background-position: 0 -100px; }
          to { background-position: 0 100vh; }
        }
        @keyframes float-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.3; }
        }

        .animate-clouds-drift-slow {
          animation: clouds-drift-slow 30s linear infinite;
        }
        .animate-clouds-drift-fast {
          animation: clouds-drift-fast 15s linear infinite;
        }
        .animate-rain-fall {
            animation: rain-fall 1s linear infinite;
        }
        .animate-float-slow {
            animation: float-slow 6s ease-in-out infinite;
        }
        .animate-pulse-slow {
            animation: pulse-slow 8s ease-in-out infinite;
        }
        .bg-gradient-radial {
            background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
        </div>
    )
}
