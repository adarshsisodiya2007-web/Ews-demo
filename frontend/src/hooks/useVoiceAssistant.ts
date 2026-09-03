/**
 * useVoiceAssistant Hook — Multilingual Voice Alerts & Speech-to-Text
 * Uses Web Speech API (SpeechSynthesis + SpeechRecognition)
 * Supports English, Hindi, and Regional Dialects
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceAssistantProps {
  lang: 'en' | 'hi' | 'as';
}

export const useVoiceAssistant = (lang: 'en' | 'hi' | 'as' = 'en') => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
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
      } else {
        setVoiceSupported(false);
      }
    }
  }, [lang]);

  // Text-to-Speech voice alert
  const speakAlert = useCallback((zoneName: string, level: string, actionProtocol: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop prior speech

    let message = '';
    let voiceLang = 'en-IN';

    if (lang === 'hi') {
      voiceLang = 'hi-IN';
      if (level === 'RED') {
        message = `चेतावनी! ${zoneName} में गंभीर भूस्खलन का खतरा है। तत्काल निकासी के निर्देश दिए गए हैं। कृपया सुरक्षित मार्ग से निकलें।`;
      } else if (level === 'AMBER') {
        message = `ध्यान दें! ${zoneName} में भूस्खलन की पूर्व चेतावनी जारी की गई है। सतर्क रहें।`;
      } else {
        message = `${zoneName} में स्थिति सामान्य और सुरक्षित है।`;
      }
    } else if (lang === 'as') {
      voiceLang = 'as-IN';
      message = `জৰুৰী সতৰ্কবাৰ্তা! ${zoneName}ত ভূমিস্খলনৰ আশংকা। অনুগ্ৰহ কৰি সুৰক্ষিত স্থানলৈ যাওক।`;
    } else {
      voiceLang = 'en-US';
      if (level === 'RED') {
        message = `Warning! Critical landslide alert in ${zoneName}. Immediate evacuation required. Protocol: ${actionProtocol}`;
      } else if (level === 'AMBER') {
        message = `Advisory alert in ${zoneName}. Elevated risk detected. Prepare for possible evacuation.`;
      } else {
        message = `Normal conditions monitored in ${zoneName}.`;
      }
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
        recognitionRef.current.start();
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return {
    isSpeaking,
    isListening,
    transcript,
    voiceSupported,
    speakAlert,
    stopSpeaking,
    startListening,
    stopListening
  };
};
