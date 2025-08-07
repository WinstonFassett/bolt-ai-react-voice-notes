import { Bot, Settings, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/appStore'
import type { Agent } from '@/store/appStore'

interface AgentCardProps {
  agent: Agent
  isBuiltIn?: boolean
}

export function AgentCard({ agent, isBuiltIn = false }: AgentCardProps) {
  const { updateAgent, deleteAgent, showAgentEditor } = useAppStore()

  const handleAutoRunToggle = (checked: boolean) => {
    updateAgent(agent.id, { autoRun: checked })
  }

  const handleEdit = () => {
    showAgentEditor(agent)
  }

  const handleDelete = () => {
    deleteAgent(agent.id)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Bot className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{agent.name}</h3>
                {isBuiltIn && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Built-in
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {agent.model}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Switch
                checked={agent.autoRun}
                onCheckedChange={handleAutoRunToggle}
              />
            </div>
            
            {isBuiltIn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            
            {!isBuiltIn && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {agent.description}
        </p>
      </CardContent>
    </Card>
  )
}