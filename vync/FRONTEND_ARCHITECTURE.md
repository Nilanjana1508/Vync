# Vync - Frontend Architecture Documentation

## Overview

Vync is a real-time semantic conferencing system that combines video, audio, and facial analysis to enable intelligent communication. This document covers the frontend React architecture and integration guide.

## Architecture Layers

```
┌─────────────────────────────────────┐
│   ConferenceApp (UI Component)      │
├─────────────────────────────────────┤
│  useRegistration / useSemanticBroadcast │
├─────────────────────────────────────┤
│  useCamera | useMicrophone | useMediaPipe │
├─────────────────────────────────────┤
│  useConnectionManager                │
├─────────────────────────────────────┤
│  useConferenceSocket (WebSocket)     │
├─────────────────────────────────────┤
│  ConferenceContext (State)           │
└─────────────────────────────────────┘
```

---

## Core Hooks

### 1. **useConferenceSocket** - WebSocket Connection
**File:** `vync/src/hooks/useConferenceSocket.ts`

Manages direct WebSocket connection to the FastAPI backend.

**Features:**
- Automatic reconnection (configurable attempts/delay)
- Heartbeat keepalive (PING/PONG)
- Message queue for offline buffering
- Event subscription system
- Packet serialization/deserialization

**Usage:**
```typescript
const socket = useConferenceSocket({
  serverUrl: "ws://localhost:8000",
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  heartbeatInterval: 30000,
});

// Send packets
socket.sendPacket(packet);

// Subscribe to events
socket.subscribe(PacketType.ACK, (packet) => {
  console.log("ACK received:", packet);
});

// Connection state
console.log(socket.connected, socket.connecting, socket.error);
```

---

### 2. **useConnectionManager** - Connection Orchestration
**File:** `vync/src/hooks/useConnectionManager.ts`

Orchestrates WebSocket + Conference Context. Handles JOIN, ACK/NACK, PING/PONG.

**Features:**
- Automatic JOIN packet on connection
- ACK/NACK response handling
- Heartbeat PING/PONG protocol
- Node ID & Speaker ID generation
- Sequence number management

**Usage:**
```typescript
const connection = useConnectionManager({
  serverUrl: "ws://localhost:8000",
  roomId: "room-123",
  userId: "user-456",
  onConnected: () => console.log("Connected!"),
  onDisconnected: () => console.log("Disconnected!"),
  onError: (err) => console.error(err),
});

console.log(connection.nodeId, connection.speakerId);
console.log(connection.connected);
```

---

### 3. **useCamera** - Video Capture
**File:** `vync/src/hooks/useCamera.ts`

Captures video frames from user's webcam using `getUserMedia()`.

**Features:**
- Frame capture as ImageData, Base64, or Blob
- Configurable resolution & frame rate
- Camera permission handling

**Usage:**
```typescript
const camera = useCamera({
  width: 640,
  height: 480,
  facingMode: "user",
  frameRate: 30,
});

// Capture frame as Base64 (for transmission)
const frameBase64 = camera.captureFrameAsBase64();

// Get resolution
const { width, height } = camera.getResolution();
```

---

### 4. **useMicrophone** - Audio Capture
**File:** `vync/src/hooks/useMicrophone.ts`

Captures audio from user's microphone using Web Audio API.

**Features:**
- Real-time audio via ScriptProcessorNode
- WAV encoding
- Audio level calculation (RMS)
- Downsampling for compression
- Base64 encoding for transmission

**Usage:**
```typescript
const microphone = useMicrophone({
  sampleRate: 16000,
  channelCount: 1,
  bufferSize: 4096,
});

// Start recording with callback
microphone.startRecording((audioData: Float32Array) => {
  const level = microphone.getAudioLevel(audioData);
  console.log("Audio level:", level);
});

// Encode to Base64
const audioBase64 = microphone.audioToBase64(audioData);
```

---

### 5. **useMediaPipe** - Face Detection
**File:** `vync/src/hooks/useMediaPipe.ts`

Detects facial landmarks and head pose using TensorFlow.js + MediaPipe.

