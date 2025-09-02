import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { AlertCircle, CheckCircle, XCircle, Play, Square, Settings, FlaskConical } from 'lucide-react';
import { audioTestSuite } from '../services/audioTesting';
import { useFeatureFlagsStore, FeatureFlagControls } from '../stores/featureFlagsStore';
import { HybridAudioRecorder } from '../services/hybridAudioRecorder';
import { HybridAudioPlayer } from '../services/hybridAudioPlayer';
import type { TestResult, BenchmarkResult, CompatibilityTest, MediaBunnyCapabilities } from '../services/audioTesting';

interface TestResults {
  compatibility: CompatibilityTest[];
  functionality: TestResult[];
  performance: BenchmarkResult[];
  capabilities: MediaBunnyCapabilities;
}

export const AudioTestingInterface: React.FC = () => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recorder, setRecorder] = useState<HybridAudioRecorder | null>(null);
  const [player, setPlayer] = useState<HybridAudioPlayer | null>(null);
  const [lastRecording, setLastRecording] = useState<Blob | null>(null);

  const featureFlags = useFeatureFlagsStore();

  // Test recording timer
  useEffect(() => {
    let interval: number | null = null;
    if (isRecording && recorder) {
      interval = window.setInterval(() => {
        setRecordingDuration(recorder.getRecordingDuration());
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recorder]);

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setTestProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const results = await audioTestSuite.runAllTests();
      
      clearInterval(progressInterval);
      setTestProgress(100);
      setTestResults(results);
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const startTestRecording = async () => {
    try {
      const newRecorder = new HybridAudioRecorder();
      await newRecorder.initialize();
      await newRecorder.startRecording();
      
      setRecorder(newRecorder);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to start test recording:', error);
    }
  };

  const stopTestRecording = async () => {
    if (!recorder) return;

    try {
      const result = await recorder.stopRecording();
      setLastRecording(result.audioBlob);
      setIsRecording(false);
      setRecorder(null);
      
      console.log('Test recording completed:', {
        duration: result.duration,
        format: result.format,
        usingMediaBunny: result.usingMediaBunny,
        size: result.audioBlob.size
      });
    } catch (error) {
      console.error('Failed to stop test recording:', error);
    }
  };

  const playTestRecording = async () => {
    if (!lastRecording) return;

    try {
      const newPlayer = new HybridAudioPlayer();
      await newPlayer.loadAudio(lastRecording);
      
      newPlayer.addEventListener((event: any) => {
        if (event.type === 'ended') {
          setIsPlaying(false);
          setPlayer(null);
        }
      });

      await newPlayer.play();
      setPlayer(newPlayer);
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play test recording:', error);
    }
  };

  const stopTestPlayback = () => {
    if (player) {
      player.stop();
      setIsPlaying(false);
      setPlayer(null);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (supported: boolean) => {
    return supported ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getTestStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <FlaskConical className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Audio System Testing</h1>
      </div>

      {/* Feature Flag Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Flag Controls
          </CardTitle>
          <CardDescription>
            Control which audio implementation to use for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="recording"
                checked={featureFlags.useMediaBunnyRecording}
                onCheckedChange={(checked) => featureFlags.setFlag('useMediaBunnyRecording', checked)}
              />
              <Label htmlFor="recording">Media Bunny Recording</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="playback"
                checked={featureFlags.useMediaBunnyPlayback}
                onCheckedChange={(checked) => featureFlags.setFlag('useMediaBunnyPlayback', checked)}
              />
              <Label htmlFor="playback">Media Bunny Playback</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="storage"
                checked={featureFlags.useMediaBunnyStorage}
                onCheckedChange={(checked) => featureFlags.setFlag('useMediaBunnyStorage', checked)}
              />
              <Label htmlFor="storage">Media Bunny Storage</Label>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => FeatureFlagControls.enableAll()}
            >
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => FeatureFlagControls.disableAll()}
            >
              Disable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => featureFlags.setRolloutPercentage(100)}
            >
              100% Rollout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => featureFlags.setRolloutPercentage(0)}
            >
              0% Rollout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Comprehensive Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Comprehensive Test Suite</CardTitle>
            <CardDescription>
              Run all compatibility, functionality, and performance tests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={runAllTests}
                disabled={isRunningTests}
                className="flex-1"
              >
                {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTestResults(null)}
                disabled={isRunningTests || !testResults}
              >
                Clear Results
              </Button>
            </div>
            
            {isRunningTests && (
              <div className="space-y-2">
                <Progress value={testProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {testProgress}% complete
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Audio Testing</CardTitle>
            <CardDescription>
              Test recording and playback functionality manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={isRecording ? stopTestRecording : startTestRecording}
                disabled={isPlaying}
                className="flex-1"
                variant={isRecording ? "destructive" : "default"}
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  'Start Test Recording'
                )}
              </Button>
              
              <Button
                onClick={isPlaying ? stopTestPlayback : playTestRecording}
                disabled={!lastRecording || isRecording}
                variant={isPlaying ? "destructive" : "outline"}
              >
                {isPlaying ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
            </div>
            
            {isRecording && (
              <div className="text-center">
                <Badge variant="destructive" className="animate-pulse">
                  Recording: {formatTime(recordingDuration)}
                </Badge>
              </div>
            )}
            
            {lastRecording && (
              <div className="text-sm text-muted-foreground">
                Last recording: {Math.round(lastRecording.size / 1024)}KB
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="space-y-6">
          {/* Browser Compatibility */}
          <Card>
            <CardHeader>
              <CardTitle>Browser Compatibility</CardTitle>
              <CardDescription>
                Check which audio features are supported in your browser
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.compatibility.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.supported)}
                      <div>
                        <div className="font-medium">{test.feature}</div>
                        {!test.supported && test.fallback && (
                          <div className="text-sm text-muted-foreground">
                            Fallback: {test.fallback}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={test.supported ? "default" : "secondary"}>
                      {test.supported ? 'Supported' : 'Not Available'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle>System Capabilities</CardTitle>
              <CardDescription>
                Media Bunny and WebCodecs capabilities on your system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResults.capabilities.isSupported)}
                    <span className="font-medium">Media Bunny Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResults.capabilities.webCodecsSupported)}
                    <span className="font-medium">WebCodecs Support</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Preferred Format: </span>
                    <Badge variant="outline">{testResults.capabilities.preferredFormat}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Supported Codecs: </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {testResults.capabilities.supportedCodecs.map((codec, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {codec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Functionality Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Functionality Tests</CardTitle>
              <CardDescription>
                Results of core audio functionality tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.functionality.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTestStatusIcon(test.passed)}
                      <div>
                        <div className="font-medium">{test.name}</div>
                        {test.duration && (
                          <div className="text-sm text-muted-foreground">
                            Duration: {test.duration.toFixed(2)}ms
                          </div>
                        )}
                        {!test.passed && test.error && (
                          <div className="text-sm text-red-600 mt-1">
                            Error: {test.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={test.passed ? "default" : "destructive"}>
                      {test.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Benchmarks */}
          {testResults.performance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
                <CardDescription>
                  Performance metrics for audio operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResults.performance.map((benchmark, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{benchmark.operation}</span>
                        <Badge variant="outline">
                          {benchmark.averageTime.toFixed(2)}ms avg
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {benchmark.iterations} iterations, total: {benchmark.duration.toFixed(2)}ms
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Report */}
          <Card>
            <CardHeader>
              <CardTitle>Test Report</CardTitle>
              <CardDescription>
                Markdown report of all test results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {audioTestSuite.generateReport(testResults)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};