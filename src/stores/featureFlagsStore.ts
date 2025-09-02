import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MediaBunnyFeatureFlags } from '../types/mediaBunny';

interface FeatureFlagsState extends MediaBunnyFeatureFlags {
  // Core feature flags
  useMediaBunnyRecording: boolean;
  useMediaBunnyPlayback: boolean;
  useMediaBunnyStorage: boolean;
  enableAudioTesting: boolean;
  enableAdvancedFeatures: boolean;
  
  // Development flags
  enableDebugLogging: boolean;
  enablePerformanceMonitoring: boolean;
  enableExperimentalFeatures: boolean;
  
  // Rollout control
  rolloutPercentage: number;
  userId?: string;
  
  // Actions
  setFlag: (flag: keyof MediaBunnyFeatureFlags, value: boolean) => void;
  toggleFlag: (flag: keyof MediaBunnyFeatureFlags) => void;
  setRolloutPercentage: (percentage: number) => void;
  setUserId: (userId: string) => void;
  resetToDefaults: () => void;
  
  // Helper methods
  isUserInRollout: () => boolean;
  getActiveFlags: () => Partial<MediaBunnyFeatureFlags>;
  shouldUseMediaBunny: (feature: 'recording' | 'playback' | 'storage') => boolean;
}

// Default feature flag values - ENABLED for testing branch
const DEFAULT_FLAGS: MediaBunnyFeatureFlags & {
  enableDebugLogging: boolean;
  enablePerformanceMonitoring: boolean;
  enableExperimentalFeatures: boolean;
  rolloutPercentage: number;
} = {
  useMediaBunnyRecording: true,  // ENABLED for testing
  useMediaBunnyPlayback: true,   // ENABLED for testing
  useMediaBunnyStorage: true,    // ENABLED for testing
  enableAudioTesting: true,
  enableAdvancedFeatures: true,  // ENABLED for testing
  enableDebugLogging: process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
  enableExperimentalFeatures: true, // ENABLED for testing
  rolloutPercentage: 100, // 100% rollout for testing
};

// Simple hash function for consistent user bucketing
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_FLAGS,
      userId: undefined,
      
      // Actions
      setFlag: (flag, value) => {
        console.log(`FeatureFlags: Setting ${flag} to ${value}`);
        set({ [flag]: value });
      },
      
      toggleFlag: (flag) => {
        const currentValue = get()[flag];
        const newValue = !currentValue;
        console.log(`FeatureFlags: Toggling ${flag} from ${currentValue} to ${newValue}`);
        set({ [flag]: newValue });
      },
      
      setRolloutPercentage: (percentage) => {
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        console.log(`FeatureFlags: Setting rollout percentage to ${clampedPercentage}%`);
        set({ rolloutPercentage: clampedPercentage });
      },
      
      setUserId: (userId) => {
        console.log(`FeatureFlags: Setting user ID for rollout bucketing`);
        set({ userId });
      },
      
      resetToDefaults: () => {
        console.log('FeatureFlags: Resetting all flags to defaults');
        set({ ...DEFAULT_FLAGS, userId: get().userId });
      },
      
      // Helper methods
      isUserInRollout: () => {
        const { rolloutPercentage, userId } = get();
        
        if (rolloutPercentage === 0) return false;
        if (rolloutPercentage === 100) return true;
        if (!userId) return false;
        
        // Use consistent hashing to determine if user is in rollout
        const userHash = hashString(userId);
        const bucketValue = (userHash % 100) + 1;
        const inRollout = bucketValue <= rolloutPercentage;
        
        console.log(`FeatureFlags: User ${userId} bucket ${bucketValue}, rollout ${rolloutPercentage}%, included: ${inRollout}`);
        return inRollout;
      },
      
      getActiveFlags: () => {
        const state = get();
        const activeFlags: Partial<MediaBunnyFeatureFlags> = {};
        
        Object.keys(DEFAULT_FLAGS).forEach((key) => {
          const flagKey = key as keyof MediaBunnyFeatureFlags;
          if (state[flagKey]) {
            activeFlags[flagKey] = true;
          }
        });
        
        return activeFlags;
      },
      
      shouldUseMediaBunny: (feature: 'recording' | 'playback' | 'storage') => {
        const state = get();
        
        // Check if user is in rollout
        if (!state.isUserInRollout()) {
          return false;
        }
        
        // Check specific feature flag
        switch (feature) {
          case 'recording':
            return state.useMediaBunnyRecording;
          case 'playback':
            return state.useMediaBunnyPlayback;
          case 'storage':
            return state.useMediaBunnyStorage;
          default:
            return false;
        }
      }
    }),
    {
      name: 'feature-flags-storage',
      partialize: (state) => ({
        // Only persist certain flags, not temporary ones
        useMediaBunnyRecording: state.useMediaBunnyRecording,
        useMediaBunnyPlayback: state.useMediaBunnyPlayback,
        useMediaBunnyStorage: state.useMediaBunnyStorage,
        enableAudioTesting: state.enableAudioTesting,
        enableAdvancedFeatures: state.enableAdvancedFeatures,
        rolloutPercentage: state.rolloutPercentage,
        userId: state.userId,
      }),
    }
  )
);

// Hook for easier feature flag checking
export const useFeatureFlag = (flag: keyof MediaBunnyFeatureFlags): boolean => {
  return useFeatureFlagsStore((state) => state[flag]);
};

// Hook for checking if a Media Bunny feature should be used
export const useMediaBunnyFeature = (feature: 'recording' | 'playback' | 'storage'): boolean => {
  return useFeatureFlagsStore((state) => state.shouldUseMediaBunny(feature));
};

// Development helper to easily control flags
export const FeatureFlagControls = {
  enable: (flag: keyof MediaBunnyFeatureFlags) => {
    useFeatureFlagsStore.getState().setFlag(flag, true);
  },
  disable: (flag: keyof MediaBunnyFeatureFlags) => {
    useFeatureFlagsStore.getState().setFlag(flag, false);
  },
  toggle: (flag: keyof MediaBunnyFeatureFlags) => {
    useFeatureFlagsStore.getState().toggleFlag(flag);
  },
  setRollout: (percentage: number) => {
    useFeatureFlagsStore.getState().setRolloutPercentage(percentage);
  },
  enableAll: () => {
    const store = useFeatureFlagsStore.getState();
    store.setFlag('useMediaBunnyRecording', true);
    store.setFlag('useMediaBunnyPlayback', true);
    store.setFlag('useMediaBunnyStorage', true);
    store.setFlag('enableAdvancedFeatures', true);
    store.setRolloutPercentage(100);
  },
  disableAll: () => {
    useFeatureFlagsStore.getState().resetToDefaults();
  },
  status: () => {
    const state = useFeatureFlagsStore.getState();
    return {
      flags: state.getActiveFlags(),
      rollout: `${state.rolloutPercentage}%`,
      userInRollout: state.isUserInRollout(),
      userId: state.userId
    };
  }
};

// Make controls available in development console
if (process.env.NODE_ENV === 'development') {
  (window as any).FeatureFlags = FeatureFlagControls;
  console.log('🎌 Feature flag controls available at window.FeatureFlags');
  console.log('Available commands: enable(flag), disable(flag), toggle(flag), setRollout(%), enableAll(), disableAll(), status()');
}