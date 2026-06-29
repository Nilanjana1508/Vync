/**
 * Packet Serializers - Convert TypeScript objects to JSON for transmission
 * Ensures exact format matching protocol specification
 */

import {
  Packet,
  RegistrationStartPayload,
  SnapshotPayload,
  RegistrationCompletePayload,
  AudioPayload,
  SemanticPayload,
  AckPacket,
  NackPacket,
  PingPacket,
  PongPacket,
} from "./types";

// ==================== PACKET SERIALIZERS ====================

export function serializePacket<T>(packet: Packet<T>): string {
  try {
    return JSON.stringify(packet);
  } catch (error) {
    throw new Error(`Failed to serialize packet: ${error}`);
  }
}

export function deserializePacket<T>(jsonString: string): Packet<T> {
  try {
    const packet = JSON.parse(jsonString);
    validatePacketStructure(packet);
    return packet as Packet<T>;
  } catch (error) {
    throw new Error(`Failed to deserialize packet: ${error}`);
  }
}

// ==================== FORMATTERS ====================

/**
 * Formats a packet for logging/debugging with JSON output
 * Shows exactly what will be transmitted
 */
export function formatPacketForLogging(packet: Packet<any>): string {
  return JSON.stringify(packet, null, 2);
}

/**
 * Formats a packet into a compact single-line JSON (for transmission)
 */
export function formatPacketForTransmission(packet: Packet<any>): string {
  return JSON.stringify(packet);
}

/**
 * Displays packet metadata in human-readable format
 */
export function formatPacketMetadata(packet: Packet<any>): string {
  const { metadata } = packet;
  return (
    `[${metadata.packet_type.toUpperCase()}] ` +
    `Room: ${metadata.room_id}, ` +
    `Speaker: ${metadata.speaker_id}, ` +
    `Seq: ${metadata.sequence_number}, ` +
    `TS: ${metadata.timestamp}`
  );
}

// ==================== VALIDATORS ====================

function validatePacketStructure(obj: any): void {
  if (!obj.metadata) {
    throw new Error("Missing metadata");
  }

  if (!obj.payload) {
    throw new Error("Missing payload");
  }

  const { metadata } = obj;

  if (!metadata.room_id) throw new Error("Missing metadata.room_id");
  if (!metadata.node_id) throw new Error("Missing metadata.node_id");
  if (!metadata.speaker_id) throw new Error("Missing metadata.speaker_id");
  if (!metadata.packet_type) throw new Error("Missing metadata.packet_type");
  if (typeof metadata.sequence_number !== "number")
    throw new Error("Invalid metadata.sequence_number");
  if (typeof metadata.timestamp !== "number")
    throw new Error("Invalid metadata.timestamp");

  if (!obj.payload.version) {
    throw new Error("Missing payload.version");
  }
}

// ==================== JSON STRUCTURE EXAMPLES ====================

/**
 * These examples show exactly what JSON is produced
 * Used for validation and testing
 */

export const EXAMPLE_PACKETS = {
  REGISTRATION_START: {
    metadata: {
      room_id: "ROOM001",
      node_id: "NODE001",
      speaker_id: "SP101",
      packet_type: "registration_start",
      sequence_number: 1,
      timestamp: 1719686400000,
    },
    payload: {
      version: "1.0",
      registration_id: "REG_1719686400000_abc123",
      total_snapshots: 3,
      timestamp: 1719686400000,
    },
  },

  SNAPSHOT: {
    metadata: {
      room_id: "ROOM001",
      node_id: "NODE001",
      speaker_id: "SP101",
      packet_type: "snapshot",
      sequence_number: 2,
      timestamp: 1719686401000,
    },
    payload: {
      version: "1.0",
      registration_id: "REG_1719686400000_abc123",
      face_id: "SP101",
      image_format: "jpeg",
      image_width: 640,
      image_height: 480,
      embedding_available: false,
      image_data: "/9j/4AAQSkZJRgABAQEAYABgAAD...",
      timestamp: 1719686401000,
    },
  },

  REGISTRATION_COMPLETE: {
    metadata: {
      room_id: "ROOM001",
      node_id: "NODE001",
      speaker_id: "SP101",
      packet_type: "registration_complete",
      sequence_number: 4,
      timestamp: 1719686403000,
    },
    payload: {
      version: "1.0",
      registration_id: "REG_1719686400000_abc123",
      registered_faces: ["SP101", "SP102", "SP103"],
      timestamp: 1719686403000,
    },
  },

  AUDIO: {
    metadata: {
      room_id: "ROOM001",
      node_id: "NODE001",
      speaker_id: "SP101",
      packet_type: "audio",
      sequence_number: 5,
      timestamp: 1719686404000,
    },
    payload: {
      version: "1.0",
      audio_data: "//NExAAqQAP8A...",
      codec: "opus",
      sample_rate: 16000,
      channels: 1,
      duration_ms: 100,
      timestamp: 1719686404000,
    },
  },

  SEMANTIC: {
    metadata: {
      room_id: "ROOM001",
      node_id: "NODE001",
      speaker_id: "SP101",
      packet_type: "semantic",
      sequence_number: 6,
      timestamp: 1719686404500,
    },
    payload: {
      version: "1.0",
      facial_landmarks: {
        mouth_open: 0.5,
        mouth_width: 0.8,
        eye_left_open: 0.9,
        eye_right_open: 0.9,
        eyebrow_left_raise: 0.2,
        eyebrow_right_raise: 0.2,
        nose_direction_x: 0.0,
        nose_direction_y: 0.0,
      },
      head_pose: {
        yaw: 0.0,
        pitch: 0.0,
        roll: 0.0,
      },
      facial_expression: {
        emotion: "neutral",
        confidence: 0.95,
      },
      timestamp: 1719686404500,
    },
  },

  ACK: {
    metadata: {
      room_id: "ROOM001",
      node_id: "NODE001",
      speaker_id: "SP101",
      packet_type: "ack",
      sequence_number: 7,
      timestamp: 1719686405000,
    },
    payload: {
      acknowledged_sequence: 5,
      packet_type: "audio",
      timestamp: 1719686405000,
    },
  },

  PING: {
    metadata: {
      room_id: "ROOM001",
      node_id: "NODE001",
      speaker_id: "SP101",
      packet_type: "ping",
      sequence_number: 8,
      timestamp: 1719686406000,
    },
    payload: {
      timestamp: 1719686406000,
    },
  },
};

// ==================== PRETTY PRINT ====================

/**
 * Pretty-print a JSON packet to console with colors (Node.js)
 */
export function prettyPrintPacket(packet: Packet<any>): void {
  console.log("\n" + "=".repeat(80));
  console.log("PACKET STRUCTURE:");
  console.log("=".repeat(80));
  console.log(JSON.stringify(packet, null, 2));
  console.log("=".repeat(80) + "\n");
}

/**
 * Get the size in bytes of serialized packet
 */
export function getPacketSizeBytes(packet: Packet<any>): number {
  const serialized = serializePacket(packet);
  return new TextEncoder().encode(serialized).byteLength;
}

/**
 * Check if packet exceeds maximum size
 */
export function isPacketTooLarge(
  packet: Packet<any>,
  maxSizeBytes: number = 65536
): boolean {
  return getPacketSizeBytes(packet) > maxSizeBytes;
}
