# Bolt AI React Voice Notes - UI Redesign Inventory

## App Overview

Bolt AI React Voice Notes is an AI-powered voice note application that transforms spoken audio into rich, interactive documents. The app operates entirely client-side without a server backend, making data import/export capabilities essential for user data management.

### Core Functionality

- **Main Flow**: Record audio → Transcribe → Process with AI agents → Generate outputs
- **Notes System**: Documents that can contain text, audio recordings, agent outputs, and metadata
- **AI Processing**: Uses AI agents to analyze and enhance notes with summaries, takeaways, and other insights
- **Offline-First**: Works without an internet connection using local models
- **Model Flexibility**: Uses local LLMs by default for transcription, with options to use OpenAI for transcription and remote LLMs for agent processing

## Critical UX Features

- Markdown formatting and editing of notes from users and AI agents
- Audio recording and playback while browsing tabs and documents
- Progress reporting -- no DEAD time where user has no idea what is happening.
- Nice dialogs and notifications -- no alerts. Use toasts. Use first class dialogs.
- Routing and stack navigation
- Mobile-friendly screen nav, ie footer tabs and recording/playback controls.
- Export/import/delete(danger) for each of notes, audio, settings. Also clear all (danger) and clear cached models (no danger). 

### Critical UI Flow

Go to recording screen and press record
Recording widget pops up just above footer (NOT in header), and persists across all tabs while recording WITHOUT blocking access to content in underlying tabs. Tabs MUST allow extra bottom space so in that scenario in order to fully scroll
Use can pause or cancel the recording. 
When user completes recording, they are immediately taken to the note editor screen
The user MUST be shown the note editor screen after pressing stop, WITHOUT DELAY.
The NOTE EDITOR screen should be showing the user the processing status related to the note
There is no reason to put processing information on the record screen. Don't do it.
The note editor screen informs the user of progress ie with transcription status, model loading status and agent processing status
The transcription streams in as it happens. 
The agent should automatically generate a title based on the transcription
Once transcription completes, autorun agents in sequence, showing status and progress ie across checklist of agents
Agent outputs appear as they are created and contents stream in. 


### Redesign Goals

The app needs a redesign to become a first-class mobile application with:
- Mobile-first. Tight UI on mobile, not too much padding or too large fonts. 
- Idiomatic mobile navigation (stack navigation, tabs, and/or sidebar)
- First-class routing (back button and reload support, without surprise scroll jumps)
- Professional UI/UX that follows platform conventions
- Intuitive workflows for recording, editing, and managing notes
- Responsive design that works well on various device sizes
- Dark/light theme toggle with browser pref default
- Move logic and esp async processing workflow into stores/services
- Idiomatic UX and theming using tailwind and/or css variables. Shad UI optional

### Current theme configuration

This was improvised by AI, is not a bad start, but is not precious.

On desktop screens should have a common max width like max-w-4xl mx-auto

I like having semantic colors in CSS vars. 

```css

:root {
  /* Dark Theme Colors */
  --bg-primary: #0a0a0b;
  --bg-secondary: #1a1a1b;
  --bg-tertiary: #2a2a2b;
  --bg-elevated: #333334;

  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-tertiary: #666666;
  --text-disabled: #404040;

  --accent-primary: #6366f1;
  --accent-secondary: #8b5cf6;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-error: #ef4444;

  --border: #333333;
  --border-light: #404040;
  --shadow: rgba(0, 0, 0, 0.5);
  --shadow-lg: rgba(0, 0, 0, 0.8);

  /* Spacing System (4px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-normal: 250ms ease-out;
  --transition-slow: 350ms ease-out;
}
```

## Responsiveness

Generally buttons should have focus outlines and react when pressed, ie scale to .97


### Current Architecture
This document provides a detailed inventory of the existing stores, services, logic, and information architecture to support a clean UI redesign without changing the underlying stores or APIs.

## Stores

### 1. `notesStore`

**Purpose:** Manages all note data and operations.

**Key State:**
- `notes`: Array of Note objects with fields:
  - `id`: Unique identifier
  - `title`: Note title
  - `content`: Markdown content
  - `tags`: Array of string tags
  - `audioUrl`: URL to audio recording (if available)
  - `versions`: Array of previous versions
  - `created`: Timestamp
  - `lastEdited`: Timestamp
  - `duration`: Audio duration in seconds
  - `takeaways`: Array of key points extracted by AI
  - `optimizedAudio`: Flag indicating if audio has been optimized
  - `type`: Note type (regular or agent-generated)
  - `sourceNoteIds`: For agent-generated notes, IDs of source notes

