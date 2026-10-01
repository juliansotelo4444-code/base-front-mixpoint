import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import client from '../api/client';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export default function HojaDeRutaModal({ remitoIds, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('ambos'); // 'ambos', 'picking', 'reparto'

    useEffect(() => {
        async function cargar() {
            setLoading(true);
            setError('');
            try {
                const res = await client.post('/remitos/hoja-de-ruta', { remito_ids: remitoIds });
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Error al generar la hoja de ruta.');
            } finally {
                setLoading(false);
            }
        }
        if (remitoIds && remitoIds.length) {
            cargar();
        }
    }, [remitoIds]);

    function handlePrint() {
        window.print();
    }

    if (loading) {
        return (
            <Modal title="Generando Hoja de Ruta..." onClose={onClose} width={800}>
                <p className="muted" style={{ padding: 20, textAlign: 'center' }}>Consolidando productos y remitos seleccionados…</p>
            </Modal>
        );
    }

    if (error || !data) {
        return (
            <Modal title="Error" onClose={onClose} width={500}>
                <div className="alert-banner error">{error || 'No se pudieron obtener los datos.'}</div>
            </Modal>
        );
    }

    const { remitos, picking, totales } = data;

    return (
        <Modal
            title={`Hoja de Ruta y Picking (${remitos.length} remitos)`}
            onClose={onClose}
            width={940}
        >
            <div className="stack gap-md">
                {/* Barra de acciones en pantalla (no se imprime) */}
                <div className="spread no-print" style={{ alignItems: 'center', background: 'var(--color-surface-sunken)', padding: '10px 16px', borderRadius: 8 }}>
                    <div className="row gap-xs">
                        <button
                            type="button"
                            className={`btn btn-sm ${tab === 'ambos' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('ambos')}
                        >
                            Ver Todo
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${tab === 'picking' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('picking')}
                        >
                            📦 Solo Picking Depósito
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${tab === 'reparto' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('reparto')}
                        >
                            🚚 Solo Hoja de Reparto
                        </button>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
                        🖨️ Imprimir A4
                    </button>
                </div>

                {/* Resumen de métricas */}
                <div className="dashboard-stats-grid no-print" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <div className="card card-pad text-center" style={{ padding: 12 }}>
                        <div className="muted text-xs">Total de Pedidos</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{totales.cantidad_remitos}</div>
                    </div>
                    <div className="card card-pad text-center" style={{ padding: 12 }}>
                        <div className="muted text-xs">Kilos Consolidados</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)' }}>{totales.total_kilos} kg</div>
                    </div>
                    <div className="card card-pad text-center" style={{ padding: 12 }}>
                        <div className="muted text-xs">Cobranza Prevista</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent)' }}>{fmtMoney(totales.total_importe)}</div>
                    </div>
                </div>

                {/* CONTENIDO IMPRIMIBLE */}
                <div id="hoja-de-ruta-impresion" className="hoja-ruta-print-area stack gap-lg">
                    {/* 1. SECCIÓN DE PICKING (DEPÓSITO) */}
                    {(tab === 'ambos' || tab === 'picking') && (
                        <div className="card card-pad" style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
                            <div className="spread" style={{ borderBottom: '2px solid #1a382b', paddingBottom: 8, marginBottom: 12 }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#1a382b', fontSize: 16 }}>
                                        📦 PLANILLA DE PICKING CONSOLIDADO (DEPÓSITO)
                                    </h3>
                                    <span className="muted text-xs">Mix Point Distribuidora Mayorista · Fecha: {new Date().toLocaleDateString('es-AR')}</span>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                                    Total a Cargar: <span style={{ color: '#1a382b' }}>{totales.total_kilos} kg</span> ({picking.length} productos)
                                </div>
                            </div>

                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ width: 40 }}>OK</th>
                                        <th>Código</th>
                                        <th>Producto</th>
                                        <th className="text-center">En Pedidos</th>
                                        <th className="text-right">Cantidad Total a Subir</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {picking.map(p => (
                                        <tr key={p.producto_id}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input type="checkbox" style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                            </td>
                                            <td className="mono muted">{p.codigo || '—'}</td>
                                            <td style={{ fontWeight: 600 }}>{p.producto_nombre}</td>
                                            <td className="text-center mono">{p.cantidad_pedidos}</td>
                                            <td className="text-right mono" style={{ fontWeight: 700, fontSize: 13, color: '#1a382b' }}>
                                                {p.total_cantidad} {p.unidad_medida}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 2. SECCIÓN HOJA DE REPARTO (CHOFER / LOGÍSTICA) */}
                    {(tab === 'ambos' || tab === 'reparto') && (
                        <div className="card card-pad" style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
                            <div className="spread" style={{ borderBottom: '2px solid #1a382b', paddingBottom: 8, marginBottom: 12 }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#1a382b', fontSize: 16 }}>
                                        🚚 HOJA DE RUTA DE REPARTO
                                    </h3>
                                    <span className="muted text-xs">{totales.cantidad_remitos} entregas programadas · Repartidor: ____________________</span>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                                    Cobranza de Entregas: <span style={{ color: '#c88a35' }}>{fmtMoney(totales.total_importe)}</span>
                                </div>
                            </div>

                            <table className="data-table" style={{ fontSize: 11.5 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ width: 30 }}>#</th>
                                        <th>Remito</th>
                                        <th>Cliente & Teléfono</th>
                                        <th>Dirección / Localidad</th>
                                        <th>Resumen de Mercadería</th>
                                        <th className="text-right">Cobrar ($)</th>
                                        <th style={{ width: 100 }}>Firma / Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {remitos.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td className="mono muted text-center">{idx + 1}</td>
                                            <td className="mono" style={{ fontWeight: 700 }}>{r.numero}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{r.cliente_nombre}</div>
                                                {r.cliente_telefono && <div className="muted text-xs mono">📞 {r.cliente_telefono}</div>}
                                            </td>
                                            <td>
                                                <div>{r.direccion_entrega || r.cliente_direccion_base || 'Retiro en depósito'}</div>
                                                {r.cliente_localidad && <span className="muted text-xs">({r.cliente_localidad})</span>}
                                            </td>
                                            <td>
                                                <div style={{ maxWidth: 240, fontSize: 11, lineHeight: 1.2 }}>
                                                    {r.items?.map(it => `${it.producto_nombre} x${it.cantidad}${it.unidad_medida}`).join(', ')}
                                                </div>
                                            </td>
                                            <td className="text-right mono" style={{ fontWeight: 700, fontSize: 12.5, color: '#15803d' }}>
                                                {fmtMoney(r.total)}
                                            </td>
                                            <td style={{ borderBottom: '1px dashed #cbd5e1' }}>
                                                <div style={{ height: 26 }}></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
