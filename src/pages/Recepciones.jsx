import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ProductPicker from '../components/ProductPicker';
import { IconPlus, IconBuscar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

export default function Recepciones() {
    const [recepciones, setRecepciones] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState('');

    const [proveedorId, setProveedorId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [numeroRemitoProveedor, setNumeroRemitoProveedor] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [items, setItems] = useState([{ producto_id: '', cantidad: '', precio_unitario: '', numero_lote: '', fecha_vencimiento: '' }]);

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/recepciones');
        setRecepciones(data);
        setLoading(false);
    }

    useEffect(() => {
        client.get('/proveedores', { params: { activo: 1 } }).then(r => setProveedores(r.data));
        client.get('/productos', { params: { activo: 1 } }).then(r => setProductos(r.data));
        cargar();
    }, []);

    const filtradas = q
        ? recepciones.filter(r => r.proveedor_nombre.toLowerCase().includes(q.toLowerCase()) || r.numero.toLowerCase().includes(q.toLowerCase()))
        : recepciones;

    function abrirNuevo() {
        setProveedorId(''); setFecha(new Date().toISOString().slice(0, 10)); setNumeroRemitoProveedor(''); setNumeroFactura(''); setObservaciones('');
        setItems([{ producto_id: '', cantidad: '', precio_unitario: '', numero_lote: '', fecha_vencimiento: '' }]);
        setError('');
        setModalOpen(true);
    }

    function actualizarItem(i, campo, valor) {
        const nuevos = [...items];
        nuevos[i] = { ...nuevos[i], [campo]: valor };
        setItems(nuevos);
    }
    function handleSelectProducto(i, id, p) {
        const nuevos = [...items];
        nuevos[i] = {
            ...nuevos[i],
            producto_id: id,
            precio_unitario: (p && Number(p.precio_compra) > 0) ? p.precio_compra : nuevos[i].precio_unitario
        };
        setItems(nuevos);
    }
    function agregarItem() { setItems([...items, { producto_id: '', cantidad: '', precio_unitario: '', numero_lote: '', fecha_vencimiento: '' }]); }
    function quitarItem(i) { setItems(items.filter((_, idx) => idx !== i)); }

    const total = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);

    async function guardar(e) {
        e.preventDefault();
        setError('');
        const itemsValidos = items.filter(it => it.producto_id && it.cantidad);
        if (!proveedorId || itemsValidos.length === 0) {
            setError('Elegí un proveedor y al menos un producto con cantidad.');
            return;
        }
        try {
            await client.post('/recepciones', {
                proveedor_id: Number(proveedorId), fecha,
                numero_remito_proveedor: numeroRemitoProveedor, numero_factura: numeroFactura, observaciones,
                items: itemsValidos.map(it => ({
                    producto_id: Number(it.producto_id), cantidad: Number(it.cantidad), precio_unitario: Number(it.precio_unitario) || 0,
                    numero_lote: it.numero_lote || null, fecha_vencimiento: it.fecha_vencimiento || null
                }))
            });
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar la recepción.');
        }
    }

    async function verDetalle(r) {
        const { data } = await client.get(`/recepciones/${r.id}`);
        setDetalle(data);
    }

    async function anular(id) {
        if (!confirm('¿Anular esta recepción? Esto revierte el stock ingresado.')) return;
        await client.post(`/recepciones/${id}/anular`);
        cargar();
        setDetalle(null);
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Recepción de mercadería</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>{recepciones.length} recepciones registradas</p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo}><IconPlus /> Nueva recepción</button>
            </div>

            <div className="card">
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="row gap-sm" style={{ maxWidth: 340 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input placeholder="Buscar por proveedor o número…" value={q} onChange={e => setQ(e.target.value)}
                               style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }} />
                    </div>
                </div>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Número</th><th>Proveedor</th><th>Fecha</th><th>Remito prov.</th><th>Estado</th><th className="text-right">Total</th></tr></thead>
                        <tbody>
                            {filtradas.map(r => (
                                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => verDetalle(r)}>
                                    <td className="mono">{r.numero}</td>
                                    <td style={{ fontWeight: 600 }}>{r.proveedor_nombre}</td>
                                    <td className="mono">{r.fecha}</td>
                                    <td className="mono muted">{r.numero_remito_proveedor || '—'}</td>
                                    <td><span className={`badge ${r.estado === 'anulada' ? 'badge-danger' : 'badge-success'}`}>{r.estado}</span></td>
                                    <td className="text-right mono">{fmtMoney(r.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && filtradas.length === 0 && (
                        <div className="empty-state"><div className="icon">📥</div><p>No hay recepciones que coincidan.</p></div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <Modal title="Nueva recepción de mercadería" onClose={() => setModalOpen(false)} width={820}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Proveedor *</label>
                                <select required value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                                    <option value="">Seleccionar…</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Fecha</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                            </div>
                            <div className="field">
                                <label>N° remito del proveedor</label>
                                <input value={numeroRemitoProveedor} onChange={e => setNumeroRemitoProveedor(e.target.value)} />
                            </div>
                            <div className="field">
                                <label>N° factura</label>
                                <input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div className="spread" style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)' }}>Productos recibidos (cada uno genera un lote nuevo)</label>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={agregarItem}><IconPlus /> Agregar ítem</button>
                            </div>
                            <div className="stack gap-sm">
                                {items.map((it, i) => (
                                    <div key={i} className="card" style={{ padding: 12, background: 'var(--color-surface-sunken)' }}>
                                        <div className="recepcion-item-top">
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <ProductPicker
                                                    productos={productos}
                                                    value={it.producto_id}
                                                    onChange={(id, p) => handleSelectProducto(i, id, p)}
                                                    placeholder="Buscar producto por nombre o código…"
                                                />
                                            </div>
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => quitarItem(i)} disabled={items.length === 1} style={{ color: 'var(--color-danger)' }}>✕</button>
                                        </div>
                                        <div className="recepcion-item-grid">
                                            <input type="number" step="0.01" placeholder="Cantidad" value={it.cantidad} onChange={e => actualizarItem(i, 'cantidad', e.target.value)}
                                                   style={{ width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }} />
                                            <input type="number" step="0.01" placeholder="Costo unit." value={it.precio_unitario} onChange={e => actualizarItem(i, 'precio_unitario', e.target.value)}
                                                   style={{ width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }} />
                                            <input placeholder="N° de lote (opcional)" value={it.numero_lote} onChange={e => actualizarItem(i, 'numero_lote', e.target.value)}
                                                   style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }} />
                                            <input type="date" title="Fecha de vencimiento" value={it.fecha_vencimiento} onChange={e => actualizarItem(i, 'fecha_vencimiento', e.target.value)}
                                                   style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="field">
                            <label>Observaciones</label>
                            <textarea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                        </div>

                        <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                            <span className="muted text-sm">Total de la recepción</span>
                            <span className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{fmtMoney(total)}</span>
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Registrar recepción</button>
                        </div>
                    </form>
                </Modal>
            )}

            {detalle && (
                <Modal title={`Recepción ${detalle.numero}`} onClose={() => setDetalle(null)} width={620}>
                    <div className="stack gap-md">
                        <div className="spread">
                            <div>
                                <p style={{ fontWeight: 600 }}>{detalle.proveedor_nombre}</p>
                                <p className="text-sm muted">{detalle.fecha} {detalle.numero_factura && `· Factura ${detalle.numero_factura}`}</p>
                            </div>
                            <span className={`badge ${detalle.estado === 'anulada' ? 'badge-danger' : 'badge-success'}`}>{detalle.estado}</span>
                        </div>
                        <table className="data-table">
                            <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Costo</th><th className="text-right">Subtotal</th></tr></thead>
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
                        {detalle.estado !== 'anulada' && (
                            <div className="row gap-sm" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                                <button className="btn btn-danger btn-sm" onClick={() => anular(detalle.id)}>Anular recepción</button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
