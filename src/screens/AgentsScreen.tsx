import { Bot, Plus, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'

export function AgentsScreen() {
  const { 
    agents, 
    builtInAgents, 
    isProcessingAgents, 
    agentProcessingStatus, 
    showAgentEditor,
    llmProviders
  } = useAppStore()

  const allAgents = [...builtInAgents, ...agents]

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <Button onClick={() => showAgentEditor()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      <div className="grid gap-4">
        {allAgents.map((agent) => (
          <Card key={agent.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  {agent.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => showAgentEditor(agent)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  {!agent.isBuiltIn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Delete agent logic would go here
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {agent.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Provider: {agent.provider}</span>
                <span>•</span>
                <span>Model: {agent.model}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allAgents.length === 0 && (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No agents configured</h3>
          <p className="text-muted-foreground mb-4">
            Add your first AI agent to start processing your notes
          </p>
          <Button onClick={() => showAgentEditor()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      )}
    </div>
  )
}