**Features:**
- Facial landmark extraction (mouth, eyes, eyebrows, nose)
- Head pose estimation (yaw, pitch, roll)
- Semantic data only (no visual overlays)
- Configurable detection FPS

**Output:**
```typescript
interface FacialLandmarks {
  mouth_open: number;        // 0-1
  mouth_width: number;       // 0-1
  eye_left_open: number;     // 0-1
  eye_right_open: number;    // 0-1
  eyebrow_left_raise: number;  // 0-1
  eyebrow_right_raise: number; // 0-1
  nose_direction_x: number;   // -1 to 1
  nose_direction_y: number;   // -1 to 1
}

interface HeadPose {
  yaw: number;   // -1 to 1 (left-right)
  pitch: number; // -1 to 1 (up-down)
  roll: number;  // -1 to 1 (tilt)
}
```

**Usage:**
```typescript
const facePipe = useMediaPipe({ maxFaces: 1 });

// Detect from video element
const result = await facePipe.detectFace(videoElement);
console.log(result.landmarks, result.headPose, result.confidence);

// Real-time detection
facePipe.startDetection(videoElement, (result) => {
  console.log("Face detected:", result);
}, 30); // 30 FPS
```

---

### 6. **useRegistration** - Registration Flow
**File:** `vync/src/hooks/useRegistration.ts`

Orchestrates the registration flow: START → SNAPSHOTS → COMPLETE

**Registration States:**
- `IDLE` - Not registering
- `REGISTERING` - Capturing snapshots
- `COMPLETE` - Registration finished

**Features:**
- Configurable snapshot count & interval
- Progress tracking
- Snapshot data collection
- Error handling

**Usage:**
```typescript
const registration = useRegistration({
  serverUrl: "ws://localhost:8000",
  roomId: "room-123",
  userId: "user-456",
  snapshotCount: 5,
  snapshotInterval: 500,
});

// Start registration
await registration.startRegistration();

// Track progress
console.log(`${registration.currentSnapshot}/${registration.totalSnapshots}`);
console.log(`Progress: ${registration.progress}%`);

// Check state
console.log(registration.registrationState);
```

---

### 7. **useSemanticBroadcast** - Real-time Broadcasting
**File:** `vync/src/hooks/useSemanticBroadcast.ts`

Sends SEMANTIC packets in real-time during conference.

**Features:**
- Configurable broadcast FPS
- Selective data capture (video, audio, face detection)
- Bandwidth monitoring
- Frame & packet tracking
- Automatic frame throttling

**Usage:**
```typescript
const broadcast = useSemanticBroadcast({
  serverUrl: "ws://localhost:8000",
  roomId: "room-123",
  userId: "user-456",
  broadcastFps: 15,
  enableVideo: true,
  enableAudio: true,
  enableFaceDetection: true,
});

// Start broadcasting
await broadcast.startBroadcast();

// Monitor stats
const stats = broadcast.getStats();
console.log(stats.framesSent, stats.bandwidth, stats.packetsDropped);

// Stop broadcasting
broadcast.stopBroadcast();
```

---

## Context & State Management

### ConferenceContext
**File:** `vync/src/context/ConferenceContext.tsx`

Global state management for conference data.

**Features:**
- Room management (join/leave)
- Speaker management (add, update, remove)
- Registration state tracking
- Speaking state management

**Usage:**
```typescript
const conference = useConference();

conference.joinRoom(roomId, nodeId, userId);
conference.addSpeaker(speakerId, nodeId);
conference.removeSpeaker(speakerId);
conference.leaveRoom();
```

---

## Component Integration

### ConferenceApp
**File:** `vync/src/components/ConferenceApp.tsx`

Example component demonstrating full Vync flow.

**Phases:**
1. **IDLE** - Device readiness check
2. **REGISTERING** - Snapshot capture with progress
3. **BROADCASTING** - Real-time semantic data transmission

**Usage:**
```typescript
import { ConferenceApp } from "./components/ConferenceApp";

export default function App() {
  return (
    <ConferenceApp
      serverUrl="ws://localhost:8000"
      roomId="room-123"
      userId="user-456"
    />
  );
}
```

