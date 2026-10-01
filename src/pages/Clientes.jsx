import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import CuentaCorrienteModal from '../components/CuentaCorrienteModal';
import { IconPlus, IconBuscar, IconEditar, IconBaja } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const LISTA_NOMBRES = {
    kg: 'Minorista (1kg)',
    cincoKg: 'Lista 5kg',
    diezKg: 'Dietéticas (10kg)',
    veinticincoKg: 'Mayorista (25kg)',
    treintaKg: 'Bulto (30kg)',
    general: 'General'
};

const emptyForm = {
    razon_social: '',
    cuit: '',
    condicion_iva: 'Consumidor Final',
    direccion: '',
    localidad: '',
    telefono: '',
    email: '',
    lista_precio: 'kg',
    limite_credito: '',
    plazo_dias: '',
    observaciones: ''
};

export default function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [clienteCtaCte, setClienteCtaCte] = useState(null);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/clientes', { params: { q: q || undefined, activo: 1 } });
        setClientes(data);
        setLoading(false);
    }

    useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [q]);

    function abrirNuevo() {
        setEditando(null);
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    }

    function abrirEditar(cliente) {
        setEditando(cliente);
        setForm({
            ...emptyForm,
            ...cliente,
            lista_precio: cliente.lista_precio || 'kg',
            limite_credito: cliente.limite_credito ? Number(cliente.limite_credito) : '',
            plazo_dias: cliente.plazo_dias ? Number(cliente.plazo_dias) : ''
        });
        setError('');
        setModalOpen(true);
    }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        try {
            if (editando) {
                await client.put(`/clientes/${editando.id}`, form);
            } else {
                await client.post('/clientes', form);
            }
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el cliente.');
        }
    }

    async function darDeBaja(cliente) {
        if (!confirm(`¿Dar de baja a "${cliente.razon_social}"? No se elimina, pero deja de aparecer en las listas activas.`)) return;
        await client.delete(`/clientes/${cliente.id}`);
        cargar();
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Clientes</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>{clientes.length} clientes activos</p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo}><IconPlus /> Nuevo cliente</button>
            </div>

            <div className="card">
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="row gap-sm" style={{ maxWidth: 340 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input
                            placeholder="Buscar por razón social, CUIT o email…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                        />
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Razón social</th><th>CUIT</th><th>Localidad</th><th>Lista de precio</th>
                                <th className="text-right">Saldo cta. cte.</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600 }}>{c.razon_social}</td>
                                    <td className="mono muted">{c.cuit || '—'}</td>
                                    <td>{c.localidad || '—'}</td>
                                    <td>
                                        <span className="badge badge-primary" style={{ fontSize: 11.5, background: 'rgba(92,107,52,0.12)', color: 'var(--color-primary)' }}>
                                            {LISTA_NOMBRES[c.lista_precio] || c.lista_precio || 'General'}
                                        </span>
                                    </td>
                                    <td>
                                        <div
                                            className={`text-right mono ${Number(c.saldo_cuenta) > 0 ? 'text-danger' : 'muted'}`}
                                            style={{ cursor: 'pointer', fontWeight: Number(c.saldo_cuenta) > 0 ? 700 : 400 }}
                                            onClick={() => setClienteCtaCte(c)}
                                            title="Click para ver cuenta corriente"
                                        >
                                            {fmtMoney(c.saldo_cuenta)}
                                        </div>
                                        {Number(c.limite_credito) > 0 && (
                                            <div className="text-right" style={{ marginTop: 2, fontSize: 11 }}>
                                                {Number(c.saldo_cuenta) > Number(c.limite_credito) ? (
                                                    <span className="badge badge-danger" style={{ padding: '2px 6px', fontSize: 10 }}>
                                                        ⚠️ Supera límite
                                                    </span>
                                                ) : (
                                                    <span className="muted">Máx: {fmtMoney(c.limite_credito)}</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setClienteCtaCte(c)} title="Ver cuenta corriente y registrar cobros">
                                                💳 Cta. Cte.
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(c)}><IconEditar /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => darDeBaja(c)}><IconBaja /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && clientes.length === 0 && (
                        <div className="empty-state">
                            <div className="icon">📇</div>
                            <p>No hay clientes que coincidan con la búsqueda.</p>
                        </div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <Modal title={editando ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setModalOpen(false)} width={660}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="field">
                            <label>Razón social *</label>
                            <input required value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} />
                        </div>
                        <div className="form-grid">
                            <div className="field">
                                <label>CUIT</label>
                                <input value={form.cuit || ''} onChange={e => setForm({ ...form, cuit: e.target.value })} placeholder="Ej: 30-71234567-8" />
                            </div>
                            <div className="field">
                                <label>Condición IVA</label>
                                <select value={form.condicion_iva} onChange={e => setForm({ ...form, condicion_iva: e.target.value })}>
                                    <option>Consumidor Final</option>
                                    <option>Responsable Inscripto</option>
                                    <option>Monotributista</option>
                                    <option>Exento</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Dirección de entrega</label>
                                <input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Localidad / Zona</label>
                                <input value={form.localidad || ''} onChange={e => setForm({ ...form, localidad: e.target.value })} placeholder="Ej: Belgrano / CABA" />
                            </div>
                            <div className="field">
                                <label>Teléfono (con código de área)</label>
                                <input value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Ej: 11-4567-8901" />
                            </div>
                            <div className="field">
                                <label>Email</label>
                                <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                        </div>

                        {/* Configuración Comercial Mayorista */}
                        <div style={{ background: 'var(--color-surface-sunken)', padding: 14, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--color-primary)' }}>
                                🏷️ Condiciones Comerciales y Precios
                            </div>
                            <div className="form-grid">
                                <div className="field">
                                    <label>Lista de Precios Predeterminada</label>
                                    <select value={form.lista_precio || 'kg'} onChange={e => setForm({ ...form, lista_precio: e.target.value })}>
                                        <option value="kg">Minorista / Por Kg</option>
                                        <option value="cincoKg">Lista 5 Kg (Medio mayorista)</option>
                                        <option value="diezKg">Lista 10 Kg (Dietéticas y Almacenes)</option>
                                        <option value="veinticincoKg">Lista 25 Kg (Distribución / Bulto)</option>
                                        <option value="treintaKg">Lista 30 Kg (Gran volumen / Fábrica)</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Límite de Crédito ($) <span className="muted text-xs">(0 = sin límite)</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        placeholder="0 = Sin límite"
                                        value={form.limite_credito}
                                        onChange={e => setForm({ ...form, limite_credito: e.target.value })}
                                    />
                                </div>
                                <div className="field">
                                    <label>Plazo de Pago <span className="muted text-xs">(días)</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0 = Contado"
                                        value={form.plazo_dias}
                                        onChange={e => setForm({ ...form, plazo_dias: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="field">
                            <label>Observaciones</label>
                            <textarea rows={2} value={form.observaciones || ''} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Guardar cliente</button>
                        </div>
                    </form>
                </Modal>
            )}

            {clienteCtaCte && (
                <CuentaCorrienteModal
                    entidadTipo="cliente"
                    entidad={clienteCtaCte}
                    onClose={() => setClienteCtaCte(null)}
                    onActualizar={cargar}
                />
            )}
        </div>
    );
}
