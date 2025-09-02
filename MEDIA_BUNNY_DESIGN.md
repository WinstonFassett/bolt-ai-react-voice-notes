# Media Bunny Integration Design Document

## Overview

This document outlines the plan to replace the current "hacky" audio implementation with Media Bunny, a comprehensive media handling library that provides professional-grade audio recording, playback, and storage capabilities.

## Current Implementation Analysis

### Current Audio Architecture

1. **Recording (`src/stores/recordingStore.ts`)**
   - Uses native `MediaRecorder` API with browser compatibility checks
   - Handles iOS/Safari-specific MIME types (MP4, AAC, WAV fallbacks)
   - Manual audio stream management and chunk collection
   - Complex pause/resume logic with timing calculations
   - Basic audio quality settings (22kHz, mono, 16kbps)

2. **Playback (`src/stores/audioStore.ts`)**
   - Uses HTML5 `HTMLAudioElement`
   - Manual blob URL management and resolution
   - Basic error handling for different browsers
   - iOS-specific compatibility attributes

3. **Storage (`src/utils/audioStorage.ts`)**
   - IndexedDB-based storage with custom wrapper
   - Manual WebM-to-WAV conversion for iOS compatibility
   - Complex AudioContext-based format conversion
   - Browser-specific MIME type handling

### Current Issues

1. **Browser Compatibility**: Extensive manual handling for iOS/Safari differences
2. **Format Conversion**: Complex, error-prone audio format conversion logic
3. **Quality Control**: Limited audio quality options and optimization
4. **Error Handling**: Basic error handling with inconsistent user feedback
5. **Code Complexity**: Multiple stores with overlapping responsibilities
6. **Performance**: Inefficient blob URL management and memory usage

## Media Bunny Benefits

### Key Features for Our Use Case

1. **Universal Format Support**: Handles all major audio formats (.mp4, .webm, .wav, .mp3, .ogg, .aac)
2. **Hardware Acceleration**: Uses WebCodecs API for efficient encoding/decoding
3. **Cross-Platform**: Built-in browser compatibility handling
4. **Professional Quality**: Microsecond-accurate precision, multiple quality levels
5. **Streaming Support**: Input/output streaming with arbitrary file sizes
6. **Memory Efficient**: Lazy loading and optimized file handling

### Codec Support Matrix

For our voice notes app, we'll primarily use:
- **Recording**: Opus (WebM) for modern browsers, AAC (MP4) for iOS/Safari
- **Playback**: Auto-detection with fallbacks
- **Storage**: Native format preservation with conversion on-demand

## Implementation Plan

### Phase 1: Core Integration Setup

#### 1.1 Installation and Setup
```bash
npm install mediabunny
```

#### 1.2 Create Media Bunny Service Layer
- `src/services/mediaBunnyService.ts` - Main service wrapper
- `src/services/audioCoder.ts` - Encoding/decoding utilities
- `src/types/mediaBunny.ts` - TypeScript definitions

### Phase 2: Recording Implementation

#### 2.1 Replace MediaRecorder Logic
- Use Media Bunny's `CanvasSource` with `getUserMedia` input
- Implement real-time encoding with quality presets
- Add automatic format selection based on browser capabilities

#### 2.2 Recording Store Refactor
- Simplify recording state management
- Remove browser-specific compatibility code
- Add quality selection options (voice, music, high-quality)

### Phase 3: Playback Implementation

#### 3.1 Replace HTMLAudioElement
- Use Media Bunny's `Input` class for file reading
- Implement streaming playback for large files
- Add metadata extraction capabilities

#### 3.2 Audio Store Refactor
- Simplify playback state management
- Remove manual blob URL management
- Add advanced playback features (seeking, speed control)

### Phase 4: Storage Implementation

#### 4.1 Replace Custom Audio Storage
- Use Media Bunny's format conversion capabilities
- Implement smart format selection for optimal storage
- Add compression options for storage efficiency

#### 4.2 Migration Strategy
- Gradual migration of existing audio files
- Backward compatibility for existing storage format
- Cleanup of legacy conversion code

### Phase 5: Testing and Optimization

#### 5.1 Automated Testing
- Unit tests for each service component
- Integration tests for recording/playback workflows
- Cross-browser compatibility tests
- Performance benchmarks

#### 5.2 User Testing Features
- Audio quality comparison tools
- Format conversion testing
- Performance monitoring dashboard

## Technical Architecture

### New Service Layer

```
src/services/
├── mediaBunnyService.ts      # Main service orchestrator
├── audioRecorder.ts          # Recording functionality
├── audioPlayer.ts            # Playback functionality
├── audioStorage.ts           # Storage and conversion
└── audioTesting.ts           # Testing and validation utilities
```

### Store Simplification

```
src/stores/
├── audioStore.ts             # Unified audio state (simplified)
├── recordingStore.ts         # Recording-specific state (simplified)
└── audioSettingsStore.ts    # Quality and format preferences
```

### Configuration Management

```typescript
// Audio quality presets
export const AUDIO_PRESETS = {
  voice: {
    codec: 'opus',
    bitrate: 32000,
    sampleRate: 22050,
    channels: 1
  },
  music: {
    codec: 'opus',
    bitrate: 128000,
    sampleRate: 48000,
    channels: 2
  },
  highQuality: {
    codec: 'flac',
    bitrate: 0, // Lossless
    sampleRate: 48000,
    channels: 2
  }
};
```

