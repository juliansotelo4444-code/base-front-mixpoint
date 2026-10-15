import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { formatearFecha } from '../utils/fechas';
import { exportarRemitoAWord } from '../utils/remitoWordExport';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

function chunkItems(items, densidad = 'auto') {
    if (!items || items.length === 0) return [[]];
    const total = items.length;

    // 1. Modo Compacto forzado: hasta 24 ítems entran en 1 sola hoja A4
    if (densidad === 'compacto' && total <= 24) {
        return [items];
    }

    // 2. Modo Auto Inteligente: hasta 18 ítems entran de forma impecable y súper legible en 1 hoja
    if (densidad === 'auto' && total <= 18) {
        return [items];
    }

    // 3. Modo Cómodo / Espacioso: hasta 12 ítems en 1 hoja
    if (densidad === 'comodo' && total <= 12) {
        return [items];
    }

    const pages = [];
    // En Hoja 1 entran hasta 22 ítems porque no lleva totales ni firmas
    const maxFirstPage = densidad === 'compacto' ? 24 : 20;
    const maxMiddlePage = densidad === 'compacto' ? 26 : 22;
    const maxLastPage = densidad === 'compacto' ? 18 : 14;

    // Caso de 2 hojas
    if (total <= maxFirstPage + maxLastPage) {
        const firstPageCount = Math.min(maxFirstPage, Math.ceil(total * 0.55));
        pages.push(items.slice(0, firstPageCount));
        pages.push(items.slice(firstPageCount));
        return pages;
    }

    // Caso de 3 o más hojas
    let remaining = [...items];
    pages.push(remaining.slice(0, maxFirstPage));
    remaining = remaining.slice(maxFirstPage);

    while (remaining.length > 0) {
        if (remaining.length <= maxLastPage) {
            pages.push(remaining);
            break;
        }
        let take = maxMiddlePage;
        if (remaining.length - take < 4) {
            take = remaining.length - 6;
        }
        pages.push(remaining.slice(0, take));
        remaining = remaining.slice(take);
    }
    return pages;
}

