import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus, IconBuscar, IconEditar } from '../components/Icons';

const emptyForm = { codigo: '', nombre: '', categoria_id: '', unidad_medida: 'kg', precio_compra: 0, precio_venta: 0, stock_minimo: 0 };

export default function Productos() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [q, setQ] = useState('');
    const [soloBajoStock, setSoloBajoStock] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [ajusteProducto, setAjusteProducto] = useState(null);
    const [ajusteCantidad, setAjusteCantidad] = useState('');
    const [ajusteMotivo, setAjusteMotivo] = useState('');

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/productos', { params: { q: q || undefined, activo: 1, bajo_stock: soloBajoStock ? 1 : undefined } });
        setProductos(data);
        setLoading(false);
    }
    async function cargarCategorias() {
        const { data } = await client.get('/productos/categorias');
        setCategorias(data);
    }

    useEffect(() => { cargarCategorias(); }, []);
    useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [q, soloBajoStock]);

    function abrirNuevo() { setEditando(null); setForm(emptyForm); setError(''); setModalOpen(true); }
    function abrirEditar(p) { setEditando(p); setForm({ ...emptyForm, ...p, categoria_id: p.categoria_id || '' }); setError(''); setModalOpen(true); }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        try {
            const payload = { ...form, categoria_id: form.categoria_id || null };
            if (editando) await client.put(`/productos/${editando.id}`, payload);
            else await client.post('/productos', payload);
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el producto.');
        }
    }

    async function guardarAjuste(e) {
        e.preventDefault();
        const cantidad = Number(ajusteCantidad);
        if (!cantidad) return;
        await client.post(`/productos/${ajusteProducto.id}/ajuste-stock`, { cantidad, motivo: ajusteMotivo || 'Ajuste manual' });
        setAjusteProducto(null);
        setAjusteCantidad('');
        setAjusteMotivo('');
        cargar();
    }

    return (
        <div className="stack gap-lg">
            <div className="spread">
                <div>
                    <h1 style={{ fontSize: 26 }}>Productos y stock</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>{productos.length} productos</p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo}><IconPlus /> Nuevo producto</button>
            </div>

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="row gap-sm" style={{ maxWidth: 340 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input placeholder="Buscar por nombre o código…" value={q} onChange={e => setQ(e.target.value)}
                               style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }} />
                    </div>
                    <label className="row gap-xs text-sm" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={soloBajoStock} onChange={e => setSoloBajoStock(e.target.checked)} />
                        Solo stock bajo mínimo
                    </label>
                </div>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th className="text-right">Stock</th><th className="text-right">Precio compra</th><th className="text-right">Precio venta</th><th></th></tr>
                        </thead>
                        <tbody>
                            {productos.map(p => {
                                const bajoStock = p.stock_actual <= p.stock_minimo;
                                return (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 600 }}>{p.nombre}{p.codigo && <span className="muted mono text-sm"> · {p.codigo}</span>}</td>
                                        <td>{p.categoria_nombre || '—'}</td>
                                        <td>{p.unidad_medida}</td>
                                        <td className="text-right">
                                            <button className={`mono badge ${bajoStock ? 'badge-danger' : 'badge-neutral'}`} style={{ border: 'none', cursor: 'pointer' }}
                                                    onClick={() => setAjusteProducto(p)}>
                                                {p.stock_actual} {p.unidad_medida}
                                            </button>
                                        </td>
                                        <td className="text-right mono">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.precio_compra)}</td>
                                        <td className="text-right mono">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.precio_venta)}</td>
                                        <td>
                                            <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}><IconEditar /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!loading && productos.length === 0 && (
                        <div className="empty-state"><div className="icon">🥜</div><p>No hay productos que coincidan con la búsqueda.</p></div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <Modal title={editando ? 'Editar producto' : 'Nuevo producto'} onClose={() => setModalOpen(false)} width={560}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Nombre *</label>
                                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Código interno</label>
                                <input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Categoría</label>
                                <select value={form.categoria_id || ''} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                                    <option value="">Sin categoría</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Unidad de medida</label>
                                <select value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value })}>
                                    <option value="kg">Kilogramo (kg)</option>
                                    <option value="g">Gramo (g)</option>
                                    <option value="unidad">Unidad</option>
                                    <option value="bolsa">Bolsa</option>
                                    <option value="caja">Caja</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Precio de compra</label>
                                <input type="number" step="0.01" value={form.precio_compra} onChange={e => setForm({ ...form, precio_compra: Number(e.target.value) })} />
                            </div>
                            <div className="field">
                                <label>Precio de venta</label>
                                <input type="number" step="0.01" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: Number(e.target.value) })} />
                            </div>
                            <div className="field">
                                <label>Stock mínimo (alerta)</label>
                                <input type="number" step="0.01" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Guardar producto</button>
                        </div>
                    </form>
                </Modal>
            )}

            {ajusteProducto && (
                <Modal title={`Ajustar stock — ${ajusteProducto.nombre}`} onClose={() => setAjusteProducto(null)} width={440}>
                    <form onSubmit={guardarAjuste} className="stack gap-md">
                        <p className="text-sm muted">Stock actual: <strong className="mono">{ajusteProducto.stock_actual} {ajusteProducto.unidad_medida}</strong>. Usá un valor positivo para sumar o negativo para restar (mermas, roturas, conteo físico).</p>
                        <div className="field">
                            <label>Cantidad a ajustar</label>
                            <input type="number" step="0.01" placeholder="Ej: -5 o 10" value={ajusteCantidad} onChange={e => setAjusteCantidad(e.target.value)} autoFocus />
                        </div>
                        <div className="field">
                            <label>Motivo</label>
                            <input placeholder="Ej: merma por rotura, conteo físico" value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)} />
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setAjusteProducto(null)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Aplicar ajuste</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
