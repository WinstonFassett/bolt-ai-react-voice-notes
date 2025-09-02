import { mediaBunnyService } from './mediaBunnyService';
import { MediaBunnyAudioRecorder } from './audioRecorder';
import { MediaBunnyAudioPlayer } from './audioPlayer';
import type { AudioPreset } from './mediaBunnyService';
import type { MediaBunnyCapabilities } from '../types/mediaBunny';

export interface TestResult {
  name: string;
  passed: boolean;
  duration?: number;
  error?: string;
  details?: any;
}

export interface BenchmarkResult {
  operation: string;
  duration: number;
  iterations: number;
  averageTime: number;
  metadata?: any;
}

export interface CompatibilityTest {
  feature: string;
  supported: boolean;
  fallback?: string;
  details?: any;
}

export class AudioTestSuite {
  private testResults: TestResult[] = [];
  private benchmarkResults: BenchmarkResult[] = [];

  /**
   * Run all audio tests
   */
  async runAllTests(): Promise<{
    compatibility: CompatibilityTest[];
    functionality: TestResult[];
    performance: BenchmarkResult[];
    capabilities: MediaBunnyCapabilities;
  }> {
    console.log('🧪 AudioTestSuite: Running comprehensive audio tests...');
    
    const compatibility = await this.testCompatibility();
    const capabilities = await this.testCapabilities();
    const functionality = await this.testFunctionality();
    const performance = await this.benchmarkPerformance();
    
    return {
      compatibility,
      functionality,
      performance,
      capabilities
    };
  }

  /**
   * Test browser compatibility
   */
  async testCompatibility(): Promise<CompatibilityTest[]> {
    const tests: CompatibilityTest[] = [];
    
    try {
      // Test WebCodecs support
      tests.push({
        feature: 'WebCodecs API',
        supported: !!(window.AudioEncoder && window.AudioDecoder),
        fallback: 'Native MediaRecorder API'
      });

      // Test Media Bunny support
      const isSupported = await mediaBunnyService.isSupported();
      tests.push({
        feature: 'Media Bunny',
        supported: isSupported,
        fallback: 'Legacy audio implementation'
      });

      // Test getUserMedia support
      tests.push({
        feature: 'getUserMedia',
        supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        fallback: 'No recording capability'
      });

      // Test AudioContext support
      tests.push({
        feature: 'AudioContext',
        supported: !!(window.AudioContext || (window as any).webkitAudioContext),
        fallback: 'HTML5 Audio only'
      });

      // Test IndexedDB support
      tests.push({
        feature: 'IndexedDB',
        supported: !!window.indexedDB,
        fallback: 'Memory storage only'
      });

    } catch (error) {
      console.error('AudioTestSuite: Compatibility testing failed:', error);
    }

    return tests;
  }

  /**
   * Test Media Bunny capabilities
   */
  async testCapabilities(): Promise<MediaBunnyCapabilities> {
    try {
      return await mediaBunnyService.getBrowserCapabilities();
    } catch (error) {
      console.error('AudioTestSuite: Capabilities testing failed:', error);
      return {
        isSupported: false,
        supportedCodecs: [],
        preferredFormat: 'wav',
        webCodecsSupported: false,
        hardwareAcceleration: false
      };
    }
  }

  /**
   * Test core functionality
   */
  async testFunctionality(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test recording functionality
    await this.testRecording(tests);
    
    // Test playback functionality
    await this.testPlayback(tests);
    
    // Test format conversion
    await this.testFormatConversion(tests);

    return tests;
  }

  /**
   * Benchmark performance
   */
  async benchmarkPerformance(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    try {
      // Benchmark initialization time
      const initTimes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        const recorder = new MediaBunnyAudioRecorder();
        await recorder.initialize();
        const end = performance.now();
        initTimes.push(end - start);
      }

      benchmarks.push({
        operation: 'Recorder Initialization',
        duration: initTimes.reduce((a, b) => a + b, 0),
        iterations: initTimes.length,
        averageTime: initTimes.reduce((a, b) => a + b, 0) / initTimes.length
      });

    } catch (error) {
      console.error('AudioTestSuite: Performance benchmarking failed:', error);
    }

