import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
    IconBot, IconMicrofono, IconMicrofonoOff, IconClose,
    IconBuscar, IconCheck, IconAlerta
} from './Icons';

export default function JarvisWidget() {
    const [abierto, setAbierto] = useState(false);
    const [mensajes, setMensajes] = useState([
        {
            remitente: 'jarvis',
            texto: '¡Hola! Soy Jarvis, tu asistente de inteligencia operativa en Mix Point. Podés hablarme por voz o escribir tus consultas sobre stock, producción de mixes, cuentas corrientes o ventas del día.'
        }
    ]);
    const [inputTexto, setInputTexto] = useState('');
    const [escuchando, setEscuchando] = useState(false);
    const [hablando, setHablando] = useState(false);
    const [vozHabilitada, setVozHabilitada] = useState(true);
    const [cargando, setCargando] = useState(false);
    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);
    const navigate = useNavigate();

    // Inicializar Web Speech Recognition si está soportado
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

    // Función Text-to-Speech (hablar en voz alta)
    function hablarTexto(texto) {
        if (!vozHabilitada || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel(); // Detener locución previa
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-AR';
            utterance.rate = 1.05;

            // Intentar buscar una voz en español
            const voces = window.speechSynthesis.getVoices();
            const vozEsp = voces.find(v => v.lang.startsWith('es'));
            if (vozEsp) utterance.voice = vozEsp;

            utterance.onstart = () => setHablando(true);
            utterance.onend = () => setHablando(false);
            utterance.onerror = () => setHablando(false);

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.warn('Error en síntesis de voz:', err);
        }
    }

    function toggleEscucha() {
        if (!recognitionRef.current) {
            alert('El reconocimiento por voz no es soportado por este navegador. Podés escribir por teclado.');
            return;
        }
        if (escuchando) {
            recognitionRef.current.stop();
        } else {
            // Si estaba hablando, callar para escuchar
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
            const respuestaJarvis = data.respuesta || 'Consulta procesada.';

            setMensajes(prev => [...prev, {
                remitente: 'jarvis',
                texto: respuestaJarvis,
                datos: data.datos,
                accion_sugerida: data.accion_sugerida
            }]);

            hablarTexto(respuestaJarvis);
        } catch (err) {
            const errMsg = 'Disculpame, hubo un inconveniente al consultar los datos del servidor.';
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
        else if (accion.includes('Reportes')) navigate('/reportes');
    }

    const sugerenciasRapidas = [
        '¿Cuánto stock tenemos de almendras?',
        '¿Quién nos debe más dinero?',
        '¿Podemos elaborar 50 kg de mix?',
        'Resumen de ventas de hoy',
        'Alertas de stock crítico'
    ];

    return (
        <>
            {/* BOTÓN FLOTANTE TRIGGER */}
            <div className="jarvis-fab-wrapper no-print">
                <button
                    type="button"
                    onClick={() => setAbierto(!abierto)}
                    title="Asistente de IA Mix Point (Jarvis)"
                    style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #C9A227 0%, #E6C86E 50%, #9A7B1C 100%)',
                        border: '2px solid rgba(255, 255, 255, 0.4)',
                        color: '#11141D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(201, 162, 39, 0.45)',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: abierto ? 'scale(0.92)' : 'scale(1)'
                    }}
                >
                    <IconBot style={{ width: 28, height: 28 }} />
                </button>
            </div>

            {/* MODAL / PANEL CONVERSACIONAL */}
            {abierto && (
                <div className="jarvis-modal no-print">
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px',
                        background: 'linear-gradient(90deg, #1A1F2C 0%, #161A25 100%)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: 'rgba(201, 162, 39, 0.15)',
                                color: '#C9A227',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <IconBot style={{ width: 20, height: 20 }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Jarvis • Mix Point</div>
                                <div style={{ fontSize: 11, color: '#8e9aa8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                    {hablando ? 'Hablando...' : (escuchando ? 'Escuchando tu voz...' : 'Online')}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {/* Toggle voz TTS */}
                            <button
                                type="button"
                                onClick={() => setVozHabilitada(!vozHabilitada)}
                                title={vozHabilitada ? 'Silenciar voz' : 'Activar voz'}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: vozHabilitada ? '#C9A227' : '#64748b',
                                    cursor: 'pointer',
                                    padding: 6,
                                    fontSize: 12
                                }}
                            >
                                {vozHabilitada ? '🔊' : '🔇'}
                            </button>
                            {/* Cerrar */}
                            <button
                                type="button"
                                onClick={() => setAbierto(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#8e9aa8',
                                    cursor: 'pointer',
                                    padding: 6
                                }}
                            >
                                <IconClose style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                    </div>

                    {/* Mensajes */}
                    <div ref={scrollRef} style={{
                        flex: 1,
                        padding: 16,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                    }}>
                        {mensajes.map((m, idx) => (
                            <div
                                key={idx}
                                style={{
                                    alignSelf: m.remitente === 'usuario' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    background: m.remitente === 'usuario' ? '#C9A227' : '#1E2433',
                                    color: m.remitente === 'usuario' ? '#11141D' : '#f1f5f9',
                                    padding: '10px 14px',
                                    borderRadius: 14,
                                    borderBottomRightRadius: m.remitente === 'usuario' ? 2 : 14,
                                    borderBottomLeftRadius: m.remitente === 'jarvis' ? 2 : 14,
                                    fontSize: 13,
                                    lineHeight: 1.45,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}
                            >
                                <div>{m.texto}</div>

                                {/* Botón de acción contextual */}
                                {m.accion_sugerida && (
                                    <button
                                        onClick={() => ejecutarAccion(m.accion_sugerida)}
                                        style={{
                                            marginTop: 8,
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            background: 'rgba(201, 162, 39, 0.2)',
                                            border: '1px solid #C9A227',
                                            color: '#C9A227',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'block'
                                        }}
                                    >
                                        👉 {m.accion_sugerida}
                                    </button>
                                )}
                            </div>
                        ))}

                        {cargando && (
                            <div style={{
                                alignSelf: 'flex-start',
                                background: '#1E2433',
                                color: '#94a3b8',
                                padding: '8px 14px',
                                borderRadius: 14,
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                <span className="spinner-dots">Analizando base de datos...</span>
                            </div>
                        )}
                    </div>

                    {/* Sugerencias Rápidas */}
                    <div style={{
                        padding: '6px 12px',
                        background: '#161A25',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        gap: 6
                    }}>
                        {sugerenciasRapidas.map((sug, i) => (
                            <button
                                key={i}
                                onClick={() => enviarMensaje(sug)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 12,
                                    padding: '4px 10px',
                                    color: '#cbd5e1',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                {sug}
                            </button>
                        ))}
                    </div>

                    {/* Input y Botón de Voz */}
                    <div style={{
                        padding: 12,
                        background: '#1A1F2C',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        <input
                            type="text"
                            placeholder={escuchando ? 'Escuchando voz...' : 'Preguntale a Jarvis...'}
                            value={inputTexto}
                            onChange={(e) => setInputTexto(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
                            style={{
                                flex: 1,
                                background: '#11141D',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 8,
                                padding: '8px 12px',
                                color: '#fff',
                                fontSize: 13,
                                outline: 'none'
                            }}
                        />

                        {/* Micrófono STT */}
                        <button
                            type="button"
                            onClick={toggleEscucha}
                            title={escuchando ? 'Detener dictado' : 'Hablar por micrófono'}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                background: escuchando ? '#ef4444' : 'rgba(201, 162, 39, 0.15)',
                                border: 'none',
                                color: escuchando ? '#fff' : '#C9A227',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                animation: escuchando ? 'pulse 1.2s infinite' : 'none'
                            }}
                        >
                            {escuchando ? <IconMicrofonoOff style={{ width: 18, height: 18 }} /> : <IconMicrofono style={{ width: 18, height: 18 }} />}
                        </button>

                        {/* Enviar */}
                        <button
                            type="button"
                            onClick={() => enviarMensaje()}
                            disabled={!inputTexto.trim()}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 8,
                                background: '#C9A227',
                                border: 'none',
                                color: '#11141D',
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: inputTexto.trim() ? 'pointer' : 'default',
                                opacity: inputTexto.trim() ? 1 : 0.4
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
