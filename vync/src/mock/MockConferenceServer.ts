/**
 * Mock WebSocket Server for Frontend Testing
 * Simulates FastAPI backend without needing actual server
 * Run this to test frontend in isolation
 */

import { PacketType } from "./shared/types";

interface MockPacket {
  type: PacketType;
  sequence_number: number;
  [key: string]: any;
}

export class MockConferenceServer {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<
    PacketType,
    ((packet: MockPacket) => void)[]
  > = new Map();
  private sequenceCounter = 0;

  constructor(private url: string) {}

  /**
   * Connect to mock server (doesn't need actual backend)
   */
  connect(): Promise<void> {
    return new Promise((resolve) => {
      // Simulate connection delay
      setTimeout(() => {
        console.log("[Mock Server] Connected");

        // Send JOIN ACK
        const ackPacket: MockPacket = {
          type: PacketType.ACK,
          sequence_number: ++this.sequenceCounter,
          node_id: `node-${Math.random().toString(36).substr(2, 9)}`,
          speaker_id: `speaker-${Math.random().toString(36).substr(2, 9)}`,
          message: "JOIN accepted",
        };

        this.triggerHandler(PacketType.ACK, ackPacket);
        resolve();
      }, 500);
    });
  }

  /**
   * Mock send - just log the packet
   */
  send(packet: MockPacket): void {
    console.log("[Mock Server] Received packet:", packet.type, packet);

    // Simulate server responses
    switch (packet.type) {
      case PacketType.START:
        this.simulateStartResponse(packet);
        break;
      case PacketType.SNAPSHOT:
        this.simulateSnapshotResponse(packet);
        break;
      case PacketType.COMPLETE:
        this.simulateCompleteResponse(packet);
        break;
      case PacketType.SEMANTIC:
        this.simulateSemanticResponse(packet);
        break;
      case PacketType.PING:
        this.simulatePongResponse(packet);
        break;
    }
  }

  /**
   * Simulate START response
   */
  private simulateStartResponse(packet: MockPacket): void {
    setTimeout(() => {
      const ack: MockPacket = {
        type: PacketType.ACK,
        sequence_number: ++this.sequenceCounter,
        ack_sequence: packet.sequence_number,
        message: "START registered",
      };
      this.triggerHandler(PacketType.ACK, ack);
      console.log("[Mock Server] START ACK sent");
    }, 300);
  }

  /**
   * Simulate SNAPSHOT response
   */
  private simulateSnapshotResponse(packet: MockPacket): void {
    setTimeout(() => {
      const ack: MockPacket = {
        type: PacketType.ACK,
        sequence_number: ++this.sequenceCounter,
        ack_sequence: packet.sequence_number,
        message: `Snapshot ${packet.frame_index} stored`,
      };
      this.triggerHandler(PacketType.ACK, ack);
      console.log(
        `[Mock Server] SNAPSHOT #${packet.frame_index} ACK sent`
      );
    }, 200);
  }

  /**
   * Simulate COMPLETE response
   */
  private simulateCompleteResponse(packet: MockPacket): void {
    setTimeout(() => {
      const ack: MockPacket = {
        type: PacketType.ACK,
        sequence_number: ++this.sequenceCounter,
        ack_sequence: packet.sequence_number,
        message: "Registration complete",
        registration_id: `reg-${Math.random().toString(36).substr(2, 9)}`,
      };
      this.triggerHandler(PacketType.ACK, ack);
      console.log("[Mock Server] COMPLETE ACK sent");
    }, 300);
  }

  /**
   * Simulate SEMANTIC response
   */
  private simulateSemanticResponse(packet: MockPacket): void {
    // Usually no response for SEMANTIC packets
    // But log for debugging
    console.log("[Mock Server] SEMANTIC data received and processed");
  }

  /**
   * Simulate PING/PONG keepalive
   */
  private simulatePongResponse(packet: MockPacket): void {
    setTimeout(() => {
      const pong: MockPacket = {
        type: PacketType.PONG,
        sequence_number: ++this.sequenceCounter,
      };
      this.triggerHandler(PacketType.PONG, pong);
    }, 50);
  }

  /**
   * Subscribe to packet type
   */
  subscribe(
    type: PacketType,
    handler: (packet: MockPacket) => void
  ): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Trigger all handlers for a packet type
   */
  private triggerHandler(type: PacketType, packet: MockPacket): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach((handler) => handler(packet));
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    console.log("[Mock Server] Disconnected");
  }
}

/**
 * Hook version for React components
 */
export function useMockServer(serverUrl: string) {
  const server = new MockConferenceServer(serverUrl);

  const connect = async () => {
    await server.connect();
  };

  const send = (packet: MockPacket) => {
    server.send(packet);
  };

  const subscribe = (
    type: PacketType,
    handler: (packet: MockPacket) => void
  ) => {
    server.subscribe(type, handler);
  };

  return {
    connect,
    send,
    subscribe,
    disconnect: () => server.disconnect(),
  };
}
