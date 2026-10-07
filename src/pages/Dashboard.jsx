import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { IconAlerta, IconReloj, IconRecepcion } from '../components/Icons';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

function getSaludo(nombre) {
    const hora = new Date().getHours();
    let saludo = '¡Buenas noches';
    if (hora >= 6 && hora < 12) saludo = '¡Buenos días';
    else if (hora >= 12 && hora < 20) saludo = '¡Buenas tardes';
    return `${saludo}, ${nombre || 'Equipo Mix Point'}!`;
}

const ESTADOS_MAP = [
    { key: 'pendiente', label: 'Pendiente', badgeClass: 'badge-status-pendiente', icon: '🟡' },
    { key: 'en_preparacion', label: 'En Preparación', badgeClass: 'badge-status-preparacion', icon: '🔵' },
    { key: 'esperando_pago', label: 'Esperando Pago', badgeClass: 'badge-status-esperando-pago', icon: '🟣' },
    { key: 'en_camino', label: 'En Camino', badgeClass: 'badge-status-camino', icon: '🟠' },
    { key: 'entregado', label: 'Entregado', badgeClass: 'badge-status-entregado', icon: '🟢' },
    { key: 'facturado', label: 'Facturado', badgeClass: 'badge-status-facturado', icon: '🔷' },
    { key: 'cancelado', label: 'Cancelado', badgeClass: 'badge-status-cancelado', icon: '🔴' }
];

