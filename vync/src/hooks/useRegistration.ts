/**
 * Registration Hook - Orchestrates the registration flow
 * Manages START, SNAPSHOTS, and COMPLETE states
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useConnectionManager } from "./useConnectionManager";
import { useCamera } from "./useCamera";
import { useMicrophone } from "./useMicrophone";
import { useMediaPipe } from "./useMediaPipe";
import {
  RegistrationState,
  PacketType,
  SnapshotPacket,
  CompletePacket,
} from "../shared/types";
import {
  createMetadata,
  createStartPacket,
  createSnapshotPacket,
  createCompletePacket,
} from "../shared/packetBuilder";

interface RegistrationConfig {
  serverUrl: string;
  roomId: string;
  userId: string;
  snapshotCount?: number;
  snapshotInterval?: number;
}

interface RegistrationState {
  state: RegistrationState;
  progress: number; // 0-100
  currentSnapshot: number;
  totalSnapshots: number;
  error: string | null;
}

export function useRegistration(config: RegistrationConfig) {
  const {
    serverUrl,
    roomId,
    userId,
    snapshotCount = 5,
    snapshotInterval = 500, // ms between snapshots
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

  const [state, setState] = useState<RegistrationState>({
    state: RegistrationState.IDLE,
    progress: 0,
    currentSnapshot: 0,
    totalSnapshots: snapshotCount,
    error: null,
  });

  const sequenceNumberRef = useRef(0);
  const snapshotDataRef = useRef<any[]>([]);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== REGISTRATION FLOW ====================

  const startRegistration = useCallback(async () => {
    if (!connection.connected) {
      setState((prev) => ({
        ...prev,
        error: "Not connected to server",
      }));
      return;
    }

    if (!camera.ready || !microphone.ready || !facePipe.loaded) {
      setState((prev) => ({
        ...prev,
        error: "Media devices not ready",
      }));
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        state: RegistrationState.REGISTERING,
        progress: 5,
        error: null,
        currentSnapshot: 0,
      }));

      // Send START packet
      const startPacket = createStartPacket(
        roomId,
        connection.nodeId,
        connection.speakerId,
        ++sequenceNumberRef.current,
        snapshotCount
      );

      connection.sendPacket(startPacket);

      // Begin snapshot capture
      await captureSnapshots();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setState((prev) => ({
        ...prev,
        state: RegistrationState.IDLE,
        error: errorMessage,
      }));
    }
  }, [connection, camera.ready, microphone.ready, facePipe.loaded, roomId]);

  const captureSnapshots = useCallback(async () => {
    snapshotDataRef.current = [];
    let snapshotIndex = 0;

    const capture = async () => {
      if (snapshotIndex >= snapshotCount) {
        // All snapshots captured
        clearInterval(captureIntervalRef.current!);
        await completeRegistration();
        return;
      }

      try {
        // Capture video frame
        const frameBase64 = camera.captureFrameAsBase64();
        if (!frameBase64) {
          console.error("Failed to capture frame");
          return;
        }

        // Get facial landmarks and head pose
        if (camera.videoRef.current) {
          const detectionResult = await facePipe.detectFace(
            camera.videoRef.current
          );

          // Capture audio frame
          let audioBase64 = "";
          microphone.startRecording((audioData) => {
            audioBase64 = microphone.audioToBase64(audioData);
          });

          // Small delay to capture audio
          await new Promise((resolve) => setTimeout(resolve, 100));
          microphone.stopRecording();

          // Build snapshot data
          const snapshot = {
            frame_index: snapshotIndex,
            timestamp: Date.now(),
            video_frame: frameBase64.substring(0, 500), // Truncate for testing
            facial_landmarks: detectionResult.landmarks,
            head_pose: detectionResult.headPose,
            audio_frame: audioBase64.substring(0, 200), // Truncate for testing
            confidence: detectionResult.confidence,
          };

          snapshotDataRef.current.push(snapshot);

          // Send SNAPSHOT packet
          const snapshotPacket = createSnapshotPacket(
            roomId,
            connection.nodeId,
            connection.speakerId,
            ++sequenceNumberRef.current,
            snapshot
          );

          connection.sendPacket(snapshotPacket);

          // Update progress
          const progress = 10 + (snapshotIndex / snapshotCount) * 80;
          setState((prev) => ({
            ...prev,
            progress: Math.round(progress),
            currentSnapshot: snapshotIndex + 1,
          }));

          snapshotIndex++;
        }
      } catch (err) {
        console.error("Snapshot capture error:", err);
      }
    };

    // Capture first snapshot immediately
    await capture();

    // Schedule remaining snapshots
    if (snapshotIndex < snapshotCount) {
      captureIntervalRef.current = setInterval(capture, snapshotInterval);
    }
  }, [
    snapshotCount,
    snapshotInterval,
    camera,
    microphone,
    facePipe,
    roomId,
    connection,
  ]);

  const completeRegistration = useCallback(async () => {
    try {
      setState((prev) => ({
        ...prev,
        state: RegistrationState.COMPLETE,
        progress: 95,
      }));

      // Send COMPLETE packet
      const completePacket = createCompletePacket(
        roomId,
        connection.nodeId,
        connection.speakerId,
        ++sequenceNumberRef.current,
        {
          total_snapshots: snapshotCount,
          snapshots: snapshotDataRef.current,
          registration_timestamp: Date.now(),
        }
      );

      connection.sendPacket(completePacket);

      setState((prev) => ({
        ...prev,
        progress: 100,
      }));

      // Wait a bit for acknowledgement
      await new Promise((resolve) => setTimeout(resolve, 500));

      setState((prev) => ({
        ...prev,
        state: RegistrationState.IDLE,
        progress: 0,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Completion failed";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, [roomId, connection, snapshotCount]);

  const cancelRegistration = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    snapshotDataRef.current = [];

    setState({
      state: RegistrationState.IDLE,
      progress: 0,
      currentSnapshot: 0,
      totalSnapshots: snapshotCount,
      error: null,
    });
  }, [snapshotCount]);

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    registrationState: state.state,
    progress: state.progress,
    currentSnapshot: state.currentSnapshot,
    totalSnapshots: state.totalSnapshots,
    error: state.error,

    // Connection/Media state
    connected: connection.connected,
    cameraReady: camera.ready,
    microphoneReady: microphone.ready,
    faceDetectionReady: facePipe.loaded,

    // Methods
    startRegistration,
    completeRegistration,
    cancelRegistration,

    // Refs for JSX
    videoRef: camera.videoRef,
    canvasRef: camera.canvasRef,

    // Debug
    getSnapshotData: () => snapshotDataRef.current,
    debugState: () => {
      console.group("Registration State Debug");
      console.log("State:", state.state);
      console.log("Progress:", state.progress);
      console.log("Snapshots:", `${state.currentSnapshot}/${state.totalSnapshots}`);
      console.log("Connected:", connection.connected);
      console.log("Devices ready:", {
        camera: camera.ready,
        microphone: microphone.ready,
        facePipe: facePipe.loaded,
      });
      console.groupEnd();
    },
  };
}
