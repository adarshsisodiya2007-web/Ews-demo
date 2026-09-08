/**
 * useAlertSound — Emergency Siren using official SATARK alarm.mp3
 * Plays /assets/audio/alarm.mp3 with seamless looping and audio cleanup
 * SIH 2026 EWS-NER
 */
import { useRef, useCallback, useState, useEffect } from 'react';

const ALARM_AUDIO_PATH = '/assets/audio/alarm.mp3';

export function useAlertSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize or get the audio element
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
            console.warn('[useAlertSound] Autoplay or playback error on alarm.mp3:', err);
          });
      }
    } catch (e) {
      console.error('[useAlertSound] Error playing alarm.mp3:', e);
    }
  }, [getAudioElement]);

  const stopSiren = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {
        console.warn('[useAlertSound] Error pausing siren:', e);
      }
    }
    setIsPlaying(false);
  }, []);

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

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch {}
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

