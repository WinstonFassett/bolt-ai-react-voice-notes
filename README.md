# AI Voice Notes

AI Voice Notes is a modern voice transcription app that transforms your voice into text using advanced machine learning, right in your browser. Built with React and powered by Whisper, T5 and Transformers.js, it offers a seamless experience for recording, transcribing, and managing your voice recordings with intelligent AI agents for post-processing.

![AI Voice Notes Screenshot](https://ai-voice-notes.winstonfassett.com/screenshot-01@1x.jpg)

## ✨ Features

### Core Functionality
- 🎙️ **Browser-based Recording**: Record audio directly in your browser with a clean, intuitive interface
- 🤖 **ML-Powered Transcription**: Convert speech to text using state-of-the-art machine learning, running entirely in your browser
- 📝 **Rich Text Editing**: Edit and format your transcribed text using a powerful Milkdown editor
- 📊 **Audio Visualization**: See your audio waveforms in real-time while recording
- 🎵 **Audio Playback**: Replay your recordings with persistent playback controls
- 💾 **Local Storage**: All your recordings and transcripts are saved locally in your browser

### AI Agents & Intelligence
- 🤖 **Smart AI Agents**: Automatically process transcribed recordings with intelligent agents
- 📋 **Meeting Summarizer**: Extract key topics, decisions, and action items from meetings
- ✅ **Action Item Extractor**: Automatically identify and format tasks as checkboxes
- 💡 **Key Insights Generator**: Discover important insights and novel ideas from your content
- 🎯 **Reframing Helper**: Get positive perspectives and growth opportunities from challenges
- 🔧 **Custom Agents**: Create your own AI agents with custom prompts and behaviors
- ⚡ **Auto-Run Agents**: Configure agents to automatically process new transcriptions

### User Experience
- 🌙 **Dark Theme**: Beautiful, modern dark interface optimized for extended use
- 📱 **Mobile-First Design**: Responsive design that works perfectly on all devices
- 🎨 **Modern UI**: Clean, app-like interface with smooth animations and transitions
- 🏃‍♂️ **Fast Performance**: Built with Vite for lightning-fast development and production builds
- 🔒 **Privacy-First**: Your data stays local unless you choose to use AI agents

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **State Management**: Zustand for clean, modular state management
- **AI/ML**: Transformers.js for local speech recognition
- **Text Editor**: Milkdown for rich text editing with markdown support
- **Styling**: Tailwind CSS with custom design system
- **Audio**: Custom audio visualization and playback controls
- **Build Tool**: Vite for fast development and optimized builds
- **AI Integration**: call-ai for LLM provider integration (OpenAI, Anthropic)

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/WinstonFassett/ai-voice-notes.git
cd ai-voice-notes
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🤖 Setting Up AI Agents

To use the AI agents feature:

1. Go to the **Settings** tab
2. Add an LLM provider (OpenAI or Anthropic) with your API key
3. Select a default model
4. Navigate to the **Agents** tab to configure which agents should auto-run
5. Record a voice memo and watch the agents automatically process it!

## 🏗️ Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## 🔧 System Requirements

- Node.js 16 or higher
- Modern browser with WebAssembly support
- Microphone access for recording features
- Internet connection for AI agents (optional)

## 🎯 Key Differences from Original Say App

This project started as a fork of [Addy Osmani's Say](https://github.com/addyosmani/say) but has evolved significantly:

### What We Kept
- Local-first transcription using Whisper via Transformers.js
- Browser-based audio recording
- Core transcription workflow

### What We Added
- **AI Agents System**: Intelligent post-processing of transcribed recordings
- **Audio Storage & Playback**: Persistent audio recordings with playback controls
- **Modern Mobile UI**: Complete redesign with dark theme and mobile-first approach
- **Rich Text Editing**: Milkdown editor with markdown support for agent outputs
- **State Management**: Zustand-based architecture for better scalability
- **Custom Audio Visualization**: Built-in waveform visualization
- **Persistent Playback Controls**: Audio controls that work across all tabs
- **Agent Management**: Create, edit, and configure custom AI agents

## 🎨 Design Philosophy

- **Local-First**: Your data stays on your device by default
- **Privacy-Focused**: You control what (if anything) gets sent to external AI services
- **Mobile-Optimized**: Thumb-friendly interface designed for mobile use
- **Offline-Capable**: Core functionality works without internet connection
- **Progressive Enhancement**: AI features enhance but don't replace core functionality

## 📱 Mobile Experience

The app is designed mobile-first with:
- Touch-friendly controls with proper hit targets
- Responsive layout that adapts to all screen sizes
- Persistent audio controls regardless of active tab
- Optimized for one-handed use
- Native app-like feel with smooth animations

## 🔒 Privacy & Data

- **Transcription**: Happens entirely in your browser using WebAssembly
- **Audio Storage**: Stored locally in IndexedDB
- **Notes**: Saved in browser local storage
- **AI Processing**: Only sent to external services if you configure AI agents
- **No Tracking**: No analytics or tracking of any kind

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 

## 🙏 Acknowledgments

- Built with [Bolt.new](https://bolt.new) - AI-powered development platform
- Based on the excellent foundation of [Say by Addy Osmani](https://github.com/addyosmani/say)
- Powered by [Transformers.js](https://huggingface.co/docs/transformers.js) for local AI
- Inspired by Voice Notes and Untold apps for the AI agent concept

---

**Built with ❤️ using [Bolt.new](https://bolt.new)**