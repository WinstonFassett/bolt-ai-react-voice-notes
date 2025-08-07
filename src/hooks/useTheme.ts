import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

export function useTheme() {
  const { theme, setTheme } = useAppStore()

  useEffect(() => {
    const root = window.document.documentElement
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
    } else {
      root.classList.remove('light', 'dark')
      root.classList.add(theme)
    }
  }, [theme])

  return { theme, setTheme }
}