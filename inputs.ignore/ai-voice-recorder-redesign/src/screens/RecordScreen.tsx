import { RecordButton } from '@/components/Recording/RecordButton'
import { RecordingWaveform } from '@/components/Recording/RecordingWaveform'
import { TranscriptionProgress } from '@/components/Recording/TranscriptionProgress'
import { AppHeader } from '@/components/Layout/AppHeader'

export function RecordScreen() {
  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <AppHeader title="Voice Notes" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Ready to Record</h2>
          <p className="text-muted-foreground">
            Tap and hold to start recording your voice note
          </p>
        </div>
        
        <RecordingWaveform />
        <RecordButton />
      </div>
      
      <TranscriptionProgress />
    </div>
  )
}