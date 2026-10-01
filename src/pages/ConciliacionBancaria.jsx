import { useState, useEffect } from 'react';
import api from '../services/api';
import { IconBanco, IconCheck, IconClose, IconAlerta } from '../components/Icons';

export default function ConciliacionBancaria() {
    const [movimientos, setMovimientos] = useState([]);
    const [metricas, setMetricas] = useState({
        monto_pendiente: 0,
        cantidad_pendientes: 0,
        monto_conciliado_mes: 0,
        cantidad_conciliados_mes: 0
    });
    const [clientes, setClientes] = useState([]);
    const [estadoFiltro, setEstadoFiltro] = useState('pendiente');
    const [cuentaFiltro, setCuentaFiltro] = useState('');
    const [cargando, setCargando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [mostrarImportador, setMostrarImportador] = useState(false);

    // Formulario de importación
    const [cuentaOrigen, setCuentaOrigen] = useState('mercadopago');
    const [contenidoTexto, setContenidoTexto] = useState('');
    const [feedback, setFeedback] = useState(null);

    // Mapeo local de selección de cliente por fila
    const [clientesSeleccionados, setClientesSeleccionados] = useState({});

    async function cargarDatos() {
        setCargando(true);
        try {
            const [metData, movData, cliData] = await Promise.all([
                api.get('/conciliacion/metricas'),
                api.get(`/conciliacion?estado=${estadoFiltro}${cuentaFiltro ? `&cuenta_origen=${cuentaFiltro}` : ''}`),
                api.get('/clientes')
            ]);
            setMetricas(metData);
            setMovimientos(movData);
            setClientes(cliData);
        } catch (err) {
            console.error('Error cargando conciliaciones:', err);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, [estadoFiltro, cuentaFiltro]);

    async function handleImportar(e) {
        e.preventDefault();
        if (!contenidoTexto.trim()) return;

        setImportando(true);
        setFeedback(null);
        try {
            const res = await api.post('/conciliacion/importar', {
                contenido: contenidoTexto,
                cuenta_origen: cuentaOrigen
            });
            setFeedback({
                tipo: 'exito',
                texto: `Se importaron y cruzaron ${res.importados} movimientos de un total de ${res.total_procesados}.`
            });
            setContenidoTexto('');
            setMostrarImportador(false);
            cargarDatos();
        } catch (err) {
            setFeedback({ tipo: 'error', texto: err.message || 'Error al procesar extracto.' });
        } finally {
            setImportando(false);
        }
    }

    async function handleConciliarIndividual(id, clienteIdDefault, remitoIdDefault) {
        const clienteFinal = clientesSeleccionados[id] || clienteIdDefault;
        if (!clienteFinal) {
            alert('Por favor seleccioná a qué cliente corresponde este pago.');
            return;
        }

        try {
            await api.post('/conciliacion/conciliar', {
                conciliacion_id: id,
                cliente_id: clienteFinal,
                remito_id: remitoIdDefault
            });
            cargarDatos();
        } catch (err) {
            alert('Error al conciliar: ' + (err.message || ''));
        }
    }

    async function handleConciliarMasivo() {
        if (!window.confirm('¿Deseás conciliar automáticamente todos los movimientos con sugerencia de cliente?')) return;
        try {
            const res = await api.post('/conciliacion/conciliar-masivo');
            alert(`Se conciliaron ${res.conciliados} de ${res.total_procesados} movimientos.`);
            cargarDatos();
        } catch (err) {
            alert('Error en conciliación masiva: ' + (err.message || ''));
        }
    }

    async function handleDescartar(id) {
        const motivo = prompt('Motivo del descarte (opcional):', 'Movimiento no correspondiente a ventas');
        if (motivo === null) return;
        try {
            await api.post('/conciliacion/descartar', { conciliacion_id: id, motivo });
            cargarDatos();
        } catch (err) {
            alert('Error descartando: ' + (err.message || ''));
        }
    }

    const fmtDinero = n => `$ ${Number(n || 0).toLocaleString('es-AR')}`;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Conciliación Bancaria y Billeteras</h1>
                    <p className="page-subtitle">
                        Cruce automático de transferencias bancarias y Mercado Pago con remitos y cuentas corrientes.
                    </p>
                </div>
                <div className="row gap-sm">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setMostrarImportador(!mostrarImportador)}
                    >
                        <IconBanco /> {mostrarImportador ? 'Cerrar Importador' : 'Importar Extracto'}
                    </button>
                    {estadoFiltro === 'pendiente' && movimientos.some(m => m.cliente_id) && (
                        <button
                            className="btn btn-primary"
                            onClick={handleConciliarMasivo}
                        >
                            <IconCheck /> Conciliar Sugerencias (1 Clic)
                        </button>
                    )}
                </div>
            </div>

            {/* TARJETAS KPI */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div className="card stat-card" style={{ padding: 18, borderLeft: '4px solid #f59e0b', background: '#FFFFFF' }}>
                    <div className="stat-label" style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pendiente por Conciliar</div>
                    <div className="stat-value mono" style={{ fontSize: 24, fontWeight: 700, color: '#b45309', marginTop: 4 }}>
                        {fmtDinero(metricas.monto_pendiente)}
                    </div>
                    <div className="stat-sub" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {metricas.cantidad_pendientes} transferencias recibidas
                    </div>
                </div>

                <div className="card stat-card" style={{ padding: 18, borderLeft: '4px solid #10b981', background: '#FFFFFF' }}>
                    <div className="stat-label" style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Conciliado este Mes</div>
                    <div className="stat-value mono" style={{ fontSize: 24, fontWeight: 700, color: '#047857', marginTop: 4 }}>
                        {fmtDinero(metricas.monto_conciliado_mes)}
                    </div>
                    <div className="stat-sub" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {metricas.cantidad_conciliados_mes} cobros imputados a saldo
                    </div>
                </div>
            </div>

            {/* MODAL / PANEL DE IMPORTACIÓN DE EXTRACTOS */}
            {mostrarImportador && (
                <div className="card" style={{ padding: 20, marginBottom: 24, background: '#FFFFFF', border: '1px solid var(--color-border)' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
                        Importar Extracto Bancario o Mercado Pago
                    </h2>
                    <form onSubmit={handleImportar}>
                        <div className="row gap-md" style={{ marginBottom: 12 }}>
                            <div style={{ minWidth: 200 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Cuenta / Entidad</label>
                                <select
                                    className="form-control"
                                    value={cuentaOrigen}
                                    onChange={(e) => setCuentaOrigen(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                >
                                    <option value="mercadopago">Mercado Pago</option>
                                    <option value="banco_galicia">Banco Galicia</option>
                                    <option value="banco_santander">Banco Santander</option>
                                    <option value="banco_nacion">Banco Nación</option>
                                    <option value="banco_macro">Banco Macro</option>
                                    <option value="banco_bbva">Banco BBVA</option>
                                    <option value="otro">Otra Billetera / Banco</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                                Pegar líneas del extracto (CSV o texto copiado de la tabla bancaria)
                            </label>
                            <textarea
                                className="form-control"
                                rows={5}
                                value={contenidoTexto}
                                onChange={(e) => setContenidoTexto(e.target.value)}
                                placeholder="Fecha,Concepto,Monto,Comprobante,Titular..."
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, border: '1px solid var(--color-border-strong)', background: '#FAF9F4' }}
                            />
                            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                Podés copiar y pegar directamente las filas desde tu home banking o el archivo CSV descargado.
                            </div>
                        </div>

                        <div className="row gap-sm">
                            <button type="submit" className="btn btn-primary" disabled={importando || !contenidoTexto.trim()}>
                                {importando ? 'Analizando...' : 'Analizar y Cruzar con Mix Point'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setMostrarImportador(false)}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {feedback && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 20,
                    background: feedback.tipo === 'exito' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${feedback.tipo === 'exito' ? '#10b981' : '#ef4444'}`,
                    color: feedback.tipo === 'exito' ? '#10b981' : '#ef4444',
                    fontSize: 13
                }}>
                    {feedback.texto}
                </div>
            )}

            {/* PESTAÑAS DE FILTRO */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-border)', marginBottom: 16 }}>
                {[
                    { id: 'pendiente', label: `Pendientes (${metricas.cantidad_pendientes})` },
                    { id: 'conciliado', label: 'Conciliados' },
                    { id: 'descartado', label: 'Descartados' },
                    { id: 'todos', label: 'Todos los Movimientos' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEstadoFiltro(tab.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '10px 16px',
                            color: estadoFiltro === tab.id ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                            borderBottom: estadoFiltro === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                            fontWeight: estadoFiltro === tab.id ? 700 : 500,
                            cursor: 'pointer',
                            fontSize: 13
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TABLA DE MOVIMIENTOS */}
            <div className="card" style={{ padding: 16, background: '#FFFFFF' }}>
                {movimientos.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
                        No hay transferencias en este estado.
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Origen</th>
                                    <th>Detalle / Titular</th>
                                    <th className="text-right">Monto</th>
                                    <th>Cruce Sugerido (Cliente)</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.map(m => {
                                    const esPendiente = m.estado === 'pendiente';
                                    const tieneSugerencia = Boolean(m.cliente_id);

                                    return (
                                        <tr key={m.id}>
                                            <td className="mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                                                {m.fecha_movimiento}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 10,
                                                    fontSize: 10.5,
                                                    fontWeight: 600,
                                                    background: m.cuenta_origen.includes('mercado') ? '#DBEAFE' : '#FEF3C7',
                                                    color: m.cuenta_origen.includes('mercado') ? '#1E40AF' : '#92400E',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {m.cuenta_origen.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{m.titular || m.descripcion || 'Transferencia'}</div>
                                                {m.comprobante_nro && (
                                                    <div className="muted mono" style={{ fontSize: 11 }}>Comp: {m.comprobante_nro}</div>
                                                )}
                                            </td>
                                            <td className="text-right mono" style={{ fontWeight: 700, color: '#047857', fontSize: 13.5 }}>
                                                {fmtDinero(m.monto)}
                                            </td>
                                            <td>
                                                {esPendiente ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <select
                                                            className="form-control"
                                                            value={clientesSeleccionados[m.id] || m.cliente_id || ''}
                                                            onChange={(e) => setClientesSeleccionados({
                                                                ...clientesSeleccionados,
                                                                [m.id]: parseInt(e.target.value) || null
                                                            })}
                                                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, maxWidth: 220, border: '1px solid var(--color-border-strong)' }}
                                                        >
                                                            <option value="">-- Seleccionar cliente --</option>
                                                            {clientes.map(c => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.razon_social} (Debe {fmtDinero(c.saldo_cuenta)})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {m.observaciones && (
                                                            <div style={{ fontSize: 10.5, color: '#B45309' }}>
                                                                {m.observaciones}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{m.cliente_nombre || 'Cliente no asignado'}</div>
                                                        {m.remito_numero && (
                                                            <div className="muted mono" style={{ fontSize: 11 }}>Remito: {m.remito_numero}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    fontSize: 10.5,
                                                    fontWeight: 600,
                                                    background: m.estado === 'conciliado' ? 'rgba(16, 185, 129, 0.15)' : (m.estado === 'descartado' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                                                    color: m.estado === 'conciliado' ? '#10b981' : (m.estado === 'descartado' ? '#ef4444' : '#f59e0b'),
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {m.estado}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                {esPendiente ? (
                                                    <div className="row gap-xs" style={{ justifyContent: 'center' }}>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleConciliarIndividual(m.id, m.cliente_id, m.remito_id)}
                                                            title="Imputar pago a cuenta corriente"
                                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                                        >
                                                            <IconCheck style={{ width: 14, height: 14 }} /> Conciliar
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleDescartar(m.id)}
                                                            title="Descartar movimiento"
                                                            style={{ color: '#ef4444', padding: '4px 6px' }}
                                                        >
                                                            <IconClose style={{ width: 14, height: 14 }} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#64748b', fontSize: 11 }}>Listo</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
