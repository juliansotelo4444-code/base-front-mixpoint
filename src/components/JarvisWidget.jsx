import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
    IconBot, IconMicrofono, IconMicrofonoOff, IconClose,
    IconBuscar, IconCheck, IconAlerta, IconCopy
} from './Icons';

const PERSONALIDADES_CONFIG = [
    {
        id: 'jarvis',
        nombre: 'J.A.R.V.I.S.',
        subtitulo: 'Protocolo Stark Mk-IV',
        avatarEmoji: '⚡',
        colorPrimario: '#f59e0b',
        colorGlow: 'rgba(245, 158, 11, 0.5)',
        bgNucleo: 'radial-gradient(circle, #fbbf24 0%, #d97706 70%, #78350f 100%)',
        pitch: 0.98,
        rate: 1.05,
        saludo: '¡Buen día! Soy J.A.R.V.I.S., conectado por Model Context Protocol (MCP) a la base de datos de Mix Point. Puedo generar remitos automáticos a partir de pedidos sin tocar otros registros, monitorear el inventario y alertarle sobre quiebres de stock.'
    },
    {
        id: 'yoda',
        nombre: 'Maestro Yoda',
        subtitulo: 'Sabiduría Jedi del Stock',
        avatarEmoji: '🧙‍♂️',
        colorPrimario: '#10b981',
        colorGlow: 'rgba(16, 185, 129, 0.5)',
        bgNucleo: 'radial-gradient(circle, #34d399 0%, #059669 70%, #064e3b 100%)',
        pitch: 0.82,
        rate: 0.95,
        saludo: 'Fuerte en la Fuerza el stock está. Mediante el protocolo MCP los pedidos examino. Generar remitos seguros yo puedo, sin perturbar el balance. ¿Tu orden cuál es, joven padawan?'
    },
    {
        id: 'baymax',
        nombre: 'Baymax',
        subtitulo: 'Asistente de Salud Operativa',
        avatarEmoji: '🤍',
        colorPrimario: '#ef4444',
        colorGlow: 'rgba(239, 68, 68, 0.45)',
        bgNucleo: 'radial-gradient(circle, #f87171 0%, #dc2626 70%, #7f1d1d 100%)',
        pitch: 1.15,
        rate: 0.92,
        saludo: 'Hola. Soy Baymax, tu compañero de asistencia y salud del negocio. Estoy escaneando la base de datos por MCP para prevenir cualquier dolor en la entrega de remitos y stock. Del 1 al 10, ¿cómo calificarías el estado de tus pedidos?'
    },
    {
        id: 'wally',
        nombre: 'WALL-E',
        subtitulo: 'Recolector de Pedidos',
        avatarEmoji: '🤖',
        colorPrimario: '#eab308',
        colorGlow: 'rgba(234, 179, 8, 0.5)',
        bgNucleo: 'radial-gradient(circle, #facc15 0%, #ca8a04 70%, #713f12 100%)',
        pitch: 1.35,
        rate: 1.1,
        saludo: '¡Waaall-eee! *Bip bip* 📦 Pedido leído por MCP... ¡Remito compacto listo! *Ta-daaa* 🌿'
    },
    {
        id: 'c3po',
        nombre: 'C-3PO',
        subtitulo: 'Protocolo y Relaciones Humanas',
        avatarEmoji: '✨',
        colorPrimario: '#facc15',
        colorGlow: 'rgba(250, 204, 21, 0.5)',
        bgNucleo: 'radial-gradient(circle, #fef08a 0%, #eab308 70%, #854d0e 100%)',
        pitch: 1.22,
        rate: 1.08,
        saludo: '¡Oh, cielos! Soy C-3PO, relaciones humanas y androide de protocolo. Conectado rigurosamente al Model Context Protocol para garantizar que ninguna orden sufra errores de cálculo. La probabilidad de emitir el remito a la perfección es del 99.8%.'
    }
];

