import React, { useRef } from 'react';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

function chunkItems(items) {
    if (!items || items.length === 0) return [[]];
    const total = items.length;
    // Si son 10 o menos, entran cómodamente en 1 sola hoja con cabecera y firmas
    if (total <= 10) return [items];

    const pages = [];
    // La primera hoja contiene el membrete completo y los datos del cliente
    const firstPageLimit = 11;
    pages.push(items.slice(0, firstPageLimit));
    let remaining = items.slice(firstPageLimit);

    while (remaining.length > 0) {
        // En la última hoja entran hasta 12 ítems junto con el bloque de totales y firmas
        if (remaining.length <= 12) {
            pages.push(remaining);
            break;
        }
        // Si hay más, tomamos hasta 14 ítems en hojas intermedias
        const take = Math.min(14, remaining.length - 3);
        pages.push(remaining.slice(0, take));
        remaining = remaining.slice(take);
    }
    return pages;
}

function getPrintCss() {
    return `
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #1a1a1a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.35;
        }
        .remito-page-a4 {
            width: 210mm;
            height: 296mm;
            min-height: 296mm;
            max-height: 296mm;
            padding: 10mm 13mm 8mm 13mm;
            margin: 0 auto;
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            background: #ffffff;
            overflow: hidden;
            box-sizing: border-box;
        }
        .remito-page-a4:last-child {
            page-break-after: avoid;
            break-after: avoid;
        }
        .page-screen-badge {
            display: none !important;
        }
        .remito-header {
            display: grid;
            grid-template-columns: 1.4fr 0.6fr 1fr;
            gap: 12px;
            align-items: center;
            border-bottom: 2px solid #1a1a1a;
            padding-bottom: 10px;
        }
        .remito-compact-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #1a1a1a;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        .remito-logo-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 6px;
        }
        .remito-logo {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #c9a227;
        }
        .remito-brand-title {
            font-size: 16px;
            font-weight: 800;
            color: #1a382b;
            margin: 0;
            letter-spacing: 0.02em;
        }
        .remito-brand-sub {
            font-size: 8px;
            font-weight: 700;
            color: #c88a35;
            letter-spacing: 0.05em;
            margin: 2px 0 0;
        }
        .remito-brand-web {
            font-size: 9.5px;
            font-weight: 600;
            color: #1a382b;
            margin-top: 2px;
        }
        .remito-company-data {
            font-size: 9.5px;
            color: #444;
            line-height: 1.35;
        }
        .remito-header-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .remito-letter-box {
            width: 46px;
            height: 46px;
            border: 2px solid #1a1a1a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #fff;
        }
        .remito-letter-box .letter {
            font-size: 24px;
            font-weight: 900;
            line-height: 1;
        }
        .remito-letter-box .code {
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.05em;
        }
        .doc-type-badge {
            font-size: 7px;
            font-weight: 700;
            margin-top: 4px;
            background: #f0ede1;
            padding: 2px 5px;
            border-radius: 3px;
            border: 1px solid #d4cbb3;
            white-space: nowrap;
        }
        .remito-header-right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .remito-num-box {
            background: #faf8f2;
            border: 1.5px solid #1a1a1a;
            padding: 5px 12px;
            border-radius: 4px;
            margin-bottom: 5px;
            text-align: right;
            width: 100%;
        }
        .remito-title {
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #1a1a1a;
        }
        .remito-number {
            font-size: 13.5px;
            font-weight: 700;
            color: #1a382b;
            font-family: monospace;
        }
        .remito-meta-list {
            font-size: 9.5px;
            color: #333;
            line-height: 1.35;
        }
        .remito-info-grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 14px;
            background: #fdfbf7;
            border: 1px solid #e2dac9;
            border-radius: 5px;
            padding: 8px 12px;
            margin: 10px 0;
            font-size: 10.5px;
        }
        .remito-info-col p {
            margin: 2.5px 0;
        }
        .remito-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 10.5px;
        }
        .remito-table th {
            background: #1a382b !important;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 9px;
            letter-spacing: 0.04em;
            padding: 5px 7px;
            border: 1px solid #1a382b;
            text-transform: uppercase;
        }
        .remito-table td {
            padding: 6px 7px;
            border: 1px solid #e1dcc9;
            vertical-align: middle;
        }
        .remito-table tbody tr:nth-child(even) {
            background: #faf8f2;
        }
        .remito-item-desc {
            font-size: 9.5px;
            color: #666;
            font-style: italic;
        }
        .remito-continuation-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px dashed #c4b99f;
            padding-top: 6px;
            font-size: 10px;
            color: #555;
            font-weight: 600;
            margin-top: auto;
        }
        .remito-totals-box {
            background: #f7f3eb;
            border: 1.5px solid #d4cbb3;
            border-radius: 5px;
            padding: 7px 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .remito-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12.5px;
            font-weight: 800;
            color: #1a382b;
        }
        .remito-total-num {
            font-size: 15px;
            color: #1a382b;
            font-family: monospace;
        }
        .remito-signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 36px;
            margin-top: 16px;
            padding-top: 8px;
        }
        .signature-box {
            text-align: center;
        }
        .sig-line {
            border-top: 1.5px dashed #555;
            margin-bottom: 5px;
            height: 1px;
        }
        .sig-label {
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #1a1a1a;
            margin: 0;
        }
        .sig-sub {
            font-size: 8.5px;
            color: #777;
            margin-top: 2px;
        }
        .remito-legal-footer {
            border-top: 1px solid #e1dcc9;
            margin-top: 12px;
            padding-top: 5px;
            font-size: 8.5px;
            color: #888;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .mono {
            font-family: monospace;
        }
        .text-right {
            text-align: right;
        }
        .text-sm {
            font-size: 9.5px;
        }
        .muted {
            color: #666;
        }
    `;
}

