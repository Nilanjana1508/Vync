/**
 * Conference Context - Centralized state management
 * Manages room state, participant state, registration state
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  ConferenceState,
  SpeakerState,
  RegistrationState,
  PROTOCOL_VERSION,
} from "../shared/types";

interface ConferenceContextType {
  // State
  state: ConferenceState;

  // Room management
  joinRoom: (roomId: string, nodeId: string, userId: string) => void;
  leaveRoom: () => void;

  // Speaker management
  addSpeaker: (speakerId: string, nodeId: string) => void;
  updateSpeaker: (speakerId: string, updates: Partial<SpeakerState>) => void;
  removeSpeaker: (speakerId: string) => void;
  getSpeaker: (speakerId: string) => SpeakerState | undefined;
  getAllSpeakers: () => SpeakerState[];

  // Registration
  setRegistrationStatus: (speakerId: string, status: RegistrationState) => void;
  getRegistrationStatus: (speakerId: string) => RegistrationState;

  // Speaking state
  setIsSpeaking: (speakerId: string, speaking: boolean) => void;
  getIsSpeaking: (speakerId: string) => boolean;

  // Debug
  debugState: () => void;
}

const ConferenceContext = createContext<ConferenceContextType | undefined>(
  undefined
);

interface ConferenceProviderProps {
  children: React.ReactNode;
}

export function ConferenceProvider({ children }: ConferenceProviderProps) {
  const [state, setState] = useState<ConferenceState>({
    room_id: "",
    node_id: "",
    user_id: "",
    connected: false,
    registered: false,
    speakers: new Map(),
  });

  // ==================== ROOM MANAGEMENT ====================

  const joinRoom = useCallback(
    (roomId: string, nodeId: string, userId: string) => {
      setState((prev) => ({
        ...prev,
        room_id: roomId,
        node_id: nodeId,
        user_id: userId,
        connected: true,
      }));
    },
    []
  );

  const leaveRoom = useCallback(() => {
    setState((prev) => ({
      ...prev,
      room_id: "",
      node_id: "",
      user_id: "",
      connected: false,
      registered: false,
      speakers: new Map(),
    }));
  }, []);

  // ==================== SPEAKER MANAGEMENT ====================

  const addSpeaker = useCallback((speakerId: string, nodeId: string) => {
    setState((prev) => {
      const newSpeakers = new Map(prev.speakers);
      if (!newSpeakers.has(speakerId)) {
        newSpeakers.set(speakerId, {
          speaker_id: speakerId,
          node_id: nodeId,
          is_speaking: false,
          last_seen: Date.now(),
          registration_status: RegistrationState.IDLE,
        });
      }
      return { ...prev, speakers: newSpeakers };
    });
  }, []);

  const updateSpeaker = useCallback(
    (speakerId: string, updates: Partial<SpeakerState>) => {
      setState((prev) => {
        const newSpeakers = new Map(prev.speakers);
        const existing = newSpeakers.get(speakerId);
        if (existing) {
          newSpeakers.set(speakerId, { ...existing, ...updates });
        }
        return { ...prev, speakers: newSpeakers };
      });
    },
    []
  );

  const removeSpeaker = useCallback((speakerId: string) => {
    setState((prev) => {
      const newSpeakers = new Map(prev.speakers);
      newSpeakers.delete(speakerId);
      return { ...prev, speakers: newSpeakers };
    });
  }, []);

  const getSpeaker = useCallback(
    (speakerId: string): SpeakerState | undefined => {
      return state.speakers.get(speakerId);
    },
    [state.speakers]
  );

  const getAllSpeakers = useCallback((): SpeakerState[] => {
    return Array.from(state.speakers.values());
  }, [state.speakers]);

  // ==================== REGISTRATION ====================

  const setRegistrationStatus = useCallback(
    (speakerId: string, status: RegistrationState) => {
      updateSpeaker(speakerId, { registration_status: status });
    },
    [updateSpeaker]
  );

  const getRegistrationStatus = useCallback(
    (speakerId: string): RegistrationState => {
      return state.speakers.get(speakerId)?.registration_status ?? RegistrationState.IDLE;
    },
    [state.speakers]
  );

  // ==================== SPEAKING STATE ====================

  const setIsSpeaking = useCallback(
    (speakerId: string, speaking: boolean) => {
      updateSpeaker(speakerId, {
        is_speaking: speaking,
        last_seen: Date.now(),
      });
    },
    [updateSpeaker]
  );

  const getIsSpeaking = useCallback(
    (speakerId: string): boolean => {
      return state.speakers.get(speakerId)?.is_speaking ?? false;
    },
    [state.speakers]
  );

  // ==================== DEBUG ====================

  const debugState = useCallback(() => {
    console.group("Conference State Debug");
    console.log("Room:", state.room_id);
    console.log("Node:", state.node_id);
    console.log("User:", state.user_id);
    console.log("Connected:", state.connected);
    console.log("Registered:", state.registered);
    console.log("Speakers:", Array.from(state.speakers.entries()));
    console.groupEnd();
  }, [state]);

  const value: ConferenceContextType = {
    state,
    joinRoom,
    leaveRoom,
    addSpeaker,
    updateSpeaker,
    removeSpeaker,
    getSpeaker,
    getAllSpeakers,
    setRegistrationStatus,
    getRegistrationStatus,
    setIsSpeaking,
    getIsSpeaking,
    debugState,
  };

  return (
    <ConferenceContext.Provider value={value}>
      {children}
    </ConferenceContext.Provider>
  );
}

// ==================== HOOK ====================

export function useConference(): ConferenceContextType {
  const context = useContext(ConferenceContext);
  if (!context) {
    throw new Error("useConference must be used within ConferenceProvider");
  }
  return context;
}
