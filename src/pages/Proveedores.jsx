import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus, IconBuscar, IconEditar, IconBaja } from '../components/Icons';

const emptyForm = { razon_social: '', cuit: '', condicion_iva: 'Responsable Inscripto', direccion: '', localidad: '', telefono: '', email: '', observaciones: '' };

export default function Proveedores() {
    const [proveedores, setProveedores] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/proveedores', { params: { q: q || undefined, activo: 1 } });
        setProveedores(data);
        setLoading(false);
    }

    useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [q]);

    function abrirNuevo() { setEditando(null); setForm(emptyForm); setError(''); setModalOpen(true); }
    function abrirEditar(p) { setEditando(p); setForm({ ...emptyForm, ...p }); setError(''); setModalOpen(true); }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        try {
            if (editando) await client.put(`/proveedores/${editando.id}`, form);
            else await client.post('/proveedores', form);
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el proveedor.');
        }
    }

    async function darDeBaja(p) {
        if (!confirm(`¿Dar de baja a "${p.razon_social}"?`)) return;
        await client.delete(`/proveedores/${p.id}`);
        cargar();
    }

    return (
        <div className="stack gap-lg">
            <div className="spread">
                <div>
                    <h1 style={{ fontSize: 26 }}>Proveedores</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>{proveedores.length} proveedores activos</p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo}><IconPlus /> Nuevo proveedor</button>
            </div>

            <div className="card">
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="row gap-sm" style={{ maxWidth: 340 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input placeholder="Buscar por razón social, CUIT o email…" value={q} onChange={e => setQ(e.target.value)}
                               style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }} />
                    </div>
                </div>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr><th>Razón social</th><th>CUIT</th><th>Localidad</th><th>Teléfono</th><th className="text-right">Saldo (les debemos)</th><th></th></tr>
                        </thead>
                        <tbody>
                            {proveedores.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.razon_social}</td>
                                    <td className="mono muted">{p.cuit || '—'}</td>
                                    <td>{p.localidad || '—'}</td>
                                    <td className="mono">{p.telefono || '—'}</td>
                                    <td className={`text-right mono ${p.saldo_cuenta > 0 ? '' : 'muted'}`}>
                                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.saldo_cuenta)}
                                    </td>
                                    <td>
                                        <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}><IconEditar /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => darDeBaja(p)}><IconBaja /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && proveedores.length === 0 && (
                        <div className="empty-state"><div className="icon">📦</div><p>No hay proveedores que coincidan con la búsqueda.</p></div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <Modal title={editando ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setModalOpen(false)} width={620}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="field">
                            <label>Razón social *</label>
                            <input required value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} />
                        </div>
                        <div className="form-grid">
                            <div className="field">
                                <label>CUIT</label>
                                <input value={form.cuit || ''} onChange={e => setForm({ ...form, cuit: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Condición IVA</label>
                                <select value={form.condicion_iva} onChange={e => setForm({ ...form, condicion_iva: e.target.value })}>
                                    <option>Responsable Inscripto</option>
                                    <option>Monotributista</option>
                                    <option>Exento</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Dirección</label>
                                <input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Localidad</label>
                                <input value={form.localidad || ''} onChange={e => setForm({ ...form, localidad: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Teléfono</label>
                                <input value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Email</label>
                                <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="field">
                            <label>Observaciones</label>
                            <textarea rows={2} value={form.observaciones || ''} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Guardar proveedor</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
