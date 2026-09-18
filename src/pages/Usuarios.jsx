import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus } from '../components/Icons';

const ROLES = { admin: 'badge-primary', ventas: 'badge-accent', deposito: 'badge-warning', administracion: 'badge-neutral' };

const emptyForm = { nombre: '', email: '', password: '', rol: 'ventas' };

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/usuarios');
        setUsuarios(data);
        setLoading(false);
    }
    useEffect(() => { cargar(); }, []);

    function abrirNuevo() { setEditando(null); setForm(emptyForm); setError(''); setModalOpen(true); }
    function abrirEditar(u) { setEditando(u); setForm({ ...emptyForm, ...u, password: '' }); setError(''); setModalOpen(true); }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        try {
            if (editando) {
                const payload = { nombre: form.nombre, rol: form.rol, activo: form.activo };
                if (form.password) payload.password = form.password;
                await client.put(`/usuarios/${editando.id}`, payload);
            } else {
                await client.post('/usuarios', form);
            }
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el usuario.');
        }
    }

    async function toggleActivo(u) {
        await client.put(`/usuarios/${u.id}`, { nombre: u.nombre, rol: u.rol, activo: u.activo ? 0 : 1 });
        cargar();
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Usuarios</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>{usuarios.length} usuarios del sistema</p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo}><IconPlus /> Nuevo usuario</button>
            </div>

            <div className="card">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                                    <td className="mono muted">{u.email}</td>
                                    <td><span className={`badge ${ROLES[u.rol]}`}>{u.rol}</span></td>
                                    <td><span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>{u.activo ? 'activo' : 'inactivo'}</span></td>
                                    <td>
                                        <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(u)}>Editar</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => toggleActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <Modal title={editando ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setModalOpen(false)} width={460}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="field">
                            <label>Nombre *</label>
                            <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Email *</label>
                            <input required type="email" disabled={!!editando} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>{editando ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                            <input required={!editando} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Rol</label>
                            <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                                <option value="admin">Administrador</option>
                                <option value="ventas">Ventas</option>
                                <option value="deposito">Depósito</option>
                                <option value="administracion">Administración</option>
                            </select>
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
