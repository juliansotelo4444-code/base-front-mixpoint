import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const ROLES = {
    admin: 'badge-primary',
    ventas: 'badge-accent',
    deposito: 'badge-warning',
    administracion: 'badge-neutral'
};

// Lista completa de secciones / módulos configurables
export const MODULOS_SISTEMA = [
    { ruta: '/', label: 'Panel Principal (Dashboard)', icono: '📊', descripcion: 'Métricas generales, KPIs y accesos directos' },
    { ruta: '/remitos', label: 'Remitos y Facturación', icono: '📄', descripcion: 'Creación, edición y emisión de remitos' },
    { ruta: '/deposito-kanban', label: 'Preparación & Despacho (Picking)', icono: '🚚', descripcion: 'Tablero logístico, armado de pedidos y tracking con chofer' },
    { ruta: '/pedidos-web', label: 'Pedidos Web', icono: '🛒', descripcion: 'Gestión de órdenes entrantes de la tienda virtual' },
    { ruta: '/catalogo-flyers', label: 'Catálogo y Flyers', icono: '🖼️', descripcion: 'Generación de flyers promocionales y catálogo PDF' },
    { ruta: '/recepciones', label: 'Recepción de Mercadería', icono: '📥', descripcion: 'Ingreso de compras, control de lotes y stock recibido' },
    { ruta: '/produccion', label: 'Armado de Mixes (Producción)', icono: '🥣', descripcion: 'Fórmulas, transformación de materias primas y fraccionado' },
    { ruta: '/productos', label: 'Productos y Stock', icono: '📦', descripcion: 'Precios, stock en tiempo real y ajuste de inventario' },
    { ruta: '/clientes', label: 'Clientes y Cuentas', icono: '👥', descripcion: 'Fichas de clientes, saldos de cuenta corriente' },
    { ruta: '/conciliacion', label: 'Conciliación Bancaria', icono: '🏦', descripcion: 'Carga de comprobantes y validación de transferencias' },
    { ruta: '/reportes-diarios', label: 'Reportes 8:00 AM', icono: '📈', descripcion: 'Resumen gerencial matutino y métricas financieras' },
    { ruta: '/sincronizacion-sheets', label: 'Google Sheets', icono: '🔄', descripcion: 'Sincronización de planillas y respaldos en la nube' },
    { ruta: '/proveedores', label: 'Proveedores', icono: '🏭', descripcion: 'Gestión de compras y cuentas corrientes de proveedores' },
    { ruta: '/gastos', label: 'Gastos Operativos', icono: '💵', descripcion: 'Registro de egresos y control de caja' },
    { ruta: '/auditoria', label: 'Historial / Auditoría', icono: '🛡️', descripcion: 'Trazabilidad de cambios, logins y movimientos del sistema' },
    { ruta: '/manual', label: 'Manual de Uso', icono: '📖', descripcion: 'Guía interactiva y manual de procedimientos' },
];

const PERMISOS_DEFAULT_POR_ROL = {
    ventas: ['/', '/remitos', '/pedidos-web', '/catalogo-flyers', '/clientes', '/productos', '/manual'],
    deposito: ['/', '/deposito-kanban', '/recepciones', '/produccion', '/productos', '/manual'],
    administracion: ['/', '/remitos', '/pedidos-web', '/clientes', '/proveedores', '/gastos', '/conciliacion', '/reportes-diarios', '/sincronizacion-sheets', '/productos', '/manual'],
    admin: MODULOS_SISTEMA.map(m => m.ruta)
};

const emptyForm = {
    nombre: '',
    email: '',
    password: '',
    rol: 'ventas',
    permisos: PERMISOS_DEFAULT_POR_ROL.ventas
};

