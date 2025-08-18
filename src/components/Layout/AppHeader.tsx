import { ArrowLeft } from 'lucide-react'
import { useRouter, useCanGoBack } from '@tanstack/react-router'
import { Button } from '../ui/button'

interface AppHeaderProps {
  title: string
  showBack?: boolean
  actions?: React.ReactNode
}

export function AppHeader({ title, showBack, actions }: AppHeaderProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.history.back()}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}