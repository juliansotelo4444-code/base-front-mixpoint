import React from 'react';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

export default function RemitoImprimible({ remito, onClose }) {
    if (!remito) return null;

    const handlePrint = () => {
        window.print();
    };

    const fechaFormateada = remito.fecha ? new Date(remito.fecha + 'T00:00:00').toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');

    return (
        <div className="remito-print-overlay">
            <div className="remito-print-actions no-print">
                <div className="row gap-sm">
                    <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '10px 20px', fontSize: 14 }}>
                        🖨️ Imprimir / Guardar en PDF
                    </button>
                    {onClose && (
                        <button className="btn btn-secondary" onClick={onClose} style={{ padding: '10px 18px' }}>
                            ✕ Volver al sistema
                        </button>
                    )}
                </div>
                <p className="text-sm muted" style={{ marginTop: 6 }}>
                    Tip: en el diálogo de impresión podés seleccionar <strong>"Guardar como PDF"</strong> para enviarlo por WhatsApp o email.
                </p>
            </div>

            <div className="remito-document-sheet" id="remito-imprimible-sheet">
                {/* ENCABEZADO COMERCIAL */}
                <div className="remito-header">
                    <div className="remito-header-left">
                        <div className="remito-logo-row">
                            <img src="/logo-mixpoint.png" alt="Mix Point" className="remito-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                            <div>
                                <h1 className="remito-brand-title">DISTRIBUIDORA MIX POINT</h1>
                                <p className="remito-brand-sub">FRUTOS SECOS · CEREALES · SEMILLAS · ALIMENTOS NATURALES</p>
                                <p className="remito-brand-web">🌐 www.distribuidora-mix-point.com.ar</p>
                            </div>
                        </div>
                        <div className="remito-company-data">
                            <p><strong>Depósito Central:</strong> San Isidro 2135 Ituzaingo, Buenos Aires</p>
                            <p><strong>Tel / WhatsApp:</strong> (011) 57077061 | <strong>Email:</strong> ventas@distribuidora-mix-point.com.ar</p>
                            <p><strong>Condición IVA:</strong> Responsable Inscripto</p>
                        </div>
                    </div>

                    {/* CUADRO LETRA R */}
                    <div className="remito-header-center">
                        <div className="remito-letter-box">
                            <span className="letter">R</span>
                            <span className="code">COD. 091</span>
                        </div>
                        <span className="doc-type-badge">DOCUMENTO NO VÁLIDO COMO FACTURA</span>
                    </div>

                    {/* DATOS DE COMPROBANTE */}
                    <div className="remito-header-right">
                        <div className="remito-num-box">
                            <div className="remito-title">REMITO</div>
                            <div className="remito-number mono">{remito.numero || 'REM-0001-00000000'}</div>
                        </div>
                        <div className="remito-meta-list">
                            <p><strong>Fecha de emisión:</strong> <span className="mono">{fechaFormateada}</span></p>
                            <p><strong>CUIT:</strong> 30-71842901-7</p>
                            <p><strong>Ingresos Brutos:</strong> 901-284910-3</p>
                            <p><strong>Inicio de Actividades:</strong> 01/03/2024</p>
                        </div>
                    </div>
                </div>

                {/* DATOS DEL CLIENTE Y ENTREGA */}
                <div className="remito-info-grid">
                    <div className="remito-info-col">
                        <p><strong>Señor(es) / Razón Social:</strong> {remito.cliente_nombre || 'Consumidor Final'}</p>
                        <p><strong>CUIT / DNI:</strong> {remito.cliente_cuit || '—'}</p>
                        <p><strong>Condición IVA:</strong> {remito.cliente_condicion_iva || 'Consumidor Final'}</p>
                    </div>
                    <div className="remito-info-col">
                        <p><strong>Dirección de Entrega:</strong> {remito.direccion_entrega || remito.cliente_direccion || 'Retira en depósito'}</p>
                        <p><strong>Transporte / Chofer:</strong> {remito.transportista || 'Distribución propia'}</p>
                        <p><strong>Condición de Venta:</strong> Cuenta Corriente / Venta Mayorista</p>
                    </div>
                </div>

                {/* TABLA DE MERCADERÍA */}
                <table className="remito-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>CÓDIGO</th>
                            <th>DESCRIPCIÓN DE LA MERCADERÍA</th>
                            <th style={{ width: '110px' }}>LOTE / VTO.</th>
                            <th style={{ width: '90px' }} className="text-right">CANTIDAD</th>
                            <th style={{ width: '60px' }}>UNID.</th>
                            <th style={{ width: '110px' }} className="text-right">P. UNITARIO</th>
                            <th style={{ width: '120px' }} className="text-right">SUBTOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(remito.items || []).map((it, idx) => (
                            <tr key={it.id || idx}>
                                <td className="mono text-sm">{it.producto_codigo || `MP-${String(it.producto_id).padStart(3, '0')}`}</td>
                                <td>
                                    <strong>{it.producto_nombre}</strong>
                                    {it.descripcion && <span className="remito-item-desc"> ({it.descripcion})</span>}
                                </td>
                                <td className="mono text-sm">
                                    {it.numero_lote || 'L-GENERAL'}
                                    {it.fecha_vencimiento && <div className="muted text-xs">Vto: {it.fecha_vencimiento.slice(0, 10)}</div>}
                                </td>
                                <td className="mono text-right" style={{ fontWeight: 600 }}>{it.cantidad}</td>
                                <td>{it.unidad_medida || 'kg'}</td>
                                <td className="mono text-right">{fmtMoney(it.precio_unitario)}</td>
                                <td className="mono text-right" style={{ fontWeight: 600 }}>{fmtMoney(it.subtotal || (it.cantidad * it.precio_unitario))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* TOTAL MERCADERÍA */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
                    <div className="remito-totals-box" style={{ minWidth: 320 }}>
                        <div className="spread remito-total-row">
                            <span>TOTAL MERCADERÍA:</span>
                            <span className="mono remito-total-num">{fmtMoney(remito.total)}</span>
                        </div>
                        <div className="text-xs muted text-right" style={{ marginTop: 4 }}>
                            Precios netos expresados en Pesos Argentinos (ARS)
                        </div>
                    </div>
                </div>

                {/* TALÓN DE CONFORMIDAD Y FIRMA */}
                <div className="remito-signatures-grid">
                    <div className="signature-box">
                        <div className="sig-line"></div>
                        <p className="sig-label">DESPACHADO POR (MIX POINT)</p>
                        <p className="sig-sub">Firma y Sello de Salida</p>
                    </div>
                    <div className="signature-box">
                        <div className="sig-line"></div>
                        <p className="sig-label">RECIBÍ CONFORME (CLIENTE / RECEPTOR)</p>
                        <p className="sig-sub">Firma · Aclaración · D.N.I. · Fecha</p>
                    </div>
                </div>

                <div className="remito-legal-footer">
                    Distribuidora Mix Point · www.distribuidora-mix-point.com.ar · Documento comercial de control de entrega y trazabilidad de lotes.
                </div>
            </div>
        </div>
    );
}
