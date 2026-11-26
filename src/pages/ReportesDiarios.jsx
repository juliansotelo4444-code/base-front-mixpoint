import { useState, useEffect } from 'react';
import api from '../services/api';
import { IconReporte, IconCheck, IconCopy, IconReloj } from '../components/Icons';

export default function ReportesDiarios() {
    const [fechaSeleccionada, setFechaSeleccionada] = useState('');
    const [reportePreview, setReportePreview] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Configuración de canales
    const [config, setConfig] = useState({
        telegram_bot_token: '',
        telegram_chat_id: '',
        reporte_webhook_url: '',
        alertas_webhook_url: '',
        callmebot_destinatarios: [],
        ultimo_reporte_enviado: null
    });

    function agregarDestinatario() {
        setConfig(prev => ({
            ...prev,
            callmebot_destinatarios: [
                ...(prev.callmebot_destinatarios || []),
                { nombre: '', telefono: '', apikey: '' }
            ]
        }));
    }

    function eliminarDestinatario(idx) {
        setConfig(prev => ({
            ...prev,
            callmebot_destinatarios: (prev.callmebot_destinatarios || []).filter((_, i) => i !== idx)
        }));
    }

    function actualizarDestinatario(idx, campo, valor) {
        setConfig(prev => {
            const list = [...(prev.callmebot_destinatarios || [])];
            list[idx] = { ...list[idx], [campo]: valor };
            return { ...prev, callmebot_destinatarios: list };
        });
    }

    async function cargarPreview(fecha = null) {
        setCargando(true);
        try {
            const query = fecha ? `?fecha=${fecha}` : '';
            const res = await api.get(`/reportes/preview${query}`);
            setReportePreview(res);
            if (!fechaSeleccionada && res.datos?.fecha) {
                setFechaSeleccionada(res.datos.fecha);
            }
        } catch (err) {
            console.error('Error cargando preview del reporte:', err);
        } finally {
            setCargando(false);
        }
    }

    async function cargarConfig() {
        try {
            const res = await api.get('/reportes/config');
            setConfig(res);
        } catch (err) {
            console.error('Error cargando configuración de canales:', err);
        }
    }

    useEffect(() => {
        cargarPreview();
        cargarConfig();
    }, []);

    async function handleEnviarReporte() {
        setEnviando(true);
        setFeedback(null);
        try {
            const res = await api.post('/reportes/enviar', { fecha: fechaSeleccionada });
            setFeedback({
                tipo: 'exito',
                texto: `Reporte enviado con éxito. Canales: ${res.envios?.join(', ') || 'Notificación interna'}`
            });
            cargarConfig();
        } catch (err) {
            setFeedback({ tipo: 'error', texto: err.message || 'Error enviando reporte.' });
        } finally {
            setEnviando(false);
        }
    }

    async function handleGuardarConfig(e) {
        e.preventDefault();
        try {
            await api.post('/reportes/config', config);
            setFeedback({ tipo: 'exito', texto: 'Configuración de canales guardada correctamente.' });
            setTimeout(() => setFeedback(null), 4000);
        } catch (err) {
            setFeedback({ tipo: 'error', texto: 'Error guardando canales: ' + (err.message || '') });
        }
    }

    function copiarTextoWhatsApp() {
        if (!reportePreview?.texto) return;
        navigator.clipboard.writeText(reportePreview.texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
    }

    const fmtDinero = n => `$ ${Number(n || 0).toLocaleString('es-AR')}`;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reportes Diarios Ejecutivos (8:00 AM)</h1>
                    <p className="page-subtitle">
                        Envío matutino automatizado a dispositivos móviles con el balance de ventas, cobranzas y estado de stock.
                    </p>
                </div>
                <div className="row gap-sm">
                    <button
                        className="btn btn-secondary"
                        onClick={copiarTextoWhatsApp}
                        disabled={!reportePreview?.texto}
                    >
                        {copiado ? <IconCheck /> : <IconCopy />}
                        {copiado ? '¡Copiado!' : 'Copiar Texto WhatsApp'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleEnviarReporte}
                        disabled={enviando}
                    >
                        <IconReporte />
                        {enviando ? 'Enviando...' : 'Enviar Reporte Ahora'}
                    </button>
                </div>
            </div>

            {feedback && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 20,
                    background: feedback.tipo === 'exito' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${feedback.tipo === 'exito' ? '#10b981' : '#ef4444'}`,
                    color: feedback.tipo === 'exito' ? '#10b981' : '#ef4444',
                    fontSize: 13
                }}>
                    {feedback.texto}
                </div>
            )}

            {/* BARRA DE ESTADO DE PROGRAMACIÓN */}
            <div className="card" style={{ padding: '14px 18px', marginBottom: 20, background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: 'var(--color-primary-dark)' }}>
                        <IconReloj style={{ width: 22, height: 22 }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                            Programación Diaria: Todos los días a las 08:00 AM (Hora Argentina)
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                            {config.ultimo_reporte_enviado ? `Último reporte automático emitido: ${config.ultimo_reporte_enviado}` : 'Aún no se ha registrado envío automático hoy.'}
                        </div>
                    </div>
                </div>

                <div className="row gap-xs" style={{ alignItems: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>Fecha de reporte:</label>
                    <input
                        type="date"
                        className="form-control"
                        value={fechaSeleccionada}
                        onChange={(e) => {
                            setFechaSeleccionada(e.target.value);
                            cargarPreview(e.target.value);
                        }}
                        style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                    />
                </div>
            </div>

            <div className="grid-2 gap-md" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                {/* VISTA PREVIA FORMATO WHATSAPP / MÓVIL */}
                <div className="card" style={{ padding: 20, background: '#FFFFFF' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
                        Vista Previa del Mensaje Matutino (WhatsApp)
                    </h2>

                    {cargando ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Generando balance...</div>
                    ) : (
                        <div style={{
                            background: '#EFEAE2',
                            border: '1px solid #D1D7DB',
                            borderRadius: 12,
                            padding: 18,
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5,
                            color: '#111B21',
                            fontSize: 13,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            maxHeight: 520,
                            overflowY: 'auto'
                        }}>
                            {reportePreview?.texto || 'No hay datos para esta fecha.'}
                        </div>
                    )}
                </div>

                {/* CONFIGURACIÓN DE CANALES EXTERNOS */}
                <div className="card" style={{ padding: 20, background: '#FFFFFF' }}>
                    <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                                Canales de Envío a Celulares (8:00 AM)
                            </h2>
                            <p className="text-xs muted" style={{ marginTop: 2 }}>
                                Configuración de WhatsApp directo (CallMeBot) y canales adicionales.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleGuardarConfig}>
                        {/* SECCIÓN WHATSAPP CALLMEBOT DIRECTO */}
                        <div style={{
                            background: '#F0FDF4',
                            border: '1.5px solid #86EFAC',
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 20
                        }}>
                            <div className="spread" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 22 }}>📲</span>
                                    <div>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#166534' }}>
                                            WhatsApp Directo (CallMeBot)
                                        </h3>
                                        <p style={{ fontSize: 11.5, margin: 0, color: '#15803D' }}>
                                            Envío matutino directo a cada celular personal
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href="https://wa.me/34623786449?text=I%20allow%20callmebot%20to%20send%20me%20messages"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm"
                                    style={{
                                        background: '#25D366',
                                        color: '#FFFFFF',
                                        fontWeight: 700,
                                        border: 'none',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 12px',
                                        borderRadius: 6
                                    }}
                                >
                                    💬 Abrir Chat de Activación en WhatsApp
                                </a>
                            </div>

                            {/* GUÍA DE 3 PASOS */}
                            <div style={{
                                background: '#FFFFFF',
                                border: '1px solid #BBF7D0',
                                borderRadius: 8,
                                padding: '10px 14px',
                                marginBottom: 14,
                                fontSize: 12,
                                lineHeight: 1.5,
                                color: '#1F2937'
                            }}>
                                <strong style={{ color: '#166534' }}>¿Cómo activar un celular en 3 pasos?</strong>
                                <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                                    <li>Hacé clic en el botón verde arriba (o agendá al <code>+34 623 78 64 49</code> en WhatsApp).</li>
                                    <li>Enviá el mensaje: <code>I allow callmebot to send me messages</code></li>
                                    <li>CallMeBot te responderá con tu <strong>apikey</strong>. Agregá tu celular y esa apikey en la lista de abajo.</li>
                                </ol>
                            </div>

                            {/* LISTADO DE DESTINATARIOS */}
                            {(config.callmebot_destinatarios || []).length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '14px',
                                    background: '#FFFFFF',
                                    borderRadius: 6,
                                    border: '1px dashed #86EFAC',
                                    color: '#15803D',
                                    fontSize: 12
                                }}>
                                    No hay celulares cargados aún. Tocá el botón "+ Agregar Celular" para dar de alta el tuyo.
                                </div>
                            ) : (
                                <div className="stack gap-xs">
                                    {(config.callmebot_destinatarios || []).map((dest, idx) => (
                                        <div key={idx} style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto',
                                            gap: 8,
                                            background: '#FFFFFF',
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #D1FAE5',
                                            alignItems: 'center'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="Nombre (ej: Julián)"
                                                value={dest.nombre || ''}
                                                onChange={e => actualizarDestinatario(idx, 'nombre', e.target.value)}
                                                style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #CBD5E1', width: '100%' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Tel: 54911xxxxxxxx"
                                                value={dest.telefono || ''}
                                                onChange={e => actualizarDestinatario(idx, 'telefono', e.target.value)}
                                                title="Formato internacional sin el +, ej: 5491157077061"
                                                style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #CBD5E1', width: '100%' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="ApiKey (números)"
                                                value={dest.apikey || ''}
                                                onChange={e => actualizarDestinatario(idx, 'apikey', e.target.value)}
                                                style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #CBD5E1', width: '100%' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => eliminarDestinatario(idx)}
                                                className="btn btn-ghost btn-sm"
                                                style={{ color: '#EF4444', padding: '4px 8px', fontSize: 16 }}
                                                title="Eliminar este número"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={agregarDestinatario}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: 12, border: '1px solid #86EFAC', background: '#FFFFFF', color: '#166534', fontWeight: 600 }}
                                >
                                    + Agregar Celular
                                </button>
                            </div>
                        </div>

                        {/* OTROS CANALES (TELEGRAM Y WEBHOOK) */}
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--color-text)' }}>
                                Canales Alternativos Opcionales
                            </div>

                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                                    Telegram Bot Token (Opcional)
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={config.telegram_bot_token}
                                    onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
                                    placeholder="123456789:ABCdefGhIJKlmNoPQRstuvWXyz"
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--color-border-strong)' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                                    Telegram Chat ID (Grupo o usuario)
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={config.telegram_chat_id}
                                    onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
                                    placeholder="-1001234567890 o 98765432"
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--color-border-strong)' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                                    Webhook WhatsApp / Integrador Make, Zapier (Opcional)
                                </label>
                                <input
                                    type="url"
                                    className="form-control"
                                    value={config.reporte_webhook_url}
                                    onChange={(e) => setConfig({ ...config, reporte_webhook_url: e.target.value })}
                                    placeholder="https://api.gateway-whatsapp.com/v1/messages"
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--color-border-strong)' }}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 700 }}>
                            💾 Guardar Canales de Notificación
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
