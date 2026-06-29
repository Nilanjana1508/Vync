# Quick Start - 5 Minutes to Conference

## TL;DR

```bash
# 1. Install
cd vync && npm install

# 2. Make sure backend is running on ws://localhost:8000

# 3. Start frontend
npm start

# 4. Open http://localhost:3000

# 5. Click "Start Registration" → "Start Broadcasting"
```

---

## Step by Step

### Step 1: Prerequisites Check

```bash
# Check Node.js
node --version  # Should be 16+

# Check npm
npm --version   # Should be 8+

# Check backend is running
curl http://localhost:8000/  # Should respond
```

### Step 2: Install Dependencies

```bash
cd vync
npm install
```

### Step 3: Start Development Server

```bash
npm start
```

✅ App opens at http://localhost:3000

### Step 4: Allow Permissions

When prompted:
- ✅ Allow Camera
- ✅ Allow Microphone

### Step 5: Device Ready?

Wait for status checks:
```
✓ Camera: Ready
✓ Microphone: Ready
✓ Face Detection: Ready (may take 10-15 seconds)
```

### Step 6: Start Registration

Click **Start Registration**
- Captures 5 snapshots over 2.5 seconds
- Shows progress bar
- Sends to backend

### Step 7: Start Broadcasting

Click **Registration Complete - Start Broadcasting**
- Real-time semantic data stream
- Monitor: Frames, Bandwidth, Dropouts
- Click **Stop Broadcasting** to end

---

## Common Issues (Quick Fixes)

### "Camera: Not Ready"
```bash
# Check permissions
# Chrome → Settings → Privacy → Camera → Allow
# Firefox → about:permissions → Camera → Allow

# Or restart browser
```

### "Not connected to server"
```bash
# Ensure backend is running
cd ../backend
uvicorn main:app --reload

# Check URL in src/components/ConferenceApp.tsx
serverUrl="ws://localhost:8000"
```

### "Face Detection: Not Ready"
```bash
# First load takes 10-15 seconds
# TensorFlow.js downloads model from internet
# Check internet connection
# Check browser console (F12) for errors
```

---

## What's Happening?

```
┌──────────────────┐
│   Frontend React │
│   (Port 3000)    │
└────────┬─────────┘
         │ WebSocket
         │ ws://localhost:8000
         ↓
┌──────────────────┐
│  FastAPI Backend │
│   (Port 8000)    │
└──────────────────┘
```

**Data Flow:**
1. **Registration** → Backend stores facial snapshots
2. **Broadcasting** → Real-time semantic data stream
3. **Server** → Processes & stores for conference

---

## Next: Customize

Edit these files to customize:

```typescript
// Change backend URL
// src/components/ConferenceApp.tsx
serverUrl="ws://your-backend.com"

// Change registration snapshots
// src/hooks/useRegistration.ts
snapshotCount: 10  // More accuracy

// Change broadcast FPS
// src/hooks/useSemanticBroadcast.ts
broadcastFps: 30   // Higher quality
```

---

## Verify It Works

✅ **Registration Successful If:**
- Progress bar reaches 100%
- "Registration Complete" button appears
- Browser console shows no errors

✅ **Broadcasting Successful If:**
- "Frames Sent" counter increases
- Bandwidth shows > 0 bytes/sec
- "Packets Dropped" = 0

---

## Debug

```javascript
// In browser console (F12):
window.__vyncDebug.connection.debugState()
window.__vyncDebug.broadcast.debugState()
```

---

## Troubleshoot

| Problem | Solution |
|---------|----------|
| Black video | Check camera permissions |
| No audio | Check microphone permissions |
| WebSocket error | Backend not running on port 8000 |
| Face detection slow | Wait 15 seconds (first load) |
| Registration fails | Check console (F12) for errors |

---

## You're Ready! 🎉

Now you have:
- ✅ Frontend running
- ✅ Media capture working
- ✅ Real-time broadcasting
- ✅ Facial recognition

Next: Deploy to production! 🚀
