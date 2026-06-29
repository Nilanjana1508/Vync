/**
 * Packet Builder - Creates valid packets according to protocol
 * Every packet follows the exact structure from Semantic Conferencing v1.0
 */

import {
  PacketType,
  Packet,
  PacketMetadata,
  RegistrationStartPayload,
  SnapshotPayload,
  RegistrationCompletePayload,
  AudioPayload,
  SemanticPayload,
  AckPacket,
  NackPacket,
  PingPacket,
  PongPacket,
  PROTOCOL_VERSION,
  FacialLandmarks,
  HeadPose,
  FacialExpression,
} from "./types";

// ==================== METADATA BUILDER ====================

export function createMetadata(
  roomId: string,
  nodeId: string,
  speakerId: string,
  packetType: PacketType,
  sequenceNumber: number,
  timestamp: number = Date.now()
): PacketMetadata {
  return {
    room_id: roomId,
    node_id: nodeId,
    speaker_id: speakerId,
    packet_type: packetType,
    sequence_number: sequenceNumber,
    timestamp,
  };
}

// ==================== REGISTRATION START ====================

export function createRegistrationStartPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  registrationId: string,
  totalSnapshots: number,
  timestamp: number = Date.now()
): Packet<RegistrationStartPayload> {
  if (totalSnapshots <= 0) {
    throw new Error("totalSnapshots must be > 0");
  }

  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.REGISTRATION_START,
      sequenceNumber,
      timestamp
    ),
    payload: {
      version: PROTOCOL_VERSION,
      registration_id: registrationId,
      total_snapshots: totalSnapshots,
      timestamp,
    },
  };
}

// ==================== SNAPSHOT ====================

export function createSnapshotPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  registrationId: string,
  faceId: string,
  imageFormat: "jpeg" | "png",
  imageWidth: number,
  imageHeight: number,
  imageData: string, // Base64 encoded
  embeddingAvailable: boolean = false,
  timestamp: number = Date.now()
): Packet<SnapshotPayload> {
  if (!imageData || imageData.length === 0) {
    throw new Error("imageData cannot be empty");
  }

  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("Image dimensions must be positive");
  }

  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.SNAPSHOT,
      sequenceNumber,
      timestamp
    ),
    payload: {
      version: PROTOCOL_VERSION,
      registration_id: registrationId,
      face_id: faceId,
      image_format: imageFormat,
      image_width: imageWidth,
      image_height: imageHeight,
      embedding_available: embeddingAvailable,
      image_data: imageData,
      timestamp,
    },
  };
}

// ==================== REGISTRATION COMPLETE ====================

export function createRegistrationCompletePacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  registrationId: string,
  registeredFaces: string[],
  timestamp: number = Date.now()
): Packet<RegistrationCompletePayload> {
  if (!Array.isArray(registeredFaces) || registeredFaces.length === 0) {
    throw new Error("registeredFaces must be a non-empty array");
  }

  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.REGISTRATION_COMPLETE,
      sequenceNumber,
      timestamp
    ),
    payload: {
      version: PROTOCOL_VERSION,
      registration_id: registrationId,
      registered_faces: registeredFaces,
      timestamp,
    },
  };
}

// ==================== AUDIO PACKET ====================

export function createAudioPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  audioData: string, // Base64 encoded OPUS
  codec: string = "opus",
  sampleRate: number = 16000,
  channels: number = 1,
  durationMs: number,
  timestamp: number = Date.now()
): Packet<AudioPayload> {
  if (!audioData || audioData.length === 0) {
    throw new Error("audioData cannot be empty");
  }

  if (durationMs <= 0) {
    throw new Error("durationMs must be positive");
  }

  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.AUDIO,
      sequenceNumber,
      timestamp
    ),
    payload: {
      version: PROTOCOL_VERSION,
      audio_data: audioData,
      codec,
      sample_rate: sampleRate,
      channels,
      duration_ms: durationMs,
      timestamp,
    },
  };
}

// ==================== SEMANTIC PACKET ====================

export function createSemanticPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  facialLandmarks: FacialLandmarks,
  headPose: HeadPose,
  facialExpression: FacialExpression,
  timestamp: number = Date.now()
): Packet<SemanticPayload> {
  // Validate facial landmarks
  validateFacialLandmarks(facialLandmarks);
  validateHeadPose(headPose);

  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.SEMANTIC,
      sequenceNumber,
      timestamp
    ),
    payload: {
      version: PROTOCOL_VERSION,
      facial_landmarks: facialLandmarks,
      head_pose: headPose,
      facial_expression: facialExpression,
      timestamp,
    },
  };
}

// ==================== CONTROL PACKETS ====================

export function createAckPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  acknowledgedSequence: number,
  acknowledgedPacketType: PacketType,
  timestamp: number = Date.now()
): Packet<AckPacket> {
  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.ACK,
      sequenceNumber,
      timestamp
    ),
    payload: {
      acknowledged_sequence: acknowledgedSequence,
      packet_type: acknowledgedPacketType,
      timestamp,
    },
  };
}

export function createNackPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  failedSequence: number,
  reason: string,
  timestamp: number = Date.now()
): Packet<NackPacket> {
  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.NACK,
      sequenceNumber,
      timestamp
    ),
    payload: {
      failed_sequence: failedSequence,
      reason,
      timestamp,
    },
  };
}

export function createPingPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  timestamp: number = Date.now()
): Packet<PingPacket> {
  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.PING,
      sequenceNumber,
      timestamp
    ),
    payload: {
      timestamp,
    },
  };
}

export function createPongPacket(
  roomId: string,
  nodeId: string,
  speakerId: string,
  sequenceNumber: number,
  timestamp: number = Date.now()
): Packet<PongPacket> {
  return {
    metadata: createMetadata(
      roomId,
      nodeId,
      speakerId,
      PacketType.PONG,
      sequenceNumber,
      timestamp
    ),
    payload: {
      timestamp,
    },
  };
}

// ==================== VALIDATORS ====================

function validateFacialLandmarks(landmarks: FacialLandmarks): void {
  const rangeFields = [
    "mouth_open",
    "mouth_width",
    "eye_left_open",
    "eye_right_open",
    "eyebrow_left_raise",
    "eyebrow_right_raise",
  ];

  for (const field of rangeFields) {
    const value = (landmarks as any)[field];
    if (typeof value !== "number" || value < 0 || value > 1) {
      throw new Error(`${field} must be a number between 0 and 1`);
    }
  }

  const directionFields = ["nose_direction_x", "nose_direction_y"];
  for (const field of directionFields) {
    const value = (landmarks as any)[field];
    if (typeof value !== "number" || value < -1 || value > 1) {
      throw new Error(`${field} must be a number between -1 and 1`);
    }
  }
}

function validateHeadPose(pose: HeadPose): void {
  const poseFields = ["yaw", "pitch", "roll"];
  for (const field of poseFields) {
    const value = (pose as any)[field];
    if (typeof value !== "number") {
      throw new Error(`${field} must be a number`);
    }
  }
}

// ==================== HELPERS ====================

export function generateRegistrationId(): string {
  return `REG_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function generateSpeakerId(nodeId: string, index: number): string {
  // Format: SP101, SP102, SP201, SP202, etc.
  const nodeIndex = parseInt(nodeId.replace(/\D/g, "")) || 1;
  return `SP${nodeIndex}${String(index + 1).padStart(2, "0")}`;
}
