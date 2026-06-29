# Vync Frontend - Setup & Run Guide

## Prerequisites

- Node.js 16+ 
- npm 8+
- FastAPI backend running (default: `ws://localhost:8000`)

## Installation

### 1. Clone & Navigate
```bash
git clone https://github.com/Nilanjana1508/Vync.git
cd Vync/vync
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm start
```

The app will open at **http://localhost:3000**

---

## Configuration

### Backend Connection

Edit `src/components/ConferenceApp.tsx`:

```typescript
<ConferenceApp
  serverUrl="ws://localhost:8000"  // Change WebSocket URL here
  roomId="room-123"
  userId="user-456"
/>
```

### Camera Settings

Edit `src/hooks/useCamera.ts`:

```typescript
const camera = useCamera({
  width: 640,      // Video width (px)
  height: 480,     // Video height (px)
  frameRate: 30,   // Capture FPS
  facingMode: "user" // "user" or "environment"
});
```

### Registration Settings

Edit `src/hooks/useRegistration.ts`:

```typescript
const registration = useRegistration({
  snapshotCount: 5,      // Number of registration snapshots
  snapshotInterval: 500, // Delay between snapshots (ms)
  // ...
});
```

### Broadcast Settings

Edit `src/hooks/useSemanticBroadcast.ts`:

```typescript
const broadcast = useSemanticBroadcast({
  broadcastFps: 15,        // Broadcast frame rate
  enableVideo: true,       // Send video frames
  enableAudio: true,       // Send audio data
  enableFaceDetection: true, // Send facial landmarks
});
```

---

## Running the App

### Phase 1: Device Check
- Ensure camera, microphone, and face detection are ready
- Click **Start Registration**

### Phase 2: Registration
- Captures 5 snapshots over ~2.5 seconds
- Each snapshot includes:
  - Video frame
  - Facial landmarks & head pose
  - Audio frame
- Progress bar shows completion

### Phase 3: Broadcasting
- Real-time semantic data transmission
- View stats: Frames sent, Bandwidth, Dropped packets
- Click **Stop Broadcasting** to end

---

## Building for Production

```bash
npm run build
```

Optimized files in `build/` folder. Deploy to:
- Vercel
- Netlify
- Your server

---

## Troubleshooting

### Camera/Microphone Not Working

**Issue:** "Camera: Not Ready" message

**Solutions:**
1. Check browser permissions: Settings → Privacy → Camera/Microphone
2. Ensure HTTPS (required by browsers for media access)
3. Check if another app is using the camera
4. Try a different browser

### WebSocket Connection Failed

**Issue:** "Not connected to server"

**Solutions:**
1. Ensure FastAPI backend is running: `uvicorn main:app --reload`
2. Check backend URL in `ConferenceApp.tsx`
3. Check firewall allows WebSocket (port 8000)
4. Browser console should show connection error

### Face Detection Not Loading

**Issue:** "Face Detection: Not Ready"

**Solutions:**
1. Check internet (TensorFlow.js needs to download models)
2. Wait 10-15 seconds (first load is slow)
3. Check browser console for TensorFlow errors
4. Ensure JavaScript is enabled

### Poor Video Quality

**Solutions:**
1. Increase resolution: `width: 1280, height: 720`
2. Increase broadcast FPS: `broadcastFps: 30`
3. Check network bandwidth: `broadcast.bandwidth`
4. Reduce snapshot count or interval

### Audio Issues

**Solutions:**
1. Check microphone permissions
2. Test microphone in System Settings
3. Check audio level in debug: `broadcast.debugState()`
4. Lower sample rate: `sampleRate: 8000`

---

## Debug Mode

### Console Logging

Click **📊 Debug State** button to log:
- Connection status
- Devices ready state
- Frames sent, bandwidth, dropouts
- Current registration state

### Browser DevTools

```javascript
// In Chrome DevTools Console:
// Check WebSocket messages
window.__vyncDebug.connection.debugState();

// Check registration progress
window.__vyncDebug.registration.debugState();

// Check broadcast stats
window.__vyncDebug.broadcast.debugState();
```

---

## Performance Tips

### Optimize Bandwidth
```typescript
// Reduce video quality
camera.captureFrameAsBase64() // Already compressed to 80% JPEG

// Reduce broadcast FPS
broadcastFps: 10 // Instead of 15

// Disable video
enableVideo: false

// Lower audio sample rate
sampleRate: 8000 // Instead of 16000
```

### Improve Face Detection Speed
```typescript
// Reduce detection FPS (run less frequently)
facePipe.startDetection(videoElement, callback, 15); // Instead of 30
```

### Monitor Performance
```javascript
// In DevTools:
performance.now() // Time measurements
window.innerWidth // Responsive layout
```

---

## API Endpoints Reference

**Backend (FastAPI):**
- WebSocket: `ws://localhost:8000/ws/room/{room_id}/{user_id}`
- REST API: `http://localhost:8000`

**Packet Types:**
- `JOIN` - Connect to conference
- `START` - Begin registration
- `SNAPSHOT` - Send snapshot data
- `COMPLETE` - Finish registration
- `SEMANTIC` - Send real-time data
- `PING/PONG` - Keepalive
- `ACK/NACK` - Server responses

---

## Development Workflow

```bash
# Terminal 1: Start frontend
cd vync
npm start

# Terminal 2: Start backend (if needed)
cd ../backend
uvicorn main:app --reload
```

---

## Next Steps

1. ✅ Backend running
2. ✅ Frontend running
3. ✅ Test registration flow
4. ✅ Test broadcast stream
5. 📊 Monitor backend logs
6. 🚀 Deploy to production

---

## Support

For issues:
1. Check browser console (F12)
2. Enable debug mode
3. Check backend logs
4. Review FRONTEND_ARCHITECTURE.md
