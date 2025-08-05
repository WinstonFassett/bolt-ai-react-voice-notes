import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useTheme } from '@/hooks/useTheme'
import { RecordScreen } from '@/screens/RecordScreen'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { NoteDetailScreen } from '@/screens/NoteDetailScreen'
import { AgentsScreen } from '@/screens/AgentsScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { BottomNavigation } from '@/components/Layout/BottomNavigation'
import { PersistentRecordingWidget } from '@/components/Layout/PersistentRecordingWidget'
import { PersistentAudioPlayer } from '@/components/Layout/PersistentAudioPlayer'
import { Toaster } from '@/components/ui/sonner'

function AppContent() {
  const navigate = useNavigate()
  const { isRecording, initializeSampleData } = useAppStore()
  
  // Initialize theme
  useTheme()
  
  // Make navigate available globally for the store
  useEffect(() => {
    (window as any).navigate = navigate
  }, [navigate])
  
  // Initialize sample data on first load
  useEffect(() => {
    initializeSampleData()
  }, [])

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <div className={`h-full ${isRecording ? 'pb-32' : 'pb-16'}`}>
        <Routes>
          <Route path="/" element={<RecordScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/note/:id" element={<NoteDetailScreen />} />
          <Route path="/agents" element={<AgentsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </div>
      
      <PersistentRecordingWidget />
      <PersistentAudioPlayer />
      <BottomNavigation />
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}