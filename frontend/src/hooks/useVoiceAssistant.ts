/**
 * useVoiceAssistant Hook — Multilingual Voice Alerts & Speech-to-Text
 * Enhanced with dual-engine fallback for Android WebView / Capacitor:
 * Engine A: Web Speech API (SpeechSynthesis)
 * Engine B: HTML5 Audio streaming fallback (guarantees audible speech on Android)
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export const useVoiceAssistant = (lang: 'en' | 'hi' | 'as' = 'en') => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const [audioError, setAudioError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const voicesLoadedRef = useRef<boolean>(false);

  // Pre-load voices for SpeechSynthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          voicesLoadedRef.current = true;
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Initialize SpeechRecognition if present
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'as' ? 'as-IN' : 'en-IN';

          recognition.onstart = () => setIsListening(true);
          recognition.onend = () => setIsListening(false);
          recognition.onerror = () => setIsListening(false);
          recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setIsListening(false);
          };
          recognitionRef.current = recognition;
        } catch {
          // Ignore recognition init failure
        }
      } else {
        setVoiceSupported(false);
      }
    }

    return () => {
      // Cleanup on unmount
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [lang]);

  // Halt all active audio/speech
  const stopSpeaking = useCallback(() => {
    // 1. Check Native Android TTS Bridge
    if (typeof window !== 'undefined' && (window as any).AndroidTTS) {
      try {
        (window as any).AndroidTTS.stop();
      } catch (e) {
        console.warn('Native AndroidTTS stop error:', e);
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // HTML5 Audio TTS Fallback
  const playAudioFallback = useCallback((text: string, targetLang: string) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Map language code for translate_tts
      const tl = targetLang.startsWith('hi') ? 'hi' : targetLang.startsWith('as') ? 'hi' : 'en';
      const cleanText = text.replace(/[#*_`]/g, '').slice(0, 180);
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(cleanText)}`;

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setAudioError(null);
      };
      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        setAudioError('Audio playback failed');
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('HTML5 Audio play caught:', err);
          setIsSpeaking(false);
        });
      }
    } catch (e: any) {
      console.warn('Fallback TTS audio failed:', e);
      setIsSpeaking(false);
      setAudioError(e?.message || 'Audio error');
    }
  }, []);

  // Speak raw text
  const speakText = useCallback((text: string, langCode?: string) => {
    if (typeof window === 'undefined') return;

    stopSpeaking();
    setAudioError(null);

    const targetLang = langCode || (lang === 'hi' ? 'hi-IN' : lang === 'as' ? 'hi-IN' : 'en-US');

    // 1. Check Native Android TTS Bridge (Direct Android hardware speech)
    if ((window as any).AndroidTTS && typeof (window as any).AndroidTTS.speak === 'function') {
      try {
        (window as any).AndroidTTS.speak(text, targetLang);
        setIsSpeaking(true);
        // Watch for speaking completion on Android bridge
        const checkInterval = setInterval(() => {
          if ((window as any).AndroidTTS && !(window as any).AndroidTTS.isSpeaking()) {
            clearInterval(checkInterval);
            setIsSpeaking(false);
          }
        }, 500);
        setTimeout(() => clearInterval(checkInterval), 15000); // 15s max safety
        return;
      } catch (nativeErr) {
        console.warn('Native AndroidTTS call failed, falling back to Web Speech:', nativeErr);
      }
    }

    // 2. Try SpeechSynthesis (Web Speech API)
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Try to match available voice
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const matched = voices.find(v => v.lang.startsWith(targetLang.slice(0, 2)));
          if (matched) utterance.voice = matched;
        }

        let hasStarted = false;
        utterance.onstart = () => {
          hasStarted = true;
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error, switching to Audio fallback:', e);
          setIsSpeaking(false);
          // Fallback to HTML5 Audio TTS
          playAudioFallback(text, targetLang);
        };

        window.speechSynthesis.speak(utterance);

        // Watchdog: if SpeechSynthesis fails to start within 700ms, use fallback
        setTimeout(() => {
          if (!hasStarted && window.speechSynthesis.speaking === false) {
            window.speechSynthesis.cancel();
            playAudioFallback(text, targetLang);
          }
        }, 700);

        return;
      } catch (err) {
        console.warn('SpeechSynthesis exception, using fallback:', err);
      }
    }

    // 3. Direct fallback if no SpeechSynthesis
    playAudioFallback(text, targetLang);
  }, [lang, stopSpeaking, playAudioFallback]);

  // Text-to-Speech regional voice alert
  const speakAlert = useCallback((zoneName: string, level: string, actionProtocol: string) => {
    let message = '';
    let voiceLang = 'en-US';

    if (lang === 'hi') {
      voiceLang = 'hi-IN';
      if (level === 'RED') {
        message = `चेतावनी! ${zoneName} में गंभीर भूस्खलन का खतरा है। तत्काल सुरक्षित स्थान पर जाएं। निर्देश: ${actionProtocol || 'तुरंत खाली करें।'}`;
      } else if (level === 'AMBER') {
        message = `सतर्कता सूचना! ${zoneName} में भूस्खलन की संभावना है। तैयार रहें। निर्देश: ${actionProtocol || 'सतर्क रहें।'}`;
      } else {
        message = `${zoneName} में स्थिति सामान्य और सुरक्षित है। नियमित निगरानी जारी है।`;
      }
    } else if (lang === 'as') {
      voiceLang = 'hi-IN'; // Fallback to Indian accent
      if (level === 'RED') {
        message = `জরুরী সতৰ্কবাৰ্তা! ${zoneName}ত ভূমিস্খলনৰ আশংকা। অনুগ্ৰহ কৰি সুৰক্ষিত স্থানলৈ যাওক।`;
      } else if (level === 'AMBER') {
        message = `সতৰ্কতা! ${zoneName}ত ভূমিস্খলনৰ পূৰ্ব সতৰ্কবাৰ্তা।`;
      } else {
        message = `${zoneName}ত পৰিস্থিতি স্বাভাৱিক আৰু সুৰক্ষিত।`;
      }
    } else {
      voiceLang = 'en-US';
      if (level === 'RED') {
        message = `Warning! Critical landslide alert in ${zoneName}. Immediate evacuation required. Protocol: ${actionProtocol || 'Evacuate to designated shelters.'}`;
      } else if (level === 'AMBER') {
        message = `Advisory alert in ${zoneName}. Elevated landslide risk detected. Protocol: ${actionProtocol || 'Stay alert and prepare for evacuation.'}`;
      } else {
        message = `Normal conditions monitored in ${zoneName}. Regional slopes are currently stable.`;
      }
    }

    speakText(message, voiceLang);
  }, [lang, speakText]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.start();
        } catch {}
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
  }, []);

  return {
    isSpeaking,
    isListening,
    transcript,
    voiceSupported,
    audioError,
    speakAlert,
    speakText,
    stopSpeaking,
    startListening,
    stopListening
  };
};