## Migration Strategy

### Incremental Approach

1. **Week 1**: Install Media Bunny and create service layer foundations
2. **Week 2**: Implement recording functionality alongside existing system
3. **Week 3**: Implement playback functionality with fallbacks
4. **Week 4**: Implement storage layer with migration tools
5. **Week 5**: Testing, optimization, and legacy cleanup

### Feature Flags

Use feature flags to gradually roll out Media Bunny features:
```typescript
const FEATURES = {
  USE_MEDIA_BUNNY_RECORDING: false,
  USE_MEDIA_BUNNY_PLAYBACK: false,
  USE_MEDIA_BUNNY_STORAGE: false,
  ENABLE_AUDIO_TESTING: true
};
```

### Backward Compatibility

- Maintain existing audio file compatibility
- Provide migration tools for existing recordings
- Keep legacy code as fallback during transition period

## Testing Strategy

### Automated Tests

1. **Unit Tests**
   - Each service method with mocked dependencies
   - Format conversion accuracy tests
   - Error handling scenarios

2. **Integration Tests**
   - End-to-end recording and playback workflows
   - Cross-format compatibility tests
   - Storage migration accuracy tests

3. **Performance Tests**
   - Recording latency measurements
   - Playback startup time benchmarks
   - Memory usage monitoring
   - File size optimization verification

### Manual Testing Tools

Create debugging and testing utilities:

```typescript
// src/utils/audioTesting.ts
export class AudioTestSuite {
  async testRecordingQuality(): Promise<TestResults>
  async benchmarkPerformance(): Promise<BenchmarkResults>
  async validateFormatConversion(): Promise<ValidationResults>
  async testCrossBrowserCompatibility(): Promise<CompatibilityResults>
}
```

### User-Facing Testing Features

1. **Audio Quality Comparison Tool**
   - A/B testing between old and new implementations
   - Subjective quality ratings
   - Technical metrics display

2. **Performance Dashboard**
   - Real-time recording/playback metrics
   - Memory usage monitoring
   - Error rate tracking

3. **Format Support Matrix**
   - Live browser capability detection
   - Codec support verification
   - Fallback testing

## Expected Benefits

### Technical Improvements

1. **Reduced Code Complexity**: ~50% reduction in audio-related code
2. **Better Performance**: Hardware-accelerated processing
3. **Improved Compatibility**: Professional-grade cross-browser support
4. **Enhanced Quality**: Professional audio processing capabilities

### User Experience Improvements

1. **Faster Recording Startup**: Optimized media initialization
2. **Better Audio Quality**: Professional encoding algorithms
3. **More Reliable Playback**: Robust format handling
4. **Reduced File Sizes**: Efficient compression algorithms

### Development Benefits

1. **Easier Maintenance**: Single, well-documented API
2. **Feature Rich**: Built-in advanced features ready to use
3. **Future Proof**: Active development with modern web standards
4. **Testing Ready**: Comprehensive testing utilities included

## Risk Mitigation

### Potential Risks

1. **Library Size**: Media Bunny might increase bundle size
2. **Learning Curve**: Team needs to learn new API
3. **Migration Complexity**: Converting existing audio files
4. **Browser Support**: Ensure wide compatibility

### Mitigation Strategies

1. **Bundle Analysis**: Use tree-shaking and code splitting
2. **Documentation**: Create comprehensive internal docs
3. **Gradual Migration**: Incremental rollout with fallbacks
4. **Extensive Testing**: Comprehensive browser testing matrix

## Success Metrics

### Technical Metrics

- [ ] Reduce audio-related codebase by 40%+
- [ ] Improve recording startup time by 50%+
- [ ] Reduce average file sizes by 30%+
- [ ] Achieve 99%+ cross-browser compatibility

### User Experience Metrics

- [ ] Reduce audio-related error reports by 80%+
- [ ] Improve user satisfaction with audio quality
- [ ] Decrease support requests for audio issues
- [ ] Faster app loading and better performance

### Development Metrics

- [ ] Reduce audio-related bug reports
- [ ] Faster feature development for audio features
- [ ] Improved code review efficiency
- [ ] Better automated test coverage

## Timeline

### Week 1: Foundation
- [ ] Install Media Bunny and dependencies
- [ ] Create service layer architecture
- [ ] Set up testing framework
- [ ] Create feature flags system

### Week 2: Recording
- [ ] Implement Media Bunny recording service
- [ ] Create recording quality presets
- [ ] Add recording tests
- [ ] Enable feature flag for testing

### Week 3: Playback
- [ ] Implement Media Bunny playback service
- [ ] Add streaming capabilities
- [ ] Create playback tests
- [ ] Enable playback feature flag

### Week 4: Storage
- [ ] Implement Media Bunny storage service
- [ ] Create migration utilities
- [ ] Add storage tests
- [ ] Create migration plan

### Week 5: Testing & Launch
- [ ] Comprehensive cross-browser testing
- [ ] Performance optimization
- [ ] User testing with feedback collection
- [ ] Gradual rollout to production

### Week 6: Cleanup
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Monitor production metrics
- [ ] Collect user feedback

This design document provides a comprehensive roadmap for replacing the current audio implementation with Media Bunny, ensuring a professional, maintainable, and user-friendly audio experience.