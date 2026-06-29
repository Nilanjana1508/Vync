/**
 * Shared Type Definitions for Semantic Conferencing System
 * Used by both React Frontend and FastAPI Backend
 * Source of Truth: Semantic Conferencing Protocol v1.0
 */

// ==================== ENUMS ====================

export enum PacketType {
  JOIN = "join",
  LEAVE = "leave",
  PING = "ping",
  PONG = "pong",
  ACK = "ack",
  NACK = "nack",
  ERROR = "error",
  REGISTRATION_START = "registration_start",
  SNAPSHOT = "snapshot",
  REGISTRATION_COMPLETE = "registration_complete",
  AUDIO = "audio",
  SEMANTIC = "semantic",
}

export enum PacketPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export enum RegistrationState {
  IDLE = "idle",
  AWAITING_PORTRAITS = "awaiting_portraits",
  COMPLETE = "complete",
  ERROR = "error",
}

// ==================== METADATA STRUCTURES ====================

export interface PacketMetadata {
  room_id: string;
  node_id: string;
  speaker_id: string;
  packet_type: PacketType;
  sequence_number: number;
  timestamp: number; // Unix timestamp in milliseconds
}

export interface BasePayload {
  version: string;
  [key: string]: any;
}

// ==================== CONTROL PACKETS ====================

export interface JoinPacket {
  room_id: string;
  node_id: string;
  user_id: string;
  timestamp: number;
}

export interface LeavePacket {
  room_id: string;
  node_id: string;
  speaker_id: string;
  timestamp: number;
}

export interface PingPacket {
  timestamp: number;
}

export interface PongPacket {
  timestamp: number;
}

export interface AckPacket {
  acknowledged_sequence: number;
  packet_type: PacketType;
  timestamp: number;
}

export interface NackPacket {
  failed_sequence: number;
  reason: string;
  timestamp: number;
}

export interface ErrorPacket {
  error_code: string;
  error_message: string;
  timestamp: number;
}

// ==================== REGISTRATION PACKETS ====================

export interface RegistrationStartPayload {
  version: string;
  registration_id: string;
  total_snapshots: number;
  timestamp: number;
}

export interface SnapshotPayload {
  version: string;
  registration_id: string;
  face_id: string; // Speaker ID
  image_format: string; // "jpeg" or "png"
  image_width: number;
  image_height: number;
  embedding_available: boolean;
  image_data: string; // Base64 encoded image
  timestamp: number;
}

export interface RegistrationCompletePayload {
  version: string;
  registration_id: string;
  registered_faces: string[]; // Array of speaker_ids
  timestamp: number;
}

// ==================== RUNTIME PACKETS ====================

export interface AudioPayload {
  version: string;
  audio_data: string; // Base64 encoded OPUS compressed audio
  codec: string; // "opus"
  sample_rate: number;
  channels: number;
  duration_ms: number;
  timestamp: number;
}

export interface SemanticPayload {
  version: string;
  facial_landmarks: FacialLandmarks;
  head_pose: HeadPose;
  facial_expression: FacialExpression;
  timestamp: number;
}

export interface FacialLandmarks {
  mouth_open: number; // 0-1
  mouth_width: number; // 0-1
  eye_left_open: number; // 0-1
  eye_right_open: number; // 0-1
  eyebrow_left_raise: number; // 0-1
  eyebrow_right_raise: number; // 0-1
  nose_direction_x: number; // -1 to 1
  nose_direction_y: number; // -1 to 1
}

export interface HeadPose {
  yaw: number; // degrees
  pitch: number; // degrees
  roll: number; // degrees
}

export interface FacialExpression {
  emotion: string | null; // "happy", "sad", "angry", "neutral", etc.
  confidence: number; // 0-1
}

// ==================== COMPLETE PACKET WRAPPER ====================

export interface Packet<T extends BasePayload> {
  metadata: PacketMetadata;
  payload: T;
}

export type AnyPacket =
  | Packet<RegistrationStartPayload>
  | Packet<SnapshotPayload>
  | Packet<RegistrationCompletePayload>
  | Packet<AudioPayload>
  | Packet<SemanticPayload>
  | Packet<AckPacket>
  | Packet<NackPacket>
  | Packet<PingPacket>
  | Packet<PongPacket>;

// ==================== STATE STRUCTURES ====================

export interface SpeakerState {
  speaker_id: string;
  node_id: string;
  is_speaking: boolean;
  last_seen: number;
  registration_status: RegistrationState;
}

export interface RoomState {
  room_id: string;
  created_at: number;
  participants: Map<string, SpeakerState>;
}

export interface ConferenceState {
  room_id: string;
  node_id: string;
  user_id: string;
  connected: boolean;
  registered: boolean;
  speakers: Map<string, SpeakerState>;
}

// ==================== AUDIO STRUCTURES ====================

export interface AudioChunk {
  speaker_id: string;
  session_id: string;
  room_id: string;
  sequence_number: number;
  timestamp: number;
  duration: number;
  sample_rate: number;
  channels: number;
  pcm_bytes: Uint8Array;
  arrival_time: number;
}

// ==================== SEMANTIC STRUCTURES ====================

export interface SemanticFrame {
  speaker_id: string;
  session_id: string;
  room_id: string;
  sequence_number: number;
  timestamp: number;
  facial_landmarks: FacialLandmarks;
  head_pose: HeadPose;
  facial_expression: FacialExpression;
  arrival_time: number;
}

// ==================== PROCESSING BLOCK ====================

export interface ProcessingBlock {
  block_id: string;
  room_id: string;
  speaker_id: string;
  stream_type: "audio" | "semantic";
  sequence_start: number;
  sequence_end: number;
  timestamp_start: number;
  timestamp_end: number;
  items_count: number;
  created_at: number;
}

// ==================== FACE REGISTRY ====================

export interface RegisteredFace {
  speaker_id: string;
  session_id: string;
  room_id: string;
  node_id: string;
  snapshot_path: string;
  embedding_path: string | null;
  generated_path: string | null;
  registered_at: number;
  is_speaking: boolean;
  last_seen: number;
}

// ==================== CONSTANTS ====================

export const PROTOCOL_VERSION = "1.0";
export const MAX_ROOM_SIZE = 6;
export const MAX_PACKET_SIZE = 65536; // 64KB
export const QUEUE_TIMEOUT = 5000; // 5 seconds
export const AUDIO_SAMPLE_RATE = 16000; // 16kHz
export const AUDIO_CHANNELS = 1; // Mono
export const SEMANTIC_FRAME_RATE = 15; // 15 FPS
export const BLOCK_TIMEOUT = 2000; // 2 seconds
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const RECONNECT_TIMEOUT = 3000; // 3 seconds
export const MAX_RECONNECT_ATTEMPTS = 5;

// ==================== ERROR CODES ====================

export const ERROR_CODES = {
  INVALID_ROOM: "INVALID_ROOM",
  INVALID_PACKET: "INVALID_PACKET",
  REGISTRATION_FAILED: "REGISTRATION_FAILED",
  SYNC_FAILED: "SYNC_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;