**Key Actions:**
- CRUD operations: `createNote`, `updateNote`, `deleteNote`
- Version management: `saveVersion`, `restoreVersion`
- Tag management: `updateTags`
- Export/import: `exportNotes`, `importNotes`
- Audio management:
  - `downloadAllAudio`: Export all audio files as zip
  - `downloadSingleAudio`: Export single audio file (iOS-optimized)
  - `importAudio`: Import audio files
  - `getAudioFileInfo`: Get audio file information with size
  - `optimizeSingleFile`/`optimizeAllFiles`: Audio optimization for iOS

### 2. `recordingStore`

**Purpose:** Manages audio recording state and flow.

**Key State:**
- Recording status: `isRecording`, `isPaused`, `recordingTime`
- Media objects: `audioStream`, `mediaRecorder`
- Recorded data: `recordedChunks`, `recordingStartTime`

**Key Actions:**
- Recording control: `startRecordingFlow`, `pauseRecording`, `resumeRecording`, `stopRecording`, `cancelRecording`
- Audio processing: `processRecordedAudio`, `createNoteFromRecording`
- Transcription: `startTranscription`

### 3. `transcriptionStore`

**Purpose:** Manages speech-to-text transcription processes.

**Key State:**
- `worker`: Web worker for transcription
- `processingNotes`: Map of notes being processed
- `transcriptionStatus`: Current status message
- `transcriptionProgress`: Progress percentage

**Key Actions:**
- Worker management: `initializeWorker`, `cleanupWorker`
- Transcription: `startTranscription`, `startTranscriptionFromUrl`, `startTranscriptionFromAudioBuffer`
- Status tracking: `updateTranscriptionProgress`, `completeTranscription`
- Smart title generation: `generateSmartTitle`
- Auto-agent triggering: `triggerAutoAgents`

### 4. `agentsStore`

**Purpose:** Manages AI agents for processing notes.

**Key State:**
- `agents`: User-defined agents
- `builtInAgents`: System-provided agents
- `isProcessing`: Whether agents are currently running
- `processingStatus`: Current processing status message

**Key Actions:**
- Agent management: `addAgent`, `updateAgent`, `deleteAgent`, `toggleAgentAutoRun`
- Agent processing: `processNoteWithAgent`, `processNoteWithAllAutoAgents`
- Built-in agents: `initializeBuiltInAgents`
- Dependency validation: `validateAgentDependencies`

### 5. `llmProvidersStore`

**Purpose:** Manages LLM provider configurations and API calls.

**Key State:**
- `providers`: Array of provider configurations
- `isValidating`: Validation status
- `validationResults`: Results of provider validation

**Key Actions:**
- Provider management: `addProvider`, `updateProvider`, `deleteProvider`
- Validation: `validateProvider`, `validateAllProviders`
- Model selection: `getDefaultModel`, `getProviderModels`
- Client creation: `createClient`

### 6. `routingStore`

**Purpose:** Manages application routing and navigation.

**Key State:**
- `currentRoute`: Current route information with:
  - `screen`: Current screen ('main' or 'note-detail')
  - `tab`: Current tab ('record', 'library', 'agents', 'settings')
  - `noteId`: ID of currently viewed note (if applicable)
- `navigationHistory`: Stack of previous routes

**Key Actions:**
- Navigation: `navigateToNote`, `navigateToMain`, `navigateBack`
- Tab management: `setTab`
- History management: `pushToHistory`, `popFromHistory`

### 7. `settingsStore`

**Purpose:** Manages application settings.

**Key State:**
- Transcription settings: `model`, `multilingual`, `quantized`, `subtask`, `language`
- OpenAI STT settings: `useOpenAIForSTT`, `openAIModel`

**Key Actions:**
- Settings updates: `setModel`, `setMultilingual`, etc.
- Settings management: `exportSettings`, `importSettings`, `resetSettings`, `clearAllData`

### 8. `audioStore`

**Purpose:** Manages audio playback and state.

**Key State:**
- Playback state: `currentPlayingAudioUrl`, `globalIsPlaying`, `globalAudioDuration`, `globalAudioCurrentTime`
- Audio element: `audioElement`
- Mobile interaction: `isUserInteracting`, `pendingPlayRequest`

