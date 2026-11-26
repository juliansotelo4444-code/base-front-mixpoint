import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { SkeletonTable } from '../components/SkeletonLoader';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);

function formatearFechaCorta(yyyyMmDd) {
    if (!yyyyMmDd) return '';
    const parts = String(yyyyMmDd).slice(0, 10).split('-');
    if (parts.length !== 3) return yyyyMmDd;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function PagosMercadoPago() {
    const [loading, setLoading] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [configurado, setConfigurado] = useState(true);
    const [pagos, setPagos] = useState([]);
    const [cuentaInfo, setCuentaInfo] = useState(null);
    const [horas, setHoras] = useState(24);
    const [busqueda, setBusqueda] = useState('');
    const [error, setError] = useState('');
    const [ultimaConsulta, setUltimaConsulta] = useState(null);

    const cargarPagos = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        else setRefrescando(true);
        setError('');
        try {
            const { data } = await client.get('/mercadopago/pagos-recientes', {
                params: { horas, limite: 50, _t: Date.now() }
            });
            setConfigurado(Boolean(data?.configurado));
            setPagos(Array.isArray(data?.pagos) ? data.pagos : []);
            setCuentaInfo(data?.cuenta_info || null);
            setUltimaConsulta(new Date());
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudieron consultar los movimientos de Mercado Pago.');
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

    const pagosFiltrados = pagos.filter((p) => {
        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase();
        return (
            String(p.titular || '').toLowerCase().includes(q) ||
            String(p.id || '').toLowerCase().includes(q) ||
            String(p.descripcion || '').toLowerCase().includes(q) ||
            String(p.cuit || '').toLowerCase().includes(q) ||
            String(p.monto || '').includes(q)
        );
    });

    return (
        <div className="stack gap-lg">
            {/* CABECERA */}
            <div className="spread page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                            💳 Movimientos Mercado Pago
                        </h1>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: '#F1F5F9',
                            color: '#475569',
                            border: '1px solid #CBD5E1'
                        }}>
                            🔒 Solo lectura
                        </span>
                    </div>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Consulta en tiempo real de transferencias y cobros entrantes (Solo lectura)
                        {cuentaInfo?.nickname ? ` · Cuenta: ${cuentaInfo.nickname}` : ''}
                    </p>
                </div>

                <div className="row gap-sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: '#DCFCE7',
                        color: '#166534',
                        border: '1px solid #86EFAC'
                    }}>
                        ● En vivo (cada 15s)
                        {ultimaConsulta && (
                            <span className="mono" style={{ opacity: 0.85 }}>
                                · {ultimaConsulta.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                    </span>

                    <button
                        type="button"
                        className="btn"
                        onClick={() => cargarPagos(true)}
                        disabled={refrescando || loading}
                        style={{ background: '#009EE3', color: '#FFFFFF', fontWeight: 700, border: 'none', padding: '9px 15px' }}
                    >
                        {refrescando ? '⏳ Actualizando...' : '🔄 Actualizar ahora'}
                    </button>
                </div>
            </div>

            {!configurado && !loading ? (
                <div className="card card-pad" style={{
                    background: '#FFFBEB',
                    border: '1.5px solid #FDE68A',
                    color: '#92400E'
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                        ⚙️ Mercado Pago aún no está conectado
                    </h2>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
                        Un Administrador debe cargar el <strong>Access Token de Producción</strong> de Mercado Pago en la sección{' '}
                        <strong>Conciliación Bancaria → ⚙️ Configurar Mercado Pago</strong> para habilitar los movimientos en vivo.
                    </p>
                </div>
            ) : (
                <>
                    {/* BARRA DE FILTROS Y RESUMEN DE CANTIDAD */}
                    <div className="card card-pad" style={{ background: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ flex: '1 1 260px', maxWidth: 480 }}>
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar por cliente / pagador, monto o N° de operación..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        fontSize: 14,
                                        borderRadius: 8,
                                        border: '1.5px solid var(--color-border-strong)',
                                        background: '#FFFFFF',
                                        color: 'var(--color-text)'
                                    }}
                                />
                            </div>

                            <div className="row gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                <select
                                    value={horas}
                                    onChange={(e) => setHoras(Number(e.target.value))}
                                    style={{
                                        padding: '9px 12px',
                                        fontSize: 13.5,
                                        fontWeight: 600,
                                        borderRadius: 8,
                                        border: '1.5px solid var(--color-border-strong)',
                                        background: '#FFFFFF',
                                        color: 'var(--color-text)'
                                    }}
                                >
                                    <option value={6}>Últimas 6 hs</option>
                                    <option value={24}>Últimas 24 hs (Hoy)</option>
                                    <option value={48}>Últimas 48 hs</option>
                                    <option value={168}>Últimos 7 días</option>
                                </select>

                                <span style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    background: '#F0F9FF',
                                    color: '#0369A1',
                                    border: '1px solid #BAE6FD'
                                }}>
                                    {busqueda.trim()
                                        ? `${pagosFiltrados.length} de ${pagos.length} movimientos`
                                        : `${pagos.length} movimiento${pagos.length === 1 ? '' : 's'} en la ventana`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="alert-banner error">{error}</div>
                    )}

                    {/* LISTADO EN TARJETAS DE SOLO LECTURA */}
                    {loading ? (
                        <SkeletonTable rows={6} cols={4} />
                    ) : pagosFiltrados.length === 0 ? (
                        <div className="card card-pad" style={{ textAlign: 'center', padding: '44px 20px' }}>
                            <div style={{ fontSize: 38, marginBottom: 8 }}>💳</div>
                            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                                No hay cobros acreditados que coincidan
                            </p>
                            <p className="muted text-sm" style={{ margin: 0 }}>
                                {busqueda.trim()
                                    ? 'Probá limpiando el filtro de búsqueda o ampliando el rango de horas.'
                                    : `No se registraron cobros aprobados en las últimas ${horas} horas.`}
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
                            gap: 14
                        }}>
                            {pagosFiltrados.map((p) => (
                                <div
                                    key={p.id}
                                    className="card"
                                    style={{
                                        padding: '16px 18px',
                                        borderLeft: `6px solid ${p.ya_conciliado ? '#059669' : '#009EE3'}`,
                                        background: '#FFFFFF',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10
                                    }}
                                >
                                    <div className="spread" style={{ alignItems: 'flex-start', gap: 10 }}>
                                        <div>
                                            <div className="mono" style={{ fontSize: 24, fontWeight: 900, color: '#047857', lineHeight: 1.15 }}>
                                                {fmtMoney(p.monto)}
                                            </div>
                                            <div className="mono text-xs muted" style={{ marginTop: 4, fontWeight: 600 }}>
                                                📅 {formatearFechaCorta(p.fecha_movimiento)} · 🕒 {p.hora_ar ? `${p.hora_ar} hs` : '—'}
                                            </div>
                                        </div>

                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 8,
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            background: p.ya_conciliado ? '#D1FAE5' : '#E0F2FE',
                                            color: p.ya_conciliado ? '#065F46' : '#0369A1',
                                            border: `1px solid ${p.ya_conciliado ? '#A7F3D0' : '#BAE6FD'}`,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {p.ya_conciliado
                                                ? `✓ Validado en sistema${p.conciliacion_remito_numero ? ` (${p.conciliacion_remito_numero})` : ''}`
                                                : '● Acreditado en MP'}
                                        </span>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                                        <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                                            👤 {p.titular}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{
                                                background: '#F1F5F9',
                                                color: '#334155',
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: 6
                                            }}>
                                                {p.medio_pago}
                                            </span>
                                            <span className="mono text-xs muted">
                                                Op #{p.id}
                                            </span>
                                            {p.cuit && (
                                                <span className="mono text-xs muted">
                                                    · Doc: {p.cuit}
                                                </span>
                                            )}
                                        </div>
                                        {(p.descripcion || p.external_reference) && (
                                            <div className="text-xs muted" style={{ wordBreak: 'break-word' }}>
                                                {p.descripcion}
                                                {p.external_reference && p.descripcion !== p.external_reference ? ` · Ref: ${p.external_reference}` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
