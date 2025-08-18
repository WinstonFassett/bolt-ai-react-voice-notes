import { useEffect } from 'react'
import { createRootRoute, Outlet, useNavigate, ScrollRestoration } from '@tanstack/react-router'
import { useRecordingStore } from '../stores/recordingStore'
import { useAudioStore } from '../stores/audioStore'
import { useTheme } from '../hooks/useTheme'
import { BottomNavigation } from '../components/Layout/BottomNavigation'
import { PersistentRecordingWidget } from '../components/Layout/PersistentRecordingWidget'
import { PersistentAudioPlayer } from '../components/Layout/PersistentAudioPlayer'
import { Toaster } from '../components/ui/sonner'

function RootComponent() {
  const navigate = useNavigate()
  const { isRecording } = useRecordingStore()
  const { initializeAudio } = useAudioStore()

  // Initialize theme
  useTheme()

  // Initialize audio on app load
  useEffect(() => {
    initializeAudio()
  }, [])

  // Make navigate available globally for the store
  useEffect(() => {
    (window as any).navigate = navigate
  }, [navigate])

  return (
    <div className="h-screen bg-background text-foreground transition-colors overflow-hidden">
      <div className={`h-full ${isRecording ? 'pb-32' : 'pb-16'}`}>
        <Outlet />
      </div>
      
      <PersistentRecordingWidget />
      <PersistentAudioPlayer />
      <BottomNavigation />
      <Toaster />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
