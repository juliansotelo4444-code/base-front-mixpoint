import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { obtenerImagenProducto } from '../utils/imagenProducto';
import { generarHojasCatalogo } from '../utils/catalogoPaginacion';

const fmtMoney = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const WHATSAPP_OFICIAL = '1167873243';
const ALIAS_PAGO = 'mixpoint2026';

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
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 10px;
            line-height: 1.3;
        }
        .catalogo-print-sheet {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            margin: 0 auto;
            page-break-after: always;
            break-after: page;
            position: relative;
            background: #ffffff;
            overflow: hidden;
            box-sizing: border-box;
        }
        .catalogo-print-sheet.sheet-portada {
            padding: 0;
        }
        .catalogo-print-sheet.sheet-content {
            padding: 10mm 12mm 8mm 12mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .catalogo-print-sheet:last-child {
            page-break-after: avoid;
            break-after: avoid;
        }
        .no-print {
            display: none !important;
        }
    `;
}

export default function CatalogoImprimibleModal({ productos = [], categorias = [], onClose }) {
    const printableRef = useRef(null);
    const [paginaActiva, setPaginaActiva] = useState('todas');
    const [zoomScale, setZoomScale] = useState(0.75);
    const [modoAjuste, setModoAjuste] = useState('auto');

    // Auto-ajuste de escala de zoom para la pantalla
    useEffect(() => {
        const calcularAuto = () => {
            if (typeof window === 'undefined') return;
            if (window.innerWidth <= 768) {
                const scaleW = (window.innerWidth - 32) / 794;
                setZoomScale(Number(Math.min(1, Math.max(0.35, scaleW)).toFixed(2)));
            } else {
                const scaleH = (window.innerHeight - 150) / 1120;
                const scaleW = (window.innerWidth - 80) / 820;
                const opt = Math.min(1, Math.max(0.45, Math.min(scaleH, scaleW)));
                setZoomScale(Number(opt.toFixed(2)));
            }
        };

        if (modoAjuste === 'auto') {
            calcularAuto();
            window.addEventListener('resize', calcularAuto);
            return () => window.removeEventListener('resize', calcularAuto);
        }
    }, [modoAjuste]);

    // Cerrar con Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Generar hojas balanceadas y el índice exacto
    const { hojas: hojasGeneradas, indice: indiceCategorias } = useMemo(() => {
        return generarHojasCatalogo(productos);
    }, [productos]);

    // Función de impresión aislada en Iframe (cero elementos de la web)
    const handlePrint = () => {
        const root = printableRef.current;
        if (!root) {
            window.print();
            return;
        }

        const pageNodes = root.querySelectorAll('.catalogo-print-sheet');
        let sheetsHtml = '';
        if (pageNodes && pageNodes.length > 0) {
            pageNodes.forEach(node => {
                sheetsHtml += node.outerHTML;
            });
        } else {
            sheetsHtml = root.innerHTML;
        }

        let frame = document.getElementById('catalogo-hidden-iframe');
        if (frame) {
            frame.remove();
        }
        frame = document.createElement('iframe');
        frame.id = 'catalogo-hidden-iframe';
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
                <title>Catalogo_MixPoint_Mayorista</title>
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
                const titulo = 'Catalogo_MixPoint_Mayorista';
                document.title = titulo;
                if (frame.contentWindow?.document) {
                    frame.contentWindow.document.title = titulo;
                }
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } catch (e) {
                window.print();
            }
        }, 400);
    };

    const totalPages = hojasGeneradas.length;
    const baseWidthPx = 794;
    const baseHeightPx = 1120;
    const scaledWidthPx = Math.round(baseWidthPx * zoomScale);
    const scaledHeightPx = Math.round(baseHeightPx * zoomScale);

    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div
            className="remito-print-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
            onClick={(e) => {
                if (e.target.classList.contains('remito-print-overlay') && onClose) {
                    onClose();
                }
            }}
        >
            <style>{getPrintCss()}</style>

            {/* BARRA SUPERIOR DE HERRAMIENTAS Y ACCIONES */}
            <header
                className="no-print"
                style={{
                    background: '#1E293B',
                    borderBottom: '1px solid #334155',
                    padding: '10px 18px',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    zIndex: 10
                }}
            >
                {/* TÍTULO Y MÉTRICAS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#784A1C', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1.5px solid #C9A227' }}>
                        🌰
                    </div>
                    <div>
                        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#F8FAFC', letterSpacing: '0.02em' }}>
                            Catálogo Oficial & Lista de Precios Mayorista Mix Point
                        </h2>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>
                            {productos.length} productos clasificados · {totalPages} páginas A4 optimizadas sin páginas en blanco
                        </span>
                    </div>
                </div>

                {/* SELECTOR DE PÁGINAS Y ZOOM */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Selector de Hoja */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0F172A', padding: '3px 8px', borderRadius: 6, border: '1px solid #334155' }}>
                        <button
                            type="button"
                            onClick={() => setPaginaActiva('todas')}
                            style={{
                                border: 'none',
                                background: paginaActiva === 'todas' ? '#784A1C' : 'transparent',
                                color: '#FFFFFF',
                                fontWeight: paginaActiva === 'todas' ? 700 : 500,
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: 'pointer'
                            }}
                        >
                            Ver todas ({totalPages})
                        </button>
                        <select
                            value={paginaActiva}
                            onChange={(e) => setPaginaActiva(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                            style={{
                                background: '#1E293B',
                                color: '#F8FAFC',
                                border: '1px solid #475569',
                                borderRadius: 4,
                                padding: '3px 6px',
                                fontSize: 11,
                                outline: 'none'
                            }}
                        >
                            <option value="todas">Todas las hojas</option>
                            {hojasGeneradas.map((h, idx) => (
                                <option key={idx} value={idx}>
                                    Pág {h.numero}: {h.titulo || h.categoria} {h.subtitulo || ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Controles de Zoom */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0F172A', padding: '3px 8px', borderRadius: 6, border: '1px solid #334155' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setModoAjuste('auto');
                                if (window.innerWidth <= 768) {
                                    setZoomScale(Number(((window.innerWidth - 32) / 794).toFixed(2)));
                                } else {
                                    const scaleH = (window.innerHeight - 150) / 1120;
                                    const scaleW = (window.innerWidth - 80) / 820;
                                    setZoomScale(Number(Math.min(1, Math.max(0.45, Math.min(scaleH, scaleW))).toFixed(2)));
                                }
                            }}
                            style={{ border: 'none', background: modoAjuste === 'auto' ? '#334155' : 'transparent', color: '#FFF', padding: '3px 7px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                            title="Ajustar automáticamente a la pantalla"
                        >
                            📐 Ajustar
                        </button>
                        <button
                            type="button"
                            onClick={() => { setModoAjuste('100'); setZoomScale(1); }}
                            style={{ border: 'none', background: modoAjuste === '100' ? '#334155' : 'transparent', color: '#FFF', padding: '3px 7px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                        >
                            100%
                        </button>
                        <button
                            type="button"
                            onClick={() => { setModoAjuste('manual'); setZoomScale(z => Math.max(0.35, Number((z - 0.1).toFixed(2)))); }}
                            style={{ border: 'none', background: 'transparent', color: '#FFF', padding: '3px 6px', fontSize: 12, cursor: 'pointer' }}
                        >
                            🔍-
                        </button>
                        <span style={{ fontSize: 11, minWidth: 32, textAlign: 'center', fontFamily: 'monospace' }}>
                            {Math.round(zoomScale * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={() => { setModoAjuste('manual'); setZoomScale(z => Math.min(1.5, Number((z + 0.1).toFixed(2)))); }}
                            style={{ border: 'none', background: 'transparent', color: '#FFF', padding: '3px 6px', fontSize: 12, cursor: 'pointer' }}
                        >
                            🔍+
                        </button>
                    </div>

                    {/* Botón Imprimir / Guardar PDF */}
                    <button
                        type="button"
                        onClick={handlePrint}
                        style={{
                            background: '#784A1C',
                            color: '#FFFFFF',
                            border: '1.5px solid #C9A227',
                            padding: '6px 16px',
                            borderRadius: 6,
                            fontWeight: 800,
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(120,74,28,0.4)'
                        }}
                    >
                        🖨️ Imprimir / Guardar PDF
                    </button>

                    {/* Botón Cerrar */}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#334155',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        ✕ Cerrar
                    </button>
                </div>
            </header>

            {/* CONTENEDOR CENTRAL DE PÁGINAS A4 */}
            <main
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'auto',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20
                }}
            >
                <div ref={printableRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                    {hojasGeneradas.map((hoja, index) => {
                        if (paginaActiva !== 'todas' && paginaActiva !== index) {
                            return null;
                        }

                        return (
                            <div
                                key={`hoja-${hoja.numero}`}
                                style={{
                                    width: `${scaledWidthPx}px`,
                                    height: `${scaledHeightPx}px`,
                                    position: 'relative',
                                    flexShrink: 0
                                }}
                            >
                                <div
                                    style={{
                                        width: `${baseWidthPx}px`,
                                        height: `${baseHeightPx}px`,
                                        transform: `scale(${zoomScale})`,
                                        transformOrigin: 'top left',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                        background: '#FFFFFF'
                                    }}
                                >
                                    {/* =========================================================
                                        HOJA 1: PORTADA OFICIAL (IMAGEN HD COMPLETA SANGRADA)
                                        ========================================================= */}
                                    {hoja.tipo === 'portada' && (
                                        <div className="catalogo-print-sheet sheet-portada">
                                            <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                                                <img
                                                    src="/catalogo/portada.jpg"
                                                    alt="Catálogo Oficial Mix Point Mayorista"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        display: 'block'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* =========================================================
                                        HOJA 2: ÍNDICE EDITORIAL CON LÍNEAS PUNTEADAS
                                        ========================================================= */}
                                    {hoja.tipo === 'indice' && (
                                        <div className="catalogo-print-sheet sheet-content">
                                            <div>
                                                {/* Header Índice Editorial */}
                                                <div style={{ marginBottom: 28, borderBottom: '3px solid #784A1C', paddingBottom: 8 }}>
                                                    <h1 style={{
                                                        fontSize: 32,
                                                        fontWeight: 900,
                                                        color: '#2A1E17',
                                                        margin: 0,
                                                        fontFamily: '"Georgia", serif, -apple-system, BlinkMacSystemFont, "Segoe UI"',
                                                        letterSpacing: '0.02em'
                                                    }}>
                                                        Índice
                                                    </h1>
                                                </div>

                                                {/* Lista Punteada de Categorías */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 4px' }}>
                                                    {indiceCategorias.map(item => (
                                                        <div
                                                            key={item.categoria}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'baseline',
                                                                fontSize: 13,
                                                                fontFamily: '"Georgia", serif, -apple-system, BlinkMacSystemFont, "Segoe UI"'
                                                            }}
                                                        >
                                                            <span style={{ fontWeight: 700, color: '#2A1E17', paddingRight: 8, whiteSpace: 'nowrap' }}>
                                                                {item.categoria}
                                                            </span>
                                                            <span style={{
                                                                flex: 1,
                                                                borderBottom: '1.5px dotted #B0A89C',
                                                                margin: '0 8px',
                                                                transform: 'translateY(-3px)'
                                                            }} />
                                                            <span style={{ fontSize: 11, color: '#6B5E51', fontWeight: 500, paddingRight: 10, whiteSpace: 'nowrap' }}>
                                                                {item.total} productos
                                                            </span>
                                                            <span style={{ fontWeight: 800, color: '#784A1C', fontSize: 13, whiteSpace: 'nowrap' }}>
                                                                Pág. {item.pagina}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Cuadro Institucional y Comercial */}
                                                <div
                                                    style={{
                                                        marginTop: 36,
                                                        background: '#FDFBF7',
                                                        border: '1.5px solid #EAE3D2',
                                                        borderRadius: 8,
                                                        padding: '16px 20px',
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                                        gap: 16
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: 9.5, fontWeight: 800, color: '#784A1C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            Ventas & Asesoramiento Mayorista
                                                        </div>
                                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#047857', marginTop: 3 }}>
                                                            📲 WhatsApp: {WHATSAPP_OFICIAL}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 9.5, fontWeight: 800, color: '#784A1C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            Datos de Cobro Oficial
                                                        </div>
                                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#B45309', marginTop: 3 }}>
                                                            💳 Alias: {ALIAS_PAGO}
                                                        </div>
                                                    </div>
                                                    <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #DDD2BE', paddingTop: 10 }}>
                                                        <div style={{ fontSize: 11, color: '#524336', lineHeight: 1.4 }}>
                                                            📍 <strong>Depósito Central:</strong> San Isidro 2135, Ituzaingó, Prov. de Buenos Aires. Envíos y logística a todo el país. Precios netos por bulto cerrado y fraccionado de primera calidad.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer Editorial de Página */}
                                            <div style={{ textAlign: 'center', fontSize: 10, color: '#786C5E', borderTop: '1px solid #EFEAE4', paddingTop: 8 }}>
                                                Mix Point · 2
                                            </div>
                                        </div>
                                    )}

                                    {/* =========================================================
                                        HOJAS DE PRODUCTOS EN CUADRÍCULA (BALANCEADAS)
                                        ========================================================= */}
                                    {hoja.tipo === 'productos' && (
                                        <div className="catalogo-print-sheet sheet-content">
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                {/* Header de Categoría (Banner Marrón Oficial) */}
                                                <div
                                                    style={{
                                                        background: '#784A1C',
                                                        color: '#FFFFFF',
                                                        padding: '8px 16px',
                                                        borderRadius: 6,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: 10
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 16 }}>🌰</span>
                                                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            {hoja.categoria} <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.9 }}>{hoja.subtitulo}</span>
                                                        </h2>
                                                    </div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#FEF3C7', letterSpacing: '0.05em' }}>
                                                        MIX POINT · MAYORISTA
                                                    </div>
                                                </div>

                                                {/* Cuadrícula de Productos (3 columnas x filas dinámicas) */}
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                                        gap: 8,
                                                        flex: 1,
                                                        alignContent: 'start'
                                                    }}
                                                >
                                                    {hoja.productos.map(p => {
                                                        const pBase = Number(p.precio_venta || 0);
                                                        const p5k = Number(p.precio_5kg || 0);
                                                        const p10k = Number(p.precio_10kg || 0);
                                                        const p25k = Number(p.precio_25kg || 0);
                                                        const p30k = Number(p.precio_30kg || 0);

                                                        // Ajustar la altura visual de la tarjeta según la cantidad de items de la hoja
                                                        const esHojaDensa = hoja.productos.length > 9;
                                                        const cardHeight = esHojaDensa ? 190 : 215;
                                                        const imgHeight = esHojaDensa ? 84 : 100;

                                                        return (
                                                            <div
                                                                key={p.id || p.nombre}
                                                                style={{
                                                                    border: '1px solid #E5E7EB',
                                                                    borderRadius: 6,
                                                                    padding: '6px 8px',
                                                                    background: '#FFFFFF',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    justifyContent: 'space-between',
                                                                    height: cardHeight,
                                                                    boxSizing: 'border-box'
                                                                }}
                                                            >
                                                                {/* Foto del Producto */}
                                                                <div
                                                                    style={{
                                                                        height: imgHeight,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        background: '#FAFAF9',
                                                                        borderRadius: 4,
                                                                        overflow: 'hidden',
                                                                        marginBottom: 4
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={obtenerImagenProducto(p)}
                                                                        alt={p.nombre}
                                                                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                                                        onError={e => {
                                                                            e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg';
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Nombre del Producto */}
                                                                <div
                                                                    style={{
                                                                        fontSize: 10.5,
                                                                        fontWeight: 800,
                                                                        color: '#1F2937',
                                                                        lineHeight: 1.25,
                                                                        height: 28,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: 2,
                                                                        WebkitBoxOrient: 'vertical'
                                                                    }}
                                                                    title={p.nombre}
                                                                >
                                                                    {p.nombre}
                                                                </div>

                                                                {/* Tabla de Precios por Escala */}
                                                                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 2, marginTop: 'auto' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                                        <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 600 }}>x 1 {p.unidad_medida || 'kg'}:</span>
                                                                        <span style={{ fontSize: 11, fontWeight: 900, color: '#784A1C' }}>
                                                                            {pBase > 0 ? fmtMoney(pBase) : 'Consultar'}
                                                                        </span>
                                                                    </div>
                                                                    {p5k > 0 && (
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8.5 }}>
                                                                            <span style={{ color: '#6B7280' }}>x 5 kg:</span>
                                                                            <span style={{ fontWeight: 700, color: '#374151' }}>{fmtMoney(p5k)}</span>
                                                                        </div>
                                                                    )}
                                                                    {p10k > 0 && (
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8.5 }}>
                                                                            <span style={{ color: '#6B7280' }}>x 10 kg:</span>
                                                                            <span style={{ fontWeight: 700, color: '#374151' }}>{fmtMoney(p10k)}</span>
                                                                        </div>
                                                                    )}
                                                                    {p25k > 0 && (
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8.5 }}>
                                                                            <span style={{ color: '#6B7280' }}>x 25 kg:</span>
                                                                            <span style={{ fontWeight: 700, color: '#374151' }}>{fmtMoney(p25k)}</span>
                                                                        </div>
                                                                    )}
                                                                    {p30k > 0 && (
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8.5 }}>
                                                                            <span style={{ color: '#6B7280' }}>x 30 kg:</span>
                                                                            <span style={{ fontWeight: 700, color: '#374151' }}>{fmtMoney(p30k)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Footer Editorial de Página */}
                                            <div
                                                style={{
                                                    borderTop: '1px solid #E5E7EB',
                                                    paddingTop: 6,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: 9,
                                                    color: '#6B7280'
                                                }}
                                            >
                                                <span>📲 WA Pedidos: {WHATSAPP_OFICIAL}</span>
                                                <span style={{ fontWeight: 700, color: '#784A1C' }}>Mix Point · {hoja.numero}</span>
                                                <span>💳 Alias: {ALIAS_PAGO}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* =========================================================
                                        HOJAS DE HERBORISTERÍA: FORMATO TABULAR BOTÁNICO DE ALTA DENSIDAD
                                        ========================================================= */}
                                    {hoja.tipo === 'herboristeria' && (
                                        <div className="catalogo-print-sheet sheet-content">
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                {/* Header de Herboristería */}
                                                <div
                                                    style={{
                                                        background: '#784A1C',
                                                        color: '#FFFFFF',
                                                        padding: '8px 16px',
                                                        borderRadius: 6,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: 10
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 16 }}>🌿</span>
                                                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            {hoja.categoria} <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.9 }}>{hoja.subtitulo}</span>
                                                        </h2>
                                                    </div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#FEF3C7', letterSpacing: '0.05em' }}>
                                                        SELECCIÓN BOTÁNICA MAYORISTA
                                                    </div>
                                                </div>

                                                {/* Tabla Botánica Dividida en 2 Columnas Paralelas de Alta Legibilidad */}
                                                {(() => {
                                                    const mitad = Math.ceil(hoja.productos.length / 2);
                                                    const col1 = hoja.productos.slice(0, mitad);
                                                    const col2 = hoja.productos.slice(mitad);

                                                    const renderColumna = (lista, tituloCol) => (
                                                        <div style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden', background: '#FFFFFF' }}>
                                                            {/* Encabezado de la Sub-Columna */}
                                                            <div
                                                                style={{
                                                                    background: '#F5EFEB',
                                                                    borderBottom: '1.5px solid #DDD2BE',
                                                                    padding: '5px 8px',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    fontSize: 9,
                                                                    fontWeight: 800,
                                                                    color: '#784A1C',
                                                                    textTransform: 'uppercase'
                                                                }}
                                                            >
                                                                <span style={{ flex: 1 }}>Variedad / Hierba</span>
                                                                <span style={{ width: 56, textAlign: 'right' }}>x 1 kg</span>
                                                                <span style={{ width: 56, textAlign: 'right' }}>x 5 kg</span>
                                                            </div>

                                                            {/* Filas de Hierbas Medicinales */}
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                {lista.map((p, idx) => {
                                                                    const pBase = Number(p.precio_venta || 0);
                                                                    const p5k = Number(p.precio_5kg || 0);

                                                                    return (
                                                                        <div
                                                                            key={p.id || p.nombre}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'space-between',
                                                                                padding: '4px 8px',
                                                                                background: idx % 2 === 0 ? '#FFFFFF' : '#FBF9F6',
                                                                                borderBottom: idx === lista.length - 1 ? 'none' : '1px solid #F1ECE6',
                                                                                fontSize: 9.5
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, paddingRight: 6 }}>
                                                                                <span style={{ fontSize: 10, flexShrink: 0, opacity: 0.8 }}>🌿</span>
                                                                                <span
                                                                                    style={{
                                                                                        fontWeight: 700,
                                                                                        color: '#2A1E17',
                                                                                        overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis',
                                                                                        whiteSpace: 'nowrap'
                                                                                    }}
                                                                                    title={p.nombre}
                                                                                >
                                                                                    {p.nombre}
                                                                                </span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: 8, flexShrink: 0, textAlign: 'right' }}>
                                                                                <span style={{ fontWeight: 800, color: '#784A1C', width: 56 }}>
                                                                                    {pBase > 0 ? fmtMoney(pBase) : '—'}
                                                                                </span>
                                                                                <span style={{ fontWeight: 600, color: '#4B5563', width: 56 }}>
                                                                                    {p5k > 0 ? fmtMoney(p5k) : '—'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );

                                                    return (
                                                        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                                                            {renderColumna(col1, 'Parte A')}
                                                            {renderColumna(col2, 'Parte B')}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Footer Editorial de Página */}
                                            <div
                                                style={{
                                                    borderTop: '1px solid #E5E7EB',
                                                    paddingTop: 6,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: 9,
                                                    color: '#6B7280'
                                                }}
                                            >
                                                <span>📲 WA Pedidos: {WHATSAPP_OFICIAL}</span>
                                                <span style={{ fontWeight: 700, color: '#784A1C' }}>Mix Point · {hoja.numero}</span>
                                                <span>💳 Alias: {ALIAS_PAGO}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );

    return createPortal(modalContent, document.body);
}
