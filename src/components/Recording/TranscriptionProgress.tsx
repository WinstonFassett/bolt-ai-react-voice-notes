import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

export function TranscriptionProgress() {
  const { 
    isTranscribing, 
    transcriptionProgress, 
    transcriptionStatus,
    isProcessingAgents,
    agentProcessingStatus,
    currentProcessingAgents,
    completedAgents,
    builtInAgents,
    streamingNotes
  } = useAppStore()

  if (!isTranscribing && !isProcessingAgents && streamingNotes.size === 0) return null

  return (
    <Card className="mx-4">
      <CardContent className="pt-6">
        {isTranscribing && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">{transcriptionStatus}</span>
            </div>
            <Progress value={transcriptionProgress} className="w-full" />
            <p className="text-xs text-muted-foreground mt-2 flex justify-between">
              <span>{Math.round(transcriptionProgress)}% complete</span>
              <span className="text-emerald-600 dark:text-emerald-400">Loading AI models...</span>
            </p>
          </>
        )}
        
        {isProcessingAgents && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">{agentProcessingStatus}</span>
            </div>
            
            <div className="space-y-2">
              {builtInAgents.filter(agent => agent.autoRun).map(agent => (
                <div key={agent.id} className="flex items-center gap-2 text-sm">
                  {completedAgents.includes(agent.id) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : currentProcessingAgents.includes(agent.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span className={cn(
                    completedAgents.includes(agent.id) && "text-green-600 dark:text-green-400",
                    currentProcessingAgents.includes(agent.id) && "text-primary font-medium"
                  )}>
                    {agent.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}