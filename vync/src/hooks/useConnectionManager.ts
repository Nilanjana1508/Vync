/**
 * Connection Manager Hook - Orchestrates WebSocket connection and conference state
 * Handles JOIN, LEAVE, ACK/NACK, and heartbeat
 */

import { useEffect, useCallback, useRef } from "react";
import { useConferenceSocket } from "./useConferenceSocket";
import { useConference } from "../context/ConferenceContext";
import {
  PacketType,
  AckPacket,
  NackPacket,
  PingPacket,
  PongPacket,
} from "../shared/types";
import {
  createMetadata,
  createPingPacket,
  createPongPacket,
  generateSpeakerId,
} from "../shared/packetBuilder";

interface ConnectionManagerConfig {
  serverUrl: string;
  roomId: string;
  userId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export function useConnectionManager(config: ConnectionManagerConfig) {
  const { serverUrl, roomId, userId, onConnected, onDisconnected, onError } =
    config;

  const socket = useConferenceSocket({
    serverUrl,
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
  });

  const conference = useConference();
  const sequenceNumberRef = useRef(0);
  const nodeIdRef = useRef(`NODE_${Math.random().toString(36).substring(7)}`);
  const speakerIdRef = useRef<string>("");

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    if (!socket.connected) {
      return;
    }

    const nodeId = nodeIdRef.current;

    // Generate speaker ID (SP101, SP102, etc.)
    const speakerId = generateSpeakerId(nodeId, 0);
    speakerIdRef.current = speakerId;

    // Update conference state
    conference.joinRoom(roomId, nodeId, userId);
    conference.addSpeaker(speakerId, nodeId);

    // Send JOIN packet
    const joinPacket = {
      metadata: createMetadata(
        roomId,
        nodeId,
        speakerId,
        PacketType.JOIN,
        ++sequenceNumberRef.current
      ),
      payload: {
        version: "1.0",
        room_id: roomId,
        node_id: nodeId,
        user_id: userId,
        timestamp: Date.now(),
      },
    };

    socket.sendPacket(joinPacket);

    if (onConnected) {
      onConnected();
    }

    // Subscribe to ACK/NACK
    const unsubscribeAck = socket.subscribe(
      PacketType.ACK,
      (packet: any) => {
        handleAck(packet);
      }
    );

    const unsubscribeNack = socket.subscribe(
      PacketType.NACK,
      (packet: any) => {
        handleNack(packet);
      }
    );

    const unsubscribePing = socket.subscribe(
      PacketType.PING,
      (packet: any) => {
        handlePing(packet);
      }
    );

    return () => {
      unsubscribeAck();
      unsubscribeNack();
      unsubscribePing();
    };
  }, [socket.connected, roomId, userId, conference, socket, onConnected]);

  // ==================== ACK/NACK HANDLERS ====================

  const handleAck = useCallback((packet: any) => {
    const ackPayload = packet.payload as AckPacket;
  }, []);

  const handleNack = useCallback((packet: any) => {
    const nackPayload = packet.payload as NackPacket;
    console.warn(
      `NACK received for sequence ${nackPayload.failed_sequence}: ${nackPayload.reason}`
    );
    if (onError) {
      onError(`NACK: ${nackPayload.reason}`);
    }
  }, [onError]);

  const handlePing = useCallback((packet: any) => {
    const nodeId = nodeIdRef.current;
    const speakerId = speakerIdRef.current;

    const pongPacket = createPongPacket(
      roomId,
      nodeId,
      speakerId,
      ++sequenceNumberRef.current,
      Date.now()
    );
    socket.sendPacket(pongPacket);
  }, [roomId, socket]);

  // ==================== CLEANUP ====================

  useEffect(() => {
    return () => {
      if (socket.connected) {
        socket.disconnect();
        conference.leaveRoom();
        if (onDisconnected) {
          onDisconnected();
        }
      }
    };
  }, [socket, conference, onDisconnected]);

  // ==================== PUBLIC API ====================

  return {
    // Connection state
    connected: socket.connected,
    connecting: socket.connecting,
    error: socket.error,

    // Identifiers
    nodeId: nodeIdRef.current,
    speakerId: speakerIdRef.current,
    roomId,

    // Methods
    sendPacket: socket.sendPacket,
    subscribe: socket.subscribe,
    getSequenceNumber: () => ++sequenceNumberRef.current,

    // Debug
    debugState: () => {
      console.group("Connection Manager State");
      console.log("Connected:", socket.connected);
      console.log("Room:", roomId);
      console.log("Node ID:", nodeIdRef.current);
      console.log("Speaker ID:", speakerIdRef.current);
      console.log("Sequence Number:", sequenceNumberRef.current);
      console.log("Queue Size:", socket.getQueueSize());
      console.log("Handler Count:", socket.getHandlerCount());
      console.groupEnd();
    },
  };
}
