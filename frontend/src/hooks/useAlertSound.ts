/**
 * useAlertSound — Emergency Siren with Platform-Specific Sound Selection
 * 
 * - ANDROID APP (Capacitor): Uses official SATARK alarm.mp3 (/assets/audio/alarm.mp3)
 * - WEBSITE / BROWSER: Uses existing Web Audio API oscillator sweeping frequency siren
 * 
 * SIH 2026 EWS-NER
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { isCapacitorAndroid } from '../utils/platform';

const ALARM_AUDIO_PATH = '/assets/audio/alarm.mp3';

export function useAlertSound() {
  // Android native audio ref (loaded ONLY on Android/Capacitor)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio API refs for website siren
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  // ── 1. Android Audio Element (ONLY loaded/instantiated on Android/Capacitor) ──
  const getAudioElement = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio(ALARM_AUDIO_PATH);
      audio.loop = true;
      audio.preload = 'auto';

      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));

      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  // ── 2. Web Audio API Context (Used by website siren & warning beeps) ──
  const getContext = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Unlock AudioContext on first user interaction to comply with browser autoplay policies
  useEffect(() => {
    const unlockAudio = () => {
      if (ctxRef.current && ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // ── 3. Platform-Specific Play Logic ──
  const playCriticalSirenAndroid = useCallback(() => {
    try {
      const audio = getAudioElement();
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('[useAlertSound:Android] Playback error on alarm.mp3:', err);
          });
      }
    } catch (e) {
      console.error('[useAlertSound:Android] Error playing alarm.mp3:', e);
    }
  }, [getAudioElement]);

  const playCriticalSirenWeb = useCallback(() => {
    try {
      const ctx = getContext();

      // Stop existing siren oscillator
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

      // Create sweeping siren effect (600Hz - 1100Hz sawtooth)
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
    } catch (e) {
      console.warn('[useAlertSound:Web] Error playing web oscillator siren:', e);
    }
  }, [getContext]);

  // Master Play: Android uses alarm.mp3; Website uses original Web Audio siren
  const playCriticalSiren = useCallback(() => {
    if (isCapacitorAndroid()) {
      playCriticalSirenAndroid();
    } else {
      playCriticalSirenWeb();
    }
  }, [playCriticalSirenAndroid, playCriticalSirenWeb]);

  // ── 4. Stop Logic (Safely stops both platforms) ──
  const stopSiren = useCallback(() => {
    // Stop Android audio if initialized
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {
        console.warn('[useAlertSound] Error pausing Android audio siren:', e);
      }
    }

    // Stop Web Audio oscillator & sweep interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sourceRef.current) {
      try {
        if (gainRef.current && ctxRef.current) {
          gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.3);
        }
        setTimeout(() => {
          try { sourceRef.current?.stop(); } catch {}
          sourceRef.current = null;
        }, 350);
      } catch {}
    }

    setIsPlaying(false);
  }, []);

  // ── 5. Warning Beep (Shared chirp) ──
  const playWarningBeep = useCallback(() => {
    try {
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
    } catch (e) {
      console.warn('[useAlertSound] Error playing warning beep:', e);
    }
  }, [getContext]);

  // ── 6. Cleanup on Unmount ──
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch {}
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch {}
        sourceRef.current = null;
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        try {
          ctxRef.current.close();
        } catch {}
      }
    };
  }, []);

  return { playCriticalSiren, playWarningBeep, stopSiren, isPlaying };
}

