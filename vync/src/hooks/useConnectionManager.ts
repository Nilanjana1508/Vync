/**
 * Connection Manager Hook - Orchestrates WebSocket connection and conference state
 * Now uses Mock Server for frontend-only testing (backend can be added later)
 */

import { useEffect, useCallback, useRef, useState } from "react";
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
import { MockConferenceServer } from "../mock/MockConferenceServer";

interface ConnectionManagerConfig {
  serverUrl: string;
  roomId: string;
  userId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  useMockServer?: boolean; // Toggle for mock vs real backend
}

export function useConnectionManager(config: ConnectionManagerConfig) {
  const {
    serverUrl,
    roomId,
    userId,
    onConnected,
    onDisconnected,
    onError,
    useMockServer = true, // Default: use mock server for frontend-only testing
  } = config;

  const conference = useConference();
  const sequenceNumberRef = useRef(0);
  const nodeIdRef = useRef(`NODE_${Math.random().toString(36).substring(7)}`);
  const speakerIdRef = useRef<string>("");
  const mockServerRef = useRef<MockConferenceServer | null>(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message handlers storage
  const messageHandlersRef = useRef<
    Map<PacketType, ((packet: any) => void)[]>
  >(new Map());

  // ==================== MOCK SERVER SETUP ====================

  useEffect(() => {
    if (!useMockServer) {
      console.log("[Connection] Real backend mode (not implemented yet)");
      return;
    }

    const initializeMock = async () => {
      try {
        setConnecting(true);
        setError(null);

        // Create mock server
        mockServerRef.current = new MockConferenceServer(serverUrl);

        // Connect
        await mockServerRef.current.connect();

        const nodeId = nodeIdRef.current;
        const speakerId = generateSpeakerId(nodeId, 0);
        speakerIdRef.current = speakerId;

        // Update conference state
        conference.joinRoom(roomId, nodeId, userId);
        conference.addSpeaker(speakerId, nodeId);

        // Subscribe to mock server responses
        mockServerRef.current.subscribe(PacketType.ACK, (packet) => {
          console.log("[Mock Response] ACK received:", packet);
          handleAck(packet);
        });

        mockServerRef.current.subscribe(PacketType.NACK, (packet) => {
          console.log("[Mock Response] NACK received:", packet);
          handleNack(packet);
        });

        mockServerRef.current.subscribe(PacketType.PONG, (packet) => {
          console.log("[Mock Response] PONG received");
        });

        // Simulate JOIN ACK
        setTimeout(() => {
          const joinAck = {
            type: PacketType.ACK,
            sequence_number: ++sequenceNumberRef.current,
            message: "JOIN accepted (mock)",
            node_id: nodeId,
            speaker_id: speakerId,
          };
          handleAck(joinAck);
        }, 300);

        setConnected(true);
        setConnecting(false);

        if (onConnected) {
          onConnected();
        }

        console.log("[Mock Connection] Connected successfully");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        setError(errorMessage);
        setConnecting(false);
        if (onError) {
          onError(errorMessage);
        }
        console.error("[Mock Connection] Error:", errorMessage);
      }
    };

    initializeMock();

    return () => {
      if (mockServerRef.current) {
        mockServerRef.current.disconnect();
        setConnected(false);
        if (onDisconnected) {
          onDisconnected();
        }
      }
    };
  }, [useMockServer, serverUrl, roomId, userId, conference, onConnected, onDisconnected, onError]);

  // ==================== PACKET SENDING ====================

  const sendPacket = useCallback((packet: any) => {
    if (!mockServerRef.current) {
      console.warn("[Connection] Not connected to mock server");
      return;
    }

    console.log("[Mock Send] Packet:", packet.type || packet.payload?.type, packet);
    mockServerRef.current.send(packet);
  }, []);

  // ==================== ACK/NACK HANDLERS ====================

  const handleAck = useCallback((packet: any) => {
    console.log("[Handler] ACK packet processed");
  }, []);

  const handleNack = useCallback((packet: any) => {
    const reason = packet.reason || "Unknown error";
    console.warn(`[Handler] NACK received: ${reason}`);
    if (onError) {
      onError(`NACK: ${reason}`);
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
    sendPacket(pongPacket);
  }, [roomId, sendPacket]);

  // ==================== SUBSCRIBE METHOD ====================

  const subscribe = useCallback(
    (packetType: PacketType, handler: (packet: any) => void) => {
      if (!messageHandlersRef.current.has(packetType)) {
        messageHandlersRef.current.set(packetType, []);
      }
      messageHandlersRef.current.get(packetType)!.push(handler);

      // Return unsubscribe function
      return () => {
        const handlers = messageHandlersRef.current.get(packetType) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      };
    },
    []
  );

  // ==================== DEBUG ====================

  const debugState = useCallback(() => {
    console.group("🔌 Connection Manager State");
    console.log("Connected:", connected);
    console.log("Connecting:", connecting);
    console.log("Error:", error);
    console.log("Room:", roomId);
    console.log("Node ID:", nodeIdRef.current);
    console.log("Speaker ID:", speakerIdRef.current);
    console.log("Sequence Number:", sequenceNumberRef.current);
    console.log("Using Mock Server:", useMockServer);
    console.log("Mock Server:", mockServerRef.current ? "Active" : "Inactive");
    console.groupEnd();
  }, [connected, connecting, error, roomId, useMockServer]);

  // ==================== PUBLIC API ====================

  return {
    // Connection state
    connected,
    connecting,
    error,

    // Identifiers
    nodeId: nodeIdRef.current,
    speakerId: speakerIdRef.current,
    roomId,

    // Methods
    sendPacket,
    subscribe,
    getSequenceNumber: () => ++sequenceNumberRef.current,

    // Debug
    debugState,

    // Info
    isMockMode: useMockServer,
  };
}
