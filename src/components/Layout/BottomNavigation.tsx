import { Mic, Library, Bot, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { id: '/', label: 'Record', icon: Mic },
  { id: '/library', label: 'Library', icon: Library },
  { id: '/agents', label: 'Agents', icon: Bot },
  { id: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const currentPath = location.pathname
  
  // Check if we're on a note detail page to keep library tab highlighted
  const isNoteDetailPage = currentPath.startsWith('/note/');
  const activeTab = isNoteDetailPage ? '/library' : currentPath;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <nav className="max-w-4xl mx-auto bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-around py-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
              "min-w-[60px] text-xs font-medium",
              currentPath === id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}