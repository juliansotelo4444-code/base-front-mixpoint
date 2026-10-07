import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { formatearFecha } from '../utils/fechas';

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
        .remito-payment-qr-box {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #fdfbf7;
            border: 1px solid #d4cbb3;
            border-radius: 5px;
            padding: 6px 10px;
            max-width: 320px;
        }
        .remito-qr-img {
            width: 64px;
            height: 64px;
            border: 1px solid #e1dcc9;
            border-radius: 4px;
            background: #fff;
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

export default function RemitoImprimible({ remito, onClose, onAbrirEtiquetas }) {
    if (!remito) return null;

    const printableRef = useRef(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const pages = chunkItems(remito.items || []);
    const fechaFormateada = formatearFecha(remito.fecha || new Date());

    const [paginaActiva, setPaginaActiva] = useState('todas'); // 'todas' | 0 | 1...
    const [zoomScale, setZoomScale] = useState(0.85);
    const [modoAjuste, setModoAjuste] = useState('auto'); // 'auto' | '100' | 'manual'

    useEffect(() => {
        const calcularAuto = () => {
            if (typeof window === 'undefined') return;
            if (window.innerWidth <= 768) {
                setZoomScale(1);
            } else {
                const scaleH = (window.innerHeight - 150) / 1120;
                const scaleW = (window.innerWidth - 80) / 820;
                const opt = Math.min(1, Math.max(0.55, Math.min(scaleH, scaleW)));
                setZoomScale(Number(opt.toFixed(2)));
            }
        };

        if (modoAjuste === 'auto') {
            calcularAuto();
            window.addEventListener('resize', calcularAuto);
            return () => window.removeEventListener('resize', calcularAuto);
        }
    }, [modoAjuste]);

    const handleAjustarPantalla = () => {
        setModoAjuste('auto');
        if (window.innerWidth <= 768) {
            setZoomScale(1);
        } else {
            const scaleH = (window.innerHeight - 150) / 1120;
            const scaleW = (window.innerWidth - 80) / 820;
            const opt = Math.min(1, Math.max(0.55, Math.min(scaleH, scaleW)));
            setZoomScale(Number(opt.toFixed(2)));
        }
    };

    const handleZoomReal = () => {
        setModoAjuste('100');
        setZoomScale(1);
    };

    const handleZoomIn = () => {
        setModoAjuste('manual');
        setZoomScale(prev => Math.min(1.5, Number((prev + 0.1).toFixed(2))));
    };

    const handleZoomOut = () => {
        setModoAjuste('manual');
        setZoomScale(prev => Math.max(0.45, Number((prev - 0.1).toFixed(2))));
    };

    useEffect(() => {
        const qrTexto = `MIX POINT MAYORISTA\nAlias: mixpoint2026\nRemito: ${remito.numero || ''}\nTotal: ${fmtMoney(remito.total)}\nWhatsApp: 1167873243`;
        QRCode.toDataURL(qrTexto, {
            margin: 1,
            width: 140,
            color: { dark: '#11141D', light: '#FFFFFF' }
        }).then(url => setQrDataUrl(url)).catch(() => {});
    }, [remito]);

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

    const totalPages = pages.length;

    return (
        <div className="remito-print-overlay">
            {/* BARRA DE NAVEGACIÓN Y ACCIONES SUPERIOR (STICKY) */}
            <div className="remito-print-actions no-print">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1100, flexWrap: 'wrap', gap: 10 }}>
                    {/* DATOS DEL REMITO */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-primary-dark)' }}>
                            {remito.numero || 'REMITO'}
                        </span>
                        <span className="badge badge-primary" style={{ fontSize: 12 }}>
                            {remito.cliente_nombre || 'Consumidor Final'}
                        </span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                            {fmtMoney(remito.total)}
                        </span>
                        <span className="text-xs muted">
                            ({remito.items?.length || 0} ítems en {totalPages} {totalPages === 1 ? 'hoja' : 'hojas'})
                        </span>
                    </div>

                    {/* SELECTOR DE PÁGINAS Y ZOOM */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {totalPages > 1 && (
                            <div className="row gap-xs" style={{ background: 'var(--color-bg)', padding: '3px 6px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                                <button
                                    type="button"
                                    className={`btn btn-xs ${paginaActiva === 'todas' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setPaginaActiva('todas')}
                                    style={{ padding: '3px 8px', fontSize: 11 }}
                                >
                                    Ver todas ({totalPages})
                                </button>
                                {pages.map((_, pIdx) => (
                                    <button
                                        key={pIdx}
                                        type="button"
                                        className={`btn btn-xs ${paginaActiva === pIdx ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setPaginaActiva(pIdx)}
                                        style={{ padding: '3px 8px', fontSize: 11 }}
                                    >
                                        Hoja {pIdx + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="row gap-xs" style={{ background: 'var(--color-bg)', padding: '3px 6px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                            <button
                                type="button"
                                className={`btn btn-xs ${modoAjuste === 'auto' ? 'btn-secondary' : 'btn-ghost'}`}
                                onClick={handleAjustarPantalla}
                                title="Ajustar altura de página a la pantalla"
                                style={{ padding: '3px 8px', fontSize: 11 }}
                            >
                                📐 Pantalla
                            </button>
                            <button
                                type="button"
                                className={`btn btn-xs ${modoAjuste === '100' ? 'btn-secondary' : 'btn-ghost'}`}
                                onClick={handleZoomReal}
                                title="Tamaño 100% real"
                                style={{ padding: '3px 8px', fontSize: 11 }}
                            >
                                100%
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={handleZoomOut}
                                title="Reducir zoom"
                                style={{ padding: '3px 6px', fontSize: 12 }}
                            >
                                🔍-
                            </button>
                            <span className="mono text-xs" style={{ minWidth: 32, textAlign: 'center', fontSize: 10 }}>
                                {Math.round(zoomScale * 100)}%
                            </span>
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={handleZoomIn}
                                title="Aumentar zoom"
                                style={{ padding: '3px 6px', fontSize: 12 }}
                            >
                                🔍+
                            </button>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="row gap-xs" style={{ flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handlePrint}
                            style={{ padding: '6px 14px', fontSize: 12.5 }}
                        >
                            🖨️ Imprimir / PDF
                        </button>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleDownloadHtml}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                            📥 Descargar
                        </button>
                        {onAbrirEtiquetas && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onAbrirEtiquetas(remito)}
                                style={{ padding: '6px 12px', fontSize: 12, borderColor: '#C9A227', color: '#A2801A' }}
                            >
                                🏷️ Etiquetas
                            </button>
                        )}
                        {onClose && (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={onClose}
                                style={{ padding: '6px 12px', fontSize: 12 }}
                            >
                                ✕ Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTENEDOR DE PÁGINAS A4 ESCALADO */}
            <div
                ref={printableRef}
                id="remito-printable-content"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease',
                    marginBottom: zoomScale < 1 ? `-${Math.round((1 - zoomScale) * 1150 * (paginaActiva === 'todas' ? pages.length : 1) * 0.96)}px` : '20px'
                }}
            >
                {pages.map((pageItems, pageIdx) => {
                    if (paginaActiva !== 'todas' && paginaActiva !== pageIdx) {
                        return null;
                    }

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
                                                <p><strong>Teléfono / WhatsApp:</strong> {remito.cliente_telefono || '—'}</p>
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
                                            {remito.cliente_telefono && <span style={{ marginLeft: 10 }}><strong>Tel:</strong> {remito.cliente_telefono}</span>}
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, gap: 12 }}>
                                            <div className="remito-payment-qr-box">
                                                {qrDataUrl && <img src={qrDataUrl} alt="QR Pago" className="remito-qr-img" />}
                                                <div style={{ fontSize: 9, lineHeight: 1.35 }}>
                                                    <div style={{ fontWeight: 800, color: '#1a382b', fontSize: 10 }}>PAGO POR TRANSFERENCIA</div>
                                                    <div><strong>Alias:</strong> <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '1px 5px', borderRadius: 3 }}>mixpoint2026</span></div>
                                                    <div><strong>Titular:</strong> Mix Point Mayorista</div>
                                                    <div><strong>WhatsApp:</strong> 1167873243</div>
                                                    <div style={{ color: '#555', fontStyle: 'italic', marginTop: 2, fontSize: 8.5 }}>🔍 Trazabilidad de lotes bajo norma FEFO</div>
                                                </div>
                                            </div>

                                            <div className="remito-totals-box" style={{ minWidth: 280 }}>
                                                {Number(remito.descuento_porcentaje) > 0 && (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#555', marginBottom: 2 }}>
                                                            <span>Subtotal lista:</span>
                                                            <span className="mono">{fmtMoney(Number(remito.total) / (1 - Number(remito.descuento_porcentaje) / 100))}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#B23A3A', fontWeight: 600, marginBottom: 4 }}>
                                                            <span>Descuento aplicado:</span>
                                                            <span>-{remito.descuento_porcentaje}%</span>
                                                        </div>
                                                    </>
                                                )}
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
