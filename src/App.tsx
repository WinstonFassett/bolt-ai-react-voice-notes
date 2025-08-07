import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useRecordingStore } from './stores/recordingStore'
import { useAudioStore } from './stores/audioStore'
import { useTheme } from './hooks/useTheme'
import { RecordScreen } from './components/screens/RecordScreen'
import { LibraryScreen } from './components/screens/LibraryScreen'
import { NoteDetailScreenWrapper } from './components/screens/NoteDetailScreenWrapper'
import { AgentsScreen } from './components/screens/AgentsScreen'
import { SettingsScreen } from './components/screens/SettingsScreen'
import { BottomNavigation } from './components/Layout/BottomNavigation'
import { PersistentRecordingWidget } from './components/Layout/PersistentRecordingWidget'
import { PersistentAudioPlayer } from './components/Layout/PersistentAudioPlayer'
import { Toaster } from './components/ui/sonner'
import { ConfirmationProvider } from './components/ConfirmationProvider'

function AppContent() {
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
        <Routes>
          <Route path="/" element={<RecordScreen />} />
          <Route path="/library" element={<LibraryScreen 
            onUploadFile={() => console.log('Upload file')} 
            onFromUrl={() => console.log('From URL')} 
          />} />
          <Route path="/note/:id" element={<NoteDetailScreenWrapper />} />
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
      <ConfirmationProvider>
        <AppContent />
      </ConfirmationProvider>
    </BrowserRouter>
  )
}