import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import client from '../api/client';
import { IconAlerta, IconReloj } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export default function Dashboard() {
    const [resumen, setResumen] = useState(null);
    const [evolucion, setEvolucion] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            client.get('/dashboard/resumen'),
            client.get('/dashboard/evolucion-mensual'),
        ]).then(([r1, r2]) => {
            setResumen(r1.data);
            setEvolucion(r2.data);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="muted">Cargando panel…</p>;
    if (!resumen) return <p className="muted">No se pudo cargar el panel.</p>;

    // combinar series de evolución mensual en un solo array para el gráfico
    const meses = Array.from(new Set([
        ...evolucion.ventas.map(v => v.mes),
        ...evolucion.gastos.map(v => v.mes),
        ...evolucion.compras.map(v => v.mes),
    ])).sort();
    const chartData = meses.map(mes => ({
        mes,
        Ventas: evolucion.ventas.find(v => v.mes === mes)?.total || 0,
        Compras: evolucion.compras.find(v => v.mes === mes)?.total || 0,
        Gastos: evolucion.gastos.find(v => v.mes === mes)?.total || 0,
    }));

    return (
        <div className="stack gap-lg">
            <div>
                <h1 style={{ fontSize: 26 }}>Panel general</h1>
                <p className="muted text-sm" style={{ marginTop: 4 }}>Resumen del mes en curso</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <StatCard label="Ventas del mes" value={fmtMoney(resumen.ventas_mes.total)} sub={`${resumen.ventas_mes.cantidad} remitos`} accent="primary" />
                <StatCard label="Compras del mes" value={fmtMoney(resumen.compras_mes.total)} sub={`${resumen.compras_mes.cantidad} recepciones`} accent="accent" />
                <StatCard label="Gastos del mes" value={fmtMoney(resumen.gastos_mes.total)} sub={`${resumen.gastos_mes.cantidad} registros`} accent="danger" />
                <StatCard label="Valor de stock" value={fmtMoney(resumen.valor_stock_actual)} sub={`${resumen.remitos_pendientes} remitos pendientes`} accent="neutral" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
                <div className="card card-pad">
                    <h3 style={{ fontSize: 15, marginBottom: 16 }}>Evolución — últimos meses</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11.5, fill: 'var(--color-text-muted)' }} axisLine={{ stroke: 'var(--color-border-strong)' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={70}
                                   tickFormatter={(v) => new Intl.NumberFormat('es-AR', { notation: 'compact' }).format(v)} />
                            <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontSize: 12.5, borderRadius: 8, border: '1px solid var(--color-border-strong)' }} />
                            <Legend wrapperStyle={{ fontSize: 12.5 }} />
                            <Bar dataKey="Ventas" fill="#5C6B34" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Compras" fill="#A8632E" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Gastos" fill="#A83E32" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="stack gap-md">
                    <div className="card card-pad">
                        <div className="row gap-sm" style={{ marginBottom: 12, color: 'var(--color-danger)' }}>
                            <IconAlerta />
                            <h3 style={{ fontSize: 14.5 }}>Stock bajo mínimo</h3>
                        </div>
                        {resumen.productos_bajo_stock.length === 0 ? (
                            <p className="text-sm muted">Todo el stock está en niveles normales.</p>
                        ) : (
                            <div className="stack gap-sm">
                                {resumen.productos_bajo_stock.map(p => (
                                    <div key={p.id} className="spread text-sm">
                                        <span>{p.nombre}</span>
                                        <span className="mono badge badge-danger">{p.stock_actual}/{p.stock_minimo} {p.unidad_medida}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card card-pad">
                        <div className="row gap-sm" style={{ marginBottom: 12, color: 'var(--color-warning)' }}>
                            <IconReloj />
                            <h3 style={{ fontSize: 14.5 }}>Lotes por vencer (30 días)</h3>
                        </div>
                        {resumen.lotes_por_vencer.length === 0 ? (
                            <p className="text-sm muted">No hay lotes próximos a vencer.</p>
                        ) : (
                            <div className="stack gap-sm">
                                {resumen.lotes_por_vencer.map(l => (
                                    <div key={l.id} className="spread text-sm">
                                        <span>{l.producto_nombre} {l.numero_lote ? `· ${l.numero_lote}` : ''}</span>
                                        <span className="mono badge badge-warning">{l.fecha_vencimiento}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub, accent }) {
    return (
        <div className="card card-pad">
            <p className="text-sm muted">{label}</p>
            <p className="mono" style={{ fontSize: 24, fontWeight: 600, margin: '6px 0 4px' }}>{value}</p>
            <p className={`text-sm badge badge-${accent}`}>{sub}</p>
        </div>
    );
}
