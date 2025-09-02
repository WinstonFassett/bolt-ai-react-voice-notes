import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initializeDebugTools } from './utils/debugInitializer'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Initialize feature flags store (this will load persisted flags and make them available)
import './stores/featureFlagsStore'

initializeDebugTools();

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollToTopSelectors: ['main'],
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)