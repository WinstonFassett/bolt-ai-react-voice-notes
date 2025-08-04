# Settings Import/Export and TypeScript Fixes

## Summary

This branch fixes critical issues with the settings import/export functionality and TypeScript build errors:

1. **Stable Provider IDs**: Changed provider ID generation from timestamp-based to name-based for consistency
2. **Model ID Matching**: Improved model ID extraction and matching during import
3. **Boolean Flag Preservation**: Fixed handling of `autoRun: false` for built-in agents
4. **Debug Logging**: Added detailed logging for easier troubleshooting
5. **TypeScript Build Errors**: Fixed TypeScript errors related to audio management functionality
6. **Component-Store Alignment**: Updated components to use the correct store implementations

## Commit History

1. `d89ac64` - **feat: settings export import**
   - Initial implementation of settings export/import functionality

2. `1a110f3` - **2**
   - First attempt at fixing provider ID stability issues

3. `01e3c41` - **3**
   - Improved model ID extraction logic

4. `1fe3e34` - **4 refactor**
   - Refactored provider ID generation to use stable IDs

5. `e8d6a55` - **5**
   - Enhanced model ID matching to handle different provider formats

6. `6cced5d` - **6**
   - Added debug logging for troubleshooting

7. `30b691b` - **7**
   - Fixed boolean handling for `autoRun` flag

8. `3acddcc` - **8**
   - Improved built-in agent update logic

9. `65c6055` - **9**
   - Fixed edge cases in model ID matching

10. `f73d3de` - **10. working.**
    - Final fix for built-in agent updates, confirmed working

11. `commit_id` - **11. Fix TypeScript build errors**
    - Fixed TypeScript errors in RecordingState interface
    - Added missing audio management method signatures

12. `commit_id` - **12. Fix audio management architecture**
    - Updated AudioManagement component to use notesStore directly
    - Removed unnecessary audio methods from recordingStore

13. `commit_id` - **13. Fix settings import with provider ID mapping**
     - Added provider ID mapping during import to handle old timestamp-based provider IDs
     - Improved model ID extraction and matching to handle different provider formats
     - Enhanced debug logging for easier troubleshooting
     - Fixed autoRun flag preservation for built-in agent overrides

## Key Changes

### 1. Provider ID Generation

Changed from timestamp-based IDs to stable name-based IDs:

```typescript
// OLD: Using timestamps
const id = `${providerData.name.toLowerCase()}-${Date.now()}`;

// NEW: Using stable name-based IDs
const baseName = providerData.name.toLowerCase();
const existingCount = get().providers.filter(p => p.id.startsWith(baseName)).length;
const id = existingCount > 0 ? `${baseName}-${existingCount + 1}` : baseName;
```

### 2. Model ID Extraction

Improved extraction of base model IDs from full model IDs:

```typescript
// Extract base model ID for matching
let baseModelId = null;
if (modelId && typeof modelId === 'string') {
  const parts = modelId.split('-');
  if (parts.length >= 3) {
    // Skip the first two segments (provider name and timestamp)
    baseModelId = parts.slice(2).join('-');
  } else {
    // Fallback to the last segment if format is different
    baseModelId = parts[parts.length - 1];
  }
}
```

### 3. Boolean Flag Preservation

Fixed handling of `autoRun: false` for built-in agents:

```typescript
// CRITICAL: For autoRun, explicitly check if it's defined in the override to handle false values correctly
autoRun: override && override.hasOwnProperty('autoRun') ? override.autoRun : builtInAgent.autoRun
```

### 4. Built-in Agent Updates

Used the correct method to update built-in agents:

```typescript
// Create an updated agent with the override values
const updatedAgent = {
  ...builtInAgent,
  autoRun: override && override.hasOwnProperty('autoRun') ? override.autoRun : builtInAgent.autoRun,
  modelId
};

// Use the updateAgent method which handles both regular and built-in agents
agentsStore.updateAgent(updatedAgent);
```

### 5. Audio Management Architecture

Fixed TypeScript build errors by updating component to use the correct store:

```typescript
// OLD: Using recordingStore which didn't have the implementations
import { useRecordingStore } from '../../stores/recordingStore';

export const AudioManagement: React.FC = () => {
  const { exportAllAudio, importAudio, clearAllRecordings } = useRecordingStore();
  // ...
}

// NEW: Using notesStore which has the actual implementations
import { useNotesStore } from '../../stores/notesStore';

export const AudioManagement: React.FC = () => {
  const { downloadAllAudio, importAudio, clearAllRecordings } = useNotesStore();
  // ...
}
```

### 6. Provider ID Mapping During Import

Added provider ID mapping to ensure agents reference valid models after import:

```typescript
// Create a map of old provider IDs to new provider IDs
const providerIdMap = new Map();

// Map old timestamp-based provider IDs to new stable provider IDs
data.llmProviders?.providers.forEach(oldProvider => {
  const oldProviderId = oldProvider.id;
  // Find the matching new provider by name
  const newProvider = llmProvidersStore.providers.find(p => p.name === oldProvider.name);
  
  if (newProvider && oldProviderId !== newProvider.id) {
    providerIdMap.set(oldProviderId, newProvider.id);
    if (import.meta.env.DEV) {
      console.log(`Mapped old provider ID ${oldProviderId} to new ID ${newProvider.id}`);
    }
  }
});

// Update model IDs to use new provider IDs
if (agent.modelId && typeof agent.modelId === 'string') {
  // Extract provider ID and model name
  const parts = agent.modelId.split('-');
  if (parts.length >= 2) {
    const oldProviderId = parts[0];
    const newProviderId = providerIdMap.get(oldProviderId);
    
    if (newProviderId) {
      // Replace old provider ID with new provider ID
      const modelName = parts.length >= 3 ? parts.slice(2).join('-') : parts[1];
      updatedModelId = `${newProviderId}-${modelName}`;
      
      if (import.meta.env.DEV) {
        console.log(`Updated agent model ID from ${agent.modelId} to ${updatedModelId}`);
      }
    }
  }
}
```

This approach handles the model ID mapping during import without requiring schema migrations, making it more compatible with existing data.

## Breaking/Blocking TODOs

None. All issues have been resolved and the functionality is working as expected.

## Migration Notes

- Existing users with timestamp-based provider IDs will continue to work
- The system will gracefully transition to stable IDs for new providers
- No data migration is needed as the import logic now handles both formats
