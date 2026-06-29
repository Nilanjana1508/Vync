/**
 * Semantic Broadcast Hook - Real-time semantic data transmission
 * Sends SNAPSHOT and SEMANTIC packets during active conference
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useConnectionManager } from "./useConnectionManager";
import { useCamera } from "./useCamera";
import { useMicrophone } from "./useMicrophone";
import { useMediaPipe } from "./useMediaPipe";
import { PacketType, SemanticPacket } from "../shared/types";
import {
  createMetadata,
  createSemanticPacket,
} from "../shared/packetBuilder";

interface SemanticBroadcastConfig {
  serverUrl: string;
  roomId: string;
  userId: string;
  broadcastFps?: number;
  enableVideo?: boolean;
  enableAudio?: boolean;
  enableFaceDetection?: boolean;
}

interface BroadcastState {
  broadcasting: boolean;
  framesSent: number;
  packetsDropped: number;
  lastError: string | null;
  bandwidth: number; // bytes/sec
}

interface SemanticData {
  timestamp: number;
  video_frame?: string;
  facial_landmarks?: any;
  head_pose?: any;
  audio_level?: number;
  confidence?: number;
}

export function useSemanticBroadcast(config: SemanticBroadcastConfig) {
  const {
    serverUrl,
    roomId,
    userId,
    broadcastFps = 15,
    enableVideo = true,
    enableAudio = true,
    enableFaceDetection = true,
  } = config;

  const connection = useConnectionManager({
    serverUrl,
    roomId,
    userId,
  });

  const camera = useCamera({
    width: 640,
    height: 480,
    frameRate: 30,
  });

  const microphone = useMicrophone({
    sampleRate: 16000,
    channelCount: 1,
  });

  const facePipe = useMediaPipe({
    maxFaces: 1,
  });

  const [state, setState] = useState<BroadcastState>({
    broadcasting: false,
    framesSent: 0,
    packetsDropped: 0,
    lastError: null,
    bandwidth: 0,
  });

  const sequenceNumberRef = useRef(0);
  const broadcastIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCounterRef = useRef(0);
  const bytesCounterRef = useRef(0);
  const bandwidthTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioBufferRef = useRef<Float32Array | null>(null);

  // ==================== BROADCAST CONTROL ====================

  const startBroadcast = useCallback(async () => {
    if (!connection.connected) {
      setState((prev) => ({
        ...prev,
        lastError: "Not connected to server",
      }));
      return;
    }

    if (!camera.ready || !microphone.ready) {
      setState((prev) => ({
        ...prev,
        lastError: "Media devices not ready",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      broadcasting: true,
      lastError: null,
      framesSent: 0,
      packetsDropped: 0,
    }));

    // Start audio capture
    if (enableAudio) {
      microphone.startRecording((audioData) => {
        audioBufferRef.current = audioData;
      });
    }

    // Start broadcast loop
    const frameInterval = 1000 / broadcastFps;
    let lastFrameTime = Date.now();

    const broadcast = async () => {
      const now = Date.now();

      if (now - lastFrameTime >= frameInterval) {
        try {
          await sendSemanticFrame();
          lastFrameTime = now;
        } catch (err) {
          console.error("Broadcast error:", err);
          setState((prev) => ({
            ...prev,
            packetsDropped: prev.packetsDropped + 1,
            lastError: err instanceof Error ? err.message : "Unknown error",
          }));
        }
      }

      if (state.broadcasting) {
        requestAnimationFrame(broadcast);
      }
    };

    requestAnimationFrame(broadcast);

    // Bandwidth calculator
    bandwidthTimerRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        bandwidth: bytesCounterRef.current,
      }));
      bytesCounterRef.current = 0;
    }, 1000);
  }, [
    connection.connected,
    camera.ready,
    microphone.ready,
    broadcastFps,
    enableVideo,
    enableAudio,
    state.broadcasting,
  ]);

  const stopBroadcast = useCallback(() => {
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
      broadcastIntervalRef.current = null;
    }

    if (bandwidthTimerRef.current) {
      clearInterval(bandwidthTimerRef.current);
      bandwidthTimerRef.current = null;
    }

    microphone.stopRecording();

    setState((prev) => ({
      ...prev,
      broadcasting: false,
    }));
  }, [microphone]);

  // ==================== SEMANTIC FRAME TRANSMISSION ====================

  const sendSemanticFrame = useCallback(async () => {
    const semanticData: SemanticData = {
      timestamp: Date.now(),
    };

    // Capture video frame
    if (enableVideo && camera.ready) {
      const frameBase64 = camera.captureFrameAsBase64();
      if (frameBase64) {
        semanticData.video_frame = frameBase64.substring(0, 800); // Compress
      }
    }

    // Capture facial detection
    if (enableFaceDetection && facePipe.loaded && camera.videoRef.current) {
      try {
        const detectionResult = await facePipe.detectFace(
          camera.videoRef.current
        );
        if (detectionResult.landmarks) {
          semanticData.facial_landmarks = detectionResult.landmarks;
          semanticData.head_pose = detectionResult.headPose;
          semanticData.confidence = detectionResult.confidence;
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }
    }

    // Capture audio level
    if (enableAudio && audioBufferRef.current) {
      semanticData.audio_level = microphone.getAudioLevel(audioBufferRef.current);
    }

    // Build and send SEMANTIC packet
    const semanticPacket = createSemanticPacket(
      roomId,
      connection.nodeId,
      connection.speakerId,
      ++sequenceNumberRef.current,
      semanticData
    );

    // Calculate packet size
    const packetSize = JSON.stringify(semanticPacket).length;
    bytesCounterRef.current += packetSize;

    connection.sendPacket(semanticPacket);

    frameCounterRef.current++;
    setState((prev) => ({
      ...prev,
      framesSent: frameCounterRef.current,
    }));
  }, [
    enableVideo,
    enableAudio,
    enableFaceDetection,
    camera,
    microphone,
    facePipe,
    roomId,
    connection,
  ]);

  // ==================== UTILITIES ====================

  const getStats = useCallback(() => {
    return {
      broadcasting: state.broadcasting,
      framesSent: state.framesSent,
      packetsDropped: state.packetsDropped,
      bandwidth: state.bandwidth,
      fps: state.framesSent > 0 ? broadcastFps : 0,
    };
  }, [state, broadcastFps]);

  const resetStats = useCallback(() => {
    frameCounterRef.current = 0;
    bytesCounterRef.current = 0;
    setState((prev) => ({
      ...prev,
      framesSent: 0,
      packetsDropped: 0,
      bandwidth: 0,
    }));
  }, []);

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    return () => {
      stopBroadcast();
    };
  }, [stopBroadcast]);

  return {
    // State
    broadcasting: state.broadcasting,
    framesSent: state.framesSent,
    packetsDropped: state.packetsDropped,
    lastError: state.lastError,
    bandwidth: state.bandwidth,

    // Connection/Media state
    connected: connection.connected,
    cameraReady: camera.ready,
    microphoneReady: microphone.ready,
    faceDetectionReady: facePipe.loaded,

    // Methods
    startBroadcast,
    stopBroadcast,
    sendSemanticFrame,

    // Statistics
    getStats,
    resetStats,

    // Debug
    debugState: () => {
      console.group("Semantic Broadcast Debug");
      console.log("Broadcasting:", state.broadcasting);
      console.log("Frames Sent:", state.framesSent);
      console.log("Packets Dropped:", state.packetsDropped);
      console.log("Bandwidth:", `${state.bandwidth} bytes/sec`);
      console.log("Connected:", connection.connected);
      console.log("Devices:", {
        camera: camera.ready,
        microphone: microphone.ready,
        facePipe: facePipe.loaded,
      });
      console.groupEnd();
    },
  };
}