**Key Actions:**
- Playback control: `playAudio`, `togglePlayPause`, `seekAudio`, `closePlayer`
- Audio management: `initializeAudio`, `cleanupAudio`, `loadAndPlay`
- Error handling: `showError`, `clearError`, `handleAudioError`

## Services

### 1. `audioExportService`

**Purpose:** Handles exporting audio files from notes.

**Key Functions:**
- `exportAudioFiles`: Exports audio files as a zip using StreamSaver.js and web workers
- iOS-optimized export with memory-efficient streaming and smaller chunk sizes

### 2. `audioImportService`

**Purpose:** Handles importing audio files into notes.

**Key Functions:**
- `importAudioFiles`: Imports audio files from a zip file
- Batch processing to avoid memory issues on iOS

## Utilities

### 1. `audioStorage`

**Purpose:** Manages audio file storage in IndexedDB.

**Key Functions:**
- `saveAudio`: Stores audio blobs with compatibility processing
- `getAudio`: Retrieves audio by ID
- `deleteAudio`: Removes audio from storage
- `processAudioForCompatibility`: Converts WebM to WAV for iOS compatibility
- `resolveStorageUrl`: Resolves storage URLs to blob URLs

## Screens and Information Architecture

### 1. `RecordScreen`

**Purpose:** Main recording interface. 

**Content:**
- Header with app title
- Recording status and visualization
- Record button (when global button is hidden)

Recording widget should be persistent across tabs while recording. Same with playback. 

### 2. `LibraryScreen`

**Purpose:** Browse and manage notes.

**Content:**
- Header with title and add button
- Search bar for filtering notes
- Notes grouped by time period (Today, Yesterday, This Week, This Month, Older)
- Note cards with:
  - Title
  - Content preview
  - Tags
  - Creation date
  - Audio controls (if audio available)
  - Delete button
- Empty state when no notes exist
- Delete confirmation modal

### 3. `NoteDetailScreen`

**Purpose:** View and edit individual notes.

**Content:**
- Header with back button, title input, and action buttons
- Processing status (when agents or transcriber are running)
- Error status (when agent processing fails)

- Markdown editor for content
- Tag input and management
- Audio player (if audio available)
- Audio controls: play/pause, seek, download, share, delete
- Note metadata: word count, character count, creation date
- Takeaways section (AI-generated summaries)
- Action buttons: retranscribe, run agents
- Confirmation modals for delete and retranscribe actions

### 4. `AgentsScreen`

**Purpose:** Manage AI agents.

**Content:**
- Header with title and create agent button
- Dependency status card (ready or setup required)
- Custom agents section with agent cards
- Built-in agents section with agent cards
- Agent editor modal for creating/editing agents
- Each agent card shows:
  Header:
  - Icon / emoji - default to bot icon
  - Name 
  - (builtin or custom badge)
  - Model
  - Spacer
  - Edit button
  - Auto-run toggle
  Body: 
  - Description

### 5. `SettingsScreen`

**Purpose:** Configure application settings.

**Content:**
- AI Agents section:
  - LLM provider configuration
- Transcription section:
  - OpenAI STT toggle
  - Model selector
- Data Management section:
  - Settings management (export/import)
  - Notes management (export/import)
  - Audio management (export/optimize)
  - Danger zone (reset/clear data)
- About section with debug info

## Mobile-Specific Considerations

1. **iOS Audio Compatibility:**
   - WebM to WAV conversion for iOS compatibility
   - Memory-efficient audio processing
   - Single file export option using Web Share API
   - Optimized audio file handling

2. **UI Quirks (to address in redesign):**
   - Navigation jumps to bottom on route change
   - Double tap needed on mobile
   - Large text/icons on mobile
   - Clunky library view and agent screen on mobile

3. **Mobile Interaction:**
   - User interaction detection for audio playback
   - Pending play request handling for mobile browsers

## Design Requirements

1. **General:**
   - Need for dark/light theme toggle
   - More idiomatic, component-library based UI
   - Consistent styling and spacing

2. **Mobile:**
   - Better mobile UI with appropriate sizing
   - Improved library view on mobile
   - Better agent screen on mobile

## Integration Points for Design Tools

1. **Component Structure:**
   - Screens are composed of reusable UI components
   - Bottom navigation for main tabs
   - Modal system for dialogs and confirmations

2. **State Management:**
   - All UI components connect to Zustand stores
   - No prop drilling for state
   - Stores provide both state and actions

3. **Styling:**
   - Currently uses Tailwind CSS
   - Global styles in `globals.css`
   - Animation with Framer Motion


