import { useState, useEffect, useRef } from 'react';

export default function VoiceSearchButton({ onResult, placeholder = 'Búsqueda por voz' }) {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(true);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-AR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript && onResult) {
                onResult(transcript);
            }
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            try {
                recognition.abort();
            } catch (_) {}
        };
    }, [onResult]);

    const toggleListening = () => {
        if (!supported) {
            alert('La búsqueda por voz no está disponible en este navegador. Probá con Google Chrome o Microsoft Edge.');
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current?.stop();
            } catch (_) {}
            setIsListening(false);
        } else {
            try {
                recognitionRef.current?.start();
            } catch (err) {
                console.warn('Speech recognition start error:', err);
            }
        }
    };

    return (
        <button
            type="button"
            className={`btn-voice ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Escuchando... hacé clic para detener' : placeholder}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: isListening ? '#FEE2E2' : 'transparent',
                color: isListening ? '#DC2626' : 'var(--color-text-muted)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
            }}
        >
            {isListening ? (
                <span style={{ fontSize: 16 }}>🔴</span>
            ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
            )}
        </button>
    );
}
