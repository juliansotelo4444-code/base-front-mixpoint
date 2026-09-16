import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import RemitoImprimible from '../components/RemitoImprimible';
import { IconBuscar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

export default function PedidosWeb() {
    const [pedidos, setPedidos] = useState([]);
    const [pedidosUrl, setPedidosUrl] = useState('');
    const [configOpen, setConfigOpen] = useState(false);
    const [tempUrl, setTempUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [generandoId, setGenerandoId] = useState(null);
    const [remitoParaImprimir, setRemitoParaImprimir] = useState(null);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [q, setQ] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    async function cargarConfigYPedidos() {
        setLoading(true);
        setError('');
        try {
            const { data: cfg } = await client.get('/integraciones/config');
            setPedidosUrl(cfg.pedidos_url || '');
            setTempUrl(cfg.pedidos_url || '');

            const { data } = await client.get('/integraciones/pedidos-web');
            setPedidos(data.pedidos || []);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudieron cargar los pedidos web.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarConfigYPedidos();
    }, []);

    async function guardarConfig(e) {
        e.preventDefault();
        setError('');
        try {
            await client.post('/integraciones/config', { pedidos_url: tempUrl });
            setPedidosUrl(tempUrl);
            setConfigOpen(false);
            setMensaje('Enlace de Google Sheets guardado correctamente.');
            setTimeout(() => setMensaje(''), 4000);
            cargarConfigYPedidos();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar la configuración.');
        }
    }

    async function emitirRemitoAutomatico(pedido) {
        setGenerandoId(pedido.numero);
        setError('');
        try {
            const { data: remito } = await client.post('/integraciones/crear-remito-desde-pedido', {
                pedido_numero: pedido.numero,
                fecha: pedido.fecha,
                nombre: pedido.nombre,
                telefono: pedido.telefono,
                direccion_completa: pedido.direccion_completa,
                items: pedido.items
            });

            // Actualizar lista local de pedidos para marcarlo como emitido
            setPedidos(pedidos.map(p => p.numero === pedido.numero ? { ...p, remito_asociado: { id: remito.id, numero: remito.numero } } : p));

            // Abrir automáticamente la vista de impresión del remito generado
            const { data: fullRemito } = await client.get(`/remitos/${remito.id}`);
            setRemitoParaImprimir(fullRemito);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al generar el remito para este pedido.');
        } finally {
            setGenerandoId(null);
        }
    }

    async function verRemitoExistente(remitoId) {
        try {
            const { data: fullRemito } = await client.get(`/remitos/${remitoId}`);
            setRemitoParaImprimir(fullRemito);
        } catch (err) {
            setError('No se pudo cargar el remito.');
        }
    }

    const pedidosFiltrados = pedidos.filter(p => {
        const matchesQ = !q || [p.numero, p.nombre, p.telefono, p.direccion, p.zona, p.productos_str]
            .some(v => String(v || '').toLowerCase().includes(q.toLowerCase()));

        if (!matchesQ) return false;
        if (filtroEstado === 'pendientes') return !p.remito_asociado;
        if (filtroEstado === 'emitidos') return !!p.remito_asociado;
        return true;
    });

    return (
        <div className="stack gap-lg">
            <div className="spread">
                <div>
                    <h1 style={{ fontSize: 26 }}>Bandeja de Pedidos Web</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        {pedidos.length} pedidos sincronizados desde Google Sheets · Distribuidora Mix Point
                    </p>
                </div>
                <div className="row gap-sm">
                    <button className="btn btn-secondary" onClick={() => setConfigOpen(true)}>
                        ⚙️ Configurar enlace Sheets
                    </button>
                    <button className="btn btn-primary" onClick={cargarConfigYPedidos} disabled={loading}>
                        {loading ? 'Cargando...' : '🔄 Actualizar pedidos'}
                    </button>
                </div>
            </div>

            {mensaje && <div className="alert-banner" style={{ background: 'var(--color-success-tint)', color: 'var(--color-success)' }}>{mensaje}</div>}
            {error && <div className="alert-banner error">{error}</div>}

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 12 }}>
                    <div className="row gap-sm" style={{ maxWidth: 360, flex: 1 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input
                            placeholder="Buscar por cliente, teléfono, dirección o producto…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                        />
                    </div>
                    <div className="row gap-sm">
                        <select
                            value={filtroEstado}
                            onChange={e => setFiltroEstado(e.target.value)}
                            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                        >
                            <option value="todos">Todos los pedidos ({pedidos.length})</option>
                            <option value="pendientes">Pendientes de remito ({pedidos.filter(p => !p.remito_asociado).length})</option>
                            <option value="emitidos">Con remito emitido ({pedidos.filter(p => p.remito_asociado).length})</option>
                        </select>
                    </div>
                </div>

                <div className="table-wrap">
                    {pedidosFiltrados.length === 0 && !loading ? (
                        <div className="empty-state">
                            <div className="icon">📦</div>
                            <p>No se encontraron pedidos con los filtros aplicados.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>N° Pedido</th>
                                    <th>Fecha</th>
                                    <th>Cliente y Contacto</th>
                                    <th>Destino / Entrega</th>
                                    <th>Productos solicitados</th>
                                    <th className="text-right">Total Web</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosFiltrados.map((p, idx) => {
                                    const yaEmitido = !!p.remito_asociado;
                                    const esGenerando = generandoId === p.numero;

                                    return (
                                        <tr key={p.numero || idx} style={{ background: yaEmitido ? 'rgba(62, 122, 82, 0.04)' : undefined }}>
                                            <td className="mono" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                                {p.numero}
                                            </td>
                                            <td className="mono text-xs muted" style={{ whiteSpace: 'nowrap' }}>
                                                {p.fecha}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                                                {p.telefono && (
                                                    <a
                                                        href={`https://wa.me/549${String(p.telefono).replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mono text-xs"
                                                        style={{ color: 'var(--color-primary-dark)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}
                                                        title="Enviar WhatsApp al cliente"
                                                    >
                                                        📲 {p.telefono}
                                                    </a>
                                                )}
                                            </td>
                                            <td>
                                                <div>{p.direccion || '—'}</div>
                                                {p.zona && <span className="badge badge-neutral" style={{ fontSize: 10, marginTop: 3 }}>{p.zona}</span>}
                                            </td>
                                            <td style={{ maxWidth: 320 }}>
                                                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                                                    {p.items.map((it, itIdx) => (
                                                        <div key={itIdx} style={{ marginBottom: 2 }}>
                                                            <strong>{it.cantidad} {it.unidad_medida}</strong> × {it.nombre}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="text-right mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                                                {fmtMoney(p.total)}
                                            </td>
                                            <td>
                                                {yaEmitido ? (
                                                    <span className="badge badge-success" style={{ fontSize: 11 }}>
                                                        Emitido ({p.remito_asociado.numero})
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-warning" style={{ fontSize: 11 }}>
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                                                {yaEmitido ? (
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => verRemitoExistente(p.remito_asociado.id)}
                                                    >
                                                        🖨️ Ver Remito
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => emitirRemitoAutomatico(p)}
                                                        disabled={esGenerando}
                                                    >
                                                        {esGenerando ? 'Generando...' : '⚡ Emitir Remito'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MODAL CONFIGURACIÓN SHEETS */}
            {configOpen && (
                <Modal title="Configurar Google Sheet de Pedidos Web" onClose={() => setConfigOpen(false)} width={600}>
                    <form onSubmit={guardarConfig} className="stack gap-md">
                        <p className="text-sm muted">
                            Pegá el enlace de la planilla donde la web registra las compras. El sistema actualizará automáticamente los pedidos recibidos.
                        </p>
                        <div className="field">
                            <label>Enlace compartido de Google Sheets</label>
                            <input
                                required
                                placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                                value={tempUrl}
                                onChange={e => setTempUrl(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setConfigOpen(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Guardar y Sincronizar
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* VISTA IMPRIMIBLE DEL REMITO GENERADO */}
            {remitoParaImprimir && (
                <RemitoImprimible
                    remito={remitoParaImprimir}
                    onClose={() => setRemitoParaImprimir(null)}
                />
            )}
        </div>
    );
}