---

## Packet Types & Data Structures

### Packet Type Flow

```
┌─────────────┐
│   JOIN      │  Client → Server (on connection)
└──────┬──────┘
       ↓
┌─────────────────┐
│  START          │  Client → Server (begin registration)
└──────┬──────────┘
       ↓
┌─────────────────┐
│  SNAPSHOT (×N)  │  Client → Server (capture N snapshots)
└──────┬──────────┘
       ↓
┌─────────────────┐
│  COMPLETE       │  Client → Server (end registration)
└──────┬──────────┘
       ↓
┌──────────────────────┐
│  SEMANTIC (ongoing)  │  Client → Server (real-time data)
└──────────────────────┘
```

### Key Data Structures

**SnapshotPacket:**
```typescript
{
  frame_index: number;
  timestamp: number;
  video_frame: string;           // Base64 JPEG
  facial_landmarks: FacialLandmarks;
  head_pose: HeadPose;
  audio_frame: string;           // Base64 WAV
  confidence: number;            // 0-1
}
```

**SemanticPacket:**
```typescript
{
  timestamp: number;
  video_frame?: string;
  facial_landmarks?: FacialLandmarks;
  head_pose?: HeadPose;
  audio_level?: number;
  confidence?: number;
}
```

---

## Integration Steps

### 1. Install Dependencies

```bash
npm install @tensorflow/tfjs @tensorflow-models/face-landmarks-detection
```

### 2. Wrap App with ConferenceProvider

```typescript
import { ConferenceProvider } from "./context/ConferenceContext";

export default function App() {
  return (
    <ConferenceProvider>
      <ConferenceApp serverUrl="ws://localhost:8000" roomId="room-123" userId="user-456" />
    </ConferenceProvider>
  );
}
```

### 3. Import & Use Hooks

```typescript
import { useRegistration } from "./hooks/useRegistration";
import { useSemanticBroadcast } from "./hooks/useSemanticBroadcast";

function MyComponent() {
  const registration = useRegistration({...});
  const broadcast = useSemanticBroadcast({...});
  
  // Your logic here
}
```

---

## Performance Optimization

### Video Encoding
- Base64 JPEGs at 80% quality for transmission
- Resolution: 640×480 (configurable)
- Frame rate: 15 FPS for broadcast (30 FPS capture)

### Audio Processing
- 16kHz sample rate (industry standard)
- WAV encoding for clarity
- RMS level calculation for real-time feedback

### Face Detection
- MediaPipe FaceMesh (468 keypoints)
- Semantic extraction only (no visual rendering)
- Downsampling support for bandwidth optimization

### Bandwidth Monitoring
- Real-time tracking (bytes/sec)
- Automatic frame throttling
- Packet dropout detection

---

## Debugging

### Enable Debug Logs

```typescript
// Connection Manager
connection.debugState();

// Registration
registration.debugState();

// Broadcast
broadcast.debugState();

// Conference State
conference.debug();
```

### Browser DevTools

```javascript
// In console
window.__vyncDebug = {
  connection: connectionRef.current,
  registration: registrationRef.current,
  broadcast: broadcastRef.current,
};
```

---

## Error Handling

### Common Issues

**Camera/Microphone Not Available:**
```typescript
if (!camera.ready) {
  console.error("Camera error:", camera.error);
}
```

**Connection Failed:**
```typescript
if (!connection.connected) {
  console.error("Connection error:", connection.error);
}
```

**Face Detection Timeout:**
```typescript
if (!facePipe.loaded) {
  console.error("Face detection error:", facePipe.error);
}
```

---

## API Reference

See `vync/src/shared/types.ts` for complete type definitions:
- `PacketType` - Enum of packet types
- `RegistrationState` - Registration flow states
- `FacialLandmarks` - Facial landmark values
- `HeadPose` - Head orientation values
- `AckPacket`, `NackPacket` - Server responses

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Requirements:**
- getUserMedia API
- Web Audio API
- WebSocket
- TensorFlow.js support

---

## License

MIT - See LICENSE file for details.
