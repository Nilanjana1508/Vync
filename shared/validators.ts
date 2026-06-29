/**
 * Packet Validators - Validate packets before sending/receiving
 * Ensures compliance with Semantic Conferencing Protocol v1.0
 */

import {
  Packet,
  PacketType,
  PROTOCOL_VERSION,
  MAX_PACKET_SIZE,
  FacialLandmarks,
  HeadPose,
} from "./types";

// ==================== PACKET VALIDATORS ====================

/**
 * Comprehensive packet validation
 */
export function validatePacket(packet: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check top-level structure
  if (!packet || typeof packet !== "object") {
    errors.push("Packet must be an object");
    return { valid: false, errors };
  }

  if (!packet.metadata) {
    errors.push("Missing metadata");
  } else {
    validateMetadata(packet.metadata, errors);
  }

  if (!packet.payload) {
    errors.push("Missing payload");
  } else {
    validatePayload(packet.payload, errors);
  }

  // Check packet size
  try {
    const size = new TextEncoder().encode(JSON.stringify(packet)).byteLength;
    if (size > MAX_PACKET_SIZE) {
      errors.push(
        `Packet size (${size} bytes) exceeds maximum (${MAX_PACKET_SIZE} bytes)`
      );
    }
  } catch (e) {
    errors.push("Failed to calculate packet size");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateMetadata(metadata: any, errors: string[]): void {
  if (typeof metadata !== "object") {
    errors.push("Metadata must be an object");
    return;
  }

  if (!metadata.room_id || typeof metadata.room_id !== "string") {
    errors.push("Metadata: room_id must be a non-empty string");
  }

  if (!metadata.node_id || typeof metadata.node_id !== "string") {
    errors.push("Metadata: node_id must be a non-empty string");
  }

  if (!metadata.speaker_id || typeof metadata.speaker_id !== "string") {
    errors.push("Metadata: speaker_id must be a non-empty string");
  }

  if (!Object.values(PacketType).includes(metadata.packet_type)) {
    errors.push(
      `Metadata: packet_type must be one of: ${Object.values(PacketType).join(", ")}`
    );
  }

  if (typeof metadata.sequence_number !== "number" || metadata.sequence_number < 0) {
    errors.push("Metadata: sequence_number must be a non-negative number");
  }

  if (typeof metadata.timestamp !== "number" || metadata.timestamp <= 0) {
    errors.push("Metadata: timestamp must be a positive number");
  }
}

function validatePayload(payload: any, errors: string[]): void {
  if (typeof payload !== "object") {
    errors.push("Payload must be an object");
    return;
  }

  if (!payload.version || payload.version !== PROTOCOL_VERSION) {
    errors.push(`Payload: version must be "${PROTOCOL_VERSION}"`);
  }

  if (typeof payload.timestamp !== "number" || payload.timestamp <= 0) {
    errors.push("Payload: timestamp must be a positive number");
  }
}

// ==================== FIELD VALIDATORS ====================

/**
 * Validate facial landmarks values
 */
export function validateFacialLandmarks(
  landmarks: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!landmarks || typeof landmarks !== "object") {
    errors.push("Facial landmarks must be an object");
    return { valid: false, errors };
  }

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
    if (typeof value !== "number") {
      errors.push(`${field} must be a number`);
    } else if (value < 0 || value > 1) {
      errors.push(`${field} must be between 0 and 1 (got ${value})`);
    }
  }

  const directionFields = ["nose_direction_x", "nose_direction_y"];
  for (const field of directionFields) {
    const value = (landmarks as any)[field];
    if (typeof value !== "number") {
      errors.push(`${field} must be a number`);
    } else if (value < -1 || value > 1) {
      errors.push(`${field} must be between -1 and 1 (got ${value})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate head pose values
 */
export function validateHeadPose(pose: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pose || typeof pose !== "object") {
    errors.push("Head pose must be an object");
    return { valid: false, errors };
  }

  const fields = ["yaw", "pitch", "roll"];
  for (const field of fields) {
    const value = (pose as any)[field];
    if (typeof value !== "number") {
      errors.push(`${field} must be a number`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate base64 encoded data
 */
export function validateBase64(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== "string") {
    errors.push("Base64 data must be a non-empty string");
    return { valid: false, errors };
  }

  try {
    // Test decode
    atob(data);
  } catch (e) {
    errors.push("Invalid base64 encoding");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  width: any,
  height: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof width !== "number" || width <= 0) {
    errors.push("Width must be a positive number");
  }

  if (typeof height !== "number" || height <= 0) {
    errors.push("Height must be a positive number");
  }

  if (width > 4096 || height > 4096) {
    errors.push("Image dimensions exceed maximum (4096x4096)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate speaker ID format
 */
export function validateSpeakerId(id: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!id || typeof id !== "string") {
    errors.push("Speaker ID must be a non-empty string");
    return { valid: false, errors };
  }

  // Format: SP101, SP102, etc.
  if (!/^SP\d{3}$/.test(id)) {
    errors.push("Speaker ID must match format SPxxx where x is a digit");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate room ID format
 */
export function validateRoomId(id: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!id || typeof id !== "string") {
    errors.push("Room ID must be a non-empty string");
    return { valid: false, errors };
  }

  if (id.length < 3 || id.length > 50) {
    errors.push("Room ID must be between 3 and 50 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate sequence number
 */
export function validateSequenceNumber(seq: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof seq !== "number") {
    errors.push("Sequence number must be a number");
  } else if (seq < 0) {
    errors.push("Sequence number must be non-negative");
  } else if (!Number.isInteger(seq)) {
    errors.push("Sequence number must be an integer");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate timestamp
 */
export function validateTimestamp(ts: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof ts !== "number") {
    errors.push("Timestamp must be a number");
    return { valid: false, errors };
  }

  if (ts <= 0) {
    errors.push("Timestamp must be positive");
  }

  const now = Date.now();
  const diff = Math.abs(now - ts);

  if (diff > 300000) {
    // 5 minutes
    errors.push(
      `Timestamp differs from current time by ${diff}ms (more than 5 minutes)`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== REGISTRATION VALIDATORS ====================

/**
 * Validate registration ID format
 */
export function validateRegistrationId(id: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!id || typeof id !== "string") {
    errors.push("Registration ID must be a non-empty string");
    return { valid: false, errors };
  }

  if (!id.startsWith("REG_")) {
    errors.push("Registration ID must start with 'REG_'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate total snapshots count
 */
export function validateTotalSnapshots(count: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof count !== "number") {
    errors.push("Total snapshots must be a number");
  } else if (count <= 0) {
    errors.push("Total snapshots must be positive");
  } else if (!Number.isInteger(count)) {
    errors.push("Total snapshots must be an integer");
  } else if (count > 50) {
    errors.push("Total snapshots exceeds maximum (50)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate registered faces array
 */
export function validateRegisteredFaces(
  faces: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(faces)) {
    errors.push("Registered faces must be an array");
    return { valid: false, errors };
  }

  if (faces.length === 0) {
    errors.push("Registered faces array cannot be empty");
  }

  for (let i = 0; i < faces.length; i++) {
    const validation = validateSpeakerId(faces[i]);
    if (!validation.valid) {
      errors.push(`Face ${i}: ${validation.errors.join(", ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== AUDIO VALIDATORS ====================

/**
 * Validate audio codec
 */
export function validateAudioCodec(codec: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validCodecs = ["opus", "aac", "mp3"];

  if (!codec || typeof codec !== "string") {
    errors.push("Audio codec must be a non-empty string");
  } else if (!validCodecs.includes(codec)) {
    errors.push(`Audio codec must be one of: ${validCodecs.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate sample rate
 */
export function validateSampleRate(rate: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validRates = [8000, 16000, 22050, 44100, 48000];

  if (typeof rate !== "number") {
    errors.push("Sample rate must be a number");
  } else if (!validRates.includes(rate)) {
    errors.push(`Sample rate must be one of: ${validRates.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate audio channels
 */
export function validateAudioChannels(channels: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof channels !== "number") {
    errors.push("Channels must be a number");
  } else if (channels !== 1 && channels !== 2) {
    errors.push("Channels must be 1 (mono) or 2 (stereo)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate audio duration
 */
export function validateAudioDuration(ms: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof ms !== "number") {
    errors.push("Duration must be a number");
  } else if (ms <= 0) {
    errors.push("Duration must be positive");
  } else if (ms > 60000) {
    errors.push("Duration exceeds maximum (60 seconds)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== ERROR REPORTING ====================

/**
 * Format validation errors for logging
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return "No errors";
  return errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n");
}

/**
 * Throw error if validation fails
 */
export function throwIfInvalid(
  result: { valid: boolean; errors: string[] },
  context: string = ""
): void {
  if (!result.valid) {
    const prefix = context ? `${context}: ` : "";
    throw new Error(
      `${prefix}Validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
}