export default function Usuarios() {
    const { usuario: usuarioActual, refrescarUsuario } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    async function cargar() {
        setLoading(true);
        try {
            const { data } = await client.get('/usuarios');
            setUsuarios(data);
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargar();
    }, []);

    function abrirNuevo() {
        setEditando(null);
        setForm({
            ...emptyForm,
            permisos: [...PERMISOS_DEFAULT_POR_ROL.ventas]
        });
        setError('');
        setModalOpen(true);
    }

    function abrirEditar(u) {
        setEditando(u);
        const permisosExistentes = Array.isArray(u.permisos) && u.permisos.length > 0
            ? u.permisos
            : (PERMISOS_DEFAULT_POR_ROL[u.rol] || []);

        setForm({
            nombre: u.nombre || '',
            email: u.email || '',
            password: '',
            rol: u.rol || 'ventas',
            activo: u.activo,
            permisos: [...permisosExistentes]
        });
        setError('');
        setModalOpen(true);
    }

    function handleCambioRol(nuevoRol) {
        // Al cambiar de rol, si es nuevo o el usuario lo desea, podemos pre-cargar los permisos típicos de ese rol
        const permisosSugeridos = PERMISOS_DEFAULT_POR_ROL[nuevoRol] || [];
        setForm(prev => ({
            ...prev,
            rol: nuevoRol,
            permisos: nuevoRol === 'admin' ? MODULOS_SISTEMA.map(m => m.ruta) : permisosSugeridos
        }));
    }

    function togglePermiso(ruta) {
        setForm(prev => {
            const yaTiene = prev.permisos.includes(ruta);
            const nuevos = yaTiene
                ? prev.permisos.filter(r => r !== ruta)
                : [...prev.permisos, ruta];
            return { ...prev, permisos: nuevos };
        });
    }

    function seleccionarTodosLosPermisos() {
        setForm(prev => ({
            ...prev,
            permisos: MODULOS_SISTEMA.map(m => m.ruta)
        }));
    }

    function deseleccionarTodosLosPermisos() {
        setForm(prev => ({
            ...prev,
            permisos: []
        }));
    }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        setGuardando(true);
        try {
            if (editando) {
                const payload = {
                    nombre: form.nombre,
                    rol: form.rol,
                    activo: form.activo,
                    permisos: form.rol === 'admin' ? MODULOS_SISTEMA.map(m => m.ruta) : form.permisos
                };
                if (form.password) payload.password = form.password;
                await client.put(`/usuarios/${editando.id}`, payload);
            } else {
                const payload = {
                    ...form,
                    permisos: form.rol === 'admin' ? MODULOS_SISTEMA.map(m => m.ruta) : form.permisos
                };
                await client.post('/usuarios', payload);
            }

            // Si se editó a sí mismo, refrescar la sesión local
            if (editando && usuarioActual?.id === editando.id) {
                await refrescarUsuario();
            }

            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el usuario.');
        } finally {
            setGuardando(false);
        }
    }

    async function toggleActivo(u) {
        try {
            await client.put(`/usuarios/${u.id}`, {
                nombre: u.nombre,
                rol: u.rol,
                activo: u.activo ? 0 : 1,
                permisos: u.permisos
            });
            cargar();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al cambiar estado.');
        }
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 900 }}>Administración de Usuarios y Permisos</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Configurá las áreas y secciones permitidas para cada usuario del sistema de forma granular.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo}>
                    <IconPlus /> Nuevo usuario
                </button>
            </div>

            <div className="card">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol Principal</th>
                                <th>Módulos Permitidos</th>
                                <th>Estado</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 24 }} className="muted">
                                        Cargando usuarios...
                                    </td>
                                </tr>
                            ) : usuarios.map(u => {
                                const cantPermisos = u.rol === 'admin'
                                    ? MODULOS_SISTEMA.length
                                    : (Array.isArray(u.permisos) && u.permisos.length > 0 ? u.permisos.length : (PERMISOS_DEFAULT_POR_ROL[u.rol]?.length || 0));

                                return (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                                        <td className="mono muted">{u.email}</td>
                                        <td>
                                            <span className={`badge ${ROLES[u.rol] || 'badge-neutral'}`}>
                                                {u.rol}
                                            </span>
                                        </td>
                                        <td>
                                            {u.rol === 'admin' ? (
                                                <span style={{
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    color: '#059669',
                                                    background: '#D1FAE5',
                                                    padding: '3px 8px',
                                                    borderRadius: 6
                                                }}>
                                                    ⭐ Acceso Total (Admin)
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#1E40AF',
                                                    background: '#DBEAFE',
                                                    padding: '3px 8px',
                                                    borderRadius: 6
                                                }}>
                                                    🔐 {cantPermisos} de {MODULOS_SISTEMA.length} áreas habilitadas
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>
                                                {u.activo ? 'activo' : 'inactivo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => abrirEditar(u)}
                                                    title="Editar datos y permisos de acceso"
                                                >
                                                    🔑 Gestionar Permisos
                                                </button>
                                                {u.id !== usuarioActual?.id && (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => toggleActivo(u)}
                                                    >
                                                        {u.activo ? 'Desactivar' : 'Activar'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE EDICIÓN / CREACIÓN CON CHECKLIST DE PERMISOS */}
            {modalOpen && (
                <Modal
                    title={editando ? `Editar Usuario: ${editando.nombre}` : 'Nuevo Usuario del Sistema'}
                    onClose={() => setModalOpen(false)}
                    width={680}
                >
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="field">
                                <label>Nombre y Apellido *</label>
                                <input
                                    required
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            <div className="field">
                                <label>Email de Acceso *</label>
                                <input
                                    required
                                    type="email"
                                    disabled={!!editando}
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="usuario@mixpoint.com"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="field">
                                <label>{editando ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
                                <input
                                    required={!editando}
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder={editando ? 'Dejar en blanco para no cambiar' : '••••••••'}
                                />
                            </div>
                            <div className="field">
                                <label>Rol Base</label>
                                <select
                                    value={form.rol}
                                    onChange={e => handleCambioRol(e.target.value)}
                                >
                                    <option value="admin">Administrador (Acceso irrestricto)</option>
                                    <option value="ventas">Ventas (Comercial)</option>
                                    <option value="deposito">Depósito (Logística y armado)</option>
                                    <option value="administracion">Administración (Cuentas y Finanzas)</option>
                                </select>
                            </div>
                        </div>

                        {/* SELECCIÓN GRANULAR DE SECCIONES / PERMISOS */}
                        <div style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '16px',
                            background: '#F8FAFC',
                            marginTop: 6
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 12
                            }}>
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>🛡️ Secciones y Módulos Habilitados</span>
                                        {form.rol === 'admin' && (
                                            <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', padding: '1px 6px', borderRadius: 4 }}>
                                                Admin tiene acceso a todo
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748B' }}>
                                        Marcá o desmarcá las áreas del sistema a las que este usuario podrá ingresar.
                                    </div>
                                </div>

                                {form.rol !== 'admin' && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            onClick={seleccionarTodosLosPermisos}
                                            style={{ fontSize: 11 }}
                                        >
                                            ✅ Todos
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            onClick={deseleccionarTodosLosPermisos}
                                            style={{ fontSize: 11, color: '#EF4444' }}
                                        >
                                            ❌ Ninguno
                                        </button>
                                    </div>
                                )}
                            </div>

                            {form.rol === 'admin' ? (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    background: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    color: '#065F46',
                                    fontSize: 13,
                                    fontWeight: 600
                                }}>
                                    ✨ Al tener rol de <strong>Administrador</strong>, este usuario tiene acceso irrestricto y permanente a todas las pantallas, configuraciones y usuarios del sistema.
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: 10,
                                    maxHeight: 280,
                                    overflowY: 'auto',
                                    paddingRight: 4
                                }}>
                                    {MODULOS_SISTEMA.map((modulo) => {
                                        const habilitado = form.permisos.includes(modulo.ruta);
                                        return (
                                            <label
                                                key={modulo.ruta}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 10,
                                                    padding: '10px 12px',
                                                    borderRadius: 8,
                                                    border: habilitado ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                                                    background: habilitado ? '#EFF6FF' : '#FFFFFF',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={habilitado}
                                                    onChange={() => togglePermiso(modulo.ruta)}
                                                    style={{ marginTop: 3, cursor: 'pointer', transform: 'scale(1.15)' }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: 12.5,
                                                        fontWeight: 700,
                                                        color: habilitado ? '#1E40AF' : '#1E293B',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}>
                                                        <span>{modulo.icono}</span>
                                                        <span>{modulo.label}</span>
                                                    </div>
                                                    <div style={{
                                                        fontSize: 11,
                                                        color: habilitado ? '#3B82F6' : '#64748B',
                                                        marginTop: 2,
                                                        lineHeight: 1.3
                                                    }}>
                                                        {modulo.descripcion}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setModalOpen(false)}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={guardando}
                            >
                                {guardando ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
