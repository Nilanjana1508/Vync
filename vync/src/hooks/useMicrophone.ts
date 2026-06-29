/**
 * Microphone Hook - Captures audio from user's microphone
 * Provides real-time audio for compression and transmission
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface MicrophoneConfig {
  sampleRate?: number;
  channelCount?: number;
  bufferSize?: number;
}

interface MicrophoneState {
  active: boolean;
  ready: boolean;
  error: string | null;
  isRecording: boolean;
}

export function useMicrophone(config: MicrophoneConfig = {}) {
  const {
    sampleRate = 16000,
    channelCount = 1,
    bufferSize = 4096,
  } = config;

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const [state, setState] = useState<MicrophoneState>({
    active: false,
    ready: false,
    error: null,
    isRecording: false,
  });

  const audioDataCallbackRef = useRef<((data: Float32Array) => void) | null>(
    null
  );

  // ==================== INITIALIZATION ====================

  const startMicrophone = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate,
      });
      audioContextRef.current = audioContext;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor for real-time audio
      const processor = audioContext.createScriptProcessor(
        bufferSize,
        channelCount,
        channelCount
      );

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const audioData = new Float32Array(inputData);

        if (audioDataCallbackRef.current) {
          audioDataCallbackRef.current(audioData);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      processorRef.current = processor;

      setState((prev) => ({
        ...prev,
        active: true,
        ready: true,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access microphone";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        active: false,
      }));
      console.error("Microphone error:", err);
    }
  }, [sampleRate, channelCount, bufferSize]);

  const stopMicrophone = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState({
      active: false,
      ready: false,
      error: null,
      isRecording: false,
    });
  }, []);

  // ==================== RECORDING ====================

  const startRecording = useCallback((callback: (data: Float32Array) => void) => {
    if (!state.ready) {
      console.error("Microphone not ready");
      return;
    }

    audioDataCallbackRef.current = callback;
    setState((prev) => ({ ...prev, isRecording: true }));
  }, [state.ready]);

  const stopRecording = useCallback(() => {
    audioDataCallbackRef.current = null;
    setState((prev) => ({ ...prev, isRecording: false }));
  }, []);

  // ==================== AUDIO PROCESSING ====================

  /**
   * Convert Float32Array to WAV format (base64)
   */
  const encodeWAV = useCallback((audioData: Float32Array): string => {
    const WAV_HEADER_SIZE = 44;
    const buffer = new ArrayBuffer(WAV_HEADER_SIZE + audioData.length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + audioData.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Channels
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, audioData.length * 2, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < audioData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }, [sampleRate]);

  /**
   * Convert audio to base64 for transmission
   */
  const audioToBase64 = useCallback(
    (audioData: Float32Array): string => {
      const wav = encodeWAV(audioData);
      return btoa(wav);
    },
    [encodeWAV]
  );

  /**
   * Downsample audio for compression
   */
  const downsample = useCallback(
    (audioData: Float32Array, factor: number): Float32Array => {
      if (factor <= 1) return audioData;

      const downsampled = new Float32Array(
        Math.floor(audioData.length / factor)
      );
      for (let i = 0; i < downsampled.length; i++) {
        downsampled[i] = audioData[i * factor];
      }
      return downsampled;
    },
    []
  );

  /**
   * Calculate audio level (RMS)
   */
  const getAudioLevel = useCallback((audioData: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }, []);

  // ==================== UTILITIES ====================

  const getAudioContext = useCallback((): AudioContext | null => {
    return audioContextRef.current;
  }, []);

  const getSampleRate = useCallback((): number => {
    return audioContextRef.current?.sampleRate || sampleRate;
  }, [sampleRate]);

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    startMicrophone();

    return () => {
      stopMicrophone();
    };
  }, [startMicrophone, stopMicrophone]);

  return {
    // State
    active: state.active,
    ready: state.ready,
    error: state.error,
    isRecording: state.isRecording,

    // Methods
    startMicrophone,
    stopMicrophone,
    startRecording,
    stopRecording,

    // Audio processing
    encodeWAV,
    audioToBase64,
    downsample,
    getAudioLevel,

    // Utilities
    getAudioContext,
    getSampleRate,
  };
}
