/**
 * Camera Hook - Captures video from user's webcam
 * Provides frame-by-frame access for processing
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface CameraConfig {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
  frameRate?: number;
}

interface CameraState {
  active: boolean;
  ready: boolean;
  error: string | null;
}

export function useCamera(config: CameraConfig = {}) {
  const {
    width = 640,
    height = 480,
    facingMode = "user",
    frameRate = 30,
  } = config;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>({
    active: false,
    ready: false,
    error: null,
  });

  // ==================== INITIALIZATION ====================

  const startCamera = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
          frameRate: { ideal: frameRate },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          setState((prev) => ({
            ...prev,
            active: true,
            ready: true,
          }));
        };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        active: false,
      }));
      console.error("Camera error:", err);
    }
  }, [width, height, facingMode, frameRate]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState({
      active: false,
      ready: false,
      error: null,
    });
  }, []);

  // ==================== FRAME CAPTURE ====================

  const captureFrame = useCallback((): ImageData | null => {
    if (!videoRef.current || !canvasRef.current || !state.ready) {
      return null;
    }

    try {
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return null;

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      ctx.drawImage(videoRef.current, 0, 0);

      return ctx.getImageData(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    } catch (err) {
      console.error("Frame capture error:", err);
      return null;
    }
  }, [state.ready]);

  const captureFrameAsBase64 = useCallback((): string | null => {
    if (!canvasRef.current || !state.ready) {
      return null;
    }

    try {
      return canvasRef.current.toDataURL("image/jpeg", 0.8);
    } catch (err) {
      console.error("Base64 capture error:", err);
      return null;
    }
  }, [state.ready]);

  const captureFrameAsBlob = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current || !state.ready) {
      return null;
    }

    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg", 0.8);
    });
  }, [state.ready]);

  // ==================== UTILITIES ====================

  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    return videoRef.current;
  }, []);

  const getCanvasElement = useCallback((): HTMLCanvasElement | null => {
    return canvasRef.current;
  }, []);

  const getResolution = useCallback(() => {
    if (!videoRef.current || !state.ready) {
      return { width: 0, height: 0 };
    }

    return {
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight,
    };
  }, [state.ready]);

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return {
    // State
    active: state.active,
    ready: state.ready,
    error: state.error,

    // Refs for JSX
    videoRef,
    canvasRef,

    // Methods
    startCamera,
    stopCamera,
    captureFrame,
    captureFrameAsBase64,
    captureFrameAsBlob,
    getVideoElement,
    getCanvasElement,
    getResolution,
  };
}
