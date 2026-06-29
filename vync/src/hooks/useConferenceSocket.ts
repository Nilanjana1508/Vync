/**
 * WebSocket Connection Hook for Semantic Conferencing
 * Manages direct connection to FastAPI backend
 * Handles reconnection, heartbeat, and packet routing
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { Packet, PacketType, AnyPacket } from "../shared/types";
import { serializePacket, deserializePacket } from "../shared/serializers";
import { validatePacket } from "../shared/validators";

interface WebSocketConfig {
  serverUrl: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessageTime: number;
}

type PacketHandler = (packet: AnyPacket) => void;

export function useConferenceSocket(config: WebSocketConfig) {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessageTime: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef<Map<PacketType, Set<PacketHandler>>>(new Map());
  const messageQueueRef = useRef<Packet<any>[]>([]);

  const {
    serverUrl,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    heartbeatInterval = 30000,
  } = config;

  // ==================== CONNECTION ====================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState((prev) => ({ ...prev, connecting: true }));

    try {
      const ws = new WebSocket(serverUrl);

      ws.onopen = () => {
        reconnectCountRef.current = 0;
        setState((prev) => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
        }));

        // Flush queued messages
        while (messageQueueRef.current.length > 0) {
          const packet = messageQueueRef.current.shift();
          if (packet) {
            ws.send(serializePacket(packet));
          }
        }

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const packet = deserializePacket<any>(event.data);
          const validation = validatePacket(packet);

          if (!validation.valid) {
            console.error(
              "Invalid packet received:",
              validation.errors.join(", ")
            );
            return;
          }

          setState((prev) => ({
            ...prev,
            lastMessageTime: Date.now(),
          }));

          // Route packet to handlers
          const handlers = handlersRef.current.get(packet.metadata.packet_type);
          if (handlers) {
            handlers.forEach((handler) => {
              try {
                handler(packet);
              } catch (err) {
                console.error("Packet handler error:", err);
              }
            });
          }
        } catch (err) {
          console.error("Failed to process received message:", err);
        }
      };

      ws.onerror = (error) => {
        setState((prev) => ({
          ...prev,
          error: "WebSocket error occurred",
        }));
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        stopHeartbeat();
        setState((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
        }));

        // Attempt reconnection
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectCountRef.current);
        } else {
          setState((prev) => ({
            ...prev,
            error: "Failed to connect after multiple attempts",
          }));
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        connecting: false,
        error: `Connection failed: ${err}`,
      }));
      console.error("WebSocket connection error:", err);
    }
  }, [serverUrl, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    stopHeartbeat();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState({
      connected: false,
      connecting: false,
      error: null,
      lastMessageTime: 0,
    });
  }, []);

  // ==================== SEND ====================

  const sendPacket = useCallback((packet: Packet<any>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      messageQueueRef.current.push(packet);
      return;
    }

    try {
      const serialized = serializePacket(packet);
      wsRef.current.send(serialized);
    } catch (err) {
      console.error("Failed to send packet:", err);
      messageQueueRef.current.push(packet);
    }
  }, []);

  // ==================== HANDLERS ====================

  const subscribe = useCallback(
    (packetType: PacketType, handler: PacketHandler) => {
      if (!handlersRef.current.has(packetType)) {
        handlersRef.current.set(packetType, new Set());
      }
      handlersRef.current.get(packetType)!.add(handler);

      return () => {
        handlersRef.current.get(packetType)?.delete(handler);
      };
    },
    []
  );

  // ==================== HEARTBEAT ====================

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - state.lastMessageTime > heartbeatInterval) {
          // Send ping to keep connection alive
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, state.lastMessageTime]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    // State
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    lastMessageTime: state.lastMessageTime,

    // Methods
    sendPacket,
    subscribe,
    disconnect,
    reconnect: connect,

    // Debug
    getQueueSize: () => messageQueueRef.current.length,
    getHandlerCount: () =>
      Array.from(handlersRef.current.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
  };
}
