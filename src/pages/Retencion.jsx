import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import useKanbanSocket from '../hooks/useKanbanSocket';
import { formatearFecha, formatearHora } from '../utils/fechas';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

function formatMinutos(mins) {
    if (mins < 60) return `hace ${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h < 24) return `hace ${h}h ${m}m`;
    const d = Math.floor(h / 24);
    return `hace ${d} día(s)`;
}

export default function Retencion() {
    const [tab, setTab] = useState('carritos'); // 'carritos' | 'reposicion' | 'cupones'
    const [resumen, setResumen] = useState({
        carritos: { abandonados: 0, notificados: 0, recuperados: 0, monto_recuperable: 0, monto_recuperado: 0 },
        reposicion: { pendientes: 0, enviados: 0, convertidos: 0 },
        cupones: { activos: 0, usados: 0 }
    });
    const [carritos, setCarritos] = useState([]);
    const [reposiciones, setReposiciones] = useState([]);
    const [cupones, setCupones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [escaneando, setEscaneando] = useState(false);
    const [enviandoId, setEnviandoId] = useState(null);
    const [filtroCarrito, setFiltroCarrito] = useState('todos');
    const [filtroRepo, setFiltroRepo] = useState('todos');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Configuración rápida al elegir "CON Cupón"
    const [cupPorcentaje, setCupPorcentaje] = useState(10);
    const [cupDias, setCupDias] = useState(7);

    // Modal crear cupón manual
    const [modalCuponOpen, setModalCuponOpen] = useState(false);
    const [nuevoCupon, setNuevoCupon] = useState({
        codigo: '',
        tipo_descuento: 'porcentaje',
        valor_descuento: 10,
        usos_maximos: 1,
        dias_validez: 7
    });

    const cargarTodo = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [resRes, carRes, repRes, cupRes] = await Promise.all([
                client.get('/retencion/resumen'),
                client.get('/retencion/carritos', { params: { estado: filtroCarrito } }),
                client.get('/retencion/reposicion', { params: { estado: filtroRepo } }),
                client.get('/retencion/cupones')
            ]);
            setResumen(resRes.data);
            setCarritos(carRes.data.carritos || []);
            setReposiciones(repRes.data.recordatorios || []);
            setCupones(cupRes.data.cupones || []);
        } catch (err) {
            if (!silent) setError(err.response?.data?.error || 'Error cargando módulo de retención.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filtroCarrito, filtroRepo]);

    useEffect(() => {
        cargarTodo();
    }, [cargarTodo]);

    const handleSocket = useCallback((evento) => {
        if (evento.startsWith('retencion:') || evento === 'pedido_web_nuevo') {
            cargarTodo(true);
        }
    }, [cargarTodo]);

    useKanbanSocket(handleSocket);

    function mostrarMensaje(txt) {
        setMensaje(txt);
        setTimeout(() => setMensaje(''), 5000);
    }

    async function escanearCarritos() {
        setEscaneando(true);
        setError('');
        try {
            const { data } = await client.post('/retencion/cron/carritos-abandonados');
            mostrarMensaje(`✅ Escaneo completado: ${data.detectados || 0} nuevo(s) carrito(s) abandonado(s).`);
            await cargarTodo(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error escaneando carritos.');
        } finally {
            setEscaneando(false);
        }
    }

    async function escanearReposicion() {
        setEscaneando(true);
        setError('');
        try {
            const { data } = await client.post('/retencion/cron/reposicion');
            mostrarMensaje(`✅ Escaneo completado: ${data.detectados || 0} nuevo(s) cliente(s) en ventana 25–30 días.`);
            await cargarTodo(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error escaneando reposiciones.');
        } finally {
            setEscaneando(false);
        }
    }

    async function enviarWhatsAppCarrito(c) {
        if (c.wa_url) {
            window.open(c.wa_url, '_blank');
        } else {
            try {
                await navigator.clipboard.writeText(c.mensaje_whatsapp || '');
                mostrarMensaje('📋 Este carrito no tiene teléfono válido. Mensaje copiado al portapapeles.');
            } catch {}
        }
        if (c.estado === 'abandonado' || c.estado === 'activo') {
            try {
                await client.put(`/retencion/carritos/${c.id}/estado`, { estado: 'notificado' });
                await cargarTodo(true);
            } catch {}
        }
    }

    async function cambiarEstadoCarrito(id, estado) {
        try {
            await client.put(`/retencion/carritos/${id}/estado`, { estado });
            await cargarTodo(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error actualizando carrito.');
        }
    }

    async function enviarWhatsAppReposicion(r, conCupon) {
        setEnviandoId(`${r.id}-${conCupon ? 'cupon' : 'sin'}`);
        setError('');
        try {
            const { data } = await client.post(`/retencion/reposicion/${r.id}/preparar-envio`, {
                con_cupon: conCupon,
                porcentaje: Number(cupPorcentaje) || 10,
                dias_validez: Number(cupDias) || 7
            });

            if (data.wa_url) {
                window.open(data.wa_url, '_blank');
                mostrarMensaje(
                    conCupon
                        ? `🎁 WhatsApp abierto CON cupón ${data.cupon?.codigo} (${data.cupon?.valor_descuento}% OFF).`
                        : `📲 WhatsApp abierto SIN cupón (link de recompra directa).`
                );
            } else {
                try {
                    await navigator.clipboard.writeText(data.mensaje_whatsapp || data.enlace || '');
                    mostrarMensaje('📋 El cliente no tiene teléfono cargado. Mensaje y enlace copiados al portapapeles.');
                } catch {}
            }
            await cargarTodo(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error preparando envío de reposición.');
        } finally {
            setEnviandoId(null);
        }
    }

    async function cambiarEstadoReposicion(id, estado) {
        try {
            await client.put(`/retencion/reposicion/${id}/estado`, { estado });
            await cargarTodo(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error actualizando recordatorio.');
        }
    }

    async function crearCuponManual(e) {
        e.preventDefault();
        setError('');
        try {
            const { data } = await client.post('/retencion/cupones', nuevoCupon);
            setModalCuponOpen(false);
            setNuevoCupon({ codigo: '', tipo_descuento: 'porcentaje', valor_descuento: 10, usos_maximos: 1, dias_validez: 7 });
            mostrarMensaje(`🎟️ Cupón ${data.cupon.codigo} creado correctamente.`);
            await cargarTodo(true);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo crear el cupón.');
        }
    }

    async function toggleCupon(id) {
        try {
            await client.put(`/retencion/cupones/${id}/toggle`);
            await cargarTodo(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error cambiando estado del cupón.');
        }
    }

    return (
        <div className="stack gap-lg">
            {/* CABECERA */}
            <div className="spread page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
                        Retención y Recuperación de Ventas
                    </h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Carritos abandonados (&gt;90 min) y recordatorios de reposición (25–30 días) con envío opcional CON o SIN cupón.
                    </p>
                </div>
                <div className="row gap-xs" style={{ flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={escanearCarritos}
                        disabled={escaneando}
                    >
                        {escaneando ? 'Escaneando...' : '🔄 Escanear Carritos'}
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={escanearReposicion}
                        disabled={escaneando}
                    >
                        {escaneando ? 'Escaneando...' : '🔁 Buscar Reposiciones (25–30d)'}
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setModalCuponOpen(true)}
                    >
                        + Crear Cupón
                    </button>
                </div>
            </div>

            {error && <div className="alert-banner error">{error}</div>}
            {mensaje && <div className="alert-banner success">{mensaje}</div>}

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #F59E0B' }}>
                    <div className="muted text-xs" style={{ fontWeight: 700 }}>🛒 CARRITOS POR RECUPERAR</div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                        {(resumen.carritos?.abandonados || 0) + (resumen.carritos?.notificados || 0)}
                    </div>
                    <div className="text-xs muted">
                        Potencial: <strong className="mono">{fmtMoney(resumen.carritos?.monto_recuperable)}</strong>
                    </div>
                </div>

                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10B981' }}>
                    <div className="muted text-xs" style={{ fontWeight: 700 }}>💰 CARRITOS RECUPERADOS</div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: '#059669' }}>
                        {resumen.carritos?.recuperados || 0}
                    </div>
                    <div className="text-xs muted">
                        Facturado: <strong className="mono">{fmtMoney(resumen.carritos?.monto_recuperado)}</strong>
                    </div>
                </div>

                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3B82F6' }}>
                    <div className="muted text-xs" style={{ fontWeight: 700 }}>🔁 REPOSICIÓN (25–30 DÍAS)</div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: '#1D4ED8' }}>
                        {resumen.reposicion?.pendientes || 0}
                    </div>
                    <div className="text-xs muted">
                        Enviados: {resumen.reposicion?.enviados || 0} · Convertidos: {resumen.reposicion?.convertidos || 0}
                    </div>
                </div>

                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #8B5CF6' }}>
                    <div className="muted text-xs" style={{ fontWeight: 700 }}>🎟️ CUPONES VIGENTES</div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: '#6D28D9' }}>
                        {resumen.cupones?.activos || 0}
                    </div>
                    <div className="text-xs muted">Canjeados en web: {resumen.cupones?.usados || 0}</div>
                </div>
            </div>

            {/* PESTAÑAS */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                <button
                    className={`btn btn-sm ${tab === 'carritos' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTab('carritos')}
                >
                    🛒 Carritos Abandonados ({carritos.length})
                </button>
                <button
                    className={`btn btn-sm ${tab === 'reposicion' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTab('reposicion')}
                >
                    🔁 Reposición 25–30 días ({reposiciones.length})
                </button>
                <button
                    className={`btn btn-sm ${tab === 'cupones' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTab('cupones')}
                >
                    🎟️ Cupones ({cupones.length})
                </button>
            </div>

            {/* CONTENIDO TAB 1: CARRITOS ABANDONADOS */}
            {tab === 'carritos' && (
                <div className="card">
                    <div className="spread" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
                        <div className="row gap-xs" style={{ flexWrap: 'wrap' }}>
                            {[
                                { k: 'todos', label: 'Todos activos' },
                                { k: 'abandonado', label: '🟠 Abandonados (>90m)' },
                                { k: 'notificado', label: '📲 Contactados' },
                                { k: 'activo', label: '⏳ Navegando (<90m)' },
                                { k: 'recuperado', label: '✅ Recuperados' }
                            ].map(f => (
                                <button
                                    key={f.k}
                                    className={`btn btn-xs ${filtroCarrito === f.k ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setFiltroCarrito(f.k)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente / Contacto</th>
                                    <th>Zona / Dirección</th>
                                    <th>Productos en el Carrito</th>
                                    <th className="text-right">Total</th>
                                    <th>Inactividad</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 24 }}>Cargando carritos...</td></tr>
                                ) : carritos.length === 0 ? (
                                    <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>No hay carritos registrados con este filtro todavía.</td></tr>
                                ) : carritos.map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{c.cliente_nombre || 'Visitante Web'}</div>
                                            {c.telefono && <div className="mono text-xs muted">📞 {c.telefono}</div>}
                                            {c.email && <div className="text-xs muted">✉️ {c.email}</div>}
                                        </td>
                                        <td className="text-xs">
                                            <div>{c.zona || '—'}</div>
                                            {c.direccion && <div className="muted">{c.direccion}</div>}
                                        </td>
                                        <td style={{ maxWidth: 300 }}>
                                            {(c.items || []).map((it, idx) => (
                                                <div key={idx} className="text-xs" style={{ marginBottom: 2 }}>
                                                    • <strong>{it.cantidad || 1}x</strong> {it.nombre} {it.escala ? `(${it.escala})` : ''}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="text-right mono" style={{ fontWeight: 700 }}>{fmtMoney(c.total)}</td>
                                        <td className="text-xs muted">{formatMinutos(c.minutos_inactivo)}</td>
                                        <td>
                                            <span className={`badge ${
                                                c.estado === 'abandonado' ? 'badge-warning' :
                                                c.estado === 'notificado' ? 'badge-accent' :
                                                c.estado === 'recuperado' ? 'badge-success' : 'badge-neutral'
                                            }`}>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                                            <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                                {c.estado !== 'recuperado' && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        style={{ background: '#059669', borderColor: '#059669' }}
                                                        onClick={() => enviarWhatsAppCarrito(c)}
                                                    >
                                                        📲 Enviar WhatsApp
                                                    </button>
                                                )}
                                                {c.estado !== 'recuperado' && (
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => cambiarEstadoCarrito(c.id, 'recuperado')}
                                                        title="Marcar manualmente como recuperado"
                                                    >
                                                        ✓
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => cambiarEstadoCarrito(c.id, 'expirado')}
                                                    title="Descartar carrito"
                                                    style={{ color: 'var(--color-danger)' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONTENIDO TAB 2: REPOSICIÓN 25-30 DÍAS (CON ELECCIÓN CON/SIN CUPÓN) */}
            {tab === 'reposicion' && (
                <div className="card">
                    <div className="spread" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 10 }}>
                        <div className="row gap-xs" style={{ flexWrap: 'wrap' }}>
                            {[
                                { k: 'todos', label: 'Todos' },
                                { k: 'pendiente', label: '🟡 Pendientes' },
                                { k: 'enviado', label: '📲 Enviados' },
                                { k: 'convertido', label: '✅ Recompraron' }
                            ].map(f => (
                                <button
                                    key={f.k}
                                    className={`btn btn-xs ${filtroRepo === f.k ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setFiltroRepo(f.k)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="row gap-sm" style={{ alignItems: 'center', fontSize: 12 }}>
                            <span className="muted">Si elegís <strong>CON cupón</strong>:</span>
                            <label className="row gap-xs" style={{ margin: 0 }}>
                                <span>% OFF:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={cupPorcentaje}
                                    onChange={e => setCupPorcentaje(e.target.value)}
                                    style={{ width: 58, padding: '3px 6px' }}
                                />
                            </label>
                            <label className="row gap-xs" style={{ margin: 0 }}>
                                <span>Días validez:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={cupDias}
                                    onChange={e => setCupDias(e.target.value)}
                                    style={{ width: 58, padding: '3px 6px' }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Último Pedido Entregado</th>
                                    <th>Productos Anteriores</th>
                                    <th>Cupón / Enlace</th>
                                    <th>Estado</th>
                                    <th className="text-right">Decidir Envío</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>Cargando clientes para reposición...</td></tr>
                                ) : reposiciones.length === 0 ? (
                                    <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 28 }}>No hay clientes con pedidos entregados hace 25–30 días en este filtro.</td></tr>
                                ) : reposiciones.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{r.cliente_nombre}</div>
                                            <div className="mono text-xs muted">📞 {r.telefono || r.cliente_telefono || 'Sin teléfono'}</div>
                                            {r.cliente_localidad && <div className="text-xs muted">{r.cliente_localidad}</div>}
                                        </td>
                                        <td>
                                            <div className="mono" style={{ fontWeight: 700 }}>{r.remito_numero}</div>
                                            <div className="text-xs muted">{formatearFecha(r.remito_fecha)} · hace <strong>{r.dias_desde_compra} días</strong></div>
                                            <div className="mono text-xs">{fmtMoney(r.remito_total)}</div>
                                        </td>
                                        <td style={{ maxWidth: 270 }}>
                                            {(r.items || []).slice(0, 4).map((it, idx) => (
                                                <div key={idx} className="text-xs">
                                                    • {it.nombre} ({Number(it.cantidad)} {it.unidad_medida || 'kg'})
                                                </div>
                                            ))}
                                            {(r.items || []).length > 4 && (
                                                <div className="text-xs muted">...y {r.items.length - 4} más</div>
                                            )}
                                        </td>
                                        <td>
                                            {r.cupon_codigo ? (
                                                <span className="badge badge-success" style={{ marginBottom: 4 }}>
                                                    🎟️ {r.cupon_codigo} ({r.cupon_valor}% OFF)
                                                </span>
                                            ) : r.estado === 'enviado' ? (
                                                <span className="badge badge-neutral" style={{ marginBottom: 4 }}>Sin cupón</span>
                                            ) : (
                                                <span className="text-xs muted">Elegí al enviar ➔</span>
                                            )}
                                            <div>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-xs"
                                                    style={{ padding: '2px 5px', fontSize: 11 }}
                                                    onClick={() => {
                                                        navigator.clipboard?.writeText(r.enlace_recompra);
                                                        mostrarMensaje('📋 Enlace de recompra copiado.');
                                                    }}
                                                >
                                                    📋 Copiar link 1-clic
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${
                                                r.estado === 'convertido' ? 'badge-success' :
                                                r.estado === 'enviado' ? 'badge-accent' :
                                                r.estado === 'pendiente' ? 'badge-warning' : 'badge-neutral'
                                            }`}>
                                                {r.estado}
                                            </span>
                                            {r.notificado_at && (
                                                <div className="text-xs muted" style={{ marginTop: 2 }}>
                                                    {formatearFecha(r.notificado_at)} {formatearHora(r.notificado_at)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ background: '#059669', borderColor: '#059669' }}
                                                    disabled={enviandoId === `${r.id}-cupon`}
                                                    onClick={() => enviarWhatsAppReposicion(r, true)}
                                                    title={`Generar cupón ${cupPorcentaje}% OFF y abrir WhatsApp`}
                                                >
                                                    {enviandoId === `${r.id}-cupon` ? 'Preparando...' : `🎁 WA CON Cupón (${cupPorcentaje}%)`}
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    disabled={enviandoId === `${r.id}-sin`}
                                                    onClick={() => enviarWhatsAppReposicion(r, false)}
                                                    title="Abrir WhatsApp solo con el link de recompra automática (sin descuento)"
                                                >
                                                    {enviandoId === `${r.id}-sin` ? 'Preparando...' : '📲 WA SIN Cupón'}
                                                </button>
                                                {r.estado !== 'descartado' && r.estado !== 'convertido' && (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => cambiarEstadoReposicion(r.id, 'descartado')}
                                                        style={{ color: 'var(--color-danger)' }}
                                                        title="Descartar"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONTENIDO TAB 3: CUPONES */}
            {tab === 'cupones' && (
                <div className="card">
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Descuento</th>
                                    <th>Cliente Asociado</th>
                                    <th>Usos</th>
                                    <th>Válido Hasta</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cupones.length === 0 ? (
                                    <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>Aún no hay cupones generados.</td></tr>
                                ) : cupones.map(cu => {
                                    const vencido = new Date(cu.valido_hasta) <= new Date();
                                    const agotado = Number(cu.usos_actuales) >= Number(cu.usos_maximos);
                                    return (
                                        <tr key={cu.id}>
                                            <td className="mono" style={{ fontWeight: 800 }}>{cu.codigo}</td>
                                            <td style={{ fontWeight: 700, color: '#059669' }}>
                                                {cu.tipo_descuento === 'monto_fijo' ? fmtMoney(cu.valor_descuento) : `${cu.valor_descuento}% OFF`}
                                            </td>
                                            <td>{cu.cliente_nombre || cu.telefono_cliente || 'Uso general'}</td>
                                            <td className="mono">{cu.usos_actuales} / {cu.usos_maximos}</td>
                                            <td className="text-xs">{formatearFecha(cu.valido_hasta)}</td>
                                            <td>
                                                <span className={`badge ${
                                                    !cu.activo ? 'badge-neutral' :
                                                    agotado ? 'badge-accent' :
                                                    vencido ? 'badge-danger' : 'badge-success'
                                                }`}>
                                                    {!cu.activo ? 'Pausado' : agotado ? 'Canjeado' : vencido ? 'Vencido' : 'Vigente'}
                                                </span>
                                                {cu.pedido_web_numero && (
                                                    <div className="text-xs muted">Usado en {cu.pedido_web_numero}</div>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    className="btn btn-secondary btn-xs"
                                                    onClick={() => toggleCupon(cu.id)}
                                                >
                                                    {cu.activo ? 'Desactivar' : 'Activar'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL CREAR CUPÓN MANUAL */}
            {modalCuponOpen && (
                <Modal title="Crear Cupón de Descuento" onClose={() => setModalCuponOpen(false)} width={460}>
                    <form onSubmit={crearCuponManual} className="stack gap-md">
                        <div className="field">
                            <label>Código del Cupón (opcional, si queda vacío se autogenera)</label>
                            <input
                                placeholder="Ej: PROMO10"
                                value={nuevoCupon.codigo}
                                onChange={e => setNuevoCupon({ ...nuevoCupon, codigo: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="field">
                                <label>Tipo</label>
                                <select
                                    value={nuevoCupon.tipo_descuento}
                                    onChange={e => setNuevoCupon({ ...nuevoCupon, tipo_descuento: e.target.value })}
                                >
                                    <option value="porcentaje">Porcentaje (%)</option>
                                    <option value="monto_fijo">Monto fijo ($)</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Valor *</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={nuevoCupon.valor_descuento}
                                    onChange={e => setNuevoCupon({ ...nuevoCupon, valor_descuento: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="field">
                                <label>Usos máximos</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={nuevoCupon.usos_maximos}
                                    onChange={e => setNuevoCupon({ ...nuevoCupon, usos_maximos: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label>Días de validez</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={nuevoCupon.dias_validez}
                                    onChange={e => setNuevoCupon({ ...nuevoCupon, dias_validez: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalCuponOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Guardar Cupón</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
