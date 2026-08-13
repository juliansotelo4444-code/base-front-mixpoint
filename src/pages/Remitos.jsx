import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus, IconBuscar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const ESTADOS = {
    pendiente: 'badge-warning', entregado: 'badge-primary', facturado: 'badge-success', anulado: 'badge-danger'
};

export default function Remitos() {
    const [remitos, setRemitos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [q, setQ] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState('');

    const [clienteId, setClienteId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [direccion, setDireccion] = useState('');
    const [transportista, setTransportista] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [items, setItems] = useState([{ producto_id: '', cantidad: '', precio_unitario: '' }]);

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/remitos', { params: { estado: estadoFiltro || undefined } });
        setRemitos(data);
        setLoading(false);
    }

    useEffect(() => {
        client.get('/clientes', { params: { activo: 1 } }).then(r => setClientes(r.data));
        client.get('/productos', { params: { activo: 1 } }).then(r => setProductos(r.data));
    }, []);
    useEffect(() => { cargar(); }, [estadoFiltro]);

    const remitosFiltrados = q
        ? remitos.filter(r => r.cliente_nombre.toLowerCase().includes(q.toLowerCase()) || r.numero.toLowerCase().includes(q.toLowerCase()))
        : remitos;

    function abrirNuevo() {
        setClienteId(''); setFecha(new Date().toISOString().slice(0, 10)); setDireccion(''); setTransportista(''); setObservaciones('');
        setItems([{ producto_id: '', cantidad: '', precio_unitario: '' }]);
        setError('');
        setModalOpen(true);
    }

    function actualizarItem(i, campo, valor) {
        const nuevos = [...items];
        nuevos[i] = { ...nuevos[i], [campo]: valor };
        if (campo === 'producto_id') {
            const prod = productos.find(p => p.id === Number(valor));
            if (prod) nuevos[i].precio_unitario = prod.precio_venta;
        }
        setItems(nuevos);
    }
    function agregarItem() { setItems([...items, { producto_id: '', cantidad: '', precio_unitario: '' }]); }
    function quitarItem(i) { setItems(items.filter((_, idx) => idx !== i)); }

    const total = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);

    async function guardar(e) {
        e.preventDefault();
        setError('');
        const itemsValidos = items.filter(it => it.producto_id && it.cantidad);
        if (!clienteId || itemsValidos.length === 0) {
            setError('Elegí un cliente y al menos un producto con cantidad.');
            return;
        }
        try {
            await client.post('/remitos', {
                cliente_id: Number(clienteId),
                fecha, direccion_entrega: direccion, transportista, observaciones,
                items: itemsValidos.map(it => ({ producto_id: Number(it.producto_id), cantidad: Number(it.cantidad), precio_unitario: Number(it.precio_unitario) || 0 }))
            });
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear el remito.');
        }
    }

    async function verDetalle(r) {
        const { data } = await client.get(`/remitos/${r.id}`);
        setDetalle(data);
    }

    async function cambiarEstado(id, estado) {
        await client.put(`/remitos/${id}/estado`, { estado });
        cargar();
        setDetalle(null);
    }

    return (
        <div className="stack gap-lg">
            <div className="spread">
                <div>
                    <h1 style={{ fontSize: 26 }}>Remitos</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>{remitos.length} remitos</p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo}><IconPlus /> Nuevo remito</button>
            </div>

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="row gap-sm" style={{ maxWidth: 320 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input placeholder="Buscar por cliente o número…" value={q} onChange={e => setQ(e.target.value)}
                               style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }} />
                    </div>
                    <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}>
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="entregado">Entregado</option>
                        <option value="facturado">Facturado</option>
                        <option value="anulado">Anulado</option>
                    </select>
                </div>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th className="text-right">Total</th></tr></thead>
                        <tbody>
                            {remitosFiltrados.map(r => (
                                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => verDetalle(r)}>
                                    <td className="mono">{r.numero}</td>
                                    <td style={{ fontWeight: 600 }}>{r.cliente_nombre}</td>
                                    <td className="mono">{r.fecha}</td>
                                    <td><span className={`badge ${ESTADOS[r.estado]}`}>{r.estado}</span></td>
                                    <td className="text-right mono">{fmtMoney(r.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && remitosFiltrados.length === 0 && (
                        <div className="empty-state"><div className="icon">🧾</div><p>No hay remitos que coincidan.</p></div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <Modal title="Nuevo remito" onClose={() => setModalOpen(false)} width={720}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Cliente *</label>
                                <select required value={clienteId} onChange={e => setClienteId(e.target.value)}>
                                    <option value="">Seleccionar…</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Fecha</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                            </div>
                            <div className="field">
                                <label>Dirección de entrega</label>
                                <input value={direccion} onChange={e => setDireccion(e.target.value)} />
                            </div>
                            <div className="field">
                                <label>Transportista</label>
                                <input value={transportista} onChange={e => setTransportista(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div className="spread" style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)' }}>Productos</label>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={agregarItem}><IconPlus /> Agregar ítem</button>
                            </div>
                            <div className="stack gap-sm">
                                {items.map((it, i) => {
                                    const prod = productos.find(p => p.id === Number(it.producto_id));
                                    const excedeStock = prod && Number(it.cantidad) > prod.stock_actual;
                                    return (
                                        <div key={i} className="row gap-sm" style={{ alignItems: 'flex-start' }}>
                                            <select value={it.producto_id} onChange={e => actualizarItem(i, 'producto_id', e.target.value)} style={{ flex: 3, padding: '9px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}>
                                                <option value="">Producto…</option>
                                                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock_actual} {p.unidad_medida})</option>)}
                                            </select>
                                            <input type="number" step="0.01" placeholder="Cant." value={it.cantidad} onChange={e => actualizarItem(i, 'cantidad', e.target.value)}
                                                   style={{ flex: 1, padding: '9px 10px', borderRadius: 6, border: `1px solid ${excedeStock ? 'var(--color-danger)' : 'var(--color-border-strong)'}` }} />
                                            <input type="number" step="0.01" placeholder="Precio unit." value={it.precio_unitario} onChange={e => actualizarItem(i, 'precio_unitario', e.target.value)}
                                                   style={{ flex: 1, padding: '9px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }} />
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => quitarItem(i)} disabled={items.length === 1}>✕</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="field">
                            <label>Observaciones</label>
                            <textarea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                        </div>

                        <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                            <span className="muted text-sm">Total del remito</span>
                            <span className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{fmtMoney(total)}</span>
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Crear remito</button>
                        </div>
                    </form>
                </Modal>
            )}

            {detalle && (
                <Modal title={`Remito ${detalle.numero}`} onClose={() => setDetalle(null)} width={620}>
                    <div className="stack gap-md">
                        <div className="spread">
                            <div>
                                <p style={{ fontWeight: 600 }}>{detalle.cliente_nombre}</p>
                                <p className="text-sm muted">{detalle.fecha} {detalle.direccion_entrega && `· ${detalle.direccion_entrega}`}</p>
                            </div>
                            <span className={`badge ${ESTADOS[detalle.estado]}`}>{detalle.estado}</span>
                        </div>
                        <table className="data-table">
                            <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Subtotal</th></tr></thead>
                            <tbody>
                                {detalle.items.map(it => (
                                    <tr key={it.id}>
                                        <td>{it.producto_nombre}</td>
                                        <td className="text-right mono">{it.cantidad} {it.unidad_medida}</td>
                                        <td className="text-right mono">{fmtMoney(it.precio_unitario)}</td>
                                        <td className="text-right mono">{fmtMoney(it.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="spread"><span className="muted">Total</span><span className="mono" style={{ fontWeight: 600, fontSize: 17 }}>{fmtMoney(detalle.total)}</span></div>
                        {detalle.estado !== 'anulado' && (
                            <div className="row gap-sm" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                                {detalle.estado === 'pendiente' && <button className="btn btn-secondary btn-sm" onClick={() => cambiarEstado(detalle.id, 'entregado')}>Marcar entregado</button>}
                                {detalle.estado === 'entregado' && <button className="btn btn-secondary btn-sm" onClick={() => cambiarEstado(detalle.id, 'facturado')}>Marcar facturado</button>}
                                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('¿Anular remito? Esto devuelve el stock.')) cambiarEstado(detalle.id, 'anulado'); }}>Anular</button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
