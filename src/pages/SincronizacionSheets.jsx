import { useState, useEffect } from 'react';
import api from '../services/api';
import { IconSync, IconCheck, IconCopy, IconAlerta } from '../components/Icons';

export default function SincronizacionSheets() {
    const [config, setConfig] = useState({
        catalogo_url: '',
        pedidos_url: '',
        script_url: '',
        webhook_token: 'MIXPOINT_SECRET_KEY',
        auto_sync_interval: '5'
    });
    const [appsScriptCode, setAppsScriptCode] = useState('');
    const [logs, setLogs] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const [mensajeFeedback, setMensajeFeedback] = useState(null);
    const [copiado, setCopiado] = useState(false);

    async function cargarDatos() {
        setCargando(true);
        try {
            const [cfgData, codeData, logsData] = await Promise.all([
                api.get('/integraciones/config'),
                api.get('/integraciones/apps-script-code'),
                api.get('/integraciones/sync-logs')
            ]);
            setConfig(cfgData);
            setAppsScriptCode(codeData.code || '');
            setLogs(logsData.logs || []);
        } catch (err) {
            console.error('Error cargando datos de integración:', err);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    async function handleGuardarConfig(e) {
        e.preventDefault();
        try {
            await api.post('/integraciones/config', config);
            setMensajeFeedback({ tipo: 'exito', texto: 'Configuración guardada correctamente.' });
            setTimeout(() => setMensajeFeedback(null), 4000);
            cargarDatos();
        } catch (err) {
            setMensajeFeedback({ tipo: 'error', texto: 'Error guardando configuración: ' + (err.message || '') });
        }
    }

    async function ejecutarSyncBidireccional() {
        setSincronizando(true);
        setMensajeFeedback(null);
        try {
            const res = await api.post('/integraciones/sync-bidireccional', {
                catalogo_url: config.catalogo_url,
                script_url: config.script_url
            });
            setMensajeFeedback({
                tipo: 'exito',
                texto: `Sincronización completada en ${res.duracion}. ${res.logs?.join(' ')}`
            });
            cargarDatos();
        } catch (err) {
            setMensajeFeedback({ tipo: 'error', texto: 'Error en sincronización: ' + (err.message || '') });
        } finally {
            setSincronizando(false);
        }
    }

    function copiarCodigo() {
        if (!appsScriptCode) return;
        navigator.clipboard.writeText(appsScriptCode);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sincronización con Google Sheets</h1>
                    <p className="page-subtitle">
                        Mantené tu hoja de cálculo habitual como panel de carga sincronizada en tiempo real con Mix Point.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={ejecutarSyncBidireccional}
                    disabled={sincronizando}
                >
                    <IconSync className={sincronizando ? 'spinner' : ''} />
                    {sincronizando ? 'Sincronizando...' : 'Sincronizar Todo Ahora'}
                </button>
            </div>

            {mensajeFeedback && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 20,
                    background: mensajeFeedback.tipo === 'exito' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${mensajeFeedback.tipo === 'exito' ? '#10b981' : '#ef4444'}`,
                    color: mensajeFeedback.tipo === 'exito' ? '#10b981' : '#ef4444',
                    fontSize: 13.5
                }}>
                    {mensajeFeedback.texto}
                </div>
            )}

            <div className="grid-2 gap-md" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                {/* PANEL 1: CONFIGURACIÓN DE ENLACES */}
                <div className="card" style={{ padding: 20 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Configuración de Hojas y Webhooks</h2>
                    <form onSubmit={handleGuardarConfig}>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                                Enlace Google Sheets (Catálogo / Productos)
                            </label>
                            <input
                                type="url"
                                className="form-control"
                                value={config.catalogo_url}
                                onChange={(e) => setConfig({ ...config, catalogo_url: e.target.value })}
                                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                                Enlace Google Sheets (Pedidos Web)
                            </label>
                            <input
                                type="url"
                                className="form-control"
                                value={config.pedidos_url}
                                onChange={(e) => setConfig({ ...config, pedidos_url: e.target.value })}
                                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                                Webhook Apps Script (Para que Mix Point actualice stock en tu Sheet)
                            </label>
                            <input
                                type="url"
                                className="form-control"
                                value={config.script_url}
                                onChange={(e) => setConfig({ ...config, script_url: e.target.value })}
                                placeholder="https://script.google.com/macros/s/.../exec"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                            />
                            <span style={{ fontSize: 11.5, color: '#8e9aa8' }}>
                                Obtenés esta URL al hacer "Implementar como Aplicación Web" en Apps Script.
                            </span>
                        </div>

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                                Token Secreto de Seguridad (x-mixpoint-token)
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={config.webhook_token}
                                onChange={(e) => setConfig({ ...config, webhook_token: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6 }}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            Guardar Configuración
                        </button>
                    </form>
                </div>

                {/* PANEL 2: INSTALACIÓN EN GOOGLE APPS SCRIPT */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Conector Google Apps Script</h2>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={copiarCodigo}
                            style={{ color: copiado ? '#10b981' : 'var(--color-primary)' }}
                        >
                            {copiado ? <IconCheck /> : <IconCopy />}
                            {copiado ? '¡Copiado!' : 'Copiar Código'}
                        </button>
                    </div>

                    <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 12 }}>
                        Pegá este código en tu Google Sheet para agregar el menú <strong>🌱 Mix Point</strong> con sincronización automática en cada edición:
                    </div>

                    <ol style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 18, marginBottom: 14, lineHeight: 1.6 }}>
                        <li>En tu hoja de cálculo, ve a <strong>Extensiones &gt; Apps Script</strong>.</li>
                        <li>Borra todo el contenido y pega el bloque inferior.</li>
                        <li>Haz clic en <strong>Implementar &gt; Nueva implementación</strong> (Tipo: Aplicación Web, Acceso: Cualquier persona).</li>
                        <li>Copia la URL generada y pégala en el campo <em>Webhook Apps Script</em> de la izquierda.</li>
                        <li>¡Listo! Tu hoja ahora se sincroniza en vivo con la base de datos.</li>
                    </ol>

                    <pre style={{
                        background: '#0e111a',
                        padding: 12,
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#a5b4fc',
                        overflowX: 'auto',
                        maxHeight: 180,
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        <code>{appsScriptCode}</code>
                    </pre>
                </div>
            </div>

            {/* HISTORIAL DE LOGS DE SINCRONIZACIÓN */}
            <div className="card" style={{ marginTop: 24, padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Historial de Sincronizaciones</h2>
                {logs.length === 0 ? (
                    <div style={{ color: '#8e9aa8', fontSize: 13, padding: '16px 0' }}>No hay registros de sincronización recientes.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', fontSize: 12.5 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 10px' }}>Fecha</th>
                                    <th style={{ padding: '8px 10px' }}>Tipo</th>
                                    <th style={{ padding: '8px 10px' }}>Resultado</th>
                                    <th style={{ padding: '8px 10px' }}>Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => {
                                    const esOk = log.resultado === 'exito';
                                    const esError = log.resultado === 'error';
                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '8px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                {new Date(log.fecha).toLocaleString('es-AR')}
                                            </td>
                                            <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>
                                                {log.tipo}
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: esOk ? 'rgba(16, 185, 129, 0.15)' : (esError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                                                    color: esOk ? '#10b981' : (esError ? '#ef4444' : '#f59e0b')
                                                }}>
                                                    {log.resultado.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 10px', color: '#cbd5e1', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.detalles}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
