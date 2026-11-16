import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconBuscar, IconPlus, IconCheck, IconEditar, IconClose } from '../components/Icons';
import { obtenerImagenProducto } from '../utils/imagenProducto';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const BADGES_PRESET = [
    '🔥 OFERTA',
    '⭐ MÁS VENDIDO',
    '✨ SELECCIÓN',
    '📦 BULTO MAYORISTA',
    '🌱 NATURAL',
    '💥 SÚPER PRECIO',
    '🏷️ IMPERDIBLE',
    '🥑 FAVORITO'
];

export default function CarruselOfertas() {
    const [carrusel, setCarrusel] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null);
    const [mensajeExito, setMensajeExito] = useState('');
    const [error, setError] = useState('');

    // Modal para agregar productos
    const [modalAgregar, setModalAgregar] = useState(false);
    const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [loadingBusqueda, setLoadingBusqueda] = useState(false);

    // Cargar productos en el carrusel
    async function cargarCarrusel() {
        setLoading(true);
        setError('');
        try {
            const { data } = await client.get('/carrusel-ofertas');
            setCarrusel(data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al cargar los productos del carrusel.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarCarrusel();
    }, []);

    // Cargar productos del catálogo para el buscador del modal
    async function cargarDisponibles(q = '') {
        setLoadingBusqueda(true);
        try {
            const { data } = await client.get('/carrusel-ofertas/disponibles', {
                params: { q: q || undefined }
            });
            setProductosDisponibles(data || []);
        } catch (err) {
            console.error('Error al buscar productos disponibles:', err);
        } finally {
            setLoadingBusqueda(false);
        }
    }

    function abrirModalAgregar() {
        setBusquedaCatalogo('');
        setModalAgregar(true);
        cargarDisponibles('');
    }

    useEffect(() => {
        if (!modalAgregar) return;
        const timer = setTimeout(() => {
            cargarDisponibles(busquedaCatalogo);
        }, 300);
        return () => clearTimeout(timer);
    }, [busquedaCatalogo, modalAgregar]);

    // Agregar producto al carrusel
    async function agregarAlCarrusel(prod) {
        try {
            await client.post('/carrusel-ofertas/agregar', {
                producto_id: prod.id,
                badge_carrusel: '🔥 OFERTA'
            });
            setMensajeExito(`✅ "${prod.nombre}" agregado al carrusel de inicio.`);
            setTimeout(() => setMensajeExito(''), 4000);
            cargarCarrusel();
            // Actualizar estado local en la lista de búsqueda
            setProductosDisponibles(prev => prev.map(p => p.id === prod.id ? { ...p, destacado_carrusel: true } : p));
        } catch (err) {
            alert(err.response?.data?.error || 'No se pudo agregar el producto al carrusel.');
        }
    }

    // Quitar producto del carrusel
    async function quitarDelCarrusel(prod) {
        if (!window.confirm(`¿Quitar "${prod.nombre}" del carrusel de ofertas de la página de inicio?`)) return;
        try {
            await client.post('/carrusel-ofertas/quitar', { producto_id: prod.id });
            setMensajeExito(`Se quitó "${prod.nombre}" del carrusel.`);
            setTimeout(() => setMensajeExito(''), 4000);
            setCarrusel(prev => prev.filter(p => p.id !== prod.id));
        } catch (err) {
            alert(err.response?.data?.error || 'Error al quitar el producto.');
        }
    }

    // Guardar configuración modificada de un producto
    async function guardarItem(item) {
        setGuardandoId(item.id);
        try {
            await client.put(`/carrusel-ofertas/${item.id}`, {
                badge_carrusel: item.badge_carrusel,
                orden_carrusel: Number(item.orden_carrusel) || 0,
                precio_oferta: item.precio_oferta ? Number(item.precio_oferta) : null
            });
            setMensajeExito(`✅ Cambios guardados para "${item.nombre}".`);
            setTimeout(() => setMensajeExito(''), 3000);
        } catch (err) {
            alert(err.response?.data?.error || 'Error al guardar los cambios.');
        } finally {
            setGuardandoId(null);
        }
    }

    // Modificar campo local en el estado del carrusel
    function actualizarLocal(id, campo, valor) {
        setCarrusel(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
    }

    // Mover orden arriba / abajo
    async function moverOrden(index, direccion) {
        const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;
        if (nuevoIndex < 0 || nuevoIndex >= carrusel.length) return;

        const copia = [...carrusel];
        const temp = copia[index];
        copia[index] = copia[nuevoIndex];
        copia[nuevoIndex] = temp;

        // Reasignar orden 1, 2, 3...
        const ordenesActualizados = copia.map((p, idx) => ({ id: p.id, orden: idx + 1 }));
        setCarrusel(copia.map((p, idx) => ({ ...p, orden_carrusel: idx + 1 })));

        try {
            await client.post('/carrusel-ofertas/reordenar', { ordenes: ordenesActualizados });
        } catch (err) {
            console.error('Error al actualizar orden:', err);
            cargarCarrusel();
        }
    }

    return (
        <div className="stack gap-lg">
            {/* CABECERA */}
            <div className="spread page-header">
                <div>
                    <div className="row gap-xs" style={{ alignItems: 'center' }}>
                        <h1 style={{ fontSize: 26, margin: 0 }}>🔥 Carrusel de Ofertas y Destacados</h1>
                        <span className="badge badge-accent" style={{ fontSize: 12 }}>Tienda Web</span>
                    </div>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Administrá qué productos, precios promocionales y etiquetas destacadas aparecen en el carrusel de inicio de <strong>distribuidora-mix-point.com.ar</strong>.
                    </p>
                </div>
                <div className="row gap-sm">
                    <a
                        href="https://distribuidora-mix-point.com.ar"
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: 13 }}
                        title="Ver la tienda online en vivo"
                    >
                        🌐 Ver Tienda en Vivo
                    </a>
                    <button
                        className="btn btn-primary"
                        onClick={abrirModalAgregar}
                        style={{ fontSize: 13.5, fontWeight: 600 }}
                    >
                        <IconPlus /> Agregar producto al carrusel
                    </button>
                </div>
            </div>

            {/* BANNERS DE MENSAJES */}
            {mensajeExito && (
                <div className="alert-banner" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                    {mensajeExito}
                </div>
            )}
            {error && (
                <div className="alert-banner error">
                    {error}
                </div>
            )}

            {/* RESUMEN RÁPIDO */}
            <div style={{
                background: '#fafaf9',
                border: '1px solid #e7e5e4',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 22 }}>🎠</div>
                    <div>
                        <strong style={{ fontSize: 14, color: '#292524' }}>
                            {carrusel.length} productos activos en el carrusel
                        </strong>
                        <div style={{ fontSize: 12, color: '#78716c' }}>
                            Se muestran automáticamente en el slider continuo de la Home con precio mayorista oficial.
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={cargarCarrusel}
                        disabled={loading}
                        title="Recargar datos desde la base"
                    >
                        🔄 Recargar lista
                    </button>
                </div>
            </div>

            {/* LISTADO DE PRODUCTOS EN EL CARRUSEL */}
            {loading ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: '#78716c' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                    Cargando productos del carrusel...
                </div>
            ) : carrusel.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🥜</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>El carrusel no tiene productos activos</h3>
                    <p style={{ color: '#78716c', maxWidth: 440, margin: '8px auto 20px' }}>
                        Seleccioná los frutos secos y mixes que más rotan para destacarlos en la portada de la tienda.
                    </p>
                    <button className="btn btn-primary" onClick={abrirModalAgregar}>
                        <IconPlus /> Agregar primer producto
                    </button>
                </div>
            ) : (
                <div className="stack gap-md">
                    {carrusel.map((item, index) => {
                        const esPrimero = index === 0;
                        const esUltimo = index === carrusel.length - 1;
                        const precioBase = Number(item.precio_venta) || 0;
                        const precioPromo = Number(item.precio_oferta) || 0;
                        const tieneDescuento = precioPromo > 0 && precioPromo < precioBase;
                        const pctDescuento = tieneDescuento ? Math.round(((precioBase - precioPromo) / precioBase) * 100) : null;

                        return (
                            <div
                                key={item.id}
                                className="card"
                                style={{
                                    padding: '16px 20px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s ease',
                                    background: '#ffffff'
                                }}
                            >
                                <div className="carrusel-card-row">
                                    {/* ORDEN Y BOTONES ARRIBA / ABAJO */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => moverOrden(index, 'arriba')}
                                            disabled={esPrimero}
                                            style={{ padding: '2px 6px', height: 22, opacity: esPrimero ? 0.3 : 1 }}
                                            title="Subir posición"
                                        >
                                            ▲
                                        </button>
                                        <span style={{ fontWeight: 800, fontSize: 14, color: '#047857' }}>
                                            #{index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => moverOrden(index, 'abajo')}
                                            disabled={esUltimo}
                                            style={{ padding: '2px 6px', height: 22, opacity: esUltimo ? 0.3 : 1 }}
                                            title="Bajar posición"
                                        >
                                            ▼
                                        </button>
                                    </div>

                                    {/* FOTO DE PORTADA */}
                                    <div style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: 8,
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                    }}>
                                        <img
                                            src={obtenerImagenProducto(item)}
                                            alt={item.nombre}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            onError={(e) => { e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg'; }}
                                        />
                                    </div>

                                    {/* DATOS DEL PRODUCTO */}
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                                                {item.nombre}
                                            </span>
                                            <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                                                {item.codigo || `MP-${item.id}`}
                                            </span>
                                        </div>
                                        <div className="muted text-xs" style={{ marginTop: 3 }}>
                                            Categoría: <strong>{item.categoria_nombre}</strong> · Stock disp: <strong className="mono">{item.stock_actual} {item.unidad_medida}</strong>
                                        </div>
                                        {/* Escalas mayoristas cargadas */}
                                        <div className="mono text-xs" style={{ color: '#64748b', marginTop: 4, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                            5k: {item.precio_5kg > 0 ? fmtMoney(item.precio_5kg) : '—'} · 10k: {item.precio_10kg > 0 ? fmtMoney(item.precio_10kg) : '—'} · 25k: {item.precio_25kg > 0 ? fmtMoney(item.precio_25kg) : '—'}
                                        </div>
                                    </div>

                                    {/* ETIQUETA / BADGE */}
                                    <div className="carrusel-col-badge">
                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                                            🏷️ ETIQUETA DESTACADA
                                        </label>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                value={item.badge_carrusel || ''}
                                                onChange={(e) => actualizarLocal(item.id, 'badge_carrusel', e.target.value)}
                                                placeholder="Ej: 🔥 OFERTA"
                                                style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', width: 130 }}
                                            />
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) actualizarLocal(item.id, 'badge_carrusel', e.target.value);
                                                }}
                                                value=""
                                                style={{ fontSize: 11, padding: '4px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                                title="Elegir etiqueta sugerida"
                                            >
                                                <option value="">Presets...</option>
                                                {BADGES_PRESET.map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* PRECIOS: BASE vs PROMOCIÓN */}
                                    <div className="carrusel-col-price">
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>
                                            Precio base: <strong className="mono">{fmtMoney(precioBase)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>
                                                Oferta $:
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Opcional"
                                                value={item.precio_oferta || ''}
                                                onChange={(e) => actualizarLocal(item.id, 'precio_oferta', e.target.value)}
                                                style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', width: 95 }}
                                            />
                                        </div>
                                        {tieneDescuento && (
                                            <span className="badge badge-success" style={{ fontSize: 10, marginTop: 3 }}>
                                                -{pctDescuento}% de descuento
                                            </span>
                                        )}
                                    </div>

                                    {/* ACCIONES GUARDAR / QUITAR */}
                                    <div className="carrusel-col-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => guardarItem(item)}
                                            disabled={guardandoId === item.id}
                                            style={{ fontSize: 12, padding: '6px 12px' }}
                                            title="Guardar badge y precio de este producto"
                                        >
                                            {guardandoId === item.id ? '⏳' : <IconCheck />} Guardar
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => quitarDelCarrusel(item)}
                                            style={{ color: '#ef4444', padding: '6px 8px' }}
                                            title="Quitar este producto del carrusel"
                                        >
                                            <IconClose />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL PARA AGREGAR PRODUCTOS DESDE EL CATÁLOGO */}
            {modalAgregar && (
                <Modal title="Agregar producto al carrusel de inicio" onClose={() => setModalAgregar(false)} width={640}>
                    <div className="stack gap-md">
                        <div className="row gap-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px' }}>
                            <IconBuscar style={{ color: '#94a3b8' }} />
                            <input
                                autoFocus
                                placeholder="Buscar en el catálogo por nombre o código..."
                                value={busquedaCatalogo}
                                onChange={(e) => setBusquedaCatalogo(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 14 }}
                            />
                        </div>

                        {loadingBusqueda ? (
                            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                Buscando productos...
                            </div>
                        ) : (
                            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {productosDisponibles.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                        No se encontraron productos con ese término.
                                    </div>
                                ) : (
                                    productosDisponibles.map(p => {
                                        const yaEnCarrusel = carrusel.some(c => c.id === p.id) || p.destacado_carrusel;

                                        return (
                                            <div
                                                key={p.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 14px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: 8,
                                                    background: yaEnCarrusel ? '#f1f5f9' : '#ffffff'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <img
                                                        src={obtenerImagenProducto(p)}
                                                        alt={p.nombre}
                                                        style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                                        onError={(e) => { e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg'; }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>
                                                            {p.nombre}
                                                        </div>
                                                        <div className="muted text-xs">
                                                            {p.categoria_nombre} · Stock: {p.stock_actual} {p.unidad_medida} · Base: <strong className="mono">{fmtMoney(p.precio_venta)}</strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    {yaEnCarrusel ? (
                                                        <span className="badge badge-success" style={{ fontSize: 11 }}>
                                                            ✓ En el carrusel
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => agregarAlCarrusel(p)}
                                                            style={{ fontSize: 12 }}
                                                        >
                                                            <IconPlus /> Agregar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalAgregar(false)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
