# AI Voice Notes

A compact, browser-first app for recording voice, transcribing it locally, and optionally post-processing with configurable AI agents.

## Why this project

- Record audio in the browser and get a local transcription without sending audio off-device by default.
- Add simple AI agents to post-process transcripts when you choose to provide an API key.
- Small, focused UI built for mobile and desktop.

## Key features

- Browser recording and playback
- In-browser speech-to-text (Transforms.js / Whisper-based models)
- Rich editing of transcripts
- Optional AI agents for summarization, task extraction, and custom prompts
- Local-first storage (see Storage section)

## Storage

- Notes (text) are saved in localStorage.
- Audio files are stored in IndexedDB.

This is intentional: quick, offline-friendly storage for notes with larger binary audio saved using IndexedDB.

## Quick start

1. Clone:

   git clone https://github.com/WinstonFassett/ai-voice-notes.git
   cd ai-voice-notes

2. Install:

   npm install

3. Run in development:

   npm run dev

4. Open http://localhost:5173

## AI agents

- Agents are optional. Configure an LLM provider (OpenAI, Anthropic, etc.) in Settings and add API keys if you want agents to run.
- By default nothing is sent to external services.

## Build & preview

- Build: npm run build
- Preview build: npm run preview

## Scripts

- npm run dev — start dev server
- npm run build — production build
- npm run preview — preview build
- npm run lint, npm run lint:fix, npm run format — code quality tools

## Tech stack

- React + TypeScript
- Zustand for state
- Transformers.js / Whisper (in-browser transcription)
- Milkdown rich text editor
- Tailwind CSS
- Vite

## Privacy

- Transcription runs in the browser by default.
- Audio and notes are stored locally unless you explicitly configure and use an external LLM provider.

## Contributing

- PRs welcome. Keep changes focused and avoid shipping secret keys.

## License

- MIT — see LICENSE

## Credits

- Inspired by the ideas in Addy Osmani's Say project, but this repository is its own project and not an active fork.