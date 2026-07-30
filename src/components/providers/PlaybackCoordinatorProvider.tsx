"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePlayerStore } from "@/stores/player-store";

export type PlaybackChannel = "track" | "showreel" | "clip";

interface PlaybackAdapter {
  pause: () => void;
}

interface PlaybackCoordinatorValue {
  foregroundPlayback: PlaybackChannel | null;
  claim: (channel: PlaybackChannel) => number;
  isCurrentClaim: (channel: PlaybackChannel, claimId: number) => boolean;
  registerAdapter: (channel: PlaybackChannel, adapter: PlaybackAdapter) => () => void;
  release: (channel: PlaybackChannel) => void;
}

const PlaybackCoordinatorContext = createContext<PlaybackCoordinatorValue | null>(null);

export function usePlaybackCoordinator() {
  const context = useContext(PlaybackCoordinatorContext);
  if (!context) {
    throw new Error("usePlaybackCoordinator must be used inside PlaybackCoordinatorProvider");
  }
  return context;
}

export function PlaybackCoordinatorProvider({ children }: { children: ReactNode }) {
  const adaptersRef = useRef(new Map<PlaybackChannel, PlaybackAdapter>());
  const claimIdRef = useRef(0);
  const foregroundRef = useRef<PlaybackChannel | null>(null);
  const [foregroundPlayback, setForegroundPlayback] = useState<PlaybackChannel | null>(null);

  const setForeground = useCallback((channel: PlaybackChannel | null) => {
    foregroundRef.current = channel;
    setForegroundPlayback(channel);
  }, []);

  const claim = useCallback((channel: PlaybackChannel) => {
    claimIdRef.current += 1;
    const claimId = claimIdRef.current;

    for (const [registeredChannel, adapter] of adaptersRef.current) {
      if (registeredChannel !== channel) adapter.pause();
    }

    setForeground(channel);
    return claimId;
  }, [setForeground]);

  const isCurrentClaim = useCallback((channel: PlaybackChannel, claimId: number) => (
    foregroundRef.current === channel && claimIdRef.current === claimId
  ), []);

  const registerAdapter = useCallback((channel: PlaybackChannel, adapter: PlaybackAdapter) => {
    adaptersRef.current.set(channel, adapter);
    return () => {
      if (adaptersRef.current.get(channel) === adapter) adaptersRef.current.delete(channel);
    };
  }, []);

  const release = useCallback((channel: PlaybackChannel) => {
    if (foregroundRef.current !== channel) return;
    claimIdRef.current += 1;
    setForeground(null);
  }, [setForeground]);

  useEffect(() => {
    const adapters = adaptersRef.current;
    const trackAdapter: PlaybackAdapter = {
      pause: () => usePlayerStore.getState().pause(),
    };
    adapters.set("track", trackAdapter);

    const unsubscribe = usePlayerStore.subscribe((state, previousState) => {
      if (state.isPlaying && !previousState.isPlaying) claim("track");
    });

    return () => {
      unsubscribe();
      if (adapters.get("track") === trackAdapter) adapters.delete("track");
    };
  }, [claim]);

  const value = useMemo<PlaybackCoordinatorValue>(() => ({
    foregroundPlayback,
    claim,
    isCurrentClaim,
    registerAdapter,
    release,
  }), [claim, foregroundPlayback, isCurrentClaim, registerAdapter, release]);

  return (
    <PlaybackCoordinatorContext.Provider value={value}>
      {children}
    </PlaybackCoordinatorContext.Provider>
  );
}
