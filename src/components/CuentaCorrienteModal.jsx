import { useState, useEffect } from 'react';
import Modal from './Modal';
import client from '../api/client';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

export default function CuentaCorrienteModal({ entidadTipo, entidad, onClose, onActualizar }) {
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrandoForm, setMostrandoForm] = useState(false);
    const [monto, setMonto] = useState('');
    const [tipo, setTipo] = useState(entidadTipo === 'cliente' ? 'cobro' : 'pago');
    const [medioPago, setMedioPago] = useState('transferencia');
    const [observaciones, setObservaciones] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [saldoActual, setSaldoActual] = useState(Number(entidad.saldo_cuenta) || 0);
    const [mensajeCopiado, setMensajeCopiado] = useState(false);

    const rutaEntidad = entidadTipo === 'cliente' ? 'clientes' : 'proveedores';

    function generarMensajeWhatsApp() {
        const estado = saldoActual > 0
            ? `tu saldo pendiente actual es de *${fmtMoney(saldoActual)}*.`
            : saldoActual < 0
            ? `tenés un saldo a favor de *${fmtMoney(Math.abs(saldoActual))}*.`
            : `tu cuenta corriente se encuentra al día ($0,00).`;

        return `Hola *${entidad.razon_social}*! Te escribimos desde *Mix Point Distribuidora*.\n\nTe informamos que ${estado}\n\nAnte cualquier consulta o para enviarnos comprobante de pago, quedamos a tu disposición.\n\n¡Muchas gracias!`;
    }

    function abrirWhatsApp() {
        const tel = (entidad.telefono || '').replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(generarMensajeWhatsApp());
        const phoneParam = tel ? (tel.startsWith('54') ? tel : (tel.startsWith('9') ? '54' + tel : '549' + tel)) : '';
        const url = phoneParam ? `https://wa.me/${phoneParam}?text=${msg}` : `https://wa.me/?text=${msg}`;
        window.open(url, '_blank');
    }

    function copiarResumen() {
        navigator.clipboard.writeText(generarMensajeWhatsApp());
        setMensajeCopiado(true);
        setTimeout(() => setMensajeCopiado(false), 3000);
    }

    async function cargarMovimientos() {
        setLoading(true);
        try {
            const { data } = await client.get(`/${rutaEntidad}/${entidad.id}/cuenta-corriente`);
            setMovimientos(data);
            const { data: entActualizada } = await client.get(`/${rutaEntidad}/${entidad.id}`);
            setSaldoActual(Number(entActualizada.saldo_cuenta) || 0);
        } catch (err) {
            console.error('Error cargando cta cte:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarMovimientos();
    }, [entidad.id]);

    async function handleRegistrar(e) {
        e.preventDefault();
        const numMonto = Math.abs(Number(monto));
        if (!numMonto || numMonto <= 0) {
            setError('Ingresá un monto válido mayor a 0.');
            return;
        }

        setGuardando(true);
        setError('');
        try {
            await client.post('/cuenta-corriente', {
                entidad_tipo: entidadTipo,
                entidad_id: entidad.id,
                tipo,
                monto: numMonto,
                medio_pago: medioPago,
                observaciones
            });
            setMonto('');
            setObservaciones('');
            setMostrandoForm(false);
            await cargarMovimientos();
            if (onActualizar) onActualizar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar el movimiento.');
        } finally {
            setGuardando(false);
        }
    }

    const etiquetaSaldo = () => {
        if (entidadTipo === 'cliente') {
            if (saldoActual > 0) return { texto: `Deuda pendiente: ${fmtMoney(saldoActual)}`, cls: 'badge-danger' };
            if (saldoActual < 0) return { texto: `Saldo a favor del cliente: ${fmtMoney(Math.abs(saldoActual))}`, cls: 'badge-info' };
            return { texto: 'Cuenta al día ($0,00)', cls: 'badge-success' };
        } else {
            if (saldoActual > 0) return { texto: `Saldo adeudado: ${fmtMoney(saldoActual)}`, cls: 'badge-warning' };
            if (saldoActual < 0) return { texto: `Anticipo a favor: ${fmtMoney(Math.abs(saldoActual))}`, cls: 'badge-info' };
            return { texto: 'Cuenta al día ($0,00)', cls: 'badge-success' };
        }
    };

    const saldoBadge = etiquetaSaldo();

    return (
        <Modal
            title={`Cuenta Corriente · ${entidad.razon_social}`}
            onClose={onClose}
            width={760}
        >
            <div className="stack gap-md">
                {/* Cabecera con estado de saldo */}
                <div className="spread" style={{ background: 'var(--color-surface-sunken)', padding: '12px 16px', borderRadius: 8 }}>
                    <div>
                        <span className="muted text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                            {entidadTipo === 'cliente' ? 'Cliente' : 'Proveedor'}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{entidad.razon_social}</div>
                        {entidad.cuit && <span className="mono muted text-xs">CUIT: {entidad.cuit}</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${saldoBadge.cls}`} style={{ fontSize: 13, padding: '4px 10px', fontWeight: 700 }}>
                            {saldoBadge.texto}
                        </span>
                    </div>
                </div>

                {/* Botón registrar pago/cobro y compartir WhatsApp */}
                <div className="spread" style={{ alignItems: 'center' }}>
                    <div className="row gap-sm" style={{ alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                            Historial de movimientos ({movimientos.length})
                        </div>
                        {entidadTipo === 'cliente' && (
                            <div className="row gap-xs">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={abrirWhatsApp}
                                    title="Abrir WhatsApp con mensaje de saldo"
                                    style={{ color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4', fontWeight: 600 }}
                                >
                                    💬 WhatsApp
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={copiarResumen}
                                    title="Copiar texto del mensaje"
                                >
                                    {mensajeCopiado ? '✅ Copiado!' : '📋 Copiar'}
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        className={`btn btn-sm ${mostrandoForm ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => setMostrandoForm(!mostrandoForm)}
                    >
                        {mostrandoForm ? 'Cancelar' : (entidadTipo === 'cliente' ? '+ Registrar Cobro' : '+ Registrar Pago')}
                    </button>
                </div>

                {/* Formulario rápido para cobro o pago */}
                {mostrandoForm && (
                    <form onSubmit={handleRegistrar} className="card stack gap-sm" style={{ padding: 14, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {entidadTipo === 'cliente' ? 'Registrar nuevo cobro a cliente' : 'Registrar nuevo pago a proveedor'}
                        </div>
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Tipo de movimiento</label>
                                <select value={tipo} onChange={e => setTipo(e.target.value)}>
                                    {entidadTipo === 'cliente' ? (
                                        <>
                                            <option value="cobro">Cobro (disminuye deuda)</option>
                                            <option value="cargo">Cargo / Facturación (aumenta deuda)</option>
                                            <option value="ajuste">Ajuste manual</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="pago">Pago emitido (disminuye deuda)</option>
                                            <option value="cargo">Cargo / Factura proveedor (aumenta deuda)</option>
                                            <option value="ajuste">Ajuste manual</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="field">
                                <label>Monto ($) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                    value={monto}
                                    onChange={e => setMonto(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="field">
                                <label>Medio de pago</label>
                                <select value={medioPago} onChange={e => setMedioPago(e.target.value)}>
                                    <option value="transferencia">Transferencia bancaria</option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Comprobante / Observaciones</label>
                                <input
                                    placeholder="Ej: N° transferencia, N° cheque o recibo…"
                                    value={observaciones}
                                    onChange={e => setObservaciones(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrandoForm(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
                                {guardando ? 'Guardando…' : 'Guardar movimiento'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tabla de movimientos */}
                <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 13 }}>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Medio</th>
                                <th>Detalle</th>
                                <th className="text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimientos.map(m => {
                                const esPositivo = m.tipo === 'cargo';
                                const fechaStr = m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                                return (
                                    <tr key={m.id}>
                                        <td className="mono text-xs">{fechaStr}</td>
                                        <td>
                                            <span className={`badge ${m.tipo === 'cargo' ? 'badge-warning' : m.tipo === 'cobro' || m.tipo === 'pago' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                                                {m.tipo === 'cargo' ? 'CARGO' : m.tipo === 'cobro' ? 'COBRO' : m.tipo === 'pago' ? 'PAGO' : 'AJUSTE'}
                                            </span>
                                        </td>
                                        <td style={{ textTransform: 'capitalize' }} className="muted text-xs">{m.medio_pago || '—'}</td>
                                        <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.observaciones || ''}>
                                            {m.observaciones || (m.referencia_tipo ? `${m.referencia_tipo} #${m.referencia_id || ''}` : '—')}
                                        </td>
                                        <td className="text-right mono" style={{ fontWeight: 600, color: esPositivo ? 'var(--color-danger)' : 'var(--color-primary-dark)' }}>
                                            {esPositivo ? '+' : '-'}{fmtMoney(Math.abs(m.monto))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!loading && movimientos.length === 0 && (
                        <div className="empty-state" style={{ padding: 24 }}>
                            <div className="icon">💳</div>
                            <p>No hay movimientos registrados en la cuenta corriente.</p>
                        </div>
                    )}
                </div>

                <div className="row gap-sm" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
}
