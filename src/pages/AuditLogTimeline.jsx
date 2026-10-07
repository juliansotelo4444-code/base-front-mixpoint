import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatearFecha } from '../utils/fechas';

function getAccionColor(accion = '') {
    const acc = accion.toUpperCase();
    if (acc.includes('CREO') || acc.includes('ALTA')) {
        return { bg: '#ECFDF5', text: '#065F46', border: '#10B981', icon: '✨' };
    }
    if (acc.includes('EDITO') || acc.includes('MODIFICO')) {
        return { bg: '#FFFBEB', text: '#92400E', border: '#F59E0B', icon: '✏️' };
    }
    if (acc.includes('TOMO') || acc.includes('ASIGNO')) {
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6', icon: '📦' };
    }
    if (acc.includes('LIBERO')) {
        return { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF', icon: '🔓' };
    }
    if (acc.includes('ESTADO') || acc.includes('KANBAN') || acc.includes('MOVER')) {
        return { bg: '#F5F3FF', text: '#5B21B6', border: '#8B5CF6', icon: '🔄' };
    }
    if (acc.includes('ELIMIN') || acc.includes('CANCEL') || acc.includes('ANUL')) {
        return { bg: '#FEF2F2', text: '#991B1B', border: '#EF4444', icon: '🚫' };
    }
    return { bg: '#F8FAFC', text: '#334155', border: '#94A3B8', icon: '📋' };
}

export default function AuditLogTimeline() {
    const [logs, setLogs] = useState([]);
    const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, limite: 20, totalPaginas: 1 });
    const [cargando, setCargando] = useState(false);
    const [expandidoId, setExpandidoId] = useState(null);

    // Filtros
    const [entidad, setEntidad] = useState('');
    const [accion, setAccion] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [q, setQ] = useState('');

    async function cargarLogs(pagina = 1) {
        setCargando(true);
        try {
            const params = {
                pagina,
                limite: 20,
                entidad: entidad || undefined,
                accion: accion || undefined,
                desde: desde || undefined,
                hasta: hasta || undefined,
                q: q || undefined
            };
            const res = await api.get('/audit-logs', { params });
            setLogs(res.logs || []);
            setPaginacion(res.paginacion || { total: 0, pagina: 1, limite: 20, totalPaginas: 1 });
        } catch (err) {
            console.error('Error al cargar logs de auditoría:', err);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarLogs(1);
    }, [entidad, accion, desde, hasta]);

    const handleBuscarSubmit = (e) => {
        e.preventDefault();
        cargarLogs(1);
    };

    const limpiarFiltros = () => {
        setEntidad('');
        setAccion('');
        setDesde('');
        setHasta('');
        setQ('');
    };

    return (
        <div className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
            {/* ENCABEZADO */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--color-primary-dark, #1A382B)' }}>
                        🛡️ Historial de Actividad y Auditoría
                    </h1>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted, #666)', fontSize: 14 }}>
                        Trazabilidad completa, inmutable y en tiempo real de operaciones críticas en Mix Point.
                    </p>
                </div>
                <div style={{ background: 'rgba(26, 56, 43, 0.08)', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    Total de registros: <strong>{paginacion.total}</strong>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="card" style={{ padding: 18, marginBottom: 24, background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)' }}>
                <form onSubmit={handleBuscarSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Búsqueda libre</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar usuario, IP, texto..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            style={{ width: '100%', fontSize: 13 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Entidad</label>
                        <select className="input" value={entidad} onChange={(e) => setEntidad(e.target.value)} style={{ width: '100%', fontSize: 13 }}>
                            <option value="">Todas las entidades</option>
                            <option value="remitos">Remitos / Pedidos</option>
                            <option value="productos">Productos</option>
                            <option value="clientes">Clientes</option>
                            <option value="usuarios">Usuarios</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Acción</label>
                        <select className="input" value={accion} onChange={(e) => setAccion(e.target.value)} style={{ width: '100%', fontSize: 13 }}>
                            <option value="">Todas las acciones</option>
                            <option value="CREO_REMITO">Nuevo Pedido (Creación)</option>
                            <option value="EDITO_REMITO">Edición de Remito (ACID)</option>
                            <option value="CAMBIO_ESTADO_REMITO">Cambio de Estado</option>
                            <option value="TOMO_PEDIDO_DEPOSITO">Tomó Pedido Depósito</option>
                            <option value="LIBERO_PEDIDO_DEPOSITO">Liberó Pedido Depósito</option>
                            <option value="MOVER_ESTADO_KANBAN">Movimiento Kanban</option>
                            <option value="BATCH_CAMBIO_ESTADO_DEPOSITO">Acción por Lote</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Desde</label>
                        <input
                            type="date"
                            className="input"
                            value={desde}
                            onChange={(e) => setDesde(e.target.value)}
                            style={{ width: '100%', fontSize: 13 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Hasta</label>
                        <input
                            type="date"
                            className="input"
                            value={hasta}
                            onChange={(e) => setHasta(e.target.value)}
                            style={{ width: '100%', fontSize: 13 }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: 13 }}>
                            🔍 Filtrar
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={limpiarFiltros} title="Limpiar filtros" style={{ fontSize: 13 }}>
                            ✕
                        </button>
                    </div>
                </form>
            </div>

            {/* TIMELINE VISUAL */}
            {cargando ? (
                <div style={{ textAlign: 'center', padding: 50, color: '#888' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                    <div>Cargando auditoría en tiempo real...</div>
                </div>
            ) : logs.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: '#666' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                    <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron registros con los filtros seleccionados.</p>
                </div>
            ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                    {/* Línea vertical de la línea temporal */}
                    <div style={{
                        position: 'absolute',
                        top: 12,
                        bottom: 12,
                        left: 11,
                        width: 2,
                        background: 'linear-gradient(to bottom, #10B981, #3B82F6, #8B5CF6, #E5E7EB)'
                    }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {logs.map((log) => {
                            const config = getAccionColor(log.accion);
                            const estaExpandido = expandidoId === log.id;
                            const fecha = new Date(log.created_at);
                            const fechaTexto = fecha.toLocaleString('es-AR', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            });

                            return (
                                <div key={log.id} style={{ position: 'relative' }}>
                                    {/* Nodo circular en la línea */}
                                    <div style={{
                                        position: 'absolute',
                                        left: -23,
                                        top: 18,
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: config.border,
                                        border: '3px solid #fff',
                                        boxShadow: `0 0 8px ${config.border}88`
                                    }} />

                                    {/* Tarjeta de actividad con efecto Glassmorphism */}
                                    <div
                                        className="card"
                                        style={{
                                            padding: 16,
                                            borderLeft: `4px solid ${config.border}`,
                                            background: 'var(--color-surface, #ffffff)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setExpandidoId(estaExpandido ? null : log.id)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: config.bg,
                                                    color: config.text,
                                                    border: `1px solid ${config.border}`,
                                                    padding: '3px 10px',
                                                    borderRadius: 16,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}>
                                                    <span>{config.icon}</span>
                                                    <span>{log.accion.replace(/_/g, ' ')}</span>
                                                </span>

                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text, #1F2937)' }}>
                                                    {log.entidad?.toUpperCase()} {log.entidad_id ? `#${log.entidad_id}` : ''}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted, #6B7280)' }}>
                                                <span>🕒 {fechaTexto}</span>
                                                {log.ip_origen && (
                                                    <span style={{ background: 'var(--color-surface-sunken)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                                                        {log.ip_origen}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Usuario y resumen */}
                                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                                <div style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: '50%',
                                                    background: 'var(--color-primary, #1A382B)',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 11,
                                                    fontWeight: 700
                                                }}>
                                                    {(log.usuario_nombre || 'S').charAt(0).toUpperCase()}
                                                </div>
                                                <span><strong>{log.usuario_nombre || 'Sistema / API'}</strong></span>
                                                {log.usuario_rol && (
                                                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-surface-sunken)', padding: '1px 6px', borderRadius: 4 }}>
                                                        {log.usuario_rol}
                                                    </span>
                                                )}
                                            </div>

                                            <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                                                {estaExpandido ? '▲ Menos detalles' : '▼ Ver detalles y cambios'}
                                            </span>
                                        </div>

                                        {/* DETALLE EXPANDIDO / DIFF */}
                                        {estaExpandido && (
                                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)', fontSize: 12.5 }} onClick={(e) => e.stopPropagation()}>
                                                {log.detalles?.motivo && (
                                                    <div style={{ marginBottom: 10, background: '#FEF3C7', color: '#92400E', padding: '6px 12px', borderRadius: 6 }}>
                                                        <strong>Motivo / Nota:</strong> {log.detalles.motivo}
                                                    </div>
                                                )}

                                                {/* Comparativa antes / despues si existe */}
                                                {log.detalles?.antes && log.detalles?.despues ? (
                                                    <div className="audit-diff-grid">
                                                        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: 10, borderRadius: 6 }}>
                                                            <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>🔴 Estado Anterior:</div>
                                                            <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--color-text)' }}>
                                                                {JSON.stringify(log.detalles.antes, null, 2)}
                                                            </pre>
                                                        </div>
                                                        <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: 10, borderRadius: 6 }}>
                                                            <div style={{ fontWeight: 700, color: '#22C55E', marginBottom: 6 }}>🟢 Estado Nuevo:</div>
                                                            <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--color-text)' }}>
                                                                {JSON.stringify(log.detalles.despues, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                                                        <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--color-text)' }}>
                                                            {JSON.stringify(log.detalles, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CONTROLES DE PAGINACIÓN */}
            {paginacion.totalPaginas > 1 && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <button
                        className="btn btn-secondary"
                        disabled={paginacion.pagina <= 1}
                        onClick={() => cargarLogs(paginacion.pagina - 1)}
                        style={{ fontSize: 13 }}
                    >
                        ← Anterior
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                        Página {paginacion.pagina} de {paginacion.totalPaginas}
                    </span>
                    <button
                        className="btn btn-secondary"
                        disabled={paginacion.pagina >= paginacion.totalPaginas}
                        onClick={() => cargarLogs(paginacion.pagina + 1)}
                        style={{ fontSize: 13 }}
                    >
                        Siguiente →
                    </button>
                </div>
            )}
        </div>
    );
}
