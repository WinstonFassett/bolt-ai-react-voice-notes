import { Mic, Library, Settings, Users } from 'lucide-react'
import { useRoutingStore } from '../../stores/routingStore'

export function BottomNavigation() {
  const { currentRoute, setTab } = useRoutingStore()
  
  const tabs = [
    { id: 'record' as const, icon: Mic, label: 'Record' },
    { id: 'library' as const, icon: Library, label: 'Library' },
    { id: 'agents' as const, icon: Users, label: 'Agents' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentRoute.tab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
