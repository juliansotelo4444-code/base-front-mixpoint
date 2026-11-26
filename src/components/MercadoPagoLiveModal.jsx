import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);

export default function MercadoPagoLiveModal({ onClose, remitoTarget = null, onPagoConfirmado }) {
    const { usuario } = useAuth();
    const esSoloLectura = usuario?.rol === 'repartidor';
    const [loading, setLoading] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [configurado, setConfigurado] = useState(true);
    const [pagos, setPagos] = useState([]);
    const [cuentaInfo, setCuentaInfo] = useState(null);
    const [horas, setHoras] = useState(24);
    const [busqueda, setBusqueda] = useState('');
    const [error, setError] = useState('');
    const [feedbackOk, setFeedbackOk] = useState('');
    const [confirmandoId, setConfirmandoId] = useState(null);
    const [ultimaConsulta, setUltimaConsulta] = useState(null);

    const cargarPagos = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        else setRefrescando(true);
        setError('');
        try {
            const { data } = await client.get('/mercadopago/pagos-recientes', {
                params: { horas, limite: 40, _t: Date.now() }
            });
            setConfigurado(Boolean(data?.configurado));
            setPagos(Array.isArray(data?.pagos) ? data.pagos : []);
            setCuentaInfo(data?.cuenta_info || null);
            setUltimaConsulta(new Date());
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudieron consultar los cobros de Mercado Pago.');
        } finally {
            setLoading(false);
            setRefrescando(false);
        }
    }, [horas]);

    useEffect(() => {
        cargarPagos(false);
        const timer = setInterval(() => {
            cargarPagos(true);
        }, 15000);
        return () => clearInterval(timer);
    }, [cargarPagos]);

    async function handleConfirmarPago(payment) {
        if (!remitoTarget) return;
        setConfirmandoId(payment.id);
        setError('');
        setFeedbackOk('');
        try {
            await client.post('/mercadopago/confirmar-pago-remito', {
                remito_id: remitoTarget.id,
                payment
            });
            setFeedbackOk(`✅ Pago de ${fmtMoney(payment.monto)} (Op #${payment.id}) confirmado en remito ${remitoTarget.numero}.`);
            await cargarPagos(true);
            if (onPagoConfirmado) onPagoConfirmado(payment);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudo imputar el pago al remito.');
        } finally {
            setConfirmandoId(null);
        }
    }

    const totalEsperado = remitoTarget ? Number(remitoTarget.total) || 0 : 0;

    const esCoincidenciaExacta = (p) => {
        if (!remitoTarget) return false;
        return Math.abs((Number(p.monto) || 0) - totalEsperado) <= 100;
    };

    const pagosFiltrados = pagos
        .filter((p) => {
            if (!busqueda.trim()) return true;
            const q = busqueda.toLowerCase();
            return (
                String(p.titular || '').toLowerCase().includes(q) ||
                String(p.id || '').includes(q) ||
                String(p.descripcion || '').toLowerCase().includes(q) ||
                String(p.monto || '').includes(q)
            );
        })
        .sort((a, b) => {
            if (remitoTarget) {
                const aMatch = !a.ya_conciliado && esCoincidenciaExacta(a) ? 1 : 0;
                const bMatch = !b.ya_conciliado && esCoincidenciaExacta(b) ? 1 : 0;
                if (aMatch !== bMatch) return bMatch - aMatch;
            }
            return new Date(b.fecha_aprobacion || 0).getTime() - new Date(a.fecha_aprobacion || 0).getTime();
        });

    return (
        <Modal
            title={remitoTarget ? `💳 Verificar Pago MP · Remito ${remitoTarget.numero}` : '💳 Cobros Mercado Pago en Tiempo Real'}
            onClose={onClose}
            width={680}
        >
            <div className="stack gap-md">
                {remitoTarget && (
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: '#F0F9FF',
                        border: '1.5px solid #009EE3',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10
                    }}>
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                                Remito a validar · {remitoTarget.numero}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                                {remitoTarget.cliente_nombre}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#0369A1' }}>Total esperado</div>
                            <div className="mono" style={{ fontSize: 20, fontWeight: 900, color: '#0284C7' }}>
                                {fmtMoney(totalEsperado)}
                            </div>
                        </div>
                    </div>
                )}

                {!configurado && !loading ? (
                    <div style={{
                        padding: 18,
                        borderRadius: 10,
                        background: '#FFFBEB',
                        border: '1.5px solid #FDE68A',
                        color: '#92400E',
                        fontSize: 13.5,
                        lineHeight: 1.5
                    }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
                            ⚙️ Mercado Pago aún no está conectado
                        </div>
                        <p style={{ margin: 0 }}>
                            Pedile a un Administrador que cargue el <strong>Access Token de Producción</strong> en{' '}
                            <strong>Conciliación Bancaria → ⚙️ Configurar Mercado Pago</strong> para ver los cobros en vivo desde acá.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* BARRA DE CONTROLES Y ACTUALIZACIÓN EN VIVO */}
                        <div className="spread" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <div className="row gap-xs" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '4px 10px',
                                    borderRadius: 20,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    background: '#DCFCE7',
                                    color: '#166534'
                                }}>
                                    ● En vivo (cada 15s)
                                </span>
                                {cuentaInfo?.nickname && (
                                    <span className="text-xs muted">Cuenta: <strong>{cuentaInfo.nickname}</strong></span>
                                )}
                                {ultimaConsulta && (
                                    <span className="text-xs muted mono">
                                        {ultimaConsulta.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                )}
                            </div>

                            <div className="row gap-xs">
                                <select
                                    value={horas}
                                    onChange={(e) => setHoras(Number(e.target.value))}
                                    style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                >
                                    <option value={6}>Últimas 6 hs</option>
                                    <option value={24}>Últimas 24 hs</option>
                                    <option value={48}>Últimas 48 hs</option>
                                    <option value={168}>Últimos 7 días</option>
                                </select>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => cargarPagos(true)}
                                    disabled={refrescando || loading}
                                    style={{ background: '#009EE3', color: '#FFFFFF', fontWeight: 700, border: 'none' }}
                                >
                                    {refrescando ? 'Actualizando...' : '🔄 Actualizar ahora'}
                                </button>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Buscar por nombre del pagador, monto o N° de operación..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--color-border-strong)' }}
                        />

                        {error && (
                            <div className="alert-banner error" style={{ fontSize: 12.5 }}>{error}</div>
                        )}
                        {feedbackOk && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: '#ECFDF5',
                                border: '1.5px solid #10B981',
                                color: '#065F46',
                                fontWeight: 700,
                                fontSize: 13
                            }}>
                                {feedbackOk}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ padding: 32, textAlign: 'center' }} className="muted">
                                Consultando cobros en Mercado Pago...
                            </div>
                        ) : pagosFiltrados.length === 0 ? (
                            <div style={{
                                padding: '28px 16px',
                                textAlign: 'center',
                                background: '#F8FAFC',
                                borderRadius: 10,
                                border: '1px dashed var(--color-border-strong)',
                                color: 'var(--color-text-muted)',
                                fontSize: 13
                            }}>
                                No se encontraron cobros aprobados en las últimas {horas} horas.
                            </div>
                        ) : (
                            <div className="stack gap-sm" style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
                                {pagosFiltrados.map((p) => {
                                    const matchExacto = !p.ya_conciliado && esCoincidenciaExacta(p);
                                    const estaConfirmando = confirmandoId === p.id;

                                    return (
                                        <div
                                            key={p.id}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: 10,
                                                background: matchExacto ? '#ECFDF5' : '#FFFFFF',
                                                border: matchExacto ? '2px solid #10B981' : '1.5px solid var(--color-border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}
                                        >
                                            <div className="spread" style={{ alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        {matchExacto && (
                                                            <span style={{
                                                                background: '#10B981',
                                                                color: '#FFFFFF',
                                                                fontSize: 10.5,
                                                                fontWeight: 800,
                                                                padding: '2px 8px',
                                                                borderRadius: 6
                                                            }}>
                                                                ✅ COINCIDE CON ESTE REMITO
                                                            </span>
                                                        )}
                                                        <span style={{
                                                            background: '#E0F2FE',
                                                            color: '#0369A1',
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '2px 7px',
                                                            borderRadius: 6
                                                        }}>
                                                            {p.medio_pago}
                                                        </span>
                                                        <span className="mono text-xs muted">
                                                            🕒 {p.fecha_movimiento} {p.hora_ar ? `${p.hora_ar} hs` : ''}
                                                        </span>
                                                    </div>

                                                    <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--color-text)', marginTop: 4 }}>
                                                        {p.titular}
                                                    </div>
                                                    <div className="text-xs muted mono">
                                                        Op #{p.id} {p.cuit ? `· Doc: ${p.cuit}` : ''}
                                                        {p.descripcion ? ` · ${p.descripcion}` : ''}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div className="mono" style={{ fontSize: 20, fontWeight: 900, color: '#047857' }}>
                                                        {fmtMoney(p.monto)}
                                                    </div>
                                                    {p.ya_conciliado && (
                                                        <span style={{
                                                            display: 'inline-block',
                                                            marginTop: 2,
                                                            fontSize: 10.5,
                                                            fontWeight: 700,
                                                            padding: '2px 7px',
                                                            borderRadius: 6,
                                                            background: '#D1FAE5',
                                                            color: '#065F46'
                                                        }}>
                                                            ✓ Conciliado{p.conciliacion_remito_numero ? ` (${p.conciliacion_remito_numero})` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {remitoTarget && !p.ya_conciliado && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8 }}>
                                                    {esSoloLectura ? (
                                                        <span style={{
                                                            fontSize: 11.5,
                                                            fontWeight: 700,
                                                            padding: '4px 10px',
                                                            borderRadius: 6,
                                                            background: '#F1F5F9',
                                                            color: '#475569'
                                                        }}>
                                                            🔒 Solo consulta (sin edición)
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${matchExacto ? 'btn-primary' : 'btn-secondary'}`}
                                                            disabled={estaConfirmando}
                                                            onClick={() => handleConfirmarPago(p)}
                                                            style={matchExacto
                                                                ? { background: '#059669', borderColor: '#059669', color: '#FFFFFF', fontWeight: 800, padding: '7px 14px' }
                                                                : { fontWeight: 600 }}
                                                        >
                                                            {estaConfirmando
                                                                ? 'Confirmando...'
                                                                : (matchExacto ? '✅ Confirmar Pago del Remito' : `Imputar a ${remitoTarget.numero}`)}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