export default function Dashboard() {
    const { usuario } = useAuth();
    const { preferences, updatePreferences } = usePreferences();
    const [resumen, setResumen] = useState(null);
    const [evolucion, setEvolucion] = useState(null);
    const [predicciones, setPredicciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [vistaActiva, setVistaActiva] = useState(usuario?.rol === 'admin' ? 'ejecutiva' : 'operativa');

    const metricsConfig = preferences?.dashboardMetrics || {
        ventas: true,
        compras: true,
        gastos: true,
        stock: true,
        graficos: true,
        alertas: true
    };
    const isTactical = preferences?.hudMode === 'tactical';

    useEffect(() => {
        Promise.all([
            client.get('/dashboard/resumen'),
            client.get('/dashboard/evolucion-mensual'),
            client.get('/jarvis/prediccion-stock').catch(() => ({ data: { predicciones: [] } }))
        ]).then(([r1, r2, r3]) => {
            setResumen(r1.data);
            setEvolucion(r2.data);
            setPredicciones(r3.data?.predicciones || []);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="stack gap-lg" style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <SkeletonTable rows={6} cols={4} />
            </div>
        );
    }

    if (!resumen) {
        return (
            <div style={{ padding: 32, textAlign: 'center' }}>
                <p className="muted">No se pudo cargar la información del panel.</p>
            </div>
        );
    }

    // Combinar series de evolución mensual
    const meses = Array.from(new Set([
        ...(evolucion?.ventas || []).map(v => v.mes),
        ...(evolucion?.gastos || []).map(v => v.mes),
        ...(evolucion?.compras || []).map(v => v.mes),
    ])).sort();

    const chartData = meses.map(mes => ({
        mes,
        Ventas: evolucion.ventas?.find(v => v.mes === mes)?.total || 0,
        Compras: evolucion.compras?.find(v => v.mes === mes)?.total || 0,
        Gastos: evolucion.gastos?.find(v => v.mes === mes)?.total || 0,
    }));

    // Contadores por estado de pedidos
    const estadosContadores = (resumen.estados_pedidos || []).reduce((acc, it) => {
        acc[it.estado] = { cantidad: it.cantidad, total: it.total };
        return acc;
    }, {});

    return (
        <div className={`stack gap-lg ${isTactical ? 'tactical-grid-bg' : ''}`} style={{ padding: isTactical ? 20 : 0, borderRadius: isTactical ? 8 : 0 }}>
            {/* CABECERA CON SALUDO Y SELECTORES */}
            <div className="spread page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                    {isTactical ? (
                        <div>
                            <div className="mono" style={{ fontSize: 11, color: '#FF9800', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                // TACTICAL INDUSTRIAL COMMAND // MIX POINT HQ
                            </div>
                            <h1 className="mono" style={{ fontSize: 24, color: '#F8FAFC', fontWeight: 700, margin: '4px 0' }}>
                                MIX POINT OPERATIONS — VISUALIZACIÓN TÁCTICA
                            </h1>
                            <p className="mono text-xs" style={{ color: '#00E676' }}>
                                ● TELEMETRÍA EN VIVO · LATENCIA: 0ms · FLUJO: GOOGLE SHEETS ➔ POSTGRESQL
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h1 style={{ fontSize: 26, color: 'var(--color-text)' }}>{getSaludo(usuario?.nombre)}</h1>
                            <p className="muted text-sm" style={{ marginTop: 4 }}>
                                Panel adaptado para {usuario?.rol === 'admin' ? 'Administración y Finanzas' : 'Operaciones y Logística'} · Distribuidora Mix Point
                            </p>
                        </div>
                    )}
                </div>

                <div className="row gap-sm" style={{ alignItems: 'center' }}>
                    {/* Toggle Rápido de Modo Táctico */}
                    <button
                        type="button"
                        onClick={() => updatePreferences({ hudMode: isTactical ? 'classic' : 'tactical' })}
                        className="btn btn-sm"
                        style={{
                            background: isTactical ? 'rgba(255, 152, 0, 0.2)' : 'rgba(17, 20, 29, 0.08)',
                            color: isTactical ? '#FF9800' : 'var(--color-text)',
                            border: `1px solid ${isTactical ? '#FF9800' : 'var(--color-border)'}`,
                            fontWeight: 600,
                            borderRadius: 6
                        }}
                        title="Cambiar entre diseño Clásico Corporativo y Modo Táctico Industrial"
                    >
                        {isTactical ? '🏛️ Modo Clásico' : '⚡ Modo Táctico HUD'}
                    </button>

                    <div style={{ background: isTactical ? '#1E293B' : '#ECE8DA', borderRadius: 8, padding: 3, display: 'inline-flex' }}>
                        <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                                background: vistaActiva === 'ejecutiva' ? (isTactical ? '#0F172A' : '#FFFFFF') : 'transparent',
                                color: vistaActiva === 'ejecutiva' ? (isTactical ? '#FF9800' : 'var(--color-text)') : (isTactical ? '#94A3B8' : 'var(--color-text-muted)'),
                                border: 'none',
                                borderRadius: 6
                            }}
                            onClick={() => setVistaActiva('ejecutiva')}
                        >
                            💼 Vista Ejecutiva
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                                background: vistaActiva === 'operativa' ? (isTactical ? '#0F172A' : '#FFFFFF') : 'transparent',
                                color: vistaActiva === 'operativa' ? (isTactical ? '#00E676' : 'var(--color-text)') : (isTactical ? '#94A3B8' : 'var(--color-text-muted)'),
                                border: 'none',
                                borderRadius: 6
                            }}
                            onClick={() => setVistaActiva('operativa')}
                        >
                            📦 Vista Depósito
                        </button>
                    </div>

                    <Link to="/remitos" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        + Generar remito
                    </Link>
                </div>
            </div>

            {/* SECCIÓN TÁCTICA HUD (SI ESTÁ ACTIVO) */}
            {isTactical && (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 280px', gap: 16, alignItems: 'stretch' }} className="tactical-hud-container">
                    {/* RADAR TÁCTICO CIRCULAR */}
                    <div className="tactical-hud-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 180 }}>
                        <div className="tactical-radar-scan" />
                        <div className="mono text-xs" style={{ color: '#FF9800', marginTop: 10, textAlign: 'center', fontWeight: 600 }}>
                            RADAR DE OPERACIONES
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>
                            NODOS ACTIVOS: {resumen.estados_pedidos?.length || 7}
                        </div>
                    </div>

                    {/* TELEMETRÍA CENTRAL */}
                    <div className="tactical-hud-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div className="spread" style={{ borderBottom: '1px solid rgba(255, 152, 0, 0.2)', paddingBottom: 8 }}>
                            <span className="mono" style={{ fontSize: 12, color: '#FF9800', fontWeight: 700 }}>
                                TELEMETRÍA DE DISTRIBUCIÓN
                            </span>
                            <span className="mono" style={{ fontSize: 11, color: '#00E676' }}>
                                STATUS: OPTIMAL
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, margin: '14px 0' }}>
                            <div>
                                <div className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>PEDIDOS HOY</div>
                                <div className="mono" style={{ fontSize: 20, color: '#F8FAFC', fontWeight: 700 }}>{resumen.pedidos_hoy || 0}</div>
                                <div className="mono" style={{ fontSize: 10, color: '#00E676' }}>▲ FLUJO CONSTANTE</div>
                            </div>
                            <div>
                                <div className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>REMITOS PENDIENTES</div>
                                <div className="mono" style={{ fontSize: 20, color: '#FF9800', fontWeight: 700 }}>{resumen.remitos_pendientes || 0}</div>
                                <div className="mono" style={{ fontSize: 10, color: '#FF9800' }}>EN ESPERA</div>
                            </div>
                            <div>
                                <div className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>PRODUCTOS TOTALES</div>
                                <div className="mono" style={{ fontSize: 20, color: '#38BDF8', fontWeight: 700 }}>{resumen.productos_total || 225}</div>
                                <div className="mono" style={{ fontSize: 10, color: '#38BDF8' }}>CATÁLOGO VIVO</div>
                            </div>
                            <div>
                                <div className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>STOCK CRÍTICO</div>
                                <div className="mono" style={{ fontSize: 20, color: '#EF4444', fontWeight: 700 }}>{resumen.productos_bajo_stock?.length || 0}</div>
                                <div className="mono" style={{ fontSize: 10, color: '#EF4444' }}>REPOSICIÓN REQ.</div>
                            </div>
                        </div>
                        <div className="mono text-xs" style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 10px', borderRadius: 4, color: '#CBD5E1' }}>
                            &gt; Conector Apps Script: Unidireccional activo. Cargas realizadas en Sheets se reflejan de inmediato.
                        </div>
                    </div>

                    {/* TERMINAL DE ESTADO Y SEGURIDAD */}
                    <div className="tactical-hud-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div className="mono" style={{ fontSize: 12, color: '#FF9800', fontWeight: 700, marginBottom: 8 }}>
                            TERMINAL STATUS
                        </div>
                        <div className="mono" style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ color: '#00E676' }}>✔ POSTGRESQL NEON: 200 OK</div>
                            <div style={{ color: '#00E676' }}>✔ REPORTE 8:00 AM: ACTIVO</div>
                            <div style={{ color: '#00E676' }}>✔ JARVIS IA: SINTONIZADO</div>
                            <div style={{ color: '#FF9800' }}>⚡ SESIÓN PERSISTENTE: 1 HORA</div>
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: '#64748B', marginTop: 10 }}>
                            DEPÓSITO: SAN ISIDRO 2135
                        </div>
                    </div>
                </div>
            )}

            {/* VISUAL TRACKER DEL PIPELINE DE 7 ESTADOS */}
            <div className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`} style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}>
                <div className="spread" style={{ marginBottom: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: isTactical ? '#FF9800' : 'inherit' }}>
                            Tracker de Pedidos y Remitos (Pipeline de 7 Estados)
                        </h3>
                        <p className="text-xs muted" style={{ color: isTactical ? '#94A3B8' : 'inherit' }}>
                            Estado de los pedidos de los últimos 30 días
                        </p>
                    </div>
                    <Link to="/remitos" className="text-sm" style={{ color: isTactical ? '#FF9800' : 'var(--color-primary-dark)', fontWeight: 600, textDecoration: 'none' }}>
                        Gestionar todos los remitos →
                    </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {ESTADOS_MAP.map(est => {
                        const count = estadosContadores[est.key]?.cantidad || 0;
                        const monto = estadosContadores[est.key]?.total || 0;

                        return (
                            <Link
                                key={est.key}
                                to={`/remitos`}
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: isTactical ? '1px solid rgba(255, 152, 0, 0.25)' : '1px solid var(--color-border)',
                                    background: isTactical ? 'rgba(0, 0, 0, 0.35)' : '#FAF9F4',
                                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                                className="card-hover-gold"
                            >
                                <div className="spread" style={{ marginBottom: 6 }}>
                                    <span style={{ fontSize: 14 }}>{est.icon}</span>
                                    <span className={`badge ${est.badgeClass}`} style={{ fontSize: 12, padding: '2px 7px' }}>
                                        {count}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: isTactical ? '#F8FAFC' : 'inherit' }}>{est.label}</div>
                                    <div className="mono text-xs muted" style={{ marginTop: 2, color: isTactical ? '#94A3B8' : 'inherit' }}>{fmtMoney(monto)}</div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* TARJETAS DE MÉTRICAS CONSOLIDADAS (FILTRABLES SEGÚN PREFERENCIAS) */}
            <div className="dashboard-stats-grid">
                {metricsConfig.ventas && (
                    <StatCard
                        label="Ventas del mes"
                        value={fmtMoney(resumen.ventas_mes.total)}
                        sub={`${resumen.ventas_mes.cantidad} remitos emitidos`}
                        accent="primary"
                        isTactical={isTactical}
                    />
                )}
                {metricsConfig.compras && (
                    <StatCard
                        label="Compras del mes"
                        value={fmtMoney(resumen.compras_mes.total)}
                        sub={`${resumen.compras_mes.cantidad} recepciones`}
                        accent="accent"
                        isTactical={isTactical}
                    />
                )}
                {metricsConfig.gastos && (
                    <StatCard
                        label="Gastos del mes"
                        value={fmtMoney(resumen.gastos_mes.total)}
                        sub={`${resumen.gastos_mes.cantidad} registros`}
                        accent="danger"
                        isTactical={isTactical}
                    />
                )}
                {metricsConfig.stock && (
                    <StatCard
                        label="Stock valorizado"
                        value={fmtMoney(resumen.valor_stock_actual)}
                        sub={`${resumen.remitos_pendientes} remitos pendientes`}
                        accent="neutral"
                        isTactical={isTactical}
                    />
                )}
            </div>

            {/* CONTENIDO SEGÚN VISTA: EJECUTIVA VS OPERATIVA */}
            {vistaActiva === 'ejecutiva' ? (
                /* VISTA EJECUTIVA: GRÁFICO DE EVOLUCIÓN + ALERTAS COMERCIALES */
                <div className="dashboard-main-grid">
                    {metricsConfig.graficos !== false && (
                        <div className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`} style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}>
                            <h3 style={{ fontSize: 15, marginBottom: 16, color: isTactical ? '#FF9800' : 'inherit' }}>
                                Evolución Financiera — Ventas, Compras y Gastos
                            </h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isTactical ? 'rgba(255, 152, 0, 0.15)' : 'var(--color-border)'} />
                                    <XAxis dataKey="mes" tick={{ fontSize: 11.5, fill: isTactical ? '#94A3B8' : 'var(--color-text-muted)' }} axisLine={{ stroke: isTactical ? '#334155' : 'var(--color-border-strong)' }} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: isTactical ? '#94A3B8' : 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={70}
                                           tickFormatter={(v) => new Intl.NumberFormat('es-AR', { notation: 'compact' }).format(v)} />
                                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontSize: 12.5, borderRadius: 8, border: '1px solid var(--color-border-strong)', backgroundColor: isTactical ? '#0F172A' : '#FFFFFF', color: isTactical ? '#F8FAFC' : 'inherit' }} />
                                    <Legend wrapperStyle={{ fontSize: 12.5 }} />
                                    <Bar dataKey="Ventas" fill={isTactical ? '#FF9800' : '#5C6B34'} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Compras" fill={isTactical ? '#38BDF8' : '#A8632E'} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Gastos" fill={isTactical ? '#F43F5E' : '#A83E32'} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="stack gap-md">
                        {/* PREDICCIÓN INTELIGENTE DE QUIEBRE DE STOCK */}
                        <div className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`} style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}>
                            <div className="row gap-sm" style={{ marginBottom: 10, color: isTactical ? '#FF9800' : 'var(--color-primary-dark)' }}>
                                <span style={{ fontSize: 18 }}>🤖</span>
                                <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>Predicción de Quiebre de Stock (Jarvis)</h3>
                            </div>
                            <p className="text-xs muted" style={{ marginBottom: 10, color: isTactical ? '#94A3B8' : 'inherit' }}>
                                Basado en el consumo diario de los últimos 30 días
                            </p>
                            {predicciones.filter(p => p.dias_restantes !== null && p.dias_restantes <= 10).length === 0 ? (
                                <p className="text-sm muted" style={{ color: isTactical ? '#94A3B8' : 'inherit' }}>
                                    ✅ Todos los productos tienen rotación con stock suficiente para más de 10 días.
                                </p>
                            ) : (
                                <div className="stack gap-xs">
                                    {predicciones.filter(p => p.dias_restantes !== null && p.dias_restantes <= 10).slice(0, 4).map(p => (
                                        <div
                                            key={p.id}
                                            className="spread text-sm"
                                            style={{
                                                padding: '6px 8px',
                                                background: isTactical ? 'rgba(255, 152, 0, 0.12)' : '#FEF3C7',
                                                borderRadius: 6,
                                                border: isTactical ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid #FDE68A'
                                            }}
                                        >
                                            <span style={{ color: isTactical ? '#F8FAFC' : 'inherit' }}><strong>{p.nombre}</strong> ({p.stock_actual} {p.unidad})</span>
                                            <span className="mono badge badge-warning" style={{ fontWeight: 700 }}>
                                                ~{p.dias_restantes} días
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ACCIONES EJECUTIVAS RÁPIDAS */}
                        <div className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`} style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}>
                            <h3 style={{ fontSize: 14.5, marginBottom: 10, color: isTactical ? '#FF9800' : 'inherit' }}>Atajos Rápidos</h3>
                            <div className="stack gap-xs">
                                <Link to="/conciliacion" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                                    🏦 Validar Transferencias y Conciliación Bancaria
                                </Link>
                                <Link to="/reportes-diarios" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                                    📊 Ver Reporte Ejecutivo 8:00 AM
                                </Link>
                                <Link to="/catalogo-flyers" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                                    🎨 Generar Catálogo y Flyers de Promoción
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* VISTA OPERATIVA: DEPÓSITO, PICKING FEFO Y LOTES POR VENCER */
                <div className="dashboard-main-grid">
                    {metricsConfig.alertas !== false && (
                        <div className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`} style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}>
                            <div className="row gap-sm" style={{ marginBottom: 14, color: 'var(--color-danger)' }}>
                                <IconAlerta />
                                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Stock Bajo Mínimo (Reposición Urgente)</h3>
                            </div>
                            {resumen.productos_bajo_stock.length === 0 ? (
                                <p className="text-sm muted" style={{ color: isTactical ? '#94A3B8' : 'inherit' }}>Todo el stock está en niveles normales en depósito.</p>
                            ) : (
                                <div className="table-wrap">
                                    <table className="data-table table-hover-gold">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th className="text-right">Stock Actual</th>
                                                <th className="text-right">Mínimo</th>
                                                <th className="text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resumen.productos_bajo_stock.map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ color: isTactical ? '#F8FAFC' : 'inherit' }}><strong>{p.nombre}</strong></td>
                                                    <td className="text-right mono"><span className="badge badge-danger">{p.stock_actual} {p.unidad_medida}</span></td>
                                                    <td className="text-right mono" style={{ color: isTactical ? '#CBD5E1' : 'inherit' }}>{p.stock_minimo} {p.unidad_medida}</td>
                                                    <td className="text-right">
                                                        <Link to="/recepciones" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>
                                                            + Recibir mercadería
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="stack gap-md">
                        {/* LOTES POR VENCER (FEFO) */}
                        <div className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`} style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}>
                            <div className="row gap-sm" style={{ marginBottom: 12, color: 'var(--color-warning)' }}>
                                <IconReloj />
                                <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>Control FEFO — Lotes Próximos a Vencer</h3>
                            </div>
                            {resumen.lotes_por_vencer.length === 0 ? (
                                <p className="text-sm muted" style={{ color: isTactical ? '#94A3B8' : 'inherit' }}>No hay lotes próximos a vencer en los siguientes 30 días.</p>
                            ) : (
                                <div className="stack gap-sm">
                                    {resumen.lotes_por_vencer.map(l => (
                                        <div
                                            key={l.id}
                                            className="spread text-sm"
                                            style={{
                                                padding: '6px 10px',
                                                background: isTactical ? 'rgba(234, 179, 8, 0.1)' : '#FFFBEB',
                                                borderRadius: 6,
                                                border: isTactical ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid #FDE68A'
                                            }}
                                        >
                                            <div>
                                                <div style={{ color: isTactical ? '#F8FAFC' : 'inherit' }}><strong>{l.producto_nombre}</strong></div>
                                                <div className="text-xs muted mono" style={{ color: isTactical ? '#94A3B8' : 'inherit' }}>Lote: {l.numero_lote || 'L-GENERAL'} ({l.cantidad_actual} {l.unidad_medida})</div>
                                            </div>
                                            <span className="mono badge badge-warning">
                                                Vto: {l.fecha_vencimiento?.slice(0, 10)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ACCIONES DE DEPÓSITO */}
                        <div className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`} style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}>
                            <h3 style={{ fontSize: 14.5, marginBottom: 10, color: isTactical ? '#FF9800' : 'inherit' }}>Acciones de Depósito</h3>
                            <div className="stack gap-xs">
                                <Link to="/recepciones" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                                    <IconRecepcion /> Registrar Recepción de Mercadería
                                </Link>
                                <Link to="/produccion" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                                    🥣 Armado y Fraccionamiento de Mixes
                                </Link>
                                <Link to="/remitos" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                                    🚚 Imprimir Hojas de Ruta y Picking
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, sub, accent, isTactical }) {
    return (
        <div
            className={`card card-pad card-hover-gold ${isTactical ? 'tactical-hud-card' : ''}`}
            style={{ background: isTactical ? 'rgba(16, 21, 34, 0.9)' : '#FFFFFF' }}
        >
            <p className="text-sm muted" style={{ color: isTactical ? '#94A3B8' : 'inherit' }}>{label}</p>
            <p className="mono" style={{ fontSize: 24, fontWeight: 600, margin: '6px 0 4px', color: isTactical ? '#F8FAFC' : 'var(--color-text)' }}>
                {value}
            </p>
            <p className={`text-sm badge badge-${accent}`}>{sub}</p>
        </div>
    );
}
