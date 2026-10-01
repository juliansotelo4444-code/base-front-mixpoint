import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import VoiceSearchButton from '../components/VoiceSearchButton';
import { IconBuscar, IconFlyer } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export default function CatalogoFlyers() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [q, setQ] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [segmentoFiltro, setSegmentoFiltro] = useState('todos');
    const [tabActiva, setTabActiva] = useState('catalogo'); // 'catalogo' | 'flyer'
    const [loading, setLoading] = useState(true);

    // Estado del Generador de Flyers
    const [flyerTitulo, setFlyerTitulo] = useState('¡OFERTAS MAYORISTAS DE LA SEMANA!');
    const [flyerSubtitulo, setFlyerSubtitulo] = useState('Precios directos para dietéticas, comercios y distribuidores');
    const [productosSeleccionados, setProductosSeleccionados] = useState([]);
    const [notaPie, setNotaPie] = useState('Precios netos por bulto cerrado · Envíos a todo el país · Stock asegurado');
    const [copiado, setCopiado] = useState(false);

    const flyerRef = useRef(null);

    useEffect(() => {
        Promise.all([
            client.get('/productos', { params: { activo: 1 } }),
            client.get('/categorias-producto').catch(() => ({ data: [] }))
        ]).then(([pRes, cRes]) => {
            setProductos(pRes.data || []);
            setCategorias(cRes.data || []);
            // Pre-seleccionar 3 productos para el flyer
            if (pRes.data && pRes.data.length >= 3) {
                setProductosSeleccionados(pRes.data.slice(0, 3).map(p => p.id));
            }
        }).finally(() => setLoading(false));
    }, []);

    const productosFiltrados = productos.filter(p => {
        const matchesQ = !q || p.nombre.toLowerCase().includes(q.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(q.toLowerCase()));
        const matchesCat = !categoriaFiltro || String(p.categoria_id) === String(categoriaFiltro);
        return matchesQ && matchesCat;
    });

    const prodsFlyer = productos.filter(p => productosSeleccionados.includes(p.id));

    function copiarTextoWhatsApp() {
        let texto = `🌰 *DISTRIBUIDORA MIX POINT — ${flyerTitulo.toUpperCase()}*\n`;
        texto += `_${flyerSubtitulo}_\n\n`;
        texto += `📦 *PRODUCTOS DESTACADOS:*\n`;
        prodsFlyer.forEach(p => {
            texto += `• *${p.nombre}* (${p.unidad_medida || 'kg'})\n`;
            if (Number(p.precio_venta) > 0) texto += `   - Precio base: ${fmtMoney(p.precio_venta)}\n`;
            if (Number(p.precio_5kg) > 0) texto += `   - Escala 5kg+: ${fmtMoney(p.precio_5kg)}/kg\n`;
            if (Number(p.precio_10kg) > 0) texto += `   - Escala 10kg+: ${fmtMoney(p.precio_10kg)}/kg\n`;
            if (Number(p.precio_25kg) > 0) texto += `   - Bulto 25kg+: ${fmtMoney(p.precio_25kg)}/kg\n`;
            if (Number(p.precio_30kg) > 0) texto += `   - Bulto 30kg+: ${fmtMoney(p.precio_30kg)}/kg\n`;
        });
        texto += `\n💳 *Datos de transferencia:* Alias: *mixpoint2026*\n`;
        texto += `📲 *Pedidos y consultas al WhatsApp oficial:* 1167873243\n`;
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
                alert('Podés seleccionar hasta 6 productos para el flyer.');
                return;
            }
            setProductosSeleccionados([...productosSeleccionados, id]);
        }
    }

    function imprimirFlyer() {
        window.print();
    }

    if (loading) return <div style={{ padding: 32, textAlign: 'center' }}><p className="muted">Cargando catálogo...</p></div>;

    return (
        <div className="stack gap-lg">
            <div className="spread page-header no-print">
                <div>
                    <h1 style={{ fontSize: 26 }}>Catálogo Digital y Flyers</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Generación automática de listas de precios y piezas de difusión para WhatsApp · Mix Point
                    </p>
                </div>
                <div className="row gap-sm">
                    <div style={{ background: '#ECE8DA', borderRadius: 8, padding: 3, display: 'inline-flex' }}>
                        <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                                background: tabActiva === 'catalogo' ? '#FFFFFF' : 'transparent',
                                color: tabActiva === 'catalogo' ? 'var(--color-text)' : 'var(--color-text-muted)',
                                borderRadius: 6
                            }}
                            onClick={() => setTabActiva('catalogo')}
                        >
                            📋 Lista de Precios Mayorista
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                                background: tabActiva === 'flyer' ? '#FFFFFF' : 'transparent',
                                color: tabActiva === 'flyer' ? 'var(--color-text)' : 'var(--color-text-muted)',
                                borderRadius: 6
                            }}
                            onClick={() => setTabActiva('flyer')}
                        >
                            <IconFlyer style={{ width: 14, height: 14 }} /> Creador de Flyers Mix Point
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB 1: CATÁLOGO DIGITAL COMPLETO */}
            {tabActiva === 'catalogo' && (
                <div className="card" style={{ background: '#FFFFFF' }}>
                    <div className="spread no-print" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 12 }}>
                        <div className="row gap-sm" style={{ maxWidth: 420, flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 10px' }}>
                            <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            <input
                                placeholder="Buscar producto o código..."
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                            />
                            <VoiceSearchButton onResult={texto => setQ(texto)} placeholder="Hablar para buscar productos..." />
                        </div>
                        <div className="row gap-sm">
                            <select
                                value={categoriaFiltro}
                                onChange={e => setCategoriaFiltro(e.target.value)}
                                style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                            <select
                                value={segmentoFiltro}
                                onChange={e => setSegmentoFiltro(e.target.value)}
                                style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                            >
                                <option value="todos">Segmento: Todos</option>
                                <option value="Comercio">Segmento: Comercio</option>
                                <option value="Dietética">Segmento: Dietética</option>
                                <option value="Mayorista">Segmento: Mayorista</option>
                                <option value="Particular">Segmento: Particular</option>
                            </select>
                            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                                🖨️ Imprimir Catálogo
                            </button>
                        </div>
                    </div>

                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th>Categoría</th>
                                    <th className="text-right">Precio Base (1-5kg)</th>
                                    <th className="text-right">Escala 5kg</th>
                                    <th className="text-right">Escala 10kg</th>
                                    <th className="text-right">Escala 25kg</th>
                                    <th className="text-right">Escala 30kg</th>
                                    <th className="text-right no-print">Flyer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productosFiltrados.map(p => {
                                    const enFlyer = productosSeleccionados.includes(p.id);

                                    return (
                                        <tr key={p.id}>
                                            <td className="mono text-xs">{p.codigo || `MP-${p.id}`}</td>
                                            <td><strong>{p.nombre}</strong></td>
                                            <td className="muted text-xs">{p.categoria_nombre || 'General'}</td>
                                            <td className="text-right mono" style={{ fontWeight: 600 }}>{fmtMoney(p.precio_venta)}</td>
                                            <td className="text-right mono text-xs">{Number(p.precio_5kg) > 0 ? fmtMoney(p.precio_5kg) : '—'}</td>
                                            <td className="text-right mono text-xs">{Number(p.precio_10kg) > 0 ? fmtMoney(p.precio_10kg) : '—'}</td>
                                            <td className="text-right mono text-xs">{Number(p.precio_25kg) > 0 ? fmtMoney(p.precio_25kg) : '—'}</td>
                                            <td className="text-right mono text-xs">{Number(p.precio_30kg) > 0 ? fmtMoney(p.precio_30kg) : '—'}</td>
                                            <td className="text-right no-print">
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${enFlyer ? 'btn-primary' : 'btn-secondary'}`}
                                                    style={{ fontSize: 11, padding: '3px 8px' }}
                                                    onClick={() => toggleSeleccionFlyer(p.id)}
                                                >
                                                    {enFlyer ? '✓ En Flyer' : '+ Añadir'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: CREADOR Y PREVISUALIZADOR DE FLYERS */}
            {tabActiva === 'flyer' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20 }}>
                    {/* PANEL DE CONTROL DE CONFIGURACIÓN */}
                    <div className="card card-pad stack gap-md no-print" style={{ background: '#FFFFFF' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Personalización del Flyer</h3>

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
                            <label>Productos en el Flyer ({productosSeleccionados.length}/6 seleccionados)</label>
                            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 6, padding: 8 }}>
                                {productos.map(p => (
                                    <label key={p.id} className="row gap-xs text-sm" style={{ padding: '4px 0', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={productosSeleccionados.includes(p.id)}
                                            onChange={() => toggleSeleccionFlyer(p.id)}
                                        />
                                        <span>{p.nombre} ({fmtMoney(p.precio_venta)})</span>
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
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                {copiado ? '✅ ¡Copiado al Portapapeles!' : '📋 Copiar Mensaje para WhatsApp'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={imprimirFlyer}
                                style={{ width: '100%', justifyContent: 'center' }}
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
                            borderRadius: 12,
                            padding: '28px 24px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                            border: '2px solid #C9A227',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: 520
                        }}
                    >
                        {/* CABECERA FLYER */}
                        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(201, 162, 39, 0.4)', paddingBottom: 16 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <img
                                    src="/logo-mixpoint.png"
                                    alt="Mix Point"
                                    style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #C9A227' }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A227', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
                                        MIX POINT
                                    </div>
                                    <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#ECE8DA' }}>
                                        DISTRIBUIDORA MAYORISTA
                                    </div>
                                </div>
                            </div>
                            <h2 style={{ fontSize: 22, color: '#FFFFFF', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                {flyerTitulo}
                            </h2>
                            <p style={{ fontSize: 13, color: '#C9A227', marginTop: 4 }}>
                                {flyerSubtitulo}
                            </p>
                        </div>

                        {/* PRODUCTOS SELECCIONADOS */}
                        <div style={{ display: 'grid', gridTemplateColumns: prodsFlyer.length > 3 ? '1fr 1fr' : '1fr', gap: 12, margin: '20px 0' }}>
                            {prodsFlyer.map(p => (
                                <div
                                    key={p.id}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(201, 162, 39, 0.3)',
                                        borderRadius: 8,
                                        padding: '12px 14px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>{p.nombre}</div>
                                        <div style={{ fontSize: 11, color: '#A9A79B', marginTop: 2 }}>
                                            Fraccionado por {p.unidad_medida || 'kg'} · Calidad Selección
                                        </div>
                                        {Number(p.precio_10kg) > 0 && (
                                            <div style={{ fontSize: 11, color: '#C9A227', marginTop: 2 }}>
                                                Escala 10kg: {fmtMoney(p.precio_10kg)}/kg
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 11, color: '#A9A79B' }}>DESDE</div>
                                        <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: '#C9A227' }}>
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
                                    <span>📲 <strong>WhatsApp Oficial:</strong> </span>
                                    <span className="mono" style={{ color: '#C9A227', fontWeight: 700, fontSize: 14 }}>1167873243</span>
                                </div>
                                <div style={{ fontSize: 12 }}>
                                    <span>💳 <strong>Alias Transferencia:</strong> </span>
                                    <span className="mono" style={{ color: '#C9A227', fontWeight: 700, fontSize: 14, background: 'rgba(201,162,39,0.15)', padding: '2px 8px', borderRadius: 4 }}>mixpoint2026</span>
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
