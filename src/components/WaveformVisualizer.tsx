import React, { useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  audioStream: MediaStream | null | undefined;
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  audioStream,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(128));

  useEffect(() => {
    if (isRecording && audioStream) {
      setupAudioAnalysis();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isRecording, audioStream]);

  const setupAudioAnalysis = () => {
    if (!audioStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    
    analyserRef.current = analyser;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const animate = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      setAudioData(new Uint8Array(dataArray));
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!isRecording) {
      // Draw idle state
      drawIdleWaveform(ctx, rect.width, rect.height);
      return;
    }

    // Draw active waveform
    drawActiveWaveform(ctx, rect.width, rect.height, audioData);
  }, [audioData, isRecording]);

  const drawIdleWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerY = height / 2;
    const barWidth = 3;
    const barSpacing = 2;
    const numBars = Math.floor(width / (barWidth + barSpacing));

    ctx.fillStyle = '#374151'; // gray-700

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + barSpacing);
      const barHeight = 4 + Math.sin(i * 0.5) * 2; // Subtle wave pattern
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, barWidth, barHeight);
    }
  };

  const drawActiveWaveform = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: Uint8Array
  ) => {
    const centerY = height / 2;
    const barWidth = 3;
    const barSpacing = 2;
    const numBars = Math.min(Math.floor(width / (barWidth + barSpacing)), data.length);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#6366f1'); // indigo-500
    gradient.addColorStop(0.5, '#8b5cf6'); // purple-500
    gradient.addColorStop(1, '#06b6d4'); // cyan-500

    ctx.fillStyle = gradient;

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + barSpacing);
      const dataIndex = Math.floor((i / numBars) * data.length);
      const amplitude = data[dataIndex] / 255;
      const barHeight = Math.max(4, amplitude * height * 0.8);
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, barWidth, barHeight);
    }
  };

  return (
    <div className={`relative bg-gray-800 rounded-lg ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};