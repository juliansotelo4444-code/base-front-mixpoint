import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import useKanbanSocket from '../hooks/useKanbanSocket';
import { useAuth } from '../context/AuthContext';
import {
    IconBot, IconMicrofono, IconClose
} from './Icons';

export default function JarvisWidget() {
    const { usuario } = useAuth();
    const [abierto, setAbierto] = useState(false);
    const [mensajes, setMensajes] = useState([
        {
            remitente: 'jarvis',
            texto: '¡Buen día, señor! Soy J.A.R.V.I.S., su asistente de inteligencia operacional en Mix Point. Conectado por Model Context Protocol (MCP) a la base de datos y a la red en vivo del equipo. Puedo generar remitos automáticos, predecir quiebres de inventario o contactar directamente a cualquier miembro del equipo conectado para averiguarle lo que necesite.'
        }
    ]);
    const [inputTexto, setInputTexto] = useState('');
    const [escuchando, setEscuchando] = useState(false);
    const [hablando, setHablando] = useState(false);
    const [vozHabilitada, setVozHabilitada] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [audioFrecuencia, setAudioFrecuencia] = useState([14, 28, 20, 36, 24, 16]);
    const [alertasBanner, setAlertasBanner] = useState(null);
    const [usuariosOnline, setUsuariosOnline] = useState([]);
    const [consultaPendienteParaMi, setConsultaPendienteParaMi] = useState(null);
    const [respuestaMiTexto, setRespuestaMiTexto] = useState('');
    const [pasosAbiertos, setPasosAbiertos] = useState({});

    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);
    const waveIntervalRef = useRef(null);
    const navigate = useNavigate();

    const togglePasos = (idx) => {
        setPasosAbiertos(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // Manejar eventos de Socket.io en tiempo real
    const handleEventoSocket = (evento, payload) => {
        if (evento === 'jarvis:usuarios_online') {
            setUsuariosOnline(payload || []);
        } else if (evento === 'jarvis:nueva_consulta_equipo') {
            // Si la consulta es para mí o para mi rol o general
            if (!payload.destinatario_id || payload.destinatario_id === usuario?.id || (payload.destinatario_nombre && payload.destinatario_nombre.toLowerCase() === usuario?.rol)) {
                setConsultaPendienteParaMi(payload);
                setAbierto(true); // Abrir widget para que responda
                hablarTexto(`Consulta prioritaria de Jarvis: ${payload.consulta}`);
            }
        } else if (evento === 'jarvis:consulta_respondida') {
            // Notificar en el chat que se obtuvo la respuesta de la persona
            setMensajes(prev => [
                ...prev,
                {
                    remitente: 'jarvis',
                    texto: `⚡ [Respuesta en Red recibida de ${payload.destinatario_nombre}]: "${payload.respuesta}"`,
                    fuente: 'red_local'
                }
            ]);
            hablarTexto(`${payload.destinatario_nombre} ha respondido: ${payload.respuesta}`);
            if (consultaPendienteParaMi && consultaPendienteParaMi.id === payload.id) {
                setConsultaPendienteParaMi(null);
            }
        } else if (evento === 'jarvis:alerta_proactiva') {
            const qCount = payload.quiebres_stock?.length || 0;
            const cCount = payload.clientes_inactivos?.length || 0;
            const aviso = `🛡️ [Alerta Sentry 24/7]: ${qCount > 0 ? `${qCount} producto(s) en quiebre crítico. ` : ''}${cCount > 0 ? `${cCount} cliente(s) inactivo(s) >20d.` : ''}`;
            setAlertasBanner(aviso);
            setMensajes(prev => [
                ...prev,
                {
                    remitente: 'jarvis',
                    texto: `${aviso}\nHe detectado anomalías operativas de forma proactiva en segundo plano.`,
                    datos: payload,
                    fuente: 'sentry_autonomo',
                    accion_sugerida: qCount > 0 ? 'Ver Proveedores' : 'Ver Clientes'
                }
            ]);
        }
    };

    const { conectado, socket } = useKanbanSocket(handleEventoSocket);

    // Escuchar eventos específicos de Jarvis en el socket
    useEffect(() => {
        if (!socket) return;
        socket.on('jarvis:usuarios_online', (data) => setUsuariosOnline(data || []));
        socket.on('jarvis:nueva_consulta_equipo', (data) => {
            if (!data.destinatario_id || data.destinatario_id === usuario?.id || (data.destinatario_nombre && data.destinatario_nombre.toLowerCase() === usuario?.rol)) {
                setConsultaPendienteParaMi(data);
                setAbierto(true);
                hablarTexto(`Consulta de Jarvis: ${data.consulta}`);
            }
        });
        socket.on('jarvis:consulta_respondida', (data) => {
            setMensajes(prev => [
                ...prev,
                {
                    remitente: 'jarvis',
                    texto: `⚡ [Respuesta en Red recibida de ${data.destinatario_nombre}]: "${data.respuesta}"`,
                    fuente: 'red_local'
                }
            ]);
            hablarTexto(`${data.destinatario_nombre} respondió: ${data.respuesta}`);
            setConsultaPendienteParaMi(null);
        });
        socket.on('jarvis:alerta_proactiva', (data) => {
            const qCount = data.quiebres_stock?.length || 0;
            const cCount = data.clientes_inactivos?.length || 0;
            const aviso = `🛡️ [Alerta Sentry 24/7]: ${qCount > 0 ? `${qCount} quiebres de stock. ` : ''}${cCount > 0 ? `${cCount} clientes inactivos.` : ''}`;
            setAlertasBanner(aviso);
        });

        // Cargar lista inicial de online
        api.get('/jarvis/usuarios-conectados').then(({ data }) => {
            if (data?.online) setUsuariosOnline(data.online);
        }).catch(() => {});
    }, [socket, usuario]);

    // Cargar alertas automáticas periódicas del sistema mediante MCP
    useEffect(() => {
        async function consultarAlertas() {
            try {
                const { data } = await api.get('/jarvis/alertas-monitoreo');
                if (data && data.stock_critico && data.stock_critico.length > 0) {
                    setAlertasBanner(`${data.stock_critico.length} productos con stock crítico`);
                }
            } catch (e) {}
        }
        consultarAlertas();
        const interval = setInterval(consultarAlertas, 60000);
        return () => clearInterval(interval);
    }, []);

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

    // Helper para seleccionar la voz más humana y natural en español
    function seleccionarMejorVoz(voces) {
        if (!voces || voces.length === 0) return null;
        const vocesEs = voces.filter(v => v.lang.startsWith('es') || v.lang === 'es-AR');
        if (vocesEs.length === 0) return null;

        // 1. Prioridad: Voces Neuronales/Naturales en español (Edge / Chrome)
        const onlineNatural = vocesEs.find(v => 
            (v.name.includes('Natural') || v.name.includes('Online')) && 
            (v.name.includes('Tomas') || v.name.includes('Gonzalo') || v.name.includes('Jorge') || v.name.includes('Alonso') || v.name.toLowerCase().includes('male'))
        );
        if (onlineNatural) return onlineNatural;

        const anyNatural = vocesEs.find(v => v.name.includes('Natural') || v.name.includes('Online'));
        if (anyNatural) return anyNatural;

        // 2. Voces Google en español
        const googleEs = vocesEs.find(v => v.name.includes('Google') || v.name.toLowerCase().includes('español'));
        if (googleEs) return googleEs;

        // 3. Voces masculinas en español
        const maleEs = vocesEs.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('hombre') || v.name.toLowerCase().includes('pablo') || v.name.toLowerCase().includes('raul') || v.name.toLowerCase().includes('carlos'));
        if (maleEs) return maleEs;

        // 4. Voz argentina o primera en español
        return vocesEs.find(v => v.lang === 'es-AR') || vocesEs[0];
    }

    // Text to Speech Humano, Elegante y Conciso (J.A.R.V.I.S.)
    function hablarTexto(textoCompleto, textoSintesis = null) {
        if (!vozHabilitada || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();

            // Usar síntesis vocal directa o extraer la primera frase ejecutiva humana
            let fraseVocal = textoSintesis;
            if (!fraseVocal || !fraseVocal.trim()) {
                const lineas = (textoCompleto || '').split('\n').filter(l => l.trim().length > 0);
                const primeraLinea = lineas[0] || '';
                const matchOracion = primeraLinea.split(/(?<=[.!?])\s+/)[0];
                fraseVocal = (matchOracion && matchOracion.length > 15) ? matchOracion : primeraLinea;
            }

            // Limpieza acústica profunda: eliminar viñetas, códigos, símbolos que suenan robóticos
            const textoLimpio = fraseVocal
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
                .replace(/[*#_~•–—|]/g, '')
                .replace(/https?:\/\/\S+/g, '')
                .replace(/\(.*?\)/g, '')
                .replace(/\bmp-\d+\b/gi, (m) => `pedido ${m.replace(/[^0-9]/g, '')}`)
                .replace(/\$\s*(\d+[.,]?\d*)/g, '$1 pesos')
                .replace(/\bkg\b/gi, 'kilos')
                .replace(/\bamba\b/gi, 'Gran Buenos Aires')
                .replace(/\bmcp\b/gi, 'sistema')
                .replace(/\bcot\b/gi, 'análisis')
                .trim();

            if (!textoLimpio) return;

            const utterance = new SpeechSynthesisUtterance(textoLimpio);
            utterance.lang = 'es-AR';
            // Cadencia Jarvis: pausada, tranquila, formal (no acelerada ni robótica)
            utterance.rate = 0.94;
            utterance.pitch = 0.92;

            const voces = window.speechSynthesis.getVoices();
            const mejorVoz = seleccionarMejorVoz(voces);
            if (mejorVoz) utterance.voice = mejorVoz;

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
            const vozJarvis = data.sintesis_voz || null;

            setMensajes(prev => [...prev, {
                remitente: 'jarvis',
                texto: respuestaJarvis,
                sintesis_voz: vozJarvis,
                datos: data.datos,
                razonamiento_pasos: data.razonamiento_pasos,
                fuente: data.fuente,
                accion_sugerida: data.accion_sugerida
            }]);

            hablarTexto(respuestaJarvis, vozJarvis);
        } catch (err) {
            const errMsg = 'Disculpe, señor. Hubo una interferencia al consultar los datos del servidor.';
            const vozErr = 'Disculpe señor, hubo una interferencia de conexión.';
            setMensajes(prev => [...prev, { remitente: 'jarvis', texto: errMsg }]);
            hablarTexto(errMsg, vozErr);
        } finally {
            setCargando(false);
        }
    }

    async function responderConsultaEnRed() {
        if (!respuestaMiTexto.trim() || !consultaPendienteParaMi) return;
        try {
            await api.post(`/jarvis/consultas-equipo/${consultaPendienteParaMi.id}/responder`, {
                respuesta: respuestaMiTexto.trim()
            });
            setConsultaPendienteParaMi(null);
            setRespuestaMiTexto('');
        } catch (err) {
            alert('Error al enviar la respuesta.');
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

    const otrosOnline = usuariosOnline.filter(u => u.id !== usuario?.id);

    const sugerenciasRapidas = [
        'Dólar blue hoy y costo de insumos',
        '¿Cómo está el clima para el reparto de hoy?',
        'Analizá el negocio y dame un plan estratégico',
        '¿Quién está conectado en la red?',
        otrosOnline.length > 0 ? `Preguntale a ${otrosOnline[0].nombre} cómo viene el despacho` : 'Generar remito automático para el pedido MP-1001',
        '¿Qué productos tienen predicción de quiebre de stock?',
        'Monitorear alertas críticas del sistema'
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
                    <div style={{
                        position: 'absolute',
                        inset: -5,
                        borderRadius: '50%',
                        border: '2px dashed rgba(245, 158, 11, 0.45)',
                        animation: 'jarvisOrbRotate 8s linear infinite',
                        pointerEvents: 'none'
                    }} />

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
                    width: 450,
                    maxWidth: '92vw',
                    height: 620,
                    maxHeight: '84vh',
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
                        padding: '14px 18px',
                        background: 'linear-gradient(180deg, rgba(26, 34, 52, 0.95) 0%, rgba(15, 19, 29, 0.95) 100%)',
                        borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div
                                    className={`jarvis-arc-reactor ${hablando ? 'jarvis-orb-speaking' : ''} ${escuchando ? 'jarvis-orb-listening' : ''}`}
                                    onClick={toggleEscucha}
                                    title={escuchando ? 'Click para detener escucha' : 'Click para hablar'}
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
                                            ? '0 0 25px rgba(245, 158, 11, 0.7), inset 0 0 15px rgba(245, 158, 11, 0.5)'
                                            : (escuchando ? '0 0 30px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(239, 68, 68, 0.6)' : '0 0 15px rgba(245, 158, 11, 0.3)'),
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div className="jarvis-ring-outer" style={{
                                        position: 'absolute',
                                        inset: -3,
                                        borderRadius: '50%',
                                        border: '2px dashed #C9A227',
                                        animation: 'jarvisOrbRotate 6s linear infinite'
                                    }} />

                                    <div className="jarvis-ring-inner" style={{
                                        position: 'absolute',
                                        inset: 3,
                                        borderRadius: '50%',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderTopColor: '#f59e0b',
                                        borderBottomColor: '#f59e0b',
                                        animation: 'jarvisOrbRotateReverse 3s linear infinite'
                                    }} />

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
                                        animation: hablando ? 'jarvisPulseCore 0.7s infinite alternate' : 'none'
                                    }}>
                                        {escuchando ? (
                                            <IconMicrofono style={{ width: 14, height: 14, color: '#fff' }} />
                                        ) : (
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px #fff' }} />
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
                                        <span>J.A.R.V.I.S.</span>
                                        <span style={{
                                            fontSize: 9.5,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: 'rgba(245, 158, 11, 0.2)',
                                            color: '#f59e0b',
                                            border: '1px solid rgba(245, 158, 11, 0.4)',
                                            fontWeight: 800
                                        }}>
                                            MCP • WEB • RED
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: '50%',
                                            background: '#10b981',
                                            boxShadow: '0 0 8px currentColor'
                                        }} />
                                        <span>
                                            {usuariosOnline.length} miembro(s) en red
                                        </span>
                                    </div>
                                </div>
                            </div>

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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10, height: 14 }}>
                            {audioFrecuencia.map((alt, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 3,
                                        height: `${alt}px`,
                                        background: hablando ? '#f59e0b' : (escuchando ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'),
                                        borderRadius: 2,
                                        transition: 'height 0.1s ease'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* BARRA DE PERSONAS EN LÍNEA EN LA RED */}
                    {usuariosOnline.length > 0 && (
                        <div style={{
                            padding: '6px 12px',
                            background: '#070a10',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            overflowX: 'auto'
                        }}>
                            <span style={{ fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>En red:</span>
                            {usuariosOnline.map(u => (
                                <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => enviarMensaje(`Preguntale a ${u.nombre} si ya revisó el stock`)}
                                    title={`Click para pedirle a Jarvis que le consulte a ${u.nombre}`}
                                    style={{
                                        background: u.id === usuario?.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        border: `1px solid ${u.id === usuario?.id ? '#3b82f6' : '#10b981'}`,
                                        color: u.id === usuario?.id ? '#93c5fd' : '#6ee7b7',
                                        padding: '2px 8px',
                                        borderRadius: 12,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                    <span>{u.nombre} {u.id === usuario?.id ? '(Vos)' : ''}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* BANNER DE CONSULTA ENTRANTE DIRIGIDA AL USUARIO ACTUAL */}
                    {consultaPendienteParaMi && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
                            padding: '10px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                                🔔 Jarvis te pregunta por solicitud del equipo:
                            </div>
                            <div style={{ fontSize: 13, color: '#fff' }}>
                                "{consultaPendienteParaMi.consulta}"
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <input
                                    type="text"
                                    value={respuestaMiTexto}
                                    onChange={(e) => setRespuestaMiTexto(e.target.value)}
                                    placeholder="Tu respuesta inmediata para Jarvis..."
                                    style={{
                                        flex: 1,
                                        background: '#0d111a',
                                        border: '1px solid #f59e0b',
                                        borderRadius: 6,
                                        padding: '6px 10px',
                                        color: '#fff',
                                        fontSize: 12
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') responderConsultaEnRed();
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={responderConsultaEnRed}
                                    style={{
                                        background: '#f59e0b',
                                        border: 'none',
                                        color: '#000',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Responder
                                </button>
                            </div>
                        </div>
                    )}

                    {/* BANNER DE ALERTA MCP */}
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
                            <span>⚠️ {alertasBanner}</span>
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
                                    {/* BADGE DE ORIGEN / FUENTE EN MENSAJES DE JARVIS */}
                                    {!esUsuario && msg.fuente && (
                                        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{
                                                fontSize: 9.5,
                                                padding: '2px 7px',
                                                borderRadius: 4,
                                                fontWeight: 800,
                                                letterSpacing: 0.3,
                                                background: msg.fuente.includes('dolar')
                                                    ? 'rgba(245, 158, 11, 0.2)'
                                                    : (msg.fuente.includes('clima')
                                                        ? 'rgba(6, 182, 212, 0.2)'
                                                        : (msg.fuente.includes('sentry')
                                                            ? 'rgba(239, 68, 68, 0.2)'
                                                            : (msg.fuente.includes('red')
                                                                ? 'rgba(16, 185, 129, 0.2)'
                                                                : 'rgba(147, 51, 234, 0.2)'))),
                                                color: msg.fuente.includes('dolar')
                                                    ? '#fbbf24'
                                                    : (msg.fuente.includes('clima')
                                                        ? '#38bdf8'
                                                        : (msg.fuente.includes('sentry')
                                                            ? '#f87171'
                                                            : (msg.fuente.includes('red')
                                                                ? '#34d399'
                                                                : '#c084fc'))),
                                                border: `1px solid ${msg.fuente.includes('dolar') ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`
                                            }}>
                                                {msg.fuente === 'web_dolar' && '🌐 DÓLAR EN VIVO'}
                                                {msg.fuente === 'web_clima' && '🌦️ SATELITAL EN VIVO'}
                                                {msg.fuente === 'web_busqueda' && '🌐 BÚSQUEDA WEB'}
                                                {msg.fuente === 'mcp_estrategico' && '📊 ESTRATEGIA HOLÍSTICA'}
                                                {msg.fuente === 'sentry_autonomo' && '🛡️ SENTRY 24/7'}
                                                {msg.fuente === 'red_local' && '⚡ RED DE TERMINALES'}
                                                {msg.fuente === 'mcp_db' && '🔒 VALIDACIÓN MCP'}
                                                {msg.fuente === 'mcp_stock_predictivo' && '📈 PREDICCIÓN RUNWAY'}
                                                {msg.fuente === 'mcp_alertas' && '⚠️ AUDITORÍA MCP'}
                                                {msg.fuente === 'mcp_cuentas_corrientes' && '💳 RIESGO CREDITICIO'}
                                                {msg.fuente === 'mcp_produccion' && '🏭 SIMULACIÓN LOTE'}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{
                                        maxWidth: '88%',
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

                                        {/* DESGLOSE ANALÍTICO CHAIN-OF-THOUGHT (CoT) */}
                                        {!esUsuario && msg.razonamiento_pasos && msg.razonamiento_pasos.length > 0 && (
                                            <div style={{ marginTop: 10, borderTop: '1px dashed rgba(245, 158, 11, 0.3)', paddingTop: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePasos(index)}
                                                    style={{
                                                        background: 'rgba(245, 158, 11, 0.1)',
                                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                                        color: '#f59e0b',
                                                        borderRadius: 6,
                                                        padding: '3px 8px',
                                                        fontSize: 10.5,
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}
                                                >
                                                    <span>🧠</span>
                                                    <span>{pasosAbiertos[index] ? 'Ocultar Razonamiento Analítico (CoT)' : 'Ver Razonamiento Chain-of-Thought (3 pasos)'}</span>
                                                    <span style={{ fontSize: 9 }}>{pasosAbiertos[index] ? '▲' : '▼'}</span>
                                                </button>

                                                {pasosAbiertos[index] && (
                                                    <div style={{
                                                        marginTop: 8,
                                                        padding: '10px 12px',
                                                        borderRadius: 8,
                                                        background: 'rgba(10, 15, 26, 0.85)',
                                                        border: '1px solid rgba(245, 158, 11, 0.25)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 8
                                                    }}>
                                                        {msg.razonamiento_pasos.map((p, pIdx) => (
                                                            <div key={pIdx} style={{ fontSize: 11.5 }}>
                                                                <div style={{
                                                                    fontWeight: 800,
                                                                    color: '#f59e0b',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    marginBottom: 3
                                                                }}>
                                                                    <span>{p.icono}</span>
                                                                    <span>Paso {p.paso}: {p.fase}</span>
                                                                </div>
                                                                <div style={{ color: '#cbd5e1', lineHeight: 1.4, paddingLeft: 18 }}>
                                                                    {p.detalle}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

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
                                J.A.R.V.I.S. consultando red y base de datos...
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
                            placeholder="Preguntale a alguien del equipo o a J.A.R.V.I.S..."
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
