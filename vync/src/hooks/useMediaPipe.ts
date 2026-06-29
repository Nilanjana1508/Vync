/**
 * MediaPipe Face Detection Hook
 * Detects facial landmarks and head pose using TensorFlow.js + MediaPipe
 * No debug overlays - semantic data only
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import { FacialLandmarks, HeadPose } from "../shared/types";

interface MediaPipeConfig {
  modelName?: string;
  maxFaces?: number;
}

interface DetectionState {
  loaded: boolean;
  error: string | null;
  isDetecting: boolean;
  frameCount: number;
}

interface DetectionResult {
  landmarks: FacialLandmarks | null;
  headPose: HeadPose | null;
  confidence: number;
}

export function useMediaPipe(config: MediaPipeConfig = {}) {
  const { modelName = "facemesh", maxFaces = 1 } = config;

  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(
    null
  );
  const [state, setState] = useState<DetectionState>({
    loaded: false,
    error: null,
    isDetecting: false,
    frameCount: 0,
  });

  const detectionCallbackRef = useRef<
    ((result: DetectionResult) => void) | null
  >(null);

  // ==================== INITIALIZATION ====================

  const loadModel = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      await tf.ready();

      const detector =
        await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
          {
            maxFaces,
            runtime: "tfjs",
          }
        );

      detectorRef.current = detector;

      setState((prev) => ({
        ...prev,
        loaded: true,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load MediaPipe model";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loaded: false,
      }));
      console.error("MediaPipe load error:", err);
    }
  }, [maxFaces]);

  const unloadModel = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = null;
    }
    setState({
      loaded: false,
      error: null,
      isDetecting: false,
      frameCount: 0,
    });
  }, []);

  // ==================== DETECTION ====================

  const detectFace = useCallback(
    async (videoElement: HTMLVideoElement): Promise<DetectionResult> => {
      if (!detectorRef.current || !state.loaded) {
        return {
          landmarks: null,
          headPose: null,
          confidence: 0,
        };
      }

      try {
        const predictions = await detectorRef.current.estimateFaces(
          videoElement,
          false
        );

        if (predictions.length === 0) {
          return {
            landmarks: null,
            headPose: null,
            confidence: 0,
          };
        }

        const face = predictions[0];
        const keypoints = face.keypoints;

        // Extract facial landmarks
        const landmarks = extractFacialLandmarks(keypoints);

        // Estimate head pose
        const headPose = estimateHeadPose(keypoints);

        // Calculate confidence (based on detection quality)
        const confidence = face.score || 0.9;

        return {
          landmarks,
          headPose,
          confidence,
        };
      } catch (err) {
        console.error("Face detection error:", err);
        return {
          landmarks: null,
          headPose: null,
          confidence: 0,
        };
      }
    },
    [state.loaded]
  );

  const startDetection = useCallback(
    (videoElement: HTMLVideoElement, callback: (result: DetectionResult) => void, fps: number = 30) => {
      if (!state.loaded) {
        console.error("MediaPipe not loaded");
        return;
      }

      detectionCallbackRef.current = callback;
      setState((prev) => ({ ...prev, isDetecting: true }));

      const frameInterval = 1000 / fps;
      let lastFrameTime = Date.now();

      const detect = async () => {
        const now = Date.now();
        if (now - lastFrameTime >= frameInterval) {
          const result = await detectFace(videoElement);
          if (callback) {
            callback(result);
          }
          lastFrameTime = now;
          setState((prev) => ({ ...prev, frameCount: prev.frameCount + 1 }));
        }

        if (state.isDetecting) {
          requestAnimationFrame(detect);
        }
      };

      requestAnimationFrame(detect);
    },
    [state.loaded, state.isDetecting, detectFace]
  );

  const stopDetection = useCallback(() => {
    detectionCallbackRef.current = null;
    setState((prev) => ({ ...prev, isDetecting: false }));
  }, []);

  // ==================== LANDMARK EXTRACTION ====================

  /**
   * Extract semantic facial landmarks from MediaPipe keypoints
   */
  function extractFacialLandmarks(keypoints: any[]): FacialLandmarks {
    // MediaPipe FaceMesh keypoint indices
    const MOUTH_OPEN_IDX = [13, 14]; // Upper and lower lips
    const MOUTH_WIDTH_IDX = [61, 291]; // Mouth corners
    const EYE_LEFT_OPEN_IDX = [33, 133]; // Eye top and bottom
    const EYE_RIGHT_OPEN_IDX = [362, 263];
    const EYEBROW_LEFT_IDX = [70, 63]; // Eyebrow points
    const EYEBROW_RIGHT_IDX = [300, 293];
    const NOSE_IDX = 1; // Nose tip

    // Calculate mouth openness (0-1)
    const mouthOpen = calculateDistance(
      keypoints[MOUTH_OPEN_IDX[0]],
      keypoints[MOUTH_OPEN_IDX[1]]
    ) / 50; // Normalize

    // Calculate mouth width (0-1)
    const mouthWidth = calculateDistance(
      keypoints[MOUTH_WIDTH_IDX[0]],
      keypoints[MOUTH_WIDTH_IDX[1]]
    ) / 100;

    // Calculate eye openness
    const eyeLeftOpen = calculateDistance(
      keypoints[EYE_LEFT_OPEN_IDX[0]],
      keypoints[EYE_LEFT_OPEN_IDX[1]]
    ) / 50;

    const eyeRightOpen = calculateDistance(
      keypoints[EYE_RIGHT_OPEN_IDX[0]],
      keypoints[EYE_RIGHT_OPEN_IDX[1]]
    ) / 50;

    // Calculate eyebrow raise
    const eyebrowLeftRaise =
      (keypoints[EYEBROW_LEFT_IDX[0]].y - keypoints[EYEBROW_LEFT_IDX[1]].y) /
      50;
    const eyebrowRightRaise =
      (keypoints[EYEBROW_RIGHT_IDX[0]].y - keypoints[EYEBROW_RIGHT_IDX[1]].y) /
      50;

    // Normalize nose direction (-1 to 1)
    const nosePoint = keypoints[NOSE_IDX];
    const faceCenter = calculateFaceCenter(keypoints);
    const noseDirectionX = (nosePoint.x - faceCenter.x) / 100;
    const noseDirectionY = (nosePoint.y - faceCenter.y) / 100;

    return {
      mouth_open: Math.max(0, Math.min(1, mouthOpen)),
      mouth_width: Math.max(0, Math.min(1, mouthWidth)),
      eye_left_open: Math.max(0, Math.min(1, eyeLeftOpen)),
      eye_right_open: Math.max(0, Math.min(1, eyeRightOpen)),
      eyebrow_left_raise: Math.max(0, Math.min(1, eyebrowLeftRaise)),
      eyebrow_right_raise: Math.max(0, Math.min(1, eyebrowRightRaise)),
      nose_direction_x: Math.max(-1, Math.min(1, noseDirectionX)),
      nose_direction_y: Math.max(-1, Math.min(1, noseDirectionY)),
    };
  }

  /**
   * Estimate head pose (yaw, pitch, roll) from keypoints
   */
  function estimateHeadPose(keypoints: any[]): HeadPose {
    // Use face landmarks to estimate head orientation
    const leftEye = keypoints[33]; // Left eye outer corner
    const rightEye = keypoints[263]; // Right eye outer corner
    const noseTip = keypoints[1];
    const chin = keypoints[152];

    // Calculate yaw (left-right head turn)
    const eyeDistance = calculateDistance(leftEye, rightEye);
    const noseToLeftEye = calculateDistance(noseTip, leftEye);
    const noseToRightEye = calculateDistance(noseTip, rightEye);
    const yaw = (noseToRightEye - noseToLeftEye) / eyeDistance;

    // Calculate pitch (up-down head tilt)
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };
    const pitch = (chin.y - eyeCenter.y) / 100;

    // Calculate roll (head tilt side to side)
    const eyeSlope =
      Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) *
      (180 / Math.PI);
    const roll = eyeSlope;

    return {
      yaw: Math.max(-1, Math.min(1, yaw)),
      pitch: Math.max(-1, Math.min(1, pitch)),
      roll: Math.max(-1, Math.min(1, roll / 90)),
    };
  }

  /**
   * Helper: Calculate Euclidean distance between two points
   */
  function calculateDistance(p1: any, p2: any): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Helper: Calculate face center for directional calculations
   */
  function calculateFaceCenter(keypoints: any[]): { x: number; y: number } {
    let sumX = 0,
      sumY = 0;
    for (const kp of keypoints) {
      sumX += kp.x;
      sumY += kp.y;
    }
    return {
      x: sumX / keypoints.length,
      y: sumY / keypoints.length,
    };
  }

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    loadModel();

    return () => {
      unloadModel();
    };
  }, [loadModel, unloadModel]);

  return {
    // State
    loaded: state.loaded,
    error: state.error,
    isDetecting: state.isDetecting,
    frameCount: state.frameCount,

    // Methods
    loadModel,
    unloadModel,
    detectFace,
    startDetection,
    stopDetection,
  };
}
