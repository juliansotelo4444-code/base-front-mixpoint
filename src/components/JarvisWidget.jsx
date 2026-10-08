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
            texto: '¡Buen día, señor! Soy J.A.R.V.I.S., su asistente de inteligencia operacional en Mix Point. Todos los subsistemas están en línea. Conectado mediante Model Context Protocol (MCP) a la base de datos central para generar remitos automatizados a partir de pedidos sin alterar otros registros, predecir quiebres de inventario y auditar el negocio.'
        }
    ]);
    const [inputTexto, setInputTexto] = useState('');
    const [escuchando, setEscuchando] = useState(false);
    const [hablando, setHablando] = useState(false);
    const [vozHabilitada, setVozHabilitada] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [audioFrecuencia, setAudioFrecuencia] = useState([14, 28, 20, 36, 24, 16]);
    const [alertasBanner, setAlertasBanner] = useState(null);

    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);
    const waveIntervalRef = useRef(null);
    const navigate = useNavigate();

    // Cargar alertas automáticas periódicas del sistema mediante MCP
    useEffect(() => {
        async function consultarAlertas() {
            try {
                const { data } = await api.get('/jarvis/alertas-monitoreo');
                if (data && data.stock_critico && data.stock_critico.length > 0) {
                    setAlertasBanner(`${data.stock_critico.length} productos con stock crítico`);
                }
            } catch (e) {
                // silencioso
            }
        }
        consultarAlertas();
        const interval = setInterval(consultarAlertas, 60000);
        return () => clearInterval(interval);
    }, []);

    // Ondas dinámicas cuando Jarvis habla o escucha
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
            setAudioFrecuencia([6, 12, 9, 14, 10, 6]);
        }
        return () => {
            if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
        };
    }, [hablando, escuchando]);

    // Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'es-AR';

            recognition.onstart = () => setEscuchando(true);
            recognition.onend = () => setEscuchando(false);
            recognition.onerror = () => setEscuchando(false);
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

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [mensajes, cargando]);

    // Text to Speech
    function hablarTexto(texto) {
        if (!vozHabilitada || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const textoLimpio = texto
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
                .replace(/[*#_~•]/g, '');

            const utterance = new SpeechSynthesisUtterance(textoLimpio);
            utterance.lang = 'es-AR';
            utterance.rate = 1.05;
            utterance.pitch = 0.98;

            const voces = window.speechSynthesis.getVoices();
            const vozEsp = voces.find(v => v.lang === 'es-AR') ||
                           voces.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Castilian')));
            if (vozEsp) utterance.voice = vozEsp;

            utterance.onstart = () => setHablando(true);
            utterance.onend = () => setHablando(false);
            utterance.onerror = () => setHablando(false);

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            setHablando(false);
        }
    }

    function toggleEscucha() {
        if (!recognitionRef.current) {
            alert('El reconocimiento por voz no está disponible en este navegador. Podés escribir.');
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
            const errMsg = 'Disculpe, señor. Hubo una interferencia al consultar los datos del servidor MCP.';
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
        else if (accion.includes('Inventario') || accion.includes('Stock') || accion.includes('Ajustar')) navigate('/productos');
        else if (accion.includes('Despacho') || accion.includes('Depósito') || accion.includes('Kanban')) navigate('/deposito-kanban');
        else if (accion.includes('Reportes')) navigate('/reportes-diarios');
        else if (accion.includes('Proveedores')) navigate('/proveedores');
    }

    const sugerenciasRapidas = [
        'Generar remito automático para el pedido MP-1001',
        '¿Qué productos tienen predicción de quiebre de stock?',
        'Monitorear alertas críticas del sistema',
        '¿Cuánto stock tenemos de almendras y nueces?',
        '¿Quiénes son nuestros mayores deudores?',
        'Resumen de facturación de hoy'
    ];

    return (
        <>
            {/* BOTÓN FLOTANTE TRIGGER CON NÚCLEO REACTIVO "ARC REACTOR" */}
            <div className="jarvis-fab-wrapper no-print">
                <button
                    type="button"
                    onClick={() => setAbierto(!abierto)}
                    title="J.A.R.V.I.S. • Inteligencia Operacional MCP"
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #1a2234 0%, #0c101a 100%)',
                        border: '2px solid rgba(245, 158, 11, 0.6)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: abierto ? 'scale(0.92)' : 'scale(1)'
                    }}
                >
                    {/* Anillo orbital exterior giratorio */}
                    <div style={{
                        position: 'absolute',
                        inset: -5,
                        borderRadius: '50%',
                        border: '2px dashed rgba(245, 158, 11, 0.45)',
                        animation: 'jarvisOrbRotate 8s linear infinite',
                        pointerEvents: 'none'
                    }} />

                    {/* Núcleo central brillante */}
                    <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #fbbf24 0%, #d97706 70%, #78350f 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f131d',
                        boxShadow: '0 0 16px rgba(245, 158, 11, 0.9), inset 0 0 8px #fff'
                    }}>
                        <IconBot style={{ width: 19, height: 19 }} />
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
                <div className="jarvis-modal no-print" style={{
                    position: 'fixed',
                    bottom: 84,
                    right: 20,
                    width: 440,
                    maxWidth: '92vw',
                    height: 600,
                    maxHeight: '82vh',
                    borderRadius: 20,
                    background: '#0d111a',
                    border: '1.5px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 30px rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 99999,
                    overflow: 'hidden'
                }}>
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
                                            : (escuchando ? '0 0 30px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(239, 68, 68, 0.6)' : '0 0 15px rgba(245, 158, 11, 0.3)'),
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
                                            letterSpacing: '0.08em',
                                            fontWeight: 800
                                        }}>
                                            AI MK-IV · MCP
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
                                            {hablando ? 'Transmitiendo respuesta...' : (escuchando ? 'Escuchando su voz...' : 'Sistemas operativos online (MCP)')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CONTROLES DEL HEADER */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (hablando) {
                                            window.speechSynthesis?.cancel();
                                            setHablando(false);
                                        }
                                        setVozHabilitada(!vozHabilitada);
                                    }}
                                    title={vozHabilitada ? 'Silenciar voz' : 'Activar voz'}
                                    style={{
                                        background: vozHabilitada ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                        border: `1px solid ${vozHabilitada ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                        color: vozHabilitada ? '#f59e0b' : '#64748b',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        padding: '5px 8px',
                                        fontSize: 13
                                    }}
                                >
                                    {vozHabilitada ? '🔊' : '🔇'}
                                </button>
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
                                        padding: 6
                                    }}
                                >
                                    <IconClose style={{ width: 18, height: 18 }} />
                                </button>
                            </div>
                        </div>

                        {/* ONDAS DE AUDIO */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            marginTop: 12,
                            height: 16
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

                    {/* BANNER DE ALERTA AUTOMÁTICA MCP */}
                    {alertasBanner && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '6px 14px',
                            color: '#f87171',
                            fontSize: 11.5,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <span>⚠️ Auditoría MCP: {alertasBanner}</span>
                            <button
                                onClick={() => enviarMensaje('Monitorear alertas críticas del sistema')}
                                style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontSize: 11 }}
                            >
                                Analizar
                            </button>
                        </div>
                    )}

                    {/* CUERPO DEL CHAT */}
                    <div ref={scrollRef} style={{
                        flex: 1,
                        padding: '16px 14px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                    }}>
                        {mensajes.map((msg, index) => {
                            const esUsuario = msg.remitente === 'usuario';
                            return (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: esUsuario ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        maxWidth: '85%',
                                        padding: '10px 14px',
                                        borderRadius: 14,
                                        borderBottomRightRadius: esUsuario ? 2 : 14,
                                        borderBottomLeftRadius: !esUsuario ? 2 : 14,
                                        background: esUsuario ? '#2563eb' : 'rgba(30, 41, 59, 0.85)',
                                        color: '#fff',
                                        fontSize: 13,
                                        lineHeight: 1.45,
                                        border: esUsuario ? 'none' : '1px solid rgba(245, 158, 11, 0.25)',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {msg.texto}
                                    </div>

                                    {/* Botón de acción sugerida */}
                                    {msg.accion_sugerida && (
                                        <button
                                            type="button"
                                            onClick={() => ejecutarAccion(msg.accion_sugerida)}
                                            style={{
                                                marginTop: 6,
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: '1px solid #f59e0b',
                                                color: '#f59e0b',
                                                borderRadius: 8,
                                                padding: '4px 10px',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🚀 {msg.accion_sugerida}
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {cargando && (
                            <div style={{ color: '#f59e0b', fontSize: 12, fontStyle: 'italic' }}>
                                J.A.R.V.I.S. consultando registros por Model Context Protocol...
                            </div>
                        )}
                    </div>

                    {/* SUGERENCIAS RÁPIDAS */}
                    <div style={{
                        padding: '8px 12px',
                        background: '#090d15',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        gap: 6,
                        overflowX: 'auto'
                    }}>
                        {sugerenciasRapidas.map((sug, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => enviarMensaje(sug)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#cbd5e1',
                                    borderRadius: 12,
                                    padding: '4px 8px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {sug}
                            </button>
                        ))}
                    </div>

                    {/* INPUT Y ENVÍO */}
                    <div style={{
                        padding: '12px',
                        background: '#0f1420',
                        borderTop: '1px solid rgba(245, 158, 11, 0.25)',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center'
                    }}>
                        <input
                            type="text"
                            value={inputTexto}
                            onChange={(e) => setInputTexto(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') enviarMensaje();
                            }}
                            placeholder="Consultar a J.A.R.V.I.S. o emitir remito..."
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: 10,
                                padding: '8px 12px',
                                color: '#fff',
                                fontSize: 13,
                                outline: 'none'
                            }}
                        />

                        <button
                            type="button"
                            onClick={toggleEscucha}
                            style={{
                                background: escuchando ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: 8,
                                padding: '8px 10px',
                                cursor: 'pointer'
                            }}
                            title="Reconocimiento por voz"
                        >
                            <IconMicrofono style={{ width: 16, height: 16 }} />
                        </button>

                        <button
                            type="button"
                            onClick={() => enviarMensaje()}
                            style={{
                                background: '#f59e0b',
                                border: 'none',
                                color: '#0f131d',
                                borderRadius: 8,
                                padding: '8px 14px',
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: 'pointer'
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
