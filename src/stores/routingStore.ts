import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RouteState {
  screen: 'main' | 'note-detail';
  noteId?: string;
  tab: 'record' | 'library' | 'agents' | 'settings';
}

interface NavigationHistoryItem {
  route: RouteState;
  timestamp: number;
}

interface RoutingState {
  currentRoute: RouteState;
  navigationHistory: NavigationHistoryItem[];
  isNavigating: boolean;
  
  // Actions
  navigateTo: (route: RouteState, addToHistory?: boolean) => void;
  navigateBack: () => boolean;
  navigateToNote: (noteId: string, fromTab?: 'record' | 'library' | 'agents' | 'settings') => void;
  navigateToMain: (tab?: 'record' | 'library' | 'agents' | 'settings') => void;
  setTab: (tab: 'record' | 'library' | 'agents' | 'settings') => void;
  
  // Browser history integration
  syncWithBrowserHistory: () => void;
  handlePopState: (event: PopStateEvent) => void;
  
  // Utilities
  canGoBack: () => boolean;
  clearHistory: () => void;
}

export const useRoutingStore = create<RoutingState>()(
  persist(
    (set, get) => ({
      currentRoute: {
        screen: 'main',
        tab: 'record'
      },
      navigationHistory: [],
      isNavigating: false,
      
      navigateTo: (route, addToHistory = true) => {
        const { currentRoute, navigationHistory } = get();
        
        // Don't add duplicate routes to history
        const isDuplicate = currentRoute.screen === route.screen && 
                           currentRoute.noteId === route.noteId && 
                           currentRoute.tab === route.tab;
        
        if (addToHistory && !isDuplicate) {
          const newHistoryItem: NavigationHistoryItem = {
            route: currentRoute,
            timestamp: Date.now()
          };
          
          set({
            navigationHistory: [...navigationHistory, newHistoryItem],
            currentRoute: route
          });
        } else {
          set({ currentRoute: route });
        }
        
        // Update browser history
        const url = routeToUrl(route);
        if (addToHistory) {
          window.history.pushState(route, '', url);
        } else {
          window.history.replaceState(route, '', url);
        }
      },
      
      navigateBack: () => {
        const { navigationHistory } = get();
        
        if (navigationHistory.length === 0) {
          return false;
        }
        
        const previousItem = navigationHistory[navigationHistory.length - 1];
        const newHistory = navigationHistory.slice(0, -1);
        
        set({
          navigationHistory: newHistory,
          currentRoute: previousItem.route,
          isNavigating: true
        });
        
        // Update browser history
        const url = routeToUrl(previousItem.route);
        window.history.pushState(previousItem.route, '', url);
        
        // Reset navigating flag after a brief delay
        setTimeout(() => set({ isNavigating: false }), 100);
        
        return true;
      },
      
      navigateToNote: (noteId, fromTab = 'library') => {
        get().navigateTo({
          screen: 'note-detail',
          noteId,
          tab: fromTab
        });
      },
      
      navigateToMain: (tab = 'library') => {
        get().navigateTo({
          screen: 'main',
          tab
        });
      },
      
      setTab: (tab) => {
        const { currentRoute } = get();
        
        // If we're viewing a note and switching tabs, go back to main
        if (currentRoute.screen === 'note-detail' && tab !== 'library') {
          get().navigateTo({
            screen: 'main',
            tab
          });
        } else {
          get().navigateTo({
            ...currentRoute,
            tab
          }, false); // Don't add tab changes to history
        }
      },
      
      syncWithBrowserHistory: () => {
        const currentUrl = window.location.pathname + window.location.search + window.location.hash;
        const route = urlToRoute(currentUrl);
        
        set({
          currentRoute: route,
          isNavigating: false
        });
      },
      
      handlePopState: (event) => {
        if (event.state) {
          set({
            currentRoute: event.state,
            isNavigating: true
          });
          
          setTimeout(() => set({ isNavigating: false }), 100);
        } else {
          get().syncWithBrowserHistory();
        }
      },
      
      canGoBack: () => {
        return get().navigationHistory.length > 0;
      },
      
      clearHistory: () => {
        set({ navigationHistory: [] });
      }
    }),
    {
      name: 'routing-store',
      version: 1,
      partialize: (state) => ({
        // Don't persist navigation history or current route
        // Let the URL be the source of truth on page load
      }),
      migrate: (persistedState: any) => persistedState
    }
  )
);

// Helper functions for URL conversion
function routeToUrl(route: RouteState): string {
  const params = new URLSearchParams();
  params.set('tab', route.tab);
  
  if (route.screen === 'note-detail' && route.noteId) {
    return `/note/${route.noteId}?${params.toString()}`;
  }
  
  return `/?${params.toString()}`;
}

function urlToRoute(url: string): RouteState {
  const urlObj = new URL(url, window.location.origin);
  const params = new URLSearchParams(urlObj.search);
  const tab = (params.get('tab') as RouteState['tab']) || 'record';
  
  // Check if it's a note detail URL
  const noteMatch = urlObj.pathname.match(/^\/note\/(.+)$/);
  if (noteMatch) {
    return {
      screen: 'note-detail',
      noteId: noteMatch[1],
      tab: 'library' // Notes are always viewed in library context
    };
  }
  
  return {
    screen: 'main',
    tab
  };
}

// Initialize browser history integration
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    useRoutingStore.getState().handlePopState(event);
  });
  
  // Sync with current URL on load
  window.addEventListener('load', () => {
    useRoutingStore.getState().syncWithBrowserHistory();
  });
}