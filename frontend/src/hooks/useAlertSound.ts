/**
 * useAlertSound — Emergency Siren using Web Audio API
 * No external audio files needed — generates siren programmatically
 * SIH 2026 EWS-NER
 */
import { useRef, useCallback, useState } from 'react';

export function useAlertSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getContext = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playCriticalSiren = useCallback(() => {
    const ctx = getContext();

    // Stop existing siren
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.connect(ctx.destination);
    gainRef.current = gainNode;

    let rising = true;

    // Create sweeping siren effect
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.connect(gainNode);
    osc.start();
    sourceRef.current = osc;

    // Sweep frequency up/down for siren effect
    intervalRef.current = window.setInterval(() => {
      if (!sourceRef.current) return;
      const now = ctxRef.current!.currentTime;
      if (rising) {
        sourceRef.current.frequency.linearRampToValueAtTime(1100, now + 0.8);
      } else {
        sourceRef.current.frequency.linearRampToValueAtTime(600, now + 0.8);
      }
      rising = !rising;
    }, 900);

    setIsPlaying(true);
  }, [getContext]);

  const playWarningBeep = useCallback(() => {
    const ctx = getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }, [getContext]);

  const stopSiren = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sourceRef.current) {
      try {
        if (gainRef.current) {
          gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current!.currentTime + 0.3);
        }
        setTimeout(() => {
          try { sourceRef.current?.stop(); } catch {}
          sourceRef.current = null;
        }, 350);
      } catch {}
    }
    setIsPlaying(false);
  }, []);

  return { playCriticalSiren, playWarningBeep, stopSiren, isPlaying };
}
