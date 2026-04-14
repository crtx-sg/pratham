'use client';
import { useState, useRef } from 'react';

export default function VoiceButton({ onResult, lang = 'en' }) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef(null);

  const langMap = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };

  function toggle() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = langMap[lang] || 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      onResult(text);
      setRecording(false);
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);

    recRef.current = rec;
    rec.start();
    setRecording(true);
  }

  return (
    <button className={`voice-btn ${recording ? 'recording' : ''}`} onClick={toggle} type="button">
      🎤
    </button>
  );
}
