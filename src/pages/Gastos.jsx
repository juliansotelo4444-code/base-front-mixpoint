import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus, IconBuscar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const emptyForm = { categoria_id: '', proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '', monto: '', metodo_pago: 'efectivo', numero_comprobante: '' };

export default function Gastos() {
    const [gastos, setGastos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [q, setQ] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [nuevaCategoriaOpen, setNuevaCategoriaOpen] = useState(false);
    const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/gastos', { params: { categoria_id: categoriaFiltro || undefined } });
        setGastos(data);
        setLoading(false);
    }
    async function cargarCategorias() {
        const { data } = await client.get('/gastos/categorias');
        setCategorias(data);
    }

    useEffect(() => {
        cargarCategorias();
        client.get('/proveedores', { params: { activo: 1 } }).then(r => setProveedores(r.data));
    }, []);
    useEffect(() => { cargar(); }, [categoriaFiltro]);

    const filtrados = q ? gastos.filter(g => g.descripcion.toLowerCase().includes(q.toLowerCase()) || g.numero.toLowerCase().includes(q.toLowerCase())) : gastos;
    const totalFiltrado = filtrados.reduce((acc, g) => acc + g.monto, 0);

    function abrirNuevo() { setForm({ ...emptyForm, fecha: new Date().toISOString().slice(0, 10) }); setError(''); setModalOpen(true); }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        if (!form.categoria_id || !form.descripcion || !form.monto) {
            setError('Completá categoría, descripción y monto.');
            return;
        }
        try {
            await client.post('/gastos', { ...form, categoria_id: Number(form.categoria_id), proveedor_id: form.proveedor_id || null, monto: Number(form.monto) });
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar el gasto.');
        }
    }

    async function crearCategoria(e) {
        e.preventDefault();
        if (!nuevaCategoriaNombre) return;
        await client.post('/gastos/categorias', { nombre: nuevaCategoriaNombre });
        setNuevaCategoriaNombre('');
        setNuevaCategoriaOpen(false);
        cargarCategorias();
    }

    async function eliminar(g) {
        if (!confirm(`¿Eliminar el gasto "${g.descripcion}"?`)) return;
        await client.delete(`/gastos/${g.id}`);
        cargar();
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Gastos generales</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>{filtrados.length} registros · Total: <span className="mono" style={{ fontWeight: 600 }}>{fmtMoney(totalFiltrado)}</span></p>
                </div>
                <div className="row gap-sm">
                    <button className="btn btn-secondary" onClick={() => setNuevaCategoriaOpen(true)}>+ Categoría</button>
                    <button className="btn btn-primary" onClick={abrirNuevo}><IconPlus /> Nuevo gasto</button>
                </div>
            </div>

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="row gap-sm" style={{ maxWidth: 320 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input placeholder="Buscar por descripción o número…" value={q} onChange={e => setQ(e.target.value)}
                               style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }} />
                    </div>
                    <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}>
                        <option value="">Todas las categorías</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Número</th><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Método</th><th className="text-right">Monto</th><th></th></tr></thead>
                        <tbody>
                            {filtrados.map(g => (
                                <tr key={g.id}>
                                    <td className="mono muted">{g.numero}</td>
                                    <td className="mono">{g.fecha}</td>
                                    <td><span className="badge badge-accent">{g.categoria_nombre}</span></td>
                                    <td>{g.descripcion}{g.proveedor_nombre && <span className="muted text-sm"> · {g.proveedor_nombre}</span>}</td>
                                    <td className="text-sm muted" style={{ textTransform: 'capitalize' }}>{g.metodo_pago}</td>
                                    <td className="text-right mono">{fmtMoney(g.monto)}</td>
                                    <td><button className="btn btn-ghost btn-sm" onClick={() => eliminar(g)}>✕</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && filtrados.length === 0 && (
                        <div className="empty-state"><div className="icon">💸</div><p>No hay gastos que coincidan.</p></div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <Modal title="Nuevo gasto" onClose={() => setModalOpen(false)} width={520}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Categoría *</label>
                                <select required value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                                    <option value="">Seleccionar…</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Fecha</label>
                                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Monto *</label>
                                <input required type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Método de pago</label>
                                <select value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })}>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Proveedor (opcional)</label>
                                <select value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
                                    <option value="">Ninguno</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>N° comprobante</label>
                                <input value={form.numero_comprobante} onChange={e => setForm({ ...form, numero_comprobante: e.target.value })} />
                            </div>
                        </div>
                        <div className="field">
                            <label>Descripción *</label>
                            <input required value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Guardar gasto</button>
                        </div>
                    </form>
                </Modal>
            )}

            {nuevaCategoriaOpen && (
                <Modal title="Nueva categoría de gasto" onClose={() => setNuevaCategoriaOpen(false)} width={400}>
                    <form onSubmit={crearCategoria} className="stack gap-md">
                        <div className="field">
                            <label>Nombre</label>
                            <input autoFocus value={nuevaCategoriaNombre} onChange={e => setNuevaCategoriaNombre(e.target.value)} />
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setNuevaCategoriaOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Crear</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
