import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import VoiceSearchButton from '../components/VoiceSearchButton';
import { IconBuscar, IconFlyer } from '../components/Icons';
import catalogoOficialData from '../data/catalogo_completo.json';
import { obtenerImagenProducto } from '../utils/imagenProducto';

const fmtMoney = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const WHATSAPP_OFICIAL = '1167873243';
const ALIAS_PAGO = 'mixpoint2026';

// Nombres descriptivos para las 21 páginas de la revista oficial
const PAGINAS_REVISTA = [
    { num: 1, titulo: 'Pág 1: Portada Mix Point', categoria: 'Portada' },
    { num: 2, titulo: 'Pág 2: Índice General de Categorías', categoria: 'Índice' },
    { num: 3, titulo: 'Pág 3: Frutos Secos (Nueces, Almendras, Castañas, Pasas)', categoria: 'Frutos Secos' },
    { num: 4, titulo: 'Pág 4: Frutos Secos (Pastas de Maní & Castañas de Pará)', categoria: 'Frutos Secos' },
    { num: 5, titulo: 'Pág 5: Mixes Especiales & Cerveceros', categoria: 'Mixes' },
    { num: 6, titulo: 'Pág 6: Cereales & Almohaditas Rellenas', categoria: 'Cereales' },
    { num: 7, titulo: 'Pág 7: Repostería, Chocolates & Coberturas', categoria: 'Repostería' },
    { num: 8, titulo: 'Pág 8: Snacks, Maníes & Maíz Frito', categoria: 'Snacks' },
    { num: 9, titulo: 'Pág 9: Legumbres, Lentejas, Porotos & Arroces', categoria: 'Legumbres' },
    { num: 10, titulo: 'Pág 10: Condimentos & Especias (Parte I)', categoria: 'Condimentos' },
    { num: 11, titulo: 'Pág 11: Condimentos & Especias (Parte II)', categoria: 'Condimentos' },
    { num: 12, titulo: 'Pág 12: Azúcares (Impalpable, Mascabo, Rubia, Negra)', categoria: 'Azúcares' },
    { num: 13, titulo: 'Pág 13: Harinas Especiales, Integrales & Sin Gluten', categoria: 'Harinas' },
    { num: 14, titulo: 'Pág 14: Semillas Seleccionadas (Chía, Sésamo, Lino, Zapallo)', categoria: 'Semillas' },
    { num: 15, titulo: 'Pág 15: Suplementos, Colágeno & Barritas Proteicas', categoria: 'Suplementos' },
    { num: 16, titulo: 'Pág 16: Aceites Puros & Esenciales (Coco, Oliva, Lino, Chía)', categoria: 'Aceites' },
    { num: 17, titulo: 'Pág 17: Otros (Miel Pura & Endulzantes Eritritol)', categoria: 'Otros' },
    { num: 18, titulo: 'Pág 18: Chocolates sin TACC & Barritas Dietéticas', categoria: 'Chocolates sin TACC' },
    { num: 19, titulo: 'Pág 19: Herboristería (Ginkgo, Moringa, Rosa Mosqueta)', categoria: 'Herboristería' },
    { num: 20, titulo: 'Pág 20: Herboristería (Melisa, Lapacho, Llantén, Menta)', categoria: 'Herboristería' },
    { num: 21, titulo: 'Pág 21: Herboristería (Ambay, Burrito, Marcela, Tilo, Uña de Gato)', categoria: 'Herboristería' },
];

const CATEGORIAS_CON_ICONO = [
    { nombre: 'Todas', icono: '🌰', total: 225 },
    { nombre: 'Frutos Secos', icono: '🥜', total: 20, pagina: 3 },
    { nombre: 'Mixes', icono: '🥣', total: 8, pagina: 5 },
    { nombre: 'Cereales', icono: '🌾', total: 16, pagina: 6 },
    { nombre: 'Repostería', icono: '🍫', total: 11, pagina: 7 },
    { nombre: 'Snacks', icono: '🍿', total: 8, pagina: 8 },
    { nombre: 'Legumbres', icono: '🫘', total: 13, pagina: 9 },
    { nombre: 'Condimentos', icono: '🧂', total: 21, pagina: 10 },
    { nombre: 'Azúcares', icono: '🍬', total: 4, pagina: 12 },
    { nombre: 'Harinas', icono: '🍞', total: 17, pagina: 13 },
    { nombre: 'Semillas', icono: '🌱', total: 10, pagina: 14 },
    { nombre: 'Suplementos', icono: '💪', total: 10, pagina: 15 },
    { nombre: 'Aceites', icono: '🫒', total: 14, pagina: 16 },
    { nombre: 'Otros', icono: '🍯', total: 3, pagina: 17 },
    { nombre: 'Chocolates sin TACC', icono: '🍫', total: 10, pagina: 18 },
    { nombre: 'Herboristería', icono: '🌿', total: 60, pagina: 19 },
];

