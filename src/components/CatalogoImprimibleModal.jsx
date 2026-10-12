import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { obtenerImagenProducto } from '../utils/imagenProducto';

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
            padding: 10mm 12mm 8mm 12mm;
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

    // Auto-ajuste de escala de zoom
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

    // Generar páginas garantizando que CADA PÁGINA tiene máximo 12 productos (3 columnas x 4 filas)
    // para que JAMÁS desborde los 297mm del formato A4
    const hojasGeneradas = useMemo(() => {
        const hojas = [];

        // HOJA 1: PORTADA EDITORIAL
        hojas.push({
            tipo: 'portada',
            numero: 1,
            titulo: 'Portada Oficial'
        });

        // HOJA 2: ÍNDICE DE CATEGORÍAS
        hojas.push({
            tipo: 'indice',
            numero: 2,
            titulo: 'Índice General'
        });

        // PÁGINAS DE PRODUCTOS POR CATEGORÍA
        // Agrupar productos válidos por categoría
        const categoriasMap = new Map();
        productos.forEach(p => {
            const cat = p.categoria_nombre || p.categoria || 'Varios';
            if (!categoriasMap.has(cat)) {
                categoriasMap.set(cat, []);
            }
            categoriasMap.get(cat).push(p);
        });

        let currentPagNum = 3;

        categoriasMap.forEach((prodsCat, catNombre) => {
            // Máximo 12 productos por hoja A4 para mantener encuadre estricto de 3 columnas x 4 filas
            const maxPorHoja = 12;
            const totalHojasCat = Math.ceil(prodsCat.length / maxPorHoja);

            for (let i = 0; i < totalHojasCat; i++) {
                const chunk = prodsCat.slice(i * maxPorHoja, (i + 1) * maxPorHoja);
                hojas.push({
                    tipo: 'productos',
                    numero: currentPagNum++,
                    categoria: catNombre,
                    subtitulo: totalHojasCat > 1 ? `(Parte ${i + 1} de ${totalHojasCat})` : '',
                    productos: chunk
                });
            }
        });

        return hojas;
    }, [productos]);

    // Mapeo dinámico para el índice (categoría -> primera página donde aparece)
    const indiceCategorias = useMemo(() => {
        const map = [];
        const vistas = new Set();
        hojasGeneradas.forEach(h => {
            if (h.tipo === 'productos' && !vistas.has(h.categoria)) {
                vistas.add(h.categoria);
                const count = productos.filter(p => (p.categoria_nombre || p.categoria || 'Varios') === h.categoria).length;
                map.push({
                    categoria: h.categoria,
                    pagina: h.numero,
                    total: count
                });
            }
        });
        return map;
    }, [hojasGeneradas, productos]);

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
                            Catálogo Oficial & Lista de Precios Mayorista
                        </h2>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>
                            {productos.length} productos clasificados · {totalPages} páginas A4 sin desbordes
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
                                    <div className="catalogo-print-sheet">
                                        {/* =========================================================
                                            HOJA 1: PORTADA EDITORIAL OFICIAL
                                            ========================================================= */}
                                        {hoja.tipo === 'portada' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', border: '3.5px solid #784A1C', borderRadius: 8, padding: '36px 28px', boxSizing: 'border-box', background: 'radial-gradient(circle at center, #FFFFFF 0%, #FDFBF7 100%)', textAlign: 'center' }}>
                                                {/* Header Portada */}
                                                <div>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FEF3C7', color: '#92400E', padding: '4px 14px', borderRadius: 16, fontSize: 10, fontWeight: 800, border: '1px solid #FCD34D', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                        LISTA OFICIAL DE PRECIOS MAYORISTA
                                                    </div>
                                                </div>

                                                {/* Centro Portada */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto 0' }}>
                                                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#784A1C', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, marginBottom: 16, border: '2.5px solid #C9A227', boxShadow: '0 8px 24px rgba(120,74,28,0.35)' }}>
                                                        🌰
                                                    </div>
                                                    <h1 style={{ fontSize: 38, fontWeight: 900, color: '#784A1C', margin: '0 0 6px', letterSpacing: '1.5px', lineHeight: 1.1 }}>
                                                        MIX POINT
                                                    </h1>
                                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: 18 }}>
                                                        Distribuidora Mayorista de Alimentos Naturales
                                                    </div>
                                                    <div style={{ width: 70, height: 4, background: '#784A1C', borderRadius: 2, marginBottom: 20 }} />
                                                    <p style={{ fontSize: 13, color: '#4B5563', maxWidth: 480, lineHeight: 1.5, margin: '0 0 28px' }}>
                                                        Frutos secos, mixes especiales, cereales, semillas, harinas y herboristería de primera selección. Trazabilidad garantizada bajo norma FEFO y escalas de precios por bulto cerrado.
                                                    </p>

                                                    {/* Tarjeta de Contacto Oficial */}
                                                    <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '16px 24px', width: '100%', maxWidth: 480, textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                                        <div>
                                                            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>WhatsApp Ventas</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: '#047857' }}>📲 {WHATSAPP_OFICIAL}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Alias de Cobro</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: '#B45309' }}>💳 {ALIAS_PAGO}</div>
                                                        </div>
                                                        <div style={{ gridColumn: 'span 2' }}>
                                                            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Depósito & Envíos a Todo el País</div>
                                                            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1E293B' }}>📍 San Isidro 2135, Ituzaingó, Prov. Buenos Aires</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Portada */}
                                                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10, fontSize: 9.5, color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>🌐 www.distribuidora-mix-point.com.ar</span>
                                                    <span>Edición Oficial Actualizada</span>
                                                    <span>Página 1 de {totalPages}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* =========================================================
                                            HOJA 2: ÍNDICE DE CATEGORÍAS
                                            ========================================================= */}
                                        {hoja.tipo === 'indice' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                                <div>
                                                    {/* Header de Categoría */}
                                                    <div style={{ background: '#784A1C', color: '#FFFFFF', padding: '10px 18px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 22 }}>📋</span>
                                                            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                Índice General de Categorías
                                                            </h2>
                                                        </div>
                                                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 10 }}>
                                                            {productos.length} Productos
                                                        </span>
                                                    </div>

                                                    {/* Grilla de Categorías del Índice */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                                        {indiceCategorias.map(item => (
                                                            <div
                                                                key={item.categoria}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '10px 14px',
                                                                    border: '1.2px solid #E2E8F0',
                                                                    borderRadius: 6,
                                                                    background: '#F8FAFC'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <span style={{ fontSize: 16 }}>🌰</span>
                                                                    <div>
                                                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{item.categoria}</div>
                                                                        <div style={{ fontSize: 9.5, color: '#64748B' }}>{item.total} variedades</div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ background: '#784A1C', color: '#FFFFFF', fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
                                                                    Pág {item.pagina}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Footer de Página */}
                                                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748B' }}>
                                                    <span>📲 Pedidos WhatsApp: {WHATSAPP_OFICIAL}</span>
                                                    <span>💳 Alias: {ALIAS_PAGO}</span>
                                                    <span style={{ fontWeight: 700, color: '#784A1C' }}>Página 2 de {totalPages}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* =========================================================
                                            HOJAS DE PRODUCTOS: 3 A N (MÁXIMO 12 POR HOJA EN 3x4)
                                            ========================================================= */}
                                        {hoja.tipo === 'productos' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                                <div>
                                                    {/* Header de Categoría */}
                                                    <div style={{ background: '#784A1C', color: '#FFFFFF', padding: '8px 16px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontSize: 18 }}>🌰</span>
                                                            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                {hoja.categoria} <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.9 }}>{hoja.subtitulo}</span>
                                                            </h2>
                                                        </div>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#FEF3C7', letterSpacing: '0.04em' }}>
                                                            MIX POINT · PÁGINA {hoja.numero}
                                                        </div>
                                                    </div>

                                                    {/* Cuadrícula Estricta de Productos: 3 Columnas x hasta 4 Filas */}
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                                            gap: 8
                                                        }}
                                                    >
                                                        {hoja.productos.map(p => {
                                                            const pBase = Number(p.precio_venta || 0);
                                                            const p5k = Number(p.precio_5kg || 0);
                                                            const p10k = Number(p.precio_10kg || 0);
                                                            const p25k = Number(p.precio_25kg || 0);
                                                            const p30k = Number(p.precio_30kg || 0);

                                                            return (
                                                                <div
                                                                    key={p.id || p.nombre}
                                                                    style={{
                                                                        border: '1px solid #D1D5DB',
                                                                        borderRadius: 6,
                                                                        padding: '6px 7px',
                                                                        background: '#FFFFFF',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        justifyContent: 'space-between',
                                                                        height: 54 * 3.4, // Altura exacta calculada para 4 filas en A4 sin desborde
                                                                        maxHeight: 190,
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                >
                                                                    {/* Foto del Producto */}
                                                                    <div
                                                                        style={{
                                                                            height: 74,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            background: '#F9FAFB',
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
                                                                            fontSize: 10,
                                                                            fontWeight: 800,
                                                                            color: '#111827',
                                                                            lineHeight: 1.2,
                                                                            height: 24,
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis'
                                                                        }}
                                                                        title={p.nombre}
                                                                    >
                                                                        {p.nombre}
                                                                    </div>

                                                                    {/* Tabla de Precios por Escala */}
                                                                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 2, marginTop: 'auto' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                                            <span style={{ fontSize: 8.5, color: '#6B7280', fontWeight: 600 }}>x 1 {p.unidad_medida || 'kg'}:</span>
                                                                            <span style={{ fontSize: 11, fontWeight: 900, color: '#784A1C' }}>
                                                                                {pBase > 0 ? fmtMoney(pBase) : 'Consultar'}
                                                                            </span>
                                                                        </div>
                                                                        {p5k > 0 && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8 }}>
                                                                                <span style={{ color: '#6B7280' }}>x 5 kg:</span>
                                                                                <span style={{ fontWeight: 700 }}>{fmtMoney(p5k)}</span>
                                                                            </div>
                                                                        )}
                                                                        {p10k > 0 && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8 }}>
                                                                                <span style={{ color: '#6B7280' }}>x 10 kg:</span>
                                                                                <span style={{ fontWeight: 700 }}>{fmtMoney(p10k)}</span>
                                                                            </div>
                                                                        )}
                                                                        {p25k > 0 && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8 }}>
                                                                                <span style={{ color: '#6B7280' }}>x 25 kg:</span>
                                                                                <span style={{ fontWeight: 700 }}>{fmtMoney(p25k)}</span>
                                                                            </div>
                                                                        )}
                                                                        {p30k > 0 && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8 }}>
                                                                                <span style={{ color: '#6B7280' }}>x 30 kg:</span>
                                                                                <span style={{ fontWeight: 700 }}>{fmtMoney(p30k)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Footer de Página */}
                                                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748B' }}>
                                                    <span>📲 WA Pedidos: {WHATSAPP_OFICIAL}</span>
                                                    <span>💳 Alias: {ALIAS_PAGO}</span>
                                                    <span>📍 San Isidro 2135, Ituzaingó</span>
                                                    <span style={{ fontWeight: 800, color: '#784A1C' }}>Página {hoja.numero} de {totalPages}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
