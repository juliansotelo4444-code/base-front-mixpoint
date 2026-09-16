import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus, IconBuscar, IconEditar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const emptyForm = {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    unidad_medida: 'kg',
    precio_compra: 0,
    precio_venta: 0,
    precio_5kg: 0,
    precio_10kg: 0,
    precio_25kg: 0,
    precio_30kg: 0,
    stock_minimo: 20
};

export default function Productos() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [q, setQ] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [soloBajoStock, setSoloBajoStock] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [ajusteProducto, setAjusteProducto] = useState(null);
    const [ajusteCantidad, setAjusteCantidad] = useState('');
    const [ajusteMotivo, setAjusteMotivo] = useState('');
    const [verPreciosId, setVerPreciosId] = useState(null);

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/productos', {
            params: {
                q: q || undefined,
                categoria_id: categoriaFiltro || undefined,
                activo: 1,
                bajo_stock: soloBajoStock ? 1 : undefined
            }
        });
        setProductos(data);
        setLoading(false);
    }

    async function cargarCategorias() {
        const { data } = await client.get('/productos/categorias');
        setCategorias(data);
    }

    useEffect(() => { cargarCategorias(); }, []);
    useEffect(() => {
        const t = setTimeout(cargar, 250);
        return () => clearTimeout(t);
    }, [q, categoriaFiltro, soloBajoStock]);

    function abrirNuevo() {
        setEditando(null);
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    }

    function abrirEditar(p) {
        setEditando(p);
        setForm({
            ...emptyForm,
            ...p,
            categoria_id: p.categoria_id || '',
            precio_compra: Number(p.precio_compra) || 0,
            precio_venta: Number(p.precio_venta) || 0,
            precio_5kg: Number(p.precio_5kg) || 0,
            precio_10kg: Number(p.precio_10kg) || 0,
            precio_25kg: Number(p.precio_25kg) || 0,
            precio_30kg: Number(p.precio_30kg) || 0,
            stock_minimo: Number(p.stock_minimo) || 0,
        });
        setError('');
        setModalOpen(true);
    }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        try {
            const payload = {
                ...form,
                categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
                precio_compra: Number(form.precio_compra) || 0,
                precio_venta: Number(form.precio_venta) || 0,
                precio_5kg: Number(form.precio_5kg) || 0,
                precio_10kg: Number(form.precio_10kg) || 0,
                precio_25kg: Number(form.precio_25kg) || 0,
                precio_30kg: Number(form.precio_30kg) || 0,
                stock_minimo: Number(form.stock_minimo) || 0,
            };
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

    const [syncing, setSyncing] = useState(false);
    const [syncMensaje, setSyncMensaje] = useState('');

    async function sincronizarConSheets() {
        setSyncing(true);
        setError('');
        setSyncMensaje('');
        try {
            const { data } = await client.post('/integraciones/sync-catalogo');
            setSyncMensaje(`✅ Catálogo sincronizado desde Google Sheets (${data.total} productos procesados, ${data.nuevos} nuevos, ${data.actualizados} actualizados).`);
            setTimeout(() => setSyncMensaje(''), 5000);
            cargar();
            cargarCategorias();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al sincronizar con Google Sheets.');
        } finally {
            setSyncing(false);
        }
    }

    return (
        <div className="stack gap-lg">
            <div className="spread">
                <div>
                    <h1 style={{ fontSize: 26 }}>Catálogo de productos y stock</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        {productos.length} productos en catálogo · Distribuidora Mix Point
                    </p>
                </div>
                <div className="row gap-sm">
                    <button
                        className="btn btn-secondary"
                        onClick={sincronizarConSheets}
                        disabled={syncing}
                        style={{ fontSize: 13.5 }}
                        title="Actualizar catálogo y precios directamente desde tu Google Sheet"
                    >
                        {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar Google Sheets'}
                    </button>
                    <button className="btn btn-primary" onClick={abrirNuevo} style={{ fontSize: 14 }}>
                        <IconPlus /> Nuevo producto
                    </button>
                </div>
            </div>

            {syncMensaje && (
                <div className="alert-banner" style={{ background: 'var(--color-success-tint)', color: 'var(--color-success)' }}>
                    {syncMensaje}
                </div>
            )}

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 12 }}>
                    <div className="row gap-sm" style={{ maxWidth: 360, flex: 1 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input
                            placeholder="Buscar por nombre o código…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                        />
                    </div>
                    <div className="row gap-sm">
                        <select
                            value={categoriaFiltro}
                            onChange={e => setCategoriaFiltro(e.target.value)}
                            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                        >
                            <option value="">Todas las categorías ({categorias.length})</option>
                            {categorias.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                        <label className="row gap-xs text-sm" style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={soloBajoStock} onChange={e => setSoloBajoStock(e.target.checked)} />
                            <span>Solo stock bajo mínimo</span>
                        </label>
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Producto / Descripción</th>
                                <th>Categoría</th>
                                <th className="text-right">Stock disp.</th>
                                <th className="text-right">Precio 1 kg</th>
                                <th className="text-right">Escalas mayoristas</th>
                                <th className="text-right">Costo estimado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map(p => {
                                const bajoStock = Number(p.stock_actual) <= Number(p.stock_minimo);
                                const isVerPrecios = verPreciosId === p.id;

                                return (
                                    <tr key={p.id}>
                                        <td className="mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                            {p.codigo || `MP-${p.id}`}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                                            {p.descripcion && (
                                                <div className="muted text-xs" style={{ marginTop: 2, fontStyle: 'italic' }}>
                                                    {p.descripcion}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                                                {p.categoria_nombre || 'General'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                className={`mono badge ${bajoStock ? 'badge-danger' : 'badge-neutral'}`}
                                                style={{ border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                                onClick={() => setAjusteProducto(p)}
                                                title="Clic para realizar ajuste manual de stock"
                                            >
                                                {p.stock_actual} {p.unidad_medida}
                                            </button>
                                        </td>
                                        <td className="text-right mono" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                            {fmtMoney(p.precio_venta)}
                                        </td>
                                        <td className="text-right">
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setVerPreciosId(isVerPrecios ? null : p.id)}
                                                style={{ fontSize: 11.5 }}
                                            >
                                                {isVerPrecios ? 'Ocultar' : 'Ver escalas (5/10/25k)'}
                                            </button>
                                            {isVerPrecios && (
                                                <div style={{ fontSize: 11, textAlign: 'right', marginTop: 4, lineHeight: 1.5 }} className="mono">
                                                    <div>5kg: <strong>{fmtMoney(p.precio_5kg || p.precio_venta)}</strong></div>
                                                    <div>10kg: <strong>{fmtMoney(p.precio_10kg || p.precio_5kg)}</strong></div>
                                                    <div>25kg: <strong>{fmtMoney(p.precio_25kg || p.precio_10kg)}</strong></div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right mono muted text-sm">
                                            {fmtMoney(p.precio_compra)}
                                        </td>
                                        <td className="text-right">
                                            <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => abrirEditar(p)}
                                                    title="Editar producto y precios"
                                                >
                                                    <IconEditar /> Editar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!loading && productos.length === 0 && (
                        <div className="empty-state">
                            <div className="icon">🥜</div>
                            <p>No hay productos que coincidan con los filtros.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL CREAR / EDITAR PRODUCTO */}
            {modalOpen && (
                <Modal title={editando ? 'Editar producto y escalas de precios' : 'Nuevo producto en catálogo'} onClose={() => setModalOpen(false)} width={680}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Nombre del producto *</label>
                                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Código interno (ej: MP-045)</label>
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
                        </div>

                        <div className="field">
                            <label>Descripción / Ingredientes (ej: almendras, nuez, pasas)</label>
                            <input value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                        </div>

                        {/* ESCALAS DE PRECIOS MIX POINT */}
                        <div style={{ background: '#faf8f2', border: '1px solid #e2dac9', borderRadius: 8, padding: '14px 16px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: 10 }}>
                                💰 Escalas de precios de venta (ARS)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                <div className="field">
                                    <label>Precio 1 kg (Base)</label>
                                    <input type="number" step="0.01" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Precio escala 5 kg</label>
                                    <input type="number" step="0.01" value={form.precio_5kg} onChange={e => setForm({ ...form, precio_5kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Precio escala 10 kg</label>
                                    <input type="number" step="0.01" value={form.precio_10kg} onChange={e => setForm({ ...form, precio_10kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Precio escala 25 kg</label>
                                    <input type="number" step="0.01" value={form.precio_25kg} onChange={e => setForm({ ...form, precio_25kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Precio escala 30 kg</label>
                                    <input type="number" step="0.01" value={form.precio_30kg} onChange={e => setForm({ ...form, precio_30kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Costo de compra estimado</label>
                                    <input type="number" step="0.01" value={form.precio_compra} onChange={e => setForm({ ...form, precio_compra: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>

                        <div className="field" style={{ maxWidth: 200 }}>
                            <label>Stock mínimo de alerta</label>
                            <input type="number" step="0.01" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: Number(e.target.value) })} />
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Guardar producto</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL AJUSTE DE STOCK */}
            {ajusteProducto && (
                <Modal title={`Ajustar stock — ${ajusteProducto.nombre}`} onClose={() => setAjusteProducto(null)} width={440}>
                    <form onSubmit={guardarAjuste} className="stack gap-md">
                        <p className="text-sm muted">
                            Stock actual registrado: <strong className="mono">{ajusteProducto.stock_actual} {ajusteProducto.unidad_medida}</strong>.
                            Ingresá un valor positivo para sumar o negativo para restar (mermas, roturas, etc.).
                        </p>
                        <div className="field">
                            <label>Cantidad a ajustar ({ajusteProducto.unidad_medida})</label>
                            <input type="number" step="0.01" placeholder="Ej: -5 o 10" value={ajusteCantidad} onChange={e => setAjusteCantidad(e.target.value)} autoFocus />
                        </div>
                        <div className="field">
                            <label>Motivo del ajuste</label>
                            <input placeholder="Ej: merma, rotura de bolsa, conteo físico" value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)} />
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
