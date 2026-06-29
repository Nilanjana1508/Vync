/**
 * Conference App - Example component demonstrating the complete Vync flow
 * Combines registration and real-time semantic broadcasting
 */

import React, { useState } from "react";
import { ConferenceProvider } from "../context/ConferenceContext";
import { useRegistration } from "../hooks/useRegistration";
import { useSemanticBroadcast } from "../hooks/useSemanticBroadcast";
import "../styles/ConferenceApp.css";

interface ConferenceAppProps {
  serverUrl: string;
  roomId: string;
  userId: string;
}

function ConferenceAppContent(props: ConferenceAppProps) {
  const { serverUrl, roomId, userId } = props;

  const registration = useRegistration({
    serverUrl,
    roomId,
    userId,
    snapshotCount: 5,
    snapshotInterval: 500,
  });

  const broadcast = useSemanticBroadcast({
    serverUrl,
    roomId,
    userId,
    broadcastFps: 15,
    enableVideo: true,
    enableAudio: true,
    enableFaceDetection: true,
  });

  const [phase, setPhase] = useState<"idle" | "registering" | "broadcasting">(
    "idle"
  );

  const handleStartRegistration = async () => {
    setPhase("registering");
    await registration.startRegistration();
  };

  const handleStartBroadcast = async () => {
    setPhase("broadcasting");
    await broadcast.startBroadcast();
  };

  const handleStopBroadcast = () => {
    broadcast.stopBroadcast();
    setPhase("idle");
  };

  const handleCancel = () => {
    registration.cancelRegistration();
    broadcast.stopBroadcast();
    setPhase("idle");
  };

  return (
    <div className="conference-app">
      {/* Header */}
      <header className="conference-header">
        <h1>🎤 Vync Conference</h1>
        <div className="connection-status">
          <span className={`status-dot ${broadcast.connected ? "connected" : "disconnected"}`}></span>
          <span className="status-text">
            {broadcast.connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </header>

      {/* Video Preview */}
      <section className="video-section">
        <div className="video-container">
          <video
            ref={registration.videoRef}
            autoPlay
            playsInline
            muted
            className="video-preview"
          />
          <canvas
            ref={registration.canvasRef}
            style={{ display: "none" }}
          />
        </div>
      </section>

      {/* Main Controls */}
      <section className="controls-section">
        {phase === "idle" && (
          <div className="phase-idle">
            <h2>Ready to Join Conference</h2>
            <div className="device-status">
              <div className="device-check">
                <span className={`check ${registration.cameraReady ? "ok" : "error"}`}>
                  {registration.cameraReady ? "✓" : "✗"}
                </span>
                <span>Camera: {registration.cameraReady ? "Ready" : "Not Ready"}</span>
              </div>
              <div className="device-check">
                <span className={`check ${registration.microphoneReady ? "ok" : "error"}`}>
                  {registration.microphoneReady ? "✓" : "✗"}
                </span>
                <span>Microphone: {registration.microphoneReady ? "Ready" : "Not Ready"}</span>
              </div>
              <div className="device-check">
                <span className={`check ${registration.faceDetectionReady ? "ok" : "error"}`}>
                  {registration.faceDetectionReady ? "✓" : "✗"}
                </span>
                <span>Face Detection: {registration.faceDetectionReady ? "Ready" : "Not Ready"}</span>
              </div>
            </div>

            <button
              onClick={handleStartRegistration}
              disabled={!registration.connected || !registration.cameraReady}
              className="btn btn-primary"
            >
              Start Registration
            </button>
          </div>
        )}

        {phase === "registering" && (
          <div className="phase-registering">
            <h2>Registration in Progress</h2>
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${registration.progress}%` }}
                />
              </div>
              <div className="progress-text">
                {registration.progress}% - Snapshot {registration.currentSnapshot}/
                {registration.totalSnapshots}
              </div>
            </div>

            {registration.error && (
              <div className="error-message">{registration.error}</div>
            )}

            <button onClick={handleCancel} className="btn btn-danger">
              Cancel
            </button>

            {registration.progress === 100 && (
              <button
                onClick={handleStartBroadcast}
                className="btn btn-success"
              >
                Registration Complete - Start Broadcasting
              </button>
            )}
          </div>
        )}

        {phase === "broadcasting" && (
          <div className="phase-broadcasting">
            <h2>📡 Broadcasting Live</h2>
            <div className="broadcast-stats">
              <div className="stat">
                <span className="stat-label">Frames Sent:</span>
                <span className="stat-value">{broadcast.framesSent}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Bandwidth:</span>
                <span className="stat-value">{broadcast.bandwidth} B/s</span>
              </div>
              <div className="stat">
                <span className="stat-label">Packets Dropped:</span>
                <span className="stat-value">{broadcast.packetsDropped}</span>
              </div>
            </div>

            {broadcast.lastError && (
              <div className="error-message">{broadcast.lastError}</div>
            )}

            <button onClick={handleStopBroadcast} className="btn btn-danger">
              Stop Broadcasting
            </button>
          </div>
        )}
      </section>

      {/* Debug Info */}
      <section className="debug-section">
        <button
          onClick={() => {
            registration.debugState?.();
            broadcast.debugState?.();
          }}
          className="btn btn-debug"
        >
          📊 Debug State
        </button>
      </section>

      {/* Footer */}
      <footer className="conference-footer">
        <p>Room: {roomId} | User: {userId}</p>
        <p>Server: {serverUrl}</p>
      </footer>
    </div>
  );
}

export function ConferenceApp(props: ConferenceAppProps) {
  return (
    <ConferenceProvider>
      <ConferenceAppContent {...props} />
    </ConferenceProvider>
  );
}
