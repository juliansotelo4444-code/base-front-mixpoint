import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
    IconBot, IconMicrofono, IconMicrofonoOff, IconClose,
    IconBuscar, IconCheck, IconAlerta, IconCopy
} from './Icons';

export default function JarvisWidget() {
    const [abierto, setAbierto] = useState(false);
    const [mensajes, setMensajes] = useState([
        {
            remitente: 'jarvis',
            texto: '¡Buen día! Soy J.A.R.V.I.S., su asistente de inteligencia operativa en Mix Point. Todos los subsistemas están en línea. Puede hablarme por voz o consultarme sobre stock en depósito, alertas FEFO, finanzas, armado de mixes o clientes.'
        }
    ]);
    const [inputTexto, setInputTexto] = useState('');
    const [escuchando, setEscuchando] = useState(false);
    const [hablando, setHablando] = useState(false);
    const [vozHabilitada, setVozHabilitada] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [modoCompacto, setModoCompacto] = useState(false);
    const [audioFrecuencia, setAudioFrecuencia] = useState([12, 24, 18, 30, 20, 15]);

    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);
    const waveIntervalRef = useRef(null);
    const navigate = useNavigate();

    // Simulación de ondas dinámicas cuando Jarvis habla o escucha
    useEffect(() => {
        if (hablando || escuchando) {
            waveIntervalRef.current = setInterval(() => {
                setAudioFrecuencia([
                    Math.floor(Math.random() * 22) + 8,
                    Math.floor(Math.random() * 32) + 12,
                    Math.floor(Math.random() * 40) + 15,
                    Math.floor(Math.random() * 34) + 10,
                    Math.floor(Math.random() * 26) + 8,
                    Math.floor(Math.random() * 18) + 6
                ]);
            }, 120);
        } else {
            if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
            setAudioFrecuencia([6, 10, 8, 12, 9, 6]);
        }
        return () => {
            if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
        };
    }, [hablando, escuchando]);

    // Inicializar Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'es-AR';

            recognition.onstart = () => setEscuchando(true);
            recognition.onend = () => setEscuchando(false);
            recognition.onerror = (e) => {
                console.warn('Speech recognition error:', e.error);
                setEscuchando(false);
            };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript && transcript.trim()) {
                    setInputTexto(transcript);
                    enviarMensaje(transcript);
                }
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // Auto-scroll al final del chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [mensajes, cargando]);

    // Síntesis de voz (Text-to-Speech)
    function hablarTexto(texto) {
        if (!vozHabilitada || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            // Limpiar emojis o caracteres raros para pronunciación fluida
            const textoLimpio = texto
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
                .replace(/[*#_~]/g, '');

            const utterance = new SpeechSynthesisUtterance(textoLimpio);
            utterance.lang = 'es-AR';
            utterance.rate = 1.06;
            utterance.pitch = 0.98; // Tono ligeramente más grave y distinguido

            const voces = window.speechSynthesis.getVoices();
            // Buscar voz en español argentina o neutra
            const vozEsp = voces.find(v => v.lang === 'es-AR') ||
                           voces.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Castilian')));
            if (vozEsp) utterance.voice = vozEsp;

            utterance.onstart = () => setHablando(true);
            utterance.onend = () => setHablando(false);
            utterance.onerror = () => setHablando(false);

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.warn('Error en síntesis de voz:', err);
            setHablando(false);
        }
    }

    function toggleEscucha() {
        if (!recognitionRef.current) {
            alert('El reconocimiento por voz no está disponible en este navegador. Podés tipear tus preguntas.');
            return;
        }
        if (escuchando) {
            recognitionRef.current.stop();
        } else {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            setHablando(false);
            recognitionRef.current.start();
        }
    }

    async function enviarMensaje(textoAEnviar = null) {
        const query = (textoAEnviar || inputTexto).trim();
        if (!query) return;

        setInputTexto('');
        setMensajes(prev => [...prev, { remitente: 'usuario', texto: query }]);
        setCargando(true);

        try {
            const data = await api.post('/jarvis/chat', { mensaje: query });
            const respuestaJarvis = data.respuesta || 'Operación procesada, señor.';

            setMensajes(prev => [...prev, {
                remitente: 'jarvis',
                texto: respuestaJarvis,
                datos: data.datos,
                accion_sugerida: data.accion_sugerida
            }]);

            hablarTexto(respuestaJarvis);
        } catch (err) {
            const errMsg = 'Disculpe, señor. Hubo una interferencia al consultar los datos del servidor.';
            setMensajes(prev => [...prev, { remitente: 'jarvis', texto: errMsg }]);
            hablarTexto(errMsg);
        } finally {
            setCargando(false);
        }
    }

    function ejecutarAccion(accion) {
        if (!accion) return;
        setAbierto(false);
        if (accion.includes('Remitos')) navigate('/remitos');
        else if (accion.includes('Producción') || accion.includes('Insumos')) navigate('/produccion');
        else if (accion.includes('Cuentas Corrientes') || accion.includes('Clientes')) navigate('/clientes');
        else if (accion.includes('Inventario') || accion.includes('Stock')) navigate('/productos');
        else if (accion.includes('Depósito') || accion.includes('Kanban')) navigate('/deposito-kanban');
        else if (accion.includes('Reportes')) navigate('/reportes-diarios');
    }

    const sugerenciasRapidas = [
        'Resumen de ventas de hoy',
        '¿Cuánto stock tenemos de almendras?',
        '¿Quiénes son los mejores clientes?',
        '¿Quién nos debe más dinero?',
        '¿Hay remitos pendientes en depósito?',
        '¿Podemos elaborar 50 kg de mix?',
        'Predicción de quiebre de stock'
    ];

    return (
        <>
            {/* BOTÓN FLOTANTE TRIGGER CON NÚCLEO REACTIVO */}
            <div className="jarvis-fab-wrapper no-print">
                <button
                    type="button"
                    onClick={() => setAbierto(!abierto)}
                    title="J.A.R.V.I.S. • Asistente Inteligente Mix Point"
                    style={{
                        width: 58,
                        height: 58,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #1a2234 0%, #0c101a 100%)',
                        border: '2px solid rgba(245, 158, 11, 0.5)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.35)',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: abierto ? 'scale(0.92)' : 'scale(1)'
                    }}
                >
                    {/* Anillo orbital exterior giratorio */}
                    <div style={{
                        position: 'absolute',
                        inset: -5,
                        borderRadius: '50%',
                        border: '2px dashed rgba(245, 158, 11, 0.4)',
                        animation: 'jarvisOrbRotate 8s linear infinite',
                        pointerEvents: 'none'
                    }} />

                    {/* Núcleo central brillante */}
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #fbbf24 0%, #d97706 70%, #78350f 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f131d',
                        boxShadow: '0 0 16px rgba(245, 158, 11, 0.8), inset 0 0 8px #fff'
                    }}>
                        <IconBot style={{ width: 18, height: 18 }} />
                    </div>

                    {/* Indicador de estado */}
                    <span style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: hablando ? '#f59e0b' : (escuchando ? '#ef4444' : '#10b981'),
                        border: '2px solid #0f131d',
                        boxShadow: '0 0 8px currentColor'
                    }} />
                </button>
            </div>

            {/* PANEL PRINCIPAL DE JARVIS */}
            {abierto && (
                <div className="jarvis-modal no-print">
                    {/* CABECERA CON NÚCLEO HOLOGRÁFICO "ARC REACTOR" */}
                    <div style={{
                        padding: '16px 18px',
                        background: 'linear-gradient(180deg, rgba(26, 34, 52, 0.95) 0%, rgba(15, 19, 29, 0.95) 100%)',
                        borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2, position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                {/* NÚCLEO REDONDO ANIMADO INTERACTIVO */}
                                <div
                                    className={`jarvis-arc-reactor ${hablando ? 'jarvis-orb-speaking' : ''} ${escuchando ? 'jarvis-orb-listening' : ''}`}
                                    onClick={toggleEscucha}
                                    title={escuchando ? 'Click para detener escucha' : 'Click para hablar'}
                                    style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: '50%',
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: 'radial-gradient(circle, #1e293b 0%, #0a0e17 100%)',
                                        boxShadow: hablando
                                            ? '0 0 25px rgba(245, 158, 11, 0.7), inset 0 0 15px rgba(245, 158, 11, 0.5)'
                                            : (escuchando ? '0 0 30px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(239, 68, 68, 0.6)' : '0 0 15px rgba(201, 162, 39, 0.3)'),
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {/* Anillo exterior orbitante */}
                                    <div className="jarvis-ring-outer" style={{
                                        position: 'absolute',
                                        inset: -3,
                                        borderRadius: '50%',
                                        border: '2px dashed #C9A227',
                                        animation: 'jarvisOrbRotate 6s linear infinite'
                                    }} />

                                    {/* Anillo concéntrico interior */}
                                    <div className="jarvis-ring-inner" style={{
                                        position: 'absolute',
                                        inset: 3,
                                        borderRadius: '50%',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderTopColor: '#f59e0b',
                                        borderBottomColor: '#f59e0b',
                                        animation: 'jarvisOrbRotateReverse 3s linear infinite'
                                    }} />

                                    {/* Centro del núcleo que pulsa al hablar */}
                                    <div className="jarvis-core-center" style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        background: escuchando
                                            ? 'radial-gradient(circle, #ef4444 0%, #991b1b 100%)'
                                            : 'radial-gradient(circle, #fde047 0%, #f59e0b 60%, #b45309 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 0 18px rgba(245, 158, 11, 0.9), inset 0 0 6px #fff',
                                        animation: hablando ? 'jarvisPulseCore 0.7s infinite alternate' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {escuchando ? (
                                            <IconMicrofono style={{ width: 14, height: 14, color: '#fff' }} />
                                        ) : (
                                            <div style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                boxShadow: '0 0 6px #fff'
                                            }} />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div style={{
                                        fontWeight: 800,
                                        fontSize: 15,
                                        letterSpacing: '0.04em',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        <span>J.A.R.V.I.S.</span>
                                        <span style={{
                                            fontSize: 9.5,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: 'rgba(245, 158, 11, 0.2)',
                                            color: '#f59e0b',
                                            border: '1px solid rgba(245, 158, 11, 0.4)',
                                            letterSpacing: '0.08em'
                                        }}>
                                            AI MK-III
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: '50%',
                                            background: hablando ? '#f59e0b' : (escuchando ? '#ef4444' : '#10b981'),
                                            boxShadow: '0 0 8px currentColor'
                                        }} />
                                        <span>
                                            {hablando ? 'Transmitiendo respuesta...' : (escuchando ? 'Escuchando su voz...' : 'Sistemas operativos online')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CONTROLES DEL HEADER */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {/* Botón silenciar/activar voz */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (hablando) {
                                            window.speechSynthesis?.cancel();
                                            setHablando(false);
                                        }
                                        setVozHabilitada(!vozHabilitada);
                                    }}
                                    title={vozHabilitada ? 'Silenciar voz de Jarvis' : 'Activar locución de voz'}
                                    style={{
                                        background: vozHabilitada ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                        border: `1px solid ${vozHabilitada ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                        color: vozHabilitada ? '#f59e0b' : '#64748b',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        padding: '5px 8px',
                                        fontSize: 13,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {vozHabilitada ? '🔊' : '🔇'}
                                </button>

                                {/* Botón Cerrar */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.speechSynthesis) window.speechSynthesis.cancel();
                                        setHablando(false);
                                        setAbierto(false);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: 6,
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Minimizar Jarvis"
                                >
                                    <IconClose style={{ width: 18, height: 18 }} />
                                </button>
                            </div>
                        </div>

                        {/* ECUALIZADOR DE ONDAS DE VOZ (WAVEFORM BARS) */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            marginTop: 12,
                            height: 18
                        }}>
                            {audioFrecuencia.map((alt, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 3,
                                        height: `${alt}px`,
                                        background: hablando ? '#f59e0b' : (escuchando ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'),
                                        borderRadius: 2,
                                        transition: 'height 0.1s ease',
                                        boxShadow: hablando || escuchando ? '0 0 6px currentColor' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* CUERPO DEL CHAT / HISTORIAL DE MENSAJES */}
                    <div ref={scrollRef} style={{
                        flex: 1,
                        padding: '16px 14px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        background: 'radial-gradient(circle at 50% 20%, rgba(20, 27, 43, 0.6) 0%, rgba(11, 14, 23, 0.95) 100%)'
                    }}>
                        {mensajes.map((m, idx) => (
                            <div
                                key={idx}
                                style={{
                                    alignSelf: m.remitente === 'usuario' ? 'flex-end' : 'flex-start',
                                    maxWidth: '88%',
                                    background: m.remitente === 'usuario'
                                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                        : 'rgba(26, 34, 52, 0.85)',
                                    color: m.remitente === 'usuario' ? '#0f172a' : '#f8fafc',
                                    border: m.remitente === 'jarvis' ? '1px solid rgba(245, 158, 11, 0.2)' : 'none',
                                    padding: '10px 14px',
                                    borderRadius: 14,
                                    borderBottomRightRadius: m.remitente === 'usuario' ? 2 : 14,
                                    borderBottomLeftRadius: m.remitente === 'jarvis' ? 2 : 14,
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                                    position: 'relative'
                                }}
                            >
                                {m.remitente === 'jarvis' && (
                                    <div style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#f59e0b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginBottom: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5
                                    }}>
                                        <span>JARVIS</span>
                                        <button
                                            type="button"
                                            onClick={() => hablarTexto(m.texto)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#f59e0b',
                                                cursor: 'pointer',
                                                fontSize: 11,
                                                padding: 0
                                            }}
                                            title="Repetir locución de voz"
                                        >
                                            🔊
                                        </button>
                                    </div>
                                )}

                                <div style={{ whiteSpace: 'pre-line' }}>{m.texto}</div>

                                {/* Botón de acción sugerida */}
                                {m.accion_sugerida && (
                                    <button
                                        type="button"
                                        onClick={() => ejecutarAccion(m.accion_sugerida)}
                                        style={{
                                            marginTop: 10,
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            border: '1px solid #f59e0b',
                                            color: '#f59e0b',
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>⚡ {m.accion_sugerida}</span>
                                    </button>
                                )}
                            </div>
                        ))}

                        {cargando && (
                            <div style={{
                                alignSelf: 'flex-start',
                                background: 'rgba(26, 34, 52, 0.85)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                color: '#cbd5e1',
                                padding: '10px 14px',
                                borderRadius: 14,
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <div style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    border: '2px solid #f59e0b',
                                    borderTopColor: 'transparent',
                                    animation: 'jarvisOrbRotate 0.8s linear infinite'
                                }} />
                                <span>Procesando telemetría de Mix Point...</span>
                            </div>
                        )}
                    </div>

                    {/* SUGERENCIAS RÁPIDAS EN CARRUSEL */}
                    <div style={{
                        padding: '8px 12px',
                        background: '#0d111a',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        gap: 8
                    }}>
                        {sugerenciasRapidas.map((sug, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => enviarMensaje(sug)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    borderRadius: 14,
                                    padding: '5px 12px',
                                    color: '#e2e8f0',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'all 0.15s'
                                }}
                            >
                                {sug}
                            </button>
                        ))}
                    </div>

                    {/* CAJA DE TEXTO Y ACCIONADOR DE VOZ */}
                    <div style={{
                        padding: 12,
                        background: '#131824',
                        borderTop: '1px solid rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        <input
                            type="text"
                            placeholder={escuchando ? 'Escuchando su voz...' : 'Escriba o hable con Jarvis...'}
                            value={inputTexto}
                            onChange={(e) => setInputTexto(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
                            style={{
                                flex: 1,
                                background: '#0a0d14',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                color: '#fff',
                                fontSize: 13,
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />

                        {/* Botón Micrófono / Reconocimiento de Voz */}
                        <button
                            type="button"
                            onClick={toggleEscucha}
                            title={escuchando ? 'Detener dictado' : 'Hablar por micrófono con Jarvis'}
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 10,
                                background: escuchando
                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                border: `1px solid ${escuchando ? '#ef4444' : 'rgba(245, 158, 11, 0.35)'}`,
                                color: escuchando ? '#fff' : '#f59e0b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: escuchando ? '0 0 16px rgba(239, 68, 68, 0.6)' : 'none'
                            }}
                        >
                            {escuchando ? <IconMicrofonoOff style={{ width: 18, height: 18 }} /> : <IconMicrofono style={{ width: 18, height: 18 }} />}
                        </button>

                        {/* Botón Enviar */}
                        <button
                            type="button"
                            onClick={() => enviarMensaje()}
                            disabled={!inputTexto.trim()}
                            style={{
                                height: 42,
                                padding: '0 16px',
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                border: 'none',
                                color: '#0f172a',
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: inputTexto.trim() ? 'pointer' : 'default',
                                opacity: inputTexto.trim() ? 1 : 0.4,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            Enviar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
