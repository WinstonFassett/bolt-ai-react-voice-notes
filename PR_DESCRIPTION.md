# Fix Settings Import/Export and TypeScript Build Errors

## Problem

The settings import/export functionality had several critical issues, and there were TypeScript build errors in the audio management code:

1. **Unstable Provider IDs**: Provider IDs were generated with timestamps (e.g., `openai-1754329412528`), causing them to change on every import/export
2. **Model ID Mismatches**: Since model IDs included the provider ID, changes in provider IDs caused model ID mismatches
3. **Boolean Flag Loss**: The import logic didn't properly preserve boolean `autoRun` flags when set to `false`
4. **Built-in Agent Updates**: Built-in agent states weren't correctly preserved during import
5. **TypeScript Build Errors**: Missing method signatures in the `RecordingState` interface caused build failures
6. **Audio Management Architecture**: The `AudioManagement` component was using the wrong store for audio operations

## Solution

This PR fixes these issues with a straightforward approach:

1. **Stable Provider IDs**: Changed provider ID generation to use stable, predictable IDs based on provider names (e.g., `openai`, `openai-2`) instead of timestamps
2. **Improved Model ID Matching**: Enhanced model ID extraction during import by parsing out the base model ID, accommodating different provider formats
3. **Boolean Flag Preservation**: Fixed handling of `autoRun: false` by explicitly checking for property existence using `hasOwnProperty`
4. **Built-in Agent Updates**: Correctly updates built-in agents using the proper update method
5. **Debug Logging**: Added detailed logging for easier troubleshooting
6. **Audio Management Architecture**: Updated the `AudioManagement` component to use the `notesStore` directly, which has the actual implementations of the audio export/import methods
7. **Clean Store Architecture**: Removed unnecessary audio method declarations from the `recordingStore` to maintain clean separation of concerns
8. **Provider ID Mapping**: Added mapping between old timestamp-based provider IDs and new stable IDs during import to ensure agents reference valid models

## Testing Done

- Verified import/export with various provider configurations
- Confirmed disabled built-in agents (`autoRun: false`) are correctly preserved during import
- Tested backward compatibility with old timestamp-based IDs
- Validated model ID matching with different provider formats
- Confirmed successful TypeScript build with no errors
- Verified audio management functionality works correctly with the updated component

## Breaking Changes

None. This PR maintains backward compatibility with existing exports while fixing the underlying issues.

## Screenshots

N/A - This is a backend fix with no UI changes.