    return benchmarks;
  }

  /**
   * Test format conversion accuracy
   */
  async testFormatConversion(): Promise<void> {
    // This would test conversion between different formats
    // and verify the output quality and accuracy
    console.log('🔄 Testing format conversion...');
  }

  /**
   * Create test audio data
   */
  private createTestAudioBlob(durationSeconds: number = 1): Promise<Blob> {
    return new Promise((resolve) => {
      // Create a simple sine wave test audio
      const sampleRate = 44100;
      const frequency = 440; // A4 note
      const samples = sampleRate * durationSeconds;
      
      const audioBuffer = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        audioBuffer[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      }
      
      // Convert to WAV format
      const wavData = this.encodeWAV(audioBuffer, sampleRate);
      resolve(new Blob([wavData], { type: 'audio/wav' }));
    });
  }

  /**
   * Simple WAV encoder for test data
   */
  private encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const length = samples.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  }

  private async testRecording(tests: TestResult[]): Promise<void> {
    try {
      const startTime = performance.now();
      
      const recorder = new MediaBunnyAudioRecorder({ preset: 'voice' });
      await recorder.initialize();
      
      const endTime = performance.now();
      
      tests.push({
        name: 'Recorder Initialization',
        passed: true,
        duration: endTime - startTime
      });
      
    } catch (error) {
      tests.push({
        name: 'Recorder Initialization',
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testPlayback(tests: TestResult[]): Promise<void> {
    try {
      const startTime = performance.now();
      
      const player = new MediaBunnyAudioPlayer();
      const testAudio = await this.createTestAudioBlob(1);
      await player.loadAudio(testAudio);
      
      const endTime = performance.now();
      
      tests.push({
        name: 'Audio Loading',
        passed: true,
        duration: endTime - startTime,
        details: { fileSize: testAudio.size }
      });
      
      await player.cleanup();
      
    } catch (error) {
      tests.push({
        name: 'Audio Loading',
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate a test report
   */
  generateReport(results: {
    compatibility: CompatibilityTest[];
    functionality: TestResult[];
    performance: BenchmarkResult[];
    capabilities: MediaBunnyCapabilities;
  }): string {
    let report = '# Audio System Test Report\n\n';
    
    // Browser Compatibility
    report += '## Browser Compatibility\n\n';
    results.compatibility.forEach(test => {
      const status = test.supported ? '✅' : '❌';
      report += `${status} **${test.feature}**: ${test.supported ? 'Supported' : `Not supported (${test.fallback})`}\n`;
    });
    
    // Capabilities
    report += '\n## System Capabilities\n\n';
    report += `- **Media Bunny Support**: ${results.capabilities.isSupported ? '✅' : '❌'}\n`;
    report += `- **WebCodecs Support**: ${results.capabilities.webCodecsSupported ? '✅' : '❌'}\n`;
    report += `- **Supported Codecs**: ${results.capabilities.supportedCodecs.join(', ')}\n`;
    report += `- **Preferred Format**: ${results.capabilities.preferredFormat}\n`;
    
    // Functionality Tests
    report += '\n## Functionality Tests\n\n';
    results.functionality.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      const duration = test.duration ? ` (${test.duration.toFixed(2)}ms)` : '';
      report += `${status} **${test.name}**${duration}\n`;
      if (!test.passed && test.error) {
        report += `   - Error: ${test.error}\n`;
      }
    });
    
    // Performance Benchmarks
    report += '\n## Performance Benchmarks\n\n';
    results.performance.forEach(benchmark => {
      report += `- **${benchmark.operation}**: ${benchmark.averageTime.toFixed(2)}ms average (${benchmark.iterations} iterations)\n`;
    });
    
    return report;
  }

  /**
   * Clear all test results
   */
  clearResults(): void {
    this.testResults = [];
    this.benchmarkResults = [];
  }
}

// Export singleton instance
export const audioTestSuite = new AudioTestSuite();