export default function JarvisWidget() {
    const [abierto, setAbierto] = useState(false);
    const [personalidadActiva, setPersonalidadActiva] = useState('jarvis');
    const [mensajes, setMensajes] = useState([
        {
            remitente: 'jarvis',
            texto: PERSONALIDADES_CONFIG[0].saludo
        }
    ]);
    const [inputTexto, setInputTexto] = useState('');
    const [escuchando, setEscuchando] = useState(false);
    const [hablando, setHablando] = useState(false);
    const [vozHabilitada, setVozHabilitada] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [audioFrecuencia, setAudioFrecuencia] = useState([12, 24, 18, 30, 20, 15]);
    const [alertasBanner, setAlertasBanner] = useState(null);

    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);
    const waveIntervalRef = useRef(null);
    const navigate = useNavigate();

    const configActual = PERSONALIDADES_CONFIG.find(p => p.id === personalidadActiva) || PERSONALIDADES_CONFIG[0];

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

    // Cambiar de personalidad
    function cambiarPersonalidad(nuevaId) {
        setPersonalidadActiva(nuevaId);
        const pers = PERSONALIDADES_CONFIG.find(p => p.id === nuevaId) || PERSONALIDADES_CONFIG[0];
        setMensajes(prev => [
            ...prev,
            {
                remitente: 'jarvis',
                texto: pers.saludo,
                personalidad: nuevaId
            }
        ]);
        hablarTexto(pers.saludo, pers);
    }

    // Ondas dinámicas
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

    // Text to Speech ajustado a la personalidad
    function hablarTexto(texto, persOverride = null) {
        if (!vozHabilitada || !('speechSynthesis' in window)) return;
        const pers = persOverride || configActual;
        try {
            window.speechSynthesis.cancel();
            const textoLimpio = texto
                .replace(/\[.*?\]/g, '')
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
                .replace(/[*#_~]/g, '');

            const utterance = new SpeechSynthesisUtterance(textoLimpio);
            utterance.lang = 'es-AR';
            utterance.rate = pers.rate || 1.0;
            utterance.pitch = pers.pitch || 1.0;

            const voces = window.speechSynthesis.getVoices();
            const vozEsp = voces.find(v => v.lang === 'es-AR') ||
                           voces.find(v => v.lang.startsWith('es'));
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
            const data = await api.post('/jarvis/chat', {
                mensaje: query,
                personalidad: personalidadActiva
            });
            const respuestaJarvis = data.respuesta || 'Operación procesada con éxito.';

            setMensajes(prev => [...prev, {
                remitente: 'jarvis',
                texto: respuestaJarvis,
                datos: data.datos,
                accion_sugerida: data.accion_sugerida,
                personalidad: personalidadActiva
            }]);

            hablarTexto(respuestaJarvis);
        } catch (err) {
            const errMsg = 'Interferencia al consultar los datos del servidor MCP.';
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
        'Generar remito automático para el pedido MP-1001',
        'Monitorear alertas críticas del sistema',
        'Consultar memoria extendida del negocio',
        '¿Cuánto stock tenemos de almendras y nueces?',
        '¿Quiénes son nuestros mayores deudores?'
    ];

    return (
        <>
            {/* BOTÓN FLOTANTE TRIGGER CON NÚCLEO DINÁMICO */}
            <div className="jarvis-fab-wrapper no-print">
                <button
                    type="button"
                    onClick={() => setAbierto(!abierto)}
                    title={`${configActual.nombre} • Agente IA MCP`}
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #1a2234 0%, #0c101a 100%)',
                        border: `2px solid ${configActual.colorPrimario}`,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: `0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px ${configActual.colorGlow}`,
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: abierto ? 'scale(0.92)' : 'scale(1)'
                    }}
                >
                    {/* Anillo orbital con animación personalizada */}
                    <div style={{
                        position: 'absolute',
                        inset: -5,
                        borderRadius: '50%',
                        border: `2px dashed ${configActual.colorPrimario}`,
                        opacity: 0.6,
                        animation: 'jarvisOrbRotate 7s linear infinite',
                        pointerEvents: 'none'
                    }} />

                    {/* Núcleo central brillante */}
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: configActual.bgNucleo,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f131d',
                        fontSize: 18,
                        boxShadow: `0 0 16px ${configActual.colorGlow}, inset 0 0 8px #fff`
                    }}>
                        {configActual.avatarEmoji}
                    </div>

                    {/* Indicador de estado */}
                    <span style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: hablando ? configActual.colorPrimario : (escuchando ? '#ef4444' : '#10b981'),
                        border: '2px solid #0f131d',
                        boxShadow: '0 0 8px currentColor'
                    }} />
                </button>
            </div>

            {/* PANEL PRINCIPAL DEL AGENTE */}
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
                    border: `1.5px solid ${configActual.colorPrimario}`,
                    boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 30px ${configActual.colorGlow}`,
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 99999,
                    overflow: 'hidden'
                }}>
                    {/* CABECERA CON REACTOR Y SELECTOR DE PERSONALIDADES */}
                    <div style={{
                        padding: '14px 16px',
                        background: 'linear-gradient(180deg, rgba(26, 34, 52, 0.95) 0%, rgba(15, 19, 29, 0.95) 100%)',
                        borderBottom: `1px solid ${configActual.colorPrimario}44`,
                        position: 'relative'
                    }}>
                        {/* Selector de Personalidades (Pills) */}
                        <div style={{
                            display: 'flex',
                            gap: 6,
                            overflowX: 'auto',
                            paddingBottom: 8,
                            marginBottom: 8,
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                            {PERSONALIDADES_CONFIG.map(p => {
                                const activo = p.id === personalidadActiva;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => cambiarPersonalidad(p.id)}
                                        style={{
                                            background: activo ? p.colorPrimario : 'rgba(255, 255, 255, 0.06)',
                                            color: activo ? '#0f131d' : '#94a3b8',
                                            border: `1px solid ${activo ? p.colorPrimario : 'rgba(255, 255, 255, 0.1)'}`,
                                            borderRadius: 20,
                                            padding: '3px 10px',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <span>{p.avatarEmoji}</span>
                                        <span>{p.nombre}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {/* REDONDEL CON ANIMACIÓN CONCÉNTRICA INTEGRADA */}
                                <div
                                    onClick={toggleEscucha}
                                    title={escuchando ? 'Detener escucha' : 'Hablar con el agente'}
                                    style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: '50%',
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: 'radial-gradient(circle, #1e293b 0%, #0a0e17 100%)',
                                        boxShadow: hablando
                                            ? `0 0 25px ${configActual.colorPrimario}, inset 0 0 15px ${configActual.colorPrimario}`
                                            : (escuchando ? '0 0 30px #ef4444, inset 0 0 15px #ef4444' : `0 0 15px ${configActual.colorGlow}`),
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {/* Anillo exterior animado */}
                                    <div style={{
                                        position: 'absolute',
                                        inset: -3,
                                        borderRadius: '50%',
                                        border: `2px dashed ${configActual.colorPrimario}`,
                                        animation: 'jarvisOrbRotate 6s linear infinite'
                                    }} />

                                    {/* Anillo concéntrico pulsante */}
                                    <div style={{
                                        position: 'absolute',
                                        inset: 3,
                                        borderRadius: '50%',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderTopColor: configActual.colorPrimario,
                                        borderBottomColor: configActual.colorPrimario,
                                        animation: 'jarvisOrbRotateReverse 3s linear infinite'
                                    }} />

                                    {/* Centro */}
                                    <div style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: configActual.bgNucleo,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        boxShadow: `0 0 18px ${configActual.colorGlow}, inset 0 0 6px #fff`,
                                        animation: hablando ? 'jarvisPulseCore 0.7s infinite alternate' : 'none'
                                    }}>
                                        {escuchando ? (
                                            <IconMicrofono style={{ width: 14, height: 14, color: '#fff' }} />
                                        ) : (
                                            configActual.avatarEmoji
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div style={{
                                        fontWeight: 800,
                                        fontSize: 15,
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        <span>{configActual.nombre}</span>
                                        <span style={{
                                            fontSize: 9.5,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: `${configActual.colorPrimario}22`,
                                            color: configActual.colorPrimario,
                                            border: `1px solid ${configActual.colorPrimario}55`,
                                            fontWeight: 800
                                        }}>
                                            MCP AGENT
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: '50%',
                                            background: hablando ? configActual.colorPrimario : (escuchando ? '#ef4444' : '#10b981'),
                                            boxShadow: '0 0 8px currentColor'
                                        }} />
                                        <span>
                                            {hablando ? 'Transmitiendo...' : (escuchando ? 'Escuchando...' : 'MCP Conectado (Solo Lectura)')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Controles de audio y cerrar */}
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
                                        background: vozHabilitada ? `${configActual.colorPrimario}22` : 'rgba(255, 255, 255, 0.05)',
                                        border: `1px solid ${vozHabilitada ? configActual.colorPrimario : 'rgba(255, 255, 255, 0.1)'}`,
                                        color: vozHabilitada ? configActual.colorPrimario : '#64748b',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        padding: '5px 8px',
                                        fontSize: 12
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

                        {/* Ondas */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10, height: 14 }}>
                            {audioFrecuencia.map((alt, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 3,
                                        height: `${alt}px`,
                                        background: hablando ? configActual.colorPrimario : (escuchando ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'),
                                        borderRadius: 2,
                                        transition: 'height 0.1s ease'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* BANNER DE ALERTA PROACTIVA MCP */}
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
                            <span>⚠️ Monitoreo MCP: {alertasBanner}</span>
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
                        padding: '14px',
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
                                        border: esUsuario ? 'none' : `1px solid ${configActual.colorPrimario}33`,
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
                                                border: `1px solid ${configActual.colorPrimario}`,
                                                color: configActual.colorPrimario,
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
                            <div style={{ color: configActual.colorPrimario, fontSize: 12, fontStyle: 'italic' }}>
                                {configActual.nombre} consultando base de datos por MCP...
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
                        borderTop: `1px solid ${configActual.colorPrimario}33`,
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
                            placeholder={`Preguntar a ${configActual.nombre} o emitir remito...`}
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
                                background: configActual.colorPrimario,
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