export default function CatalogoFlyers() {
    // Inicializar de inmediato con el catálogo oficial JSON para evitar pantallas en blanco
    const [productos, setProductos] = useState(catalogoOficialData.productos || []);
    const [categorias, setCategorias] = useState(catalogoOficialData.categorias || []);
    const [q, setQ] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [vistaCatalogo, setVistaCatalogo] = useState('grilla'); // 'grilla' | 'tabla'
    const [tabActiva, setTabActiva] = useState('catalogo'); // 'catalogo' | 'revista' | 'flyer'
    const [loading, setLoading] = useState(false);

    // Estado del Visor de Revista Digital PDF
    const [paginaActual, setPaginaActual] = useState(1);
    const [zoomRevista, setZoomRevista] = useState(100);

    // Estado del Creador de Flyers
    const [flyerTitulo, setFlyerTitulo] = useState('¡OFERTAS MAYORISTAS DE LA SEMANA!');
    const [flyerSubtitulo, setFlyerSubtitulo] = useState('Precios directos para dietéticas, comercios y distribuidores');
    const [productosSeleccionados, setProductosSeleccionados] = useState([1, 5, 8, 12]);
    const [notaPie, setNotaPie] = useState('Precios netos por bulto cerrado · Envíos a todo el país · Stock asegurado');
    const [copiado, setCopiado] = useState(false);

    const flyerRef = useRef(null);

    // Intentar sincronizar con la API si está disponible
    useEffect(() => {
        Promise.all([
            client.get('/productos', { params: { activo: 1 } }).catch(() => ({ data: [] })),
            client.get('/productos/categorias').catch(() => ({ data: [] }))
        ]).then(([pRes, cRes]) => {
            if (pRes.data && pRes.data.length > 0) {
                // Combinar datos de DB asegurando que se preserven las fotos del catálogo si existen
                const combinados = pRes.data.map(p => {
                    const localMatch = catalogoOficialData.productos.find(x => x.nombre.toLowerCase() === p.nombre.toLowerCase());
                    return {
                        ...p,
                        imagen: obtenerImagenProducto(p) || localMatch?.imagen,
                        escalas: localMatch?.escalas || {
                            x1kg: p.precio_venta,
                            x5kg: p.precio_5kg,
                            x10kg: p.precio_10kg,
                            x25kg: p.precio_25kg,
                            x30kg: p.precio_30kg
                        }
                    };
                });
                setProductos(combinados);
            }
            if (cRes.data && cRes.data.length > 0) {
                setCategorias(cRes.data);
            }
        });
    }, []);

    const productosFiltrados = productos.filter(p => {
        const query = q.toLowerCase().trim();
        const matchesQ =
            !query ||
            (p.nombre && p.nombre.toLowerCase().includes(query)) ||
            (p.codigo && p.codigo.toLowerCase().includes(query)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
            (p.categoria && p.categoria.toLowerCase().includes(query)) ||
            (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(query));

        const catName = p.categoria || p.categoria_nombre || '';
        const matchesCat =
            !categoriaFiltro ||
            catName.toLowerCase() === categoriaFiltro.toLowerCase() ||
            String(p.categoria_id) === String(categoriaFiltro);

        return matchesQ && matchesCat;
    });

    const prodsFlyer = productos.filter(p => productosSeleccionados.includes(p.id));

    function generarLinkWhatsAppProducto(prod) {
        const msg = `¡Hola Mix Point! Me interesa cotizar o encargar el producto *${prod.nombre}* (${prod.unidad_medida || 'kg'}).\nCódigo: ${prod.codigo || '—'}\nPrecio Base: ${fmtMoney(prod.precio_venta)}\nEscala 5kg: ${Number(prod.precio_5kg) > 0 ? fmtMoney(prod.precio_5kg) : 'Consultar'}\nEscala 10kg: ${Number(prod.precio_10kg) > 0 ? fmtMoney(prod.precio_10kg) : 'Consultar'}\nAlias de pago: *${ALIAS_PAGO}*\n¡Muchas gracias!`;
        return `https://wa.me/549${WHATSAPP_OFICIAL}?text=${encodeURIComponent(msg)}`;
    }

    function copiarTextoWhatsApp() {
        let texto = `🌰 *DISTRIBUIDORA MIX POINT — ${flyerTitulo.toUpperCase()}*\n`;
        texto += `_${flyerSubtitulo}_\n\n`;
        texto += `📦 *PRODUCTOS DESTACADOS:*\n`;
        prodsFlyer.forEach(p => {
            texto += `• *${p.nombre}* (${p.unidad_medida || 'kg'})\n`;
            if (Number(p.precio_venta) > 0) texto += `   - Precio base (x1kg): ${fmtMoney(p.precio_venta)}\n`;
            if (Number(p.precio_5kg) > 0) texto += `   - Escala 5kg+: ${fmtMoney(p.precio_5kg)}/kg\n`;
            if (Number(p.precio_10kg) > 0) texto += `   - Escala 10kg+: ${fmtMoney(p.precio_10kg)}/kg\n`;
            if (Number(p.precio_25kg) > 0) texto += `   - Bulto 25kg+: ${fmtMoney(p.precio_25kg)}/kg\n`;
            if (Number(p.precio_30kg) > 0) texto += `   - Bulto 30kg+: ${fmtMoney(p.precio_30kg)}/kg\n`;
        });
        texto += `\n💳 *Datos de transferencia:* Alias: *${ALIAS_PAGO}*\n`;
        texto += `📲 *Línea oficial WhatsApp:* ${WHATSAPP_OFICIAL}\n`;
        texto += `_${notaPie}_`;

        navigator.clipboard.writeText(texto).then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 3000);
        });
    }

    function toggleSeleccionFlyer(id) {
        if (productosSeleccionados.includes(id)) {
            setProductosSeleccionados(productosSeleccionados.filter(x => x !== id));
        } else {
            if (productosSeleccionados.length >= 6) {
                alert('Podés seleccionar hasta 6 productos destacados para el flyer.');
                return;
            }
            setProductosSeleccionados([...productosSeleccionados, id]);
        }
    }

    function irACategoriaEnRevista(catNombre) {
        const item = CATEGORIAS_CON_ICONO.find(c => c.nombre.toLowerCase() === catNombre.toLowerCase());
        if (item && item.pagina) {
            setPaginaActual(item.pagina);
            setTabActiva('revista');
        }
    }

    return (
        <div className="stack gap-lg">
            {/* ENCABEZADO DE PÁGINA */}
            <div className="spread page-header no-print" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div className="row gap-xs" style={{ marginBottom: 4 }}>
                        <span className="badge badge-primary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                            LISTA DE PRECIOS MAYORISTA
                        </span>
                        <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontSize: 11, fontWeight: 700 }}>
                            💳 Alias: {ALIAS_PAGO}
                        </span>
                        <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontSize: 11, fontWeight: 700 }}>
                            📲 WhatsApp: {WHATSAPP_OFICIAL}
                        </span>
                    </div>
                    <h1 style={{ fontSize: 26, margin: 0 }}>Catálogo Oficial & Creador de Flyers</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        {productos.length} productos clasificados · 15 categorías mayoristas · Fotos auténticas de catálogo
                    </p>
                </div>

                {/* BOTONERA DE PESTAÑAS PRINCIPALES */}
                <div style={{ background: '#ECE8DA', borderRadius: 8, padding: 3, display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                            background: tabActiva === 'catalogo' ? '#FFFFFF' : 'transparent',
                            color: tabActiva === 'catalogo' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                            fontWeight: tabActiva === 'catalogo' ? 700 : 500,
                            borderRadius: 6,
                            boxShadow: tabActiva === 'catalogo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                        onClick={() => setTabActiva('catalogo')}
                    >
                        🌰 Catálogo Interactivo ({productosFiltrados.length})
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                            background: tabActiva === 'revista' ? '#FFFFFF' : 'transparent',
                            color: tabActiva === 'revista' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                            fontWeight: tabActiva === 'revista' ? 700 : 500,
                            borderRadius: 6,
                            boxShadow: tabActiva === 'revista' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                        onClick={() => setTabActiva('revista')}
                    >
                        📖 Revista Catálogo PDF (21 Páginas)
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                            background: tabActiva === 'flyer' ? '#FFFFFF' : 'transparent',
                            color: tabActiva === 'flyer' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                            fontWeight: tabActiva === 'flyer' ? 700 : 500,
                            borderRadius: 6,
                            boxShadow: tabActiva === 'flyer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                        onClick={() => setTabActiva('flyer')}
                    >
                        <IconFlyer style={{ width: 14, height: 14 }} /> Creador de Flyers ({productosSeleccionados.length})
                    </button>
                </div>
            </div>

            {/* TAB 1: CATÁLOGO DIGITAL INTERACTIVO */}
            {tabActiva === 'catalogo' && (
                <div className="stack gap-md">
                    {/* BARRA DE FILTROS SUPERIOR */}
                    <div className="card" style={{ padding: '14px 18px', background: '#FFFFFF' }}>
                        <div className="spread" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                            {/* BÚSQUEDA Y VOZ */}
                            <div className="row gap-sm" style={{ maxWidth: 440, flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 10px' }}>
                                <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                                <input
                                    placeholder="Buscar por producto, código o ingrediente…"
                                    value={q}
                                    onChange={e => setQ(e.target.value)}
                                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                                />
                                <VoiceSearchButton onResult={texto => setQ(texto)} placeholder="Hablar para buscar en catálogo..." />
                            </div>

                            {/* SELECTOR DE MODO DE VISTA Y ACCIONES */}
                            <div className="row gap-sm" style={{ flexWrap: 'wrap' }}>
                                <div style={{ background: '#f1f5f9', borderRadius: 6, padding: 3, display: 'inline-flex' }}>
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        style={{
                                            background: vistaCatalogo === 'grilla' ? '#ffffff' : 'transparent',
                                            fontWeight: vistaCatalogo === 'grilla' ? 700 : 500,
                                            padding: '4px 10px',
                                            fontSize: 12
                                        }}
                                        onClick={() => setVistaCatalogo('grilla')}
                                    >
                                        🔲 Cuadrícula con Fotos
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        style={{
                                            background: vistaCatalogo === 'tabla' ? '#ffffff' : 'transparent',
                                            fontWeight: vistaCatalogo === 'tabla' ? 700 : 500,
                                            padding: '4px 10px',
                                            fontSize: 12
                                        }}
                                        onClick={() => setVistaCatalogo('tabla')}
                                    >
                                        📑 Lista Detallada
                                    </button>
                                </div>

                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => window.print()}
                                    title="Imprimir catálogo completo"
                                >
                                    🖨️ Imprimir
                                </button>
                            </div>
                        </div>

                        {/* CHIPS DE CATEGORÍAS */}
                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin' }}>
                            {CATEGORIAS_CON_ICONO.map(cat => {
                                const isSelected = (cat.nombre === 'Todas' && !categoriaFiltro) || categoriaFiltro.toLowerCase() === cat.nombre.toLowerCase();
                                return (
                                    <button
                                        key={cat.nombre}
                                        type="button"
                                        onClick={() => setCategoriaFiltro(cat.nombre === 'Todas' ? '' : cat.nombre)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 20,
                                            fontSize: 12.5,
                                            fontWeight: isSelected ? 700 : 500,
                                            border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            background: isSelected ? 'var(--color-primary-dark)' : '#ffffff',
                                            color: isSelected ? '#ffffff' : 'var(--color-text)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{cat.icono}</span>
                                        <span>{cat.nombre}</span>
                                        <span style={{
                                            background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                            color: isSelected ? '#ffffff' : '#64748b',
                                            padding: '1px 6px',
                                            borderRadius: 10,
                                            fontSize: 10.5
                                        }}>
                                            {cat.total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* VISTA 1: GRILLA CON FOTOS AUTÉNTICAS EXTRAÍDAS */}
                    {vistaCatalogo === 'grilla' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 16
                        }}>
                            {productosFiltrados.map(p => {
                                const enFlyer = productosSeleccionados.includes(p.id);
                                const catName = p.categoria || p.categoria_nombre || 'General';

                                return (
                                    <div
                                        key={p.id}
                                        className="card"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            border: enFlyer ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                            background: '#FFFFFF'
                                        }}
                                    >
                                        {/* FOTO DEL PRODUCTO EXTRAÍDA DEL PDF O ILUSTRACIÓN */}
                                        <div style={{
                                            height: 180,
                                            background: '#F8F9FA',
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            borderBottom: '1px solid var(--color-border)'
                                        }}>
                                            <img
                                                src={obtenerImagenProducto(p)}
                                                alt={p.nombre}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                                                loading="lazy"
                                                onError={e => {
                                                    e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg';
                                                }}
                                            />

                                            {/* BADGES SUPERPUESTOS */}
                                            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                                                <span className="badge" style={{ background: 'rgba(17, 20, 29, 0.85)', color: '#F5F1E3', fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                                                    {p.codigo || `MP-${p.id}`}
                                                </span>
                                            </div>
                                            <div style={{ position: 'absolute', top: 8, right: 8 }}>
                                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.9)', color: 'var(--color-primary-dark)', fontSize: 10, fontWeight: 700, border: '1px solid #e2e8f0' }}>
                                                    {catName}
                                                </span>
                                            </div>
                                        </div>

                                        {/* CUERPO DE LA TARJETA */}
                                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                            <div>
                                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-primary-dark)', lineHeight: 1.25 }}>
                                                    {p.nombre}
                                                </h3>
                                                {p.descripcion && (
                                                    <p className="muted" style={{ fontSize: 11.5, margin: '0 0 10px', lineHeight: 1.35 }}>
                                                        {p.descripcion}
                                                    </p>
                                                )}

                                                {/* MATRIZ DE ESCALAS MAYORISTAS */}
                                                <div style={{ background: '#FAF8F2', border: '1px solid #ECE8DA', borderRadius: 6, padding: '8px 10px', margin: '8px 0 12px' }}>
                                                    <div className="spread" style={{ fontSize: 12, marginBottom: 4 }}>
                                                        <span className="muted" style={{ fontWeight: 600 }}>Precio Base (x1kg):</span>
                                                        <span className="mono" style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-primary-dark)' }}>
                                                            {fmtMoney(p.precio_venta)}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, fontSize: 11, borderTop: '1px dashed #E2DCC9', paddingTop: 6 }}>
                                                        {Number(p.precio_5kg) > 0 && (
                                                            <div><span className="muted">5kg+:</span> <strong className="mono">{fmtMoney(p.precio_5kg)}</strong></div>
                                                        )}
                                                        {Number(p.precio_10kg) > 0 && (
                                                            <div><span className="muted">10kg+:</span> <strong className="mono">{fmtMoney(p.precio_10kg)}</strong></div>
                                                        )}
                                                        {Number(p.precio_25kg) > 0 && (
                                                            <div><span className="muted">25kg+:</span> <strong className="mono">{fmtMoney(p.precio_25kg)}</strong></div>
                                                        )}
                                                        {Number(p.precio_30kg) > 0 && (
                                                            <div><span className="muted">30kg+:</span> <strong className="mono">{fmtMoney(p.precio_30kg)}</strong></div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BOTONES DE ACCIÓN RÁPIDA */}
                                            <div className="row gap-xs" style={{ marginTop: 'auto' }}>
                                                <a
                                                    href={generarLinkWhatsAppProducto(p)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ flex: 1, justifyContent: 'center', fontSize: 12, color: '#047857', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                                                    title={`Consultar por WhatsApp oficial ${WHATSAPP_OFICIAL}`}
                                                >
                                                    📲 Pedir WA
                                                </a>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${enFlyer ? 'btn-primary' : 'btn-ghost'}`}
                                                    style={{ fontSize: 12, padding: '4px 10px' }}
                                                    onClick={() => toggleSeleccionFlyer(p.id)}
                                                    title="Incluir en el creador de Flyers"
                                                >
                                                    {enFlyer ? '✓ En Flyer' : '+ Flyer'}
                                                </button>
                                                {p.pagina && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ padding: '4px 8px', fontSize: 11 }}
                                                        onClick={() => {
                                                            setPaginaActual(p.pagina);
                                                            setTabActiva('revista');
                                                        }}
                                                        title={`Ver en página ${p.pagina} de la revista`}
                                                    >
                                                        📄 Pág {p.pagina}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* VISTA 2: LISTA / TABLA DE PRECIOS DETALLADA */}
                    {vistaCatalogo === 'tabla' && (
                        <div className="card" style={{ background: '#FFFFFF' }}>
                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 50 }}>Foto</th>
                                            <th>Código</th>
                                            <th>Producto & Detalle</th>
                                            <th>Categoría</th>
                                            <th className="text-right">Precio Base (1kg)</th>
                                            <th className="text-right">Escala 5kg</th>
                                            <th className="text-right">Escala 10kg</th>
                                            <th className="text-right">Escala 25kg</th>
                                            <th className="text-right">Escala 30kg</th>
                                            <th className="text-right no-print">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productosFiltrados.map(p => {
                                            const enFlyer = productosSeleccionados.includes(p.id);

                                            return (
                                                <tr key={p.id}>
                                                    <td style={{ textAlign: 'center', padding: '6px' }}>
                                                        <img
                                                            src={obtenerImagenProducto(p)}
                                                            alt={p.nombre}
                                                            style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                                            onError={e => {
                                                                e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg';
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="mono text-xs">{p.codigo || `MP-${p.id}`}</td>
                                                    <td>
                                                        <strong>{p.nombre}</strong>
                                                        {p.descripcion && <div className="muted text-xs">{p.descripcion}</div>}
                                                    </td>
                                                    <td className="muted text-xs">{p.categoria || p.categoria_nombre || 'General'}</td>
                                                    <td className="text-right mono" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                                        {fmtMoney(p.precio_venta)}
                                                    </td>
                                                    <td className="text-right mono text-xs">{Number(p.precio_5kg) > 0 ? fmtMoney(p.precio_5kg) : '—'}</td>
                                                    <td className="text-right mono text-xs">{Number(p.precio_10kg) > 0 ? fmtMoney(p.precio_10kg) : '—'}</td>
                                                    <td className="text-right mono text-xs">{Number(p.precio_25kg) > 0 ? fmtMoney(p.precio_25kg) : '—'}</td>
                                                    <td className="text-right mono text-xs">{Number(p.precio_30kg) > 0 ? fmtMoney(p.precio_30kg) : '—'}</td>
                                                    <td className="text-right no-print">
                                                        <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                                            <a
                                                                href={generarLinkWhatsAppProducto(p)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-secondary btn-sm"
                                                                style={{ padding: '3px 8px', fontSize: 11, color: '#047857' }}
                                                            >
                                                                📲 WA
                                                            </a>
                                                            <button
                                                                type="button"
                                                                className={`btn btn-sm ${enFlyer ? 'btn-primary' : 'btn-ghost'}`}
                                                                style={{ fontSize: 11, padding: '3px 8px' }}
                                                                onClick={() => toggleSeleccionFlyer(p.id)}
                                                            >
                                                                {enFlyer ? '✓' : '+ Flyer'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: REVISTA DIGITAL OFICIAL (21 PÁGINAS RENDERIZADAS) */}
            {tabActiva === 'revista' && (
                <div className="card card-pad stack gap-md" style={{ background: '#FFFFFF' }}>
                    {/* BARRA DE CONTROL DEL VISOR DE REVISTA */}
                    <div className="spread" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                        <div className="row gap-sm" style={{ alignItems: 'center' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={paginaActual <= 1}
                                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                            >
                                ◀ Anterior
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                Página {paginaActual} de 21
                            </span>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={paginaActual >= 21}
                                onClick={() => setPaginaActual(p => Math.min(21, p + 1))}
                            >
                                Siguiente ▶
                            </button>

                            {/* SELECTOR DESPLEGABLE DE PÁGINAS */}
                            <select
                                value={paginaActual}
                                onChange={e => setPaginaActual(Number(e.target.value))}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                            >
                                {PAGINAS_REVISTA.map(p => (
                                    <option key={p.num} value={p.num}>
                                        {p.titulo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* ACCIONES Y BOTÓN DE DESCARGA */}
                        <div className="row gap-sm">
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setZoomRevista(z => (z === 100 ? 140 : 100))}
                            >
                                🔍 {zoomRevista === 100 ? 'Ampliar (140%)' : 'Normal (100%)'}
                            </button>
                            <a
                                href="/catalogo/pagina_1.jpg"
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                title="Abrir imagen completa"
                            >
                                👁️ Abrir Pantalla Completa
                            </a>
                        </div>
                    </div>

                    {/* SALTO RÁPIDO A SECCIONES DE LA REVISTA */}
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                        {CATEGORIAS_CON_ICONO.filter(c => c.pagina).map(c => (
                            <button
                                key={c.nombre}
                                type="button"
                                onClick={() => setPaginaActual(c.pagina)}
                                className={`btn btn-sm ${paginaActual === c.pagina ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ fontSize: 11.5, padding: '4px 10px', whiteSpace: 'nowrap' }}
                            >
                                {c.icono} {c.nombre} (Pág {c.pagina})
                            </button>
                        ))}
                    </div>

                    {/* CONTENEDOR CENTRAL DE LA PÁGINA DE REVISTA */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: '#334155',
                            padding: 24,
                            borderRadius: 12,
                            overflow: 'auto',
                            minHeight: 640
                        }}
                    >
                        <div style={{ width: `${zoomRevista}%`, maxWidth: zoomRevista === 100 ? 800 : 1100, transition: 'width 0.2s ease' }}>
                            <img
                                src={`/catalogo/pagina_${paginaActual}.jpg`}
                                alt={`Página ${paginaActual} del Catálogo Mix Point`}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    borderRadius: 8,
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    display: 'block'
                                }}
                            />
                        </div>
                    </div>

                    {/* TIRA DE MINIATURAS INFERIOR PARA NAVEGACIÓN VISUAL RÁPIDA */}
                    <div>
                        <p className="text-xs muted" style={{ marginBottom: 8, fontWeight: 600 }}>
                            Navegación visual por hojas (hacé clic en cualquier página para verla):
                        </p>
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10 }}>
                            {PAGINAS_REVISTA.map(p => {
                                const isCur = paginaActual === p.num;
                                return (
                                    <div
                                        key={p.num}
                                        onClick={() => setPaginaActual(p.num)}
                                        style={{
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            textAlign: 'center',
                                            border: isCur ? '2.5px solid var(--color-primary)' : '1px solid #cbd5e1',
                                            borderRadius: 6,
                                            padding: 4,
                                            background: isCur ? '#FEF3C7' : '#FFFFFF',
                                            transition: 'transform 0.1s ease'
                                        }}
                                    >
                                        <img
                                            src={`/catalogo/pagina_${p.num}.jpg`}
                                            alt={`Pág ${p.num}`}
                                            style={{ width: 64, height: 90, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                                        />
                                        <div style={{ fontSize: 10, fontWeight: isCur ? 700 : 500, marginTop: 4, color: isCur ? '#92400E' : '#64748b' }}>
                                            Pág {p.num}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: CREADOR Y PREVISUALIZADOR DE FLYERS */}
            {tabActiva === 'flyer' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 24, alignItems: 'start' }}>
                    {/* PANEL DE CONTROL DE CONFIGURACIÓN */}
                    <div className="card card-pad stack gap-md no-print" style={{ background: '#FFFFFF' }}>
                        <div className="spread">
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Diseño del Flyer</h3>
                            <span className="badge badge-primary">{prodsFlyer.length} de 6 seleccionados</span>
                        </div>

                        <div className="field">
                            <label>Título Principal</label>
                            <input
                                value={flyerTitulo}
                                onChange={e => setFlyerTitulo(e.target.value)}
                                placeholder="Ej: ¡OFERTAS MAYORISTAS DE LA SEMANA!"
                            />
                        </div>

                        <div className="field">
                            <label>Subtítulo / Bajada</label>
                            <input
                                value={flyerSubtitulo}
                                onChange={e => setFlyerSubtitulo(e.target.value)}
                                placeholder="Ej: Precios directos para dietéticas y comercios"
                            />
                        </div>

                        <div className="field">
                            <label>Productos en el Flyer (Elegí hasta 6)</label>
                            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 6, padding: 8 }}>
                                {productos.map(p => (
                                    <label key={p.id} className="row gap-xs text-sm" style={{ padding: '6px 4px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                                        <input
                                            type="checkbox"
                                            checked={productosSeleccionados.includes(p.id)}
                                            onChange={() => toggleSeleccionFlyer(p.id)}
                                        />
                                        <img
                                            src={obtenerImagenProducto(p)}
                                            alt=""
                                            style={{ width: 26, height: 26, objectFit: 'contain', borderRadius: 4, background: '#fff', border: '1px solid #e2e8f0', padding: 1 }}
                                            onError={e => { e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg'; }}
                                        />
                                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.nombre}</span>
                                        <strong className="mono" style={{ fontSize: 12 }}>{fmtMoney(p.precio_venta)}</strong>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="field">
                            <label>Pie de Anuncio</label>
                            <input
                                value={notaPie}
                                onChange={e => setNotaPie(e.target.value)}
                                placeholder="Ej: Envíos a todo el país · Stock asegurado"
                            />
                        </div>

                        <div className="stack gap-xs" style={{ marginTop: 10 }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={copiarTextoWhatsApp}
                                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                            >
                                {copiado ? '✅ ¡Copiado al Portapapeles!' : '📋 Copiar Mensaje para WhatsApp'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => window.print()}
                                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                            >
                                🖨️ Imprimir / Guardar Flyer PDF
                            </button>
                        </div>
                    </div>

                    {/* PREVISUALIZADOR DEL FLYER ESTILO DORADO & MARINO MIX POINT */}
                    <div
                        ref={flyerRef}
                        style={{
                            background: '#11141D',
                            color: '#F5F1E3',
                            borderRadius: 14,
                            padding: '30px 26px',
                            boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                            border: '2px solid #C9A227',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: 560
                        }}
                    >
                        {/* CABECERA FLYER */}
                        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(201, 162, 39, 0.4)', paddingBottom: 16 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <img
                                    src="/logo-mixpoint.png"
                                    alt="Mix Point"
                                    style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #C9A227' }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#C9A227', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
                                        MIX POINT
                                    </div>
                                    <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#ECE8DA' }}>
                                        DISTRIBUIDORA MAYORISTA
                                    </div>
                                </div>
                            </div>
                            <h2 style={{ fontSize: 22, color: '#FFFFFF', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                                {flyerTitulo}
                            </h2>
                            <p style={{ fontSize: 13.5, color: '#C9A227', marginTop: 4 }}>
                                {flyerSubtitulo}
                            </p>
                        </div>

                        {/* PRODUCTOS SELECCIONADOS CON FOTOS AUTÉNTICAS */}
                        <div style={{ display: 'grid', gridTemplateColumns: prodsFlyer.length > 3 ? '1fr 1fr' : '1fr', gap: 12, margin: '20px 0' }}>
                            {prodsFlyer.map(p => (
                                <div
                                    key={p.id}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(201, 162, 39, 0.35)',
                                        borderRadius: 8,
                                        padding: '10px 12px',
                                        display: 'flex',
                                        gap: 10,
                                        alignItems: 'center'
                                    }}
                                >
                                    <img
                                        src={obtenerImagenProducto(p)}
                                        alt={p.nombre}
                                        style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: 2, flexShrink: 0, border: '1px solid #C9A227' }}
                                        onError={e => {
                                            e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg';
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.nombre}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#A9A79B', marginTop: 2 }}>
                                            Por {p.unidad_medida || 'kg'} · Calidad Selección
                                        </div>
                                        {Number(p.precio_10kg) > 0 && (
                                            <div style={{ fontSize: 11, color: '#C9A227', marginTop: 2 }}>
                                                Escala 10kg: {fmtMoney(p.precio_10kg)}/kg
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 9.5, color: '#A9A79B' }}>DESDE</div>
                                        <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: '#C9A227' }}>
                                            {fmtMoney(p.precio_25kg || p.precio_10kg || p.precio_venta)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* PIE DEL FLYER CON WHATSAPP Y ALIAS */}
                        <div style={{ borderTop: '1px solid rgba(201, 162, 39, 0.4)', paddingTop: 14, textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ fontSize: 12 }}>
                                    <span>📲 <strong>Línea Oficial WhatsApp:</strong> </span>
                                    <span className="mono" style={{ color: '#C9A227', fontWeight: 800, fontSize: 14 }}>{WHATSAPP_OFICIAL}</span>
                                </div>
                                <div style={{ fontSize: 12 }}>
                                    <span>💳 <strong>Alias Transferencia:</strong> </span>
                                    <span className="mono" style={{ color: '#C9A227', fontWeight: 800, fontSize: 14, background: 'rgba(201,162,39,0.15)', padding: '2px 8px', borderRadius: 4 }}>
                                        {ALIAS_PAGO}
                                    </span>
                                </div>
                            </div>
                            <p style={{ fontSize: 11, color: '#A9A79B', marginTop: 8, fontStyle: 'italic' }}>
                                {notaPie}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