function getPrintCss() {
    return `
        @page {
            size: A4 portrait;
            margin: 7mm 10mm 7mm 10mm;
        }
        * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 11px;
            line-height: 1.35;
        }
        .remito-page-a4 {
            width: 100% !important;
            max-width: 100% !important;
            height: 281mm !important;
            min-height: 281mm !important;
            max-height: 281mm !important;
            padding: 0 !important;
            margin: 0 auto !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative;
            background: #ffffff !important;
            box-sizing: border-box !important;
        }
        .remito-page-a4:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
        }
        .page-screen-badge {
            display: none !important;
        }

        .remito-top-block {
            flex-shrink: 0;
        }
        .remito-middle-block {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            margin: 4px 0 8px 0;
        }
        .remito-bottom-block {
            flex-shrink: 0;
            margin-top: auto;
        }

        /* ENCABEZADO */
        .remito-header {
            display: grid;
            grid-template-columns: 1.45fr 0.55fr 1fr;
            gap: 12px;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 7px;
        }
        .remito-compact-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }
        .remito-logo-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 4px;
        }
        .remito-logo {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
            border: 1.5px solid #c9a227;
        }
        .remito-brand-title {
            font-size: 17px;
            font-weight: 800;
            color: #1a382b;
            margin: 0;
            letter-spacing: 0.02em;
            line-height: 1.2;
        }
        .remito-brand-sub {
            font-size: 8.5px;
            font-weight: 700;
            color: #b45309;
            letter-spacing: 0.04em;
            margin: 1px 0 0;
        }
        .remito-brand-web {
            font-size: 9px;
            font-weight: 600;
            color: #1a382b;
            margin-top: 1px;
        }
        .remito-company-data {
            font-size: 9.5px;
            color: #334155;
            line-height: 1.35;
        }
        .remito-company-data p {
            margin: 1px 0;
        }

        /* CUADRO LETRA R */
        .remito-header-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .remito-letter-box {
            width: 44px;
            height: 44px;
            border: 2px solid #0f172a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff;
        }
        .remito-letter-box .letter {
            font-size: 23px;
            font-weight: 900;
            line-height: 1;
            color: #0f172a;
        }
        .remito-letter-box .code {
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #0f172a;
        }
        .doc-type-badge {
            font-size: 6.5px;
            font-weight: 800;
            margin-top: 3px;
            background: #f1f5f9;
            padding: 2px 5px;
            border-radius: 3px;
            border: 1px solid #cbd5e1;
            white-space: nowrap;
            color: #334155;
        }

        /* DATOS NUMERACIÓN */
        .remito-header-right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .remito-num-box {
            background: #f8fafc;
            border: 1.5px solid #0f172a;
            padding: 4px 10px;
            border-radius: 4px;
            margin-bottom: 4px;
            text-align: right;
            width: 100%;
        }
        .remito-title {
            font-size: 13.5px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #0f172a;
            line-height: 1.1;
        }
        .remito-number {
            font-size: 13.5px;
            font-weight: 800;
            color: #1a382b;
            font-family: monospace;
            line-height: 1.2;
        }
        .remito-meta-list {
            font-size: 9.5px;
            color: #334155;
            line-height: 1.35;
        }
        .remito-meta-list p {
            margin: 1px 0;
        }

        /* CUADRO CLIENTE Y ENTREGA */
        .remito-info-grid {
            display: grid;
            grid-template-columns: 1.15fr 1fr;
            gap: 12px;
            background: #fafaf9;
            border: 1.5px solid #cbd5e1;
            border-radius: 5px;
            padding: 6px 12px;
            margin: 6px 0 8px 0;
            font-size: 10.5px;
            line-height: 1.4;
        }
        .remito-info-col p {
            margin: 2px 0;
        }

        /* TABLA DE MERCADERÍA */
        .remito-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
        }
        .remito-table th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 800;
            font-size: 9.5px;
            letter-spacing: 0.03em;
            padding: 5px 7px;
            border: 1.5px solid #0f172a;
            text-transform: uppercase;
            text-align: left;
        }
        .remito-table th.text-right {
            text-align: right;
        }
        .remito-table td {
            padding: 5.5px 7px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
            line-height: 1.3;
        }
        .remito-table tbody tr:nth-child(even) {
            background: #fbfbfb;
        }
        .remito-table tbody tr.remito-row-fill td {
            padding: 5px 7px;
            color: #cbd5e1;
            border: 1px solid #e2e8f0;
        }
        .remito-item-desc {
            font-size: 9px;
            color: #64748b;
            font-style: italic;
        }

        /* PAGOS Y TOTALES */
        .remito-payment-qr-box {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #fafaf9;
            border: 1.5px solid #cbd5e1;
            border-radius: 5px;
            padding: 6px 10px;
            max-width: 330px;
        }
        .remito-qr-img {
            width: 58px;
            height: 58px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            background: #ffffff;
        }
        .remito-totals-box {
            background: #f8fafc;
            border: 2px solid #0f172a;
            border-radius: 5px;
            padding: 6px 14px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 290px;
        }
        .remito-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            font-weight: 900;
            color: #1a382b;
        }
        .remito-total-num {
            font-size: 18px;
            font-weight: 900;
            color: #1a382b;
            font-family: monospace;
        }

        /* FIRMAS */
        .remito-signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 12px;
            padding: 0 10px;
        }
        .signature-box {
            text-align: center;
        }
        .sig-line {
            border-top: 1.5px dashed #4b5563;
            margin-top: 30px;
            margin-bottom: 4px;
            height: 1px;
        }
        .sig-label {
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #0f172a;
            margin: 0;
        }
        .sig-sub {
            font-size: 8px;
            color: #64748b;
            margin-top: 2px;
        }

        /* PIE LEGAL */
        .remito-legal-footer {
            border-top: 1px solid #cbd5e1;
            margin-top: 8px;
            padding-top: 4px;
            font-size: 8px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .remito-continuation-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1.5px dashed #64748b;
            padding-top: 6px;
            font-size: 10px;
            color: #334155;
            font-weight: 700;
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
            color: #64748b;
        }

        /* ========================================================
           MODO COMPACTO (SÓLO CUANDO HAY MUCHOS ÍTEMS: > 12 ÍTEMS)
           ======================================================== */
        .remito-page-a4.compact-mode .remito-header {
            padding-bottom: 4px !important;
            gap: 8px !important;
        }
        .remito-page-a4.compact-mode .remito-logo {
            width: 38px !important;
            height: 38px !important;
        }
        .remito-page-a4.compact-mode .remito-brand-title {
            font-size: 15px !important;
        }
        .remito-page-a4.compact-mode .remito-company-data {
            font-size: 8.5px !important;
            line-height: 1.25 !important;
        }
        .remito-page-a4.compact-mode .remito-info-grid {
            padding: 4px 8px !important;
            margin: 4px 0 !important;
            font-size: 9.5px !important;
            line-height: 1.25 !important;
        }
        .remito-page-a4.compact-mode .remito-table {
            font-size: 9.5px !important;
        }
        .remito-page-a4.compact-mode .remito-table th {
            padding: 3.5px 5px !important;
            font-size: 8.5px !important;
        }
        .remito-page-a4.compact-mode .remito-table td {
            padding: 3px 5px !important;
            font-size: 9.5px !important;
            line-height: 1.2 !important;
        }
        .remito-page-a4.compact-mode .remito-qr-img {
            width: 46px !important;
            height: 46px !important;
        }
        .remito-page-a4.compact-mode .remito-total-num {
            font-size: 15px !important;
        }
        .remito-page-a4.compact-mode .sig-line {
            margin-top: 18px !important;
        }
        .remito-page-a4.compact-mode .remito-signatures-grid {
            margin-top: 8px !important;
            gap: 24px !important;
        }
    `;
}

