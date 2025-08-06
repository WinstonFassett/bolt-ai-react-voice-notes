import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'

export function RecordingWaveform() {
  const { isRecording, isPaused } = useAppStore()
  const [bars, setBars] = useState<number[]>(Array(20).fill(0))

  useEffect(() => {
    if (!isRecording || isPaused) {
      setBars(Array(20).fill(0))
      return
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 100))
    }, 100)

    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((height, index) => (
        <div
          key={index}
          className="bg-primary rounded-full transition-all duration-100 ease-out"
          style={{
            height: `${Math.max(4, height)}%`,
            width: '3px'
          }}
        />
      ))}
    </div>
  )
}