export default function RemitoImprimible({ remito, onClose }) {
    if (!remito) return null;

    const printableRef = useRef(null);
    const pages = chunkItems(remito.items || []);
    const fechaFormateada = remito.fecha ? new Date(remito.fecha + 'T00:00:00').toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');

    const handlePrint = () => {
        const content = printableRef.current;
        if (!content) {
            window.print();
            return;
        }

        let frame = document.getElementById('remito-hidden-iframe');
        if (frame) {
            frame.remove();
        }
        frame = document.createElement('iframe');
        frame.id = 'remito-hidden-iframe';
        frame.style.position = 'fixed';
        frame.style.top = '-9999px';
        frame.style.left = '-9999px';
        frame.style.width = '210mm';
        frame.style.height = '297mm';
        frame.style.border = 'none';
        document.body.appendChild(frame);

        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="utf-8">
                <title>Remito_${remito.numero || 'Comercial'}</title>
                <style>
                    ${getPrintCss()}
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } catch (e) {
                window.print();
            }
        }, 300);
    };

    const handleDownloadHtml = () => {
        const content = printableRef.current;
        if (!content) return;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Remito_${remito.numero || 'MixPoint'}</title>
    <style>
        ${getPrintCss()}
        @media screen {
            body {
                background: #525659;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .remito-page-a4 {
                box-shadow: 0 4px 16px rgba(0,0,0,0.4);
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    ${content.innerHTML}
    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Remito_${remito.numero || 'MixPoint'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="remito-print-overlay">
            {/* BARRA DE ACCIONES SUPERIOR */}
            <div className="remito-print-actions no-print">
                <div className="row gap-sm" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '10px 20px', fontSize: 14 }}>
                        🖨️ Imprimir / Guardar en PDF
                    </button>
                    <button className="btn btn-secondary" onClick={handleDownloadHtml} style={{ padding: '10px 18px', fontSize: 13.5 }}>
                        📥 Descargar Comprobante (.html)
                    </button>
                    {onClose && (
                        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '10px 16px' }}>
                            ✕ Volver al sistema
                        </button>
                    )}
                </div>
                <div style={{ marginTop: 10, textAlign: 'center' }}>
                    <span className="badge badge-primary" style={{ fontSize: 12, padding: '4px 10px' }}>
                        📄 Documento paginado en {pages.length} {pages.length === 1 ? 'hoja A4' : 'hojas A4'}
                    </span>
                    <p className="text-sm muted" style={{ marginTop: 6 }}>
                        Al pulsar <strong>"🖨️ Imprimir / Guardar en PDF"</strong>, seleccioná <strong>"Guardar como PDF"</strong> en la impresora para descargarlo directamente en tu equipo.
                    </p>
                </div>
            </div>

            {/* CONTENEDOR DE PÁGINAS A4 */}
            <div ref={printableRef} id="remito-printable-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {pages.map((pageItems, pageIdx) => {
                    const isFirstPage = pageIdx === 0;
                    const isLastPage = pageIdx === pages.length - 1;
                    const pageNumber = pageIdx + 1;
                    const totalPages = pages.length;

                    return (
                        <div className="remito-page-a4" key={pageIdx}>
                            {/* Insignia visual en pantalla */}
                            <div className="page-screen-badge no-print">
                                HOJA {pageNumber} DE {totalPages}
                            </div>

                            {/* CONTENIDO SUPERIOR */}
                            <div>
                                {isFirstPage ? (
                                    /* ENCABEZADO COMPLETO (HOJA 1) */
                                    <>
                                        <div className="remito-header">
                                            <div className="remito-header-left">
                                                <div className="remito-logo-row">
                                                    <img
                                                        src="/logo-mixpoint.png"
                                                        alt="Mix Point"
                                                        className="remito-logo"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
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
                                                    <p><strong>Inicio Actividades:</strong> 01/03/2024</p>
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
                                    </>
                                ) : (
                                    /* ENCABEZADO COMPACTO (HOJAS SIGUIENTES) */
                                    <div className="remito-compact-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <img
                                                src="/logo-mixpoint.png"
                                                alt="Mix Point"
                                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <div>
                                                <strong style={{ fontSize: 12, color: '#1a382b' }}>DISTRIBUIDORA MIX POINT</strong>
                                                <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>· Remito {remito.numero}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 11 }}>
                                            <span><strong>Cliente:</strong> {remito.cliente_nombre}</span>
                                            <span style={{ marginLeft: 12 }}><strong>Fecha:</strong> {fechaFormateada}</span>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: '#1a382b', background: '#eaf3ee', padding: '2px 8px', borderRadius: 4 }}>
                                            HOJA {pageNumber} DE {totalPages}
                                        </div>
                                    </div>
                                )}

                                {/* TABLA DE MERCADERÍA DE ESTA PÁGINA */}
                                <table className="remito-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '75px' }}>CÓDIGO</th>
                                            <th>DESCRIPCIÓN DE LA MERCADERÍA</th>
                                            <th style={{ width: '100px' }}>LOTE / VTO.</th>
                                            <th style={{ width: '80px' }} className="text-right">CANTIDAD</th>
                                            <th style={{ width: '50px' }}>UNID.</th>
                                            <th style={{ width: '100px' }} className="text-right">P. UNITARIO</th>
                                            <th style={{ width: '110px' }} className="text-right">SUBTOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.map((it, idx) => (
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
                            </div>

                            {/* CONTENIDO INFERIOR */}
                            <div>
                                {isLastPage ? (
                                    /* TOTALES Y FIRMAS EN LA ÚLTIMA HOJA */
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                            <div className="remito-totals-box" style={{ minWidth: 300 }}>
                                                <div className="remito-total-row">
                                                    <span>TOTAL MERCADERÍA:</span>
                                                    <span className="mono remito-total-num">{fmtMoney(remito.total)}</span>
                                                </div>
                                                <div className="text-xs muted text-right" style={{ marginTop: 3 }}>
                                                    Precios netos expresados en Pesos Argentinos (ARS)
                                                </div>
                                            </div>
                                        </div>

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
                                            <span>Distribuidora Mix Point · www.distribuidora-mix-point.com.ar · Control de entrega y trazabilidad.</span>
                                            <span style={{ fontWeight: 600 }}>Hoja {pageNumber} de {totalPages}</span>
                                        </div>
                                    </>
                                ) : (
                                    /* BARRA DE CONTINUACIÓN EN HOJAS INTERMEDIAS */
                                    <div className="remito-continuation-bar">
                                        <span>[Continúa en Hoja {pageNumber + 1} &gt;&gt;&gt;]</span>
                                        <span>Hoja {pageNumber} de {totalPages}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