export default function RemitoImprimible({ remito, onClose, onAbrirEtiquetas }) {
    const printableRef = useRef(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [paginaActiva, setPaginaActiva] = useState('todas'); // 'todas' | 0 | 1...
    const [zoomScale, setZoomScale] = useState(0.85);
    const [modoAjuste, setModoAjuste] = useState('auto'); // 'auto' | '100' | 'manual'
    const [densidad, setDensidad] = useState('auto'); // 'auto' | 'compacto' | 'comodo'

    useEffect(() => {
        const calcularAuto = () => {
            if (typeof window === 'undefined') return;
            if (window.innerWidth <= 768) {
                const scaleW = (window.innerWidth - 32) / 794;
                setZoomScale(Number(Math.min(1, Math.max(0.35, scaleW)).toFixed(2)));
            } else {
                const scaleH = (window.innerHeight - 140) / 1120;
                const scaleW = (window.innerWidth - 80) / 820;
                const opt = Math.min(1, Math.max(0.5, Math.min(scaleH, scaleW)));
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
            const scaleW = (window.innerWidth - 32) / 794;
            setZoomScale(Number(Math.min(1, Math.max(0.35, scaleW)).toFixed(2)));
        } else {
            const scaleH = (window.innerHeight - 140) / 1120;
            const scaleW = (window.innerWidth - 80) / 820;
            const opt = Math.min(1, Math.max(0.5, Math.min(scaleH, scaleW)));
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
        setZoomScale(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))));
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('remito-print-overlay') && onClose) {
            onClose();
        }
    };

    useEffect(() => {
        if (!remito) return;
        const nombreArchivo = `Remito_${remito.numero || 'MixPoint'}${remito.cliente_nombre ? '_' + String(remito.cliente_nombre).replace(/[^a-zA-Z0-9_-]/g, '_') : ''}`;
        const prevTitle = document.title;
        document.title = nombreArchivo;

        return () => {
            document.title = prevTitle;
        };
    }, [remito]);

    useEffect(() => {
        if (!remito) return;
        const qrTexto = `MIX POINT MAYORISTA\nAlias: mixpoint2026\nRemito: ${remito.numero || ''}\nTotal: ${fmtMoney(remito.total)}\nWhatsApp: 1167873243`;
        QRCode.toDataURL(qrTexto, {
            margin: 1,
            width: 140,
            color: { dark: '#11141D', light: '#FFFFFF' }
        }).then(url => setQrDataUrl(url)).catch(() => {});
    }, [remito]);

    if (!remito) return null;

    const totalItems = remito.items?.length || 0;
    const isCompact = densidad === 'compacto' || (densidad === 'auto' && totalItems > 12);
    const pages = chunkItems(remito.items || [], densidad);
    const fechaFormateada = formatearFecha(remito.fecha || new Date());

    const handlePrint = () => {
        const root = printableRef.current;
        if (!root) {
            window.print();
            return;
        }

        const pageNodes = root.querySelectorAll('.remito-page-a4');
        let sheetsHtml = '';
        if (pageNodes && pageNodes.length > 0) {
            Array.from(pageNodes).forEach(node => {
                const clone = node.cloneNode(true);
                // Limpiar dimensiones fijas en píxeles del zoom de pantalla para que la hoja A4 de impresión sea perfecta
                clone.style.width = '';
                clone.style.height = '';
                clone.style.minHeight = '';
                clone.style.maxHeight = '';
                clone.style.margin = '';
                clone.style.boxShadow = '';
                clone.style.transform = '';
                sheetsHtml += clone.outerHTML;
            });
        } else {
            sheetsHtml = root.innerHTML;
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
                <title>Remito_${remito.numero || 'MixPoint'}</title>
                <style>
                    ${getPrintCss()}
                </style>
            </head>
            <body>
                ${sheetsHtml}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                // Sincronizar título en la ventana principal y en el iframe para máxima compatibilidad con navegadores
                const tituloRemito = `Remito_${remito.numero || 'MixPoint'}`;
                document.title = tituloRemito;
                if (frame.contentWindow?.document) {
                    frame.contentWindow.document.title = tituloRemito;
                }
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } catch (e) {
                document.title = `Remito_${remito.numero || 'MixPoint'}`;
                window.print();
            }
        }, 300);
    };

    const handleDownloadHtml = () => {
        const root = printableRef.current;
        if (!root) return;

        const pageNodes = root.querySelectorAll('.remito-page-a4');
        let sheetsHtml = '';
        if (pageNodes && pageNodes.length > 0) {
            pageNodes.forEach(node => {
                sheetsHtml += node.outerHTML;
            });
        } else {
            sheetsHtml = root.innerHTML;
        }

        const nombreArchivo = `Remito_${remito.numero || 'MixPoint'}`;
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>${nombreArchivo}</title>
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
    ${sheetsHtml}
    <script>
        window.onload = function() {
            document.title = "${nombreArchivo}";
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombreArchivo}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const totalPages = pages.length;
    const baseWidthPx = 794;
    const baseHeightPx = 1120;
    const scaledWidthPx = Math.round(baseWidthPx * zoomScale);
    const scaledHeightPx = Math.round(baseHeightPx * zoomScale);

    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div className="remito-print-overlay" onClick={handleOverlayClick}>
            <style>{getPrintCss()}</style>
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
                        <span className="badge" style={{
                            fontSize: 11,
                            background: totalPages === 1 ? '#ECFDF5' : '#FEF3C7',
                            color: totalPages === 1 ? '#065F46' : '#92400E',
                            border: `1px solid ${totalPages === 1 ? '#A7F3D0' : '#FDE68A'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                        }}>
                            {totalPages === 1 ? '🌱 1 Hoja (Ahorro de papel)' : `📄 ${totalPages} Hojas`} · {remito.items?.length || 0} ítems
                        </span>

                        <div className="row gap-xs" style={{ background: 'var(--color-bg)', padding: '2px 5px', borderRadius: 6, border: '1px solid var(--color-border)', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: 4 }}>Densidad:</span>
                            <button
                                type="button"
                                className={`btn btn-xs ${densidad === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setDensidad('auto')}
                                style={{ padding: '2px 7px', fontSize: 11 }}
                                title="Auto: adapta automáticamente hasta 36 productos en 1 sola hoja sin desperdicio"
                            >
                                ⚡ Auto (1 Hoja)
                            </button>
                            <button
                                type="button"
                                className={`btn btn-xs ${densidad === 'compacto' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setDensidad('compacto')}
                                style={{ padding: '2px 7px', fontSize: 11 }}
                                title="Forzar modo ultra compacto (hasta 40 productos en 1 sola hoja)"
                            >
                                🌱 Compacto
                            </button>
                            <button
                                type="button"
                                className={`btn btn-xs ${densidad === 'comodo' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setDensidad('comodo')}
                                style={{ padding: '2px 7px', fontSize: 11 }}
                                title="Modo espacioso tradicional"
                            >
                                📄 Amplio
                            </button>
                        </div>
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
                                title="Ajustar a la pantalla"
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
                            onClick={() => exportarRemitoAWord(remito)}
                            style={{
                                padding: '6px 13px',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#1E40AF',
                                background: '#EFF6FF',
                                borderColor: '#93C5FD'
                            }}
                            title="Descargar remito editable para abrir en Microsoft Word (.doc)"
                        >
                            📝 Descargar Word (.doc)
                        </button>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleDownloadHtml}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            title="Descargar copia HTML imprimible"
                        >
                            📥 Descargar HTML
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
                    paddingBottom: 40
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
                        <div
                            key={pageIdx}
                            className="remito-page-outer-container"
                            style={{
                                width: `${scaledWidthPx}px`,
                                height: `${scaledHeightPx}px`,
                                margin: '0 auto 28px auto',
                                position: 'relative',
                                flexShrink: 0
                            }}
                        >
                            <div
                                style={{
                                    width: `${baseWidthPx}px`,
                                    height: `${baseHeightPx}px`,
                                    minHeight: `${baseHeightPx}px`,
                                    maxHeight: `${baseHeightPx}px`,
                                    transform: `scale(${zoomScale})`,
                                    transformOrigin: 'top left',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                }}
                            >
                                <div
                                    className={`remito-page-a4 ${isCompact ? 'compact-mode' : ''}`}
                                    style={{
                                        width: `${baseWidthPx}px`,
                                        height: `${baseHeightPx}px`,
                                        minHeight: `${baseHeightPx}px`,
                                        maxHeight: `${baseHeightPx}px`,
                                        margin: 0,
                                        boxShadow: 'none'
                                    }}
                                >
                                    {/* Insignia visual en pantalla */}
                                    <div className="page-screen-badge no-print">
                                        HOJA {pageNumber} DE {totalPages}
                                    </div>

                            {/* 1. SECCIÓN SUPERIOR: ENCABEZADO Y DATOS DE CLIENTE */}
                            <div className="remito-top-block">
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
                                                <p><strong>Señor(es) / Razón Social:</strong> <strong style={{ color: '#0f172a' }}>{remito.cliente_nombre || 'Consumidor Final'}</strong></p>
                                                <p><strong>CUIT / DNI:</strong> {remito.cliente_cuit || '—'}</p>
                                                <p><strong>Condición IVA:</strong> {remito.cliente_condicion_iva || 'Consumidor Final'}</p>
                                                <p><strong>Teléfono / WhatsApp:</strong> {remito.cliente_telefono || '—'}</p>
                                            </div>
                                            <div className="remito-info-col">
                                                <p><strong>Dirección de Entrega:</strong> <strong>{remito.direccion_entrega || remito.cliente_direccion || 'Retira en depósito'}</strong></p>
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
                                                style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <div>
                                                <strong style={{ fontSize: 13, color: '#1a382b' }}>DISTRIBUIDORA MIX POINT</strong>
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
                            </div>

                            {/* 2. SECCIÓN MEDIA: TABLA DE MERCADERÍA */}
                            <div className="remito-middle-block">
                                <table className="remito-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '80px' }}>CÓDIGO</th>
                                            <th>DESCRIPCIÓN DE LA MERCADERÍA</th>
                                            <th style={{ width: '105px' }}>LOTE / VTO.</th>
                                            <th style={{ width: '85px' }} className="text-right">CANTIDAD</th>
                                            <th style={{ width: '50px' }}>UNID.</th>
                                            <th style={{ width: '105px' }} className="text-right">P. UNITARIO</th>
                                            <th style={{ width: '115px' }} className="text-right">SUBTOTAL</th>
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
                                                <td className="mono text-right" style={{ fontWeight: 700 }}>{it.cantidad}</td>
                                                <td>{it.unidad_medida || 'kg'}</td>
                                                <td className="mono text-right">{fmtMoney(it.precio_unitario)}</td>
                                                <td className="mono text-right" style={{ fontWeight: 700 }}>{fmtMoney(it.subtotal || (it.cantidad * it.precio_unitario))}</td>
                                            </tr>
                                        ))}

                                        {/* Filas de relleno estético si hay pocos productos para que el remito no quede vacío */}
                                        {isLastPage && pageItems.length < 7 && Array.from({ length: 7 - pageItems.length }).map((_, fIdx) => (
                                            <tr key={`fill-${fIdx}`} className="remito-row-fill">
                                                <td className="mono text-sm" style={{ color: '#cbd5e1' }}>—</td>
                                                <td style={{ color: '#cbd5e1' }}>&nbsp;</td>
                                                <td className="mono text-sm" style={{ color: '#cbd5e1' }}>—</td>
                                                <td className="mono text-right" style={{ color: '#cbd5e1' }}>—</td>
                                                <td style={{ color: '#cbd5e1' }}>—</td>
                                                <td className="mono text-right" style={{ color: '#cbd5e1' }}>—</td>
                                                <td className="mono text-right" style={{ color: '#cbd5e1' }}>—</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 3. SECCIÓN INFERIOR: TOTALES, PAGOS, FIRMAS Y PIE LEGAL */}
                            <div className="remito-bottom-block">
                                {isLastPage ? (
                                    /* TOTALES Y FIRMAS EN LA ÚLTIMA HOJA */
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6, gap: 10 }}>
                                            <div className="remito-payment-qr-box">
                                                {qrDataUrl && <img src={qrDataUrl} alt="QR Pago" className="remito-qr-img" />}
                                                <div style={{ fontSize: 9.5, lineHeight: 1.35 }}>
                                                    <div style={{ fontWeight: 800, color: '#1a382b', fontSize: 10.5 }}>PAGO POR TRANSFERENCIA</div>
                                                    <div><strong>Alias:</strong> <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '1px 5px', borderRadius: 3, border: '1px solid #FDE68A' }}>mixpoint2026</span></div>
                                                    <div><strong>Titular:</strong> Mix Point Mayorista</div>
                                                    <div><strong>WhatsApp:</strong> 1167873243</div>
                                                    <div style={{ color: '#475569', fontStyle: 'italic', marginTop: 2, fontSize: 8.5 }}>🔍 Trazabilidad de lotes bajo norma FEFO</div>
                                                </div>
                                            </div>

                                            <div className="remito-totals-box">
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
                    </div>
                </div>
                    );
                })}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
