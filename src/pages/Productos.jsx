import { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ImageFinderModal from '../components/ImageFinderModal';
import VoiceSearchButton from '../components/VoiceSearchButton';
import { IconPlus, IconBuscar, IconEditar } from '../components/Icons';
import { obtenerImagenProducto } from '../utils/imagenProducto';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const emptyForm = {
    codigo: '',
    nombre: '',
    descripcion: '',
    imagen: '',
    categoria_id: '',
    unidad_medida: 'kg',
    precio_compra: 0,
    precio_venta: 0,
    precio_5kg: 0,
    precio_10kg: 0,
    precio_25kg: 0,
    precio_30kg: 0,
    stock_minimo: 20,
    destacado_carrusel: false,
    badge_carrusel: '🔥 OFERTA',
    precio_oferta: ''
};

// Comprime y redimensiona imágenes del lado del cliente para carga rápida y óptimo almacenamiento
function comprimirImagen(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

export default function Productos() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [q, setQ] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [soloBajoStock, setSoloBajoStock] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [ajusteProducto, setAjusteProducto] = useState(null);
    const [ajusteCantidad, setAjusteCantidad] = useState('');
    const [ajusteMotivo, setAjusteMotivo] = useState('');
    const [ajusteLoteId, setAjusteLoteId] = useState('');
    const [ajusteLotesDisponibles, setAjusteLotesDisponibles] = useState([]);
    const [ajusteVencimiento, setAjusteVencimiento] = useState('');
    const [verPreciosId, setVerPreciosId] = useState(null);
    const [subiendoImagen, setSubiendoImagen] = useState(false);
    const [finderOpen, setFinderOpen] = useState(false);
    const [editingPriceId, setEditingPriceId] = useState(null);
    const [editingPriceValue, setEditingPriceValue] = useState('');
    const [savingPriceId, setSavingPriceId] = useState(null);
    const [productoAEliminar, setProductoAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [ordenCampo, setOrdenCampo] = useState('nombre'); // 'nombre', 'precio_venta', 'stock_actual', 'codigo', 'categoria', 'precio_compra'
    const [ordenDir, setOrdenDir] = useState('asc'); // 'asc', 'desc'

    function cambiarOrden(campo) {
        if (ordenCampo === campo) {
            setOrdenDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setOrdenCampo(campo);
            setOrdenDir('asc');
        }
    }

    function renderSortIndicator(campo) {
        if (ordenCampo !== campo) {
            return <span style={{ opacity: 0.35, marginLeft: 4, fontSize: 10 }}>↕</span>;
        }
        return (
            <span style={{ color: 'var(--color-primary-dark)', marginLeft: 5, fontSize: 11, fontWeight: 900 }}>
                {ordenDir === 'asc' ? '▲' : '▼'}
            </span>
        );
    }

    const productosProcesados = useMemo(() => {
        const list = [...productos];
        list.sort((a, b) => {
            if (ordenCampo === 'nombre') {
                const valA = (a.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                const valB = (b.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                return ordenDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (ordenCampo === 'codigo') {
                const valA = (a.codigo || '').toLowerCase().trim();
                const valB = (b.codigo || '').toLowerCase().trim();
                return ordenDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (ordenCampo === 'categoria') {
                const valA = (a.categoria_nombre || '').toLowerCase().trim();
                const valB = (b.categoria_nombre || '').toLowerCase().trim();
                return ordenDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (ordenCampo === 'precio_venta') {
                const numA = Number(a.precio_venta) || 0;
                const numB = Number(b.precio_venta) || 0;
                return ordenDir === 'asc' ? numA - numB : numB - numA;
            }
            if (ordenCampo === 'stock_actual') {
                const numA = Number(a.stock_actual) || 0;
                const numB = Number(b.stock_actual) || 0;
                return ordenDir === 'asc' ? numA - numB : numB - numA;
            }
            if (ordenCampo === 'precio_compra') {
                const numA = Number(a.precio_compra) || 0;
                const numB = Number(b.precio_compra) || 0;
                return ordenDir === 'asc' ? numA - numB : numB - numA;
            }
            return 0;
        });
        return list;
    }, [productos, ordenCampo, ordenDir]);

    function confirmarEliminar(p) {
        setProductoAEliminar(p);
    }

    async function ejecutarEliminar() {
        if (!productoAEliminar) return;
        setEliminando(true);
        try {
            await client.delete(`/productos/${productoAEliminar.id}`);
            setProductoAEliminar(null);
            setModalOpen(false);
            await cargar();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al eliminar el producto.');
        } finally {
            setEliminando(false);
        }
    }

    async function guardarPrecioRapido(id) {
        const nuevoPrecio = Number(editingPriceValue);
        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) return;
        setSavingPriceId(id);
        try {
            const pActual = productos.find(p => p.id === id);
            await client.put(`/productos/${id}`, {
                ...pActual,
                precio_venta: nuevoPrecio
            });
            setProductos(prev => prev.map(p => p.id === id ? { ...p, precio_venta: nuevoPrecio } : p));
            setEditingPriceId(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Error al actualizar el precio.');
        } finally {
            setSavingPriceId(null);
        }
    }

    function autocalcularEscalas() {
        const base = Number(form.precio_venta) || 0;
        if (base <= 0) {
            alert('Por favor ingresá primero un Precio 1 kg (Base) válido.');
            return;
        }
        // Redondeo a múltiplos de $10: -5% para 5kg, -10% para 10kg, -15% para 25kg, -18% para 30kg
        const p5 = Math.round((base * 0.95) / 10) * 10;
        const p10 = Math.round((base * 0.90) / 10) * 10;
        const p25 = Math.round((base * 0.85) / 10) * 10;
        const p30 = Math.round((base * 0.82) / 10) * 10;

        setForm(prev => ({
            ...prev,
            precio_5kg: p5,
            precio_10kg: p10,
            precio_25kg: p25,
            precio_30kg: p30
        }));
    }

    async function manejarArchivoImagen(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setSubiendoImagen(true);
        setError('');
        try {
            const dataUrl = await comprimirImagen(file);
            setForm(prev => ({ ...prev, imagen: dataUrl }));
        } catch (err) {
            setError(err.message || 'Error al procesar la imagen seleccionada');
        } finally {
            setSubiendoImagen(false);
            e.target.value = '';
        }
    }

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/productos', {
            params: {
                q: q || undefined,
                categoria_id: categoriaFiltro || undefined,
                activo: 1,
                bajo_stock: soloBajoStock ? 1 : undefined
            }
        });
        setProductos(data);
        setLoading(false);
    }

    async function cargarCategorias() {
        const { data } = await client.get('/productos/categorias');
        setCategorias(data);
    }

    useEffect(() => { cargarCategorias(); }, []);
    useEffect(() => {
        const t = setTimeout(cargar, 250);
        return () => clearTimeout(t);
    }, [q, categoriaFiltro, soloBajoStock]);

    function abrirNuevo() {
        setEditando(null);
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    }

    function abrirEditar(p) {
        setEditando(p);
        setForm({
            ...emptyForm,
            ...p,
            imagen: p.imagen || '',
            categoria_id: p.categoria_id || '',
            precio_compra: Number(p.precio_compra) || 0,
            precio_venta: Number(p.precio_venta) || 0,
            precio_5kg: Number(p.precio_5kg) || 0,
            precio_10kg: Number(p.precio_10kg) || 0,
            precio_25kg: Number(p.precio_25kg) || 0,
            precio_30kg: Number(p.precio_30kg) || 0,
            stock_minimo: Number(p.stock_minimo) || 0,
            destacado_carrusel: Boolean(p.destacado_carrusel),
            badge_carrusel: p.badge_carrusel || '🔥 OFERTA',
            precio_oferta: p.precio_oferta ? Number(p.precio_oferta) : ''
        });
        setError('');
        setModalOpen(true);
    }

    async function guardar(e) {
        e.preventDefault();
        setError('');
        try {
            const payload = {
                ...form,
                categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
                precio_compra: Number(form.precio_compra) || 0,
                precio_venta: Number(form.precio_venta) || 0,
                precio_5kg: Number(form.precio_5kg) || 0,
                precio_10kg: Number(form.precio_10kg) || 0,
                precio_25kg: Number(form.precio_25kg) || 0,
                precio_30kg: Number(form.precio_30kg) || 0,
                stock_minimo: Number(form.stock_minimo) || 0,
                destacado_carrusel: Boolean(form.destacado_carrusel),
                badge_carrusel: form.badge_carrusel || '🔥 OFERTA',
                precio_oferta: form.precio_oferta ? Number(form.precio_oferta) : null,
            };
            if (editando) await client.put(`/productos/${editando.id}`, payload);
            else await client.post('/productos', payload);
            setModalOpen(false);
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el producto.');
        }
    }

    async function abrirAjuste(p) {
        setAjusteProducto(p);
        setAjusteCantidad('');
        setAjusteMotivo('');
        setAjusteLoteId('');
        setAjusteVencimiento('');
        setAjusteLotesDisponibles([]);
        try {
            const { data } = await client.get(`/productos/${p.id}`);
            setAjusteLotesDisponibles(data.lotes || []);
        } catch (err) {
            setAjusteLotesDisponibles([]);
        }
    }

    async function guardarAjuste(e) {
        e.preventDefault();
        const cantidad = Number(ajusteCantidad);
        if (!cantidad) return;
        await client.post(`/productos/${ajusteProducto.id}/ajuste-stock`, {
            cantidad,
            motivo: ajusteMotivo || 'Ajuste manual',
            lote_id: ajusteLoteId || null,
            fecha_vencimiento: ajusteVencimiento || null
        });
        setAjusteProducto(null);
        setAjusteCantidad('');
        setAjusteMotivo('');
        cargar();
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Catálogo de productos y stock</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        {productos.length} productos en catálogo · Distribuidora Mix Point
                    </p>
                </div>
                <div className="row gap-sm">
                    <button className="btn btn-primary" onClick={abrirNuevo} style={{ fontSize: 14 }}>
                        <IconPlus /> Nuevo producto
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 12 }}>
                    <div className="row gap-sm" style={{ maxWidth: 420, flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 10px' }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input
                            placeholder="Buscar por nombre o código…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                        />
                        <VoiceSearchButton onResult={texto => setQ(texto)} placeholder="Hablar para buscar productos..." />
                    </div>
                    <div className="row gap-sm" style={{ flexWrap: 'wrap' }}>
                        <select
                            value={`${ordenCampo}_${ordenDir}`}
                            onChange={e => {
                                const parts = e.target.value.split('_');
                                const dir = parts.pop();
                                const campo = parts.join('_');
                                setOrdenCampo(campo);
                                setOrdenDir(dir);
                            }}
                            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13, background: 'var(--color-surface)', fontWeight: 600 }}
                            title="Ordenar productos"
                        >
                            <option value="nombre_asc">🔤 Nombre: A → Z (Alfabético)</option>
                            <option value="nombre_desc">🔤 Nombre: Z → A</option>
                            <option value="precio_venta_asc">💰 Precio: Menor a Mayor</option>
                            <option value="precio_venta_desc">💰 Precio: Mayor a Menor</option>
                            <option value="stock_actual_asc">📦 Stock: Menor a Mayor</option>
                            <option value="stock_actual_desc">📦 Stock: Mayor a Menor</option>
                            <option value="codigo_asc">🏷️ Código: A → Z</option>
                            <option value="categoria_asc">📂 Categoría: A → Z</option>
                        </select>
                        <select
                            value={categoriaFiltro}
                            onChange={e => setCategoriaFiltro(e.target.value)}
                            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                        >
                            <option value="">Todas las categorías ({categorias.length})</option>
                            {categorias.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                        <label className="row gap-xs text-sm" style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={soloBajoStock} onChange={e => setSoloBajoStock(e.target.checked)} />
                            <span>Solo stock bajo mínimo</span>
                        </label>
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: 'center' }}>#</th>
                                <th style={{ width: 44, textAlign: 'center' }}>Foto</th>
                                <th 
                                    className="col-codigo"
                                    onClick={() => cambiarOrden('codigo')}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    title="Ordenar por Código"
                                >
                                    Código {renderSortIndicator('codigo')}
                                </th>
                                <th 
                                    onClick={() => cambiarOrden('nombre')}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    title="Ordenar alfabéticamente por Nombre"
                                >
                                    Producto / Descripción {renderSortIndicator('nombre')}
                                </th>
                                <th 
                                    className="col-categoria"
                                    onClick={() => cambiarOrden('categoria')}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    title="Ordenar por Categoría"
                                >
                                    Categoría {renderSortIndicator('categoria')}
                                </th>
                                <th 
                                    className="text-right"
                                    onClick={() => cambiarOrden('stock_actual')}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    title="Ordenar por Stock disponible"
                                >
                                    Stock disp. {renderSortIndicator('stock_actual')}
                                </th>
                                <th 
                                    className="text-right"
                                    onClick={() => cambiarOrden('precio_venta')}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    title="Ordenar por Precio (menor a mayor / mayor a menor)"
                                >
                                    Precio 1 kg {renderSortIndicator('precio_venta')}
                                </th>
                                <th className="text-right col-escalas">Escalas mayoristas (5/10/25/30k)</th>
                                <th 
                                    className="text-right col-costo"
                                    onClick={() => cambiarOrden('precio_compra')}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    title="Ordenar por Costo estimado"
                                >
                                    Costo estimado {renderSortIndicator('precio_compra')}
                                </th>
                                <th className="text-right col-margen">Margen / Rentab.</th>
                                <th className="text-right col-acciones">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productosProcesados.map((p, idx) => {
                                const bajoStock = Number(p.stock_actual) <= Number(p.stock_minimo);
                                const isVerPrecios = verPreciosId === p.id;
                                const costo = Number(p.precio_compra) || 0;
                                const venta = Number(p.precio_venta) || 0;
                                const margen = costo > 0 ? (((venta - costo) / costo) * 100).toFixed(1) : null;

                                return (
                                    <tr key={p.id}>
                                        <td className="col-row-num">{idx + 1}</td>
                                        <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                                            <img
                                                src={obtenerImagenProducto(p)}
                                                alt={p.nombre}
                                                style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', padding: 1 }}
                                                onError={e => {
                                                    e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg';
                                                }}
                                            />
                                        </td>
                                        <td className="mono text-sm col-codigo" style={{ color: 'var(--color-text-muted)' }}>
                                            {p.codigo || `MP-${p.id}`}
                                        </td>
                                        <td 
                                            className="col-producto"
                                            onClick={() => abrirEditar(p)}
                                            style={{ cursor: 'pointer' }}
                                            title="Clic para editar este producto"
                                        >
                                            <div className="row gap-xs" style={{ alignItems: 'center' }}>
                                                <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-xs btn-edit-title"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        abrirEditar(p);
                                                    }}
                                                    title="Editar este producto"
                                                >
                                                    ✏️ Editar
                                                </button>
                                            </div>
                                            {p.descripcion && (
                                                <div 
                                                    className="muted text-xs col-producto-desc" 
                                                    title={p.descripcion}
                                                    style={{ 
                                                        marginTop: 3, 
                                                        fontSize: 11.5, 
                                                        color: 'var(--color-text-muted)', 
                                                        maxWidth: 320,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {p.descripcion}
                                                </div>
                                            )}
                                            <div className="mobile-meta-tags">
                                                <span className="mono text-xs muted">{p.codigo || `MP-${p.id}`}</span>
                                                <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 6px' }}>
                                                    {p.categoria_nombre || 'General'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="col-categoria">
                                            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                                                {p.categoria_nombre || 'General'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                className={`mono badge ${bajoStock ? 'badge-danger' : 'badge-neutral'}`}
                                                style={{ border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                                onClick={() => abrirAjuste(p)}
                                                title="Clic para realizar ajuste manual de stock"
                                            >
                                                {p.stock_actual} {p.unidad_medida}
                                            </button>
                                        </td>
                                        <td className="text-right">
                                            {editingPriceId === p.id ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingPriceValue}
                                                        onChange={(e) => setEditingPriceValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') guardarPrecioRapido(p.id);
                                                            if (e.key === 'Escape') setEditingPriceId(null);
                                                        }}
                                                        autoFocus
                                                        style={{ width: 92, padding: '3px 6px', fontSize: 13, borderRadius: 4, border: '1px solid #047857', textAlign: 'right' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => guardarPrecioRapido(p.id)}
                                                        disabled={savingPriceId === p.id}
                                                        style={{ padding: '2px 7px', height: 26 }}
                                                        title="Guardar precio rápido (Enter)"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => setEditingPriceId(null)}
                                                        style={{ padding: '2px 6px', height: 26 }}
                                                        title="Cancelar (Esc)"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => {
                                                        setEditingPriceId(p.id);
                                                        setEditingPriceValue(p.precio_venta);
                                                    }}
                                                    title="Clic para editar precio rápidamente"
                                                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--color-primary-dark)' }}
                                                    className="mono"
                                                >
                                                    <span>{fmtMoney(p.precio_venta)}</span>
                                                    <span style={{ opacity: 0.4, fontSize: 11 }} title="Editar precio">✏️</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right col-escalas">
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setVerPreciosId(isVerPrecios ? null : p.id)}
                                                style={{ fontSize: 11.5 }}
                                            >
                                                {isVerPrecios ? 'Ocultar' : 'Ver escalas (5/10/25/30k)'}
                                            </button>
                                            {isVerPrecios && (
                                                <div style={{ fontSize: 11, textAlign: 'right', marginTop: 4, lineHeight: 1.5 }} className="mono">
                                                    <div>5kg: <strong>{Number(p.precio_5kg) > 0 ? fmtMoney(p.precio_5kg) : '—'}</strong></div>
                                                    <div>10kg: <strong>{Number(p.precio_10kg) > 0 ? fmtMoney(p.precio_10kg) : '—'}</strong></div>
                                                    <div>25kg: <strong>{Number(p.precio_25kg) > 0 ? fmtMoney(p.precio_25kg) : '—'}</strong></div>
                                                    <div>30kg: <strong>{Number(p.precio_30kg) > 0 ? fmtMoney(p.precio_30kg) : '—'}</strong></div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right mono muted text-sm col-costo">
                                            {fmtMoney(p.precio_compra)}
                                        </td>
                                        <td className="text-right col-margen">
                                            {margen !== null ? (
                                                <span className={`mono badge ${Number(margen) >= 35 ? 'badge-success' : (Number(margen) > 15 ? 'badge-warning' : 'badge-danger')}`} style={{ fontSize: 11.5 }}>
                                                    +{margen}%
                                                </span>
                                            ) : (
                                                <span className="muted text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="text-right col-acciones">
                                            <div className="row gap-xs" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        abrirEditar(p);
                                                    }}
                                                    title="Editar producto y precios"
                                                    style={{
                                                        color: 'var(--color-primary-dark)',
                                                        borderColor: 'var(--color-border-strong)',
                                                        fontWeight: 700,
                                                        padding: '5px 12px',
                                                        fontSize: 12,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 5
                                                    }}
                                                >
                                                    <IconEditar /> Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmarEliminar(p);
                                                    }}
                                                    title={`Eliminar "${p.nombre}"`}
                                                    style={{
                                                        color: '#dc2626',
                                                        padding: '5px 8px',
                                                        fontSize: 13,
                                                        borderRadius: 4
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* VISTA MÓVIL OPTIMIZADA PARA CELULARES (< 768px) */}
                <div className="productos-mobile-cards">
                    {productosProcesados.map(p => {
                        const bajoStock = Number(p.stock_actual) <= Number(p.stock_minimo);

                        return (
                            <div key={p.id} className="producto-mobile-card">
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <img
                                        src={obtenerImagenProducto(p)}
                                        alt={p.nombre}
                                        style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', padding: 2, flexShrink: 0 }}
                                        onError={e => { e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg'; }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div 
                                            style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--color-text)', cursor: 'pointer' }}
                                            onClick={() => abrirEditar(p)}
                                        >
                                            {p.nombre}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                                            <span className="mono text-xs muted">{p.codigo || `MP-${p.id}`}</span>
                                            <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 6px' }}>
                                                {p.categoria_nombre || 'General'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {p.descripcion && (
                                    <div className="muted text-xs" style={{ fontStyle: 'italic', marginTop: 6 }}>
                                        {p.descripcion}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>PRECIO 1 KG</div>
                                        <div className="mono" style={{ fontWeight: 800, fontSize: 17, color: 'var(--color-primary-dark)' }}>
                                            {fmtMoney(p.precio_venta)}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>STOCK DISP.</div>
                                        <button
                                            className={`mono badge ${bajoStock ? 'badge-danger' : 'badge-neutral'}`}
                                            style={{ border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, marginTop: 2 }}
                                            onClick={() => abrirAjuste(p)}
                                            title="Ajuste manual de stock"
                                        >
                                            {p.stock_actual} {p.unidad_medida}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        style={{ flex: 1, justifyContent: 'center', padding: '9px 12px', fontWeight: 700, fontSize: 13, borderRadius: 6 }}
                                        onClick={() => abrirEditar(p)}
                                    >
                                        <IconEditar /> Editar Producto
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '9px 12px', borderRadius: 6 }}
                                        onClick={() => confirmarEliminar(p)}
                                        title={`Eliminar "${p.nombre}"`}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                    {!loading && productosProcesados.length === 0 && (
                        <div className="empty-state">
                            <div className="icon">🥜</div>
                            <p>No hay productos que coincidan con los filtros.</p>
                        </div>
                    )}
                </div>

            {/* MODAL CREAR / EDITAR PRODUCTO */}
            {modalOpen && (
                <Modal title={editando ? 'Editar producto y escalas de precios' : 'Nuevo producto en catálogo'} onClose={() => setModalOpen(false)} width={680}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Nombre del producto *</label>
                                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Código interno (ej: MP-045)</label>
                                <input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} />
                            </div>
                            <div className="field">
                                <label>Categoría</label>
                                <select value={form.categoria_id || ''} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                                    <option value="">Sin categoría</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Unidad de medida</label>
                                <select value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value })}>
                                    <option value="kg">Kilogramo (kg)</option>
                                    <option value="g">Gramo (g)</option>
                                    <option value="unidad">Unidad</option>
                                    <option value="bolsa">Bolsa</option>
                                    <option value="caja">Caja</option>
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label>Descripción / Ingredientes (ej: almendras, nuez, pasas)</label>
                            <input value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                        </div>

                        {/* FOTO DE PORTADA DEL PRODUCTO */}
                        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <label style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                                    📸 Imagen de portada del producto
                                </label>
                                {form.imagen && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setForm({ ...form, imagen: '' })}
                                        style={{ color: '#ef4444', fontSize: 11 }}
                                    >
                                        Quitar imagen
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                <div style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    background: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
                                    {form.imagen ? (
                                        <img
                                            src={form.imagen}
                                            alt="Portada"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            onError={(e) => { e.target.src = '/catalogo/ilustraciones/mixpoint_generico.svg'; }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 26, opacity: 0.4 }}>🥜</span>
                                    )}
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                                            {subiendoImagen ? 'Procesando foto...' : (form.imagen ? 'Subir desde archivo' : 'Subir desde archivo')}
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                                style={{ display: 'none' }}
                                                onChange={manejarArchivoImagen}
                                                disabled={subiendoImagen}
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setFinderOpen(true)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                background: '#ecfdf5',
                                                borderColor: '#a7f3d0',
                                                color: '#047857',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                            title="Buscar automáticamente fotos limpias de catálogo"
                                        >
                                            🪄 Buscar foto automática
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>O ingresar URL / nombre:</span>
                                        <input
                                            type="text"
                                            placeholder="https://... o archivo.jpg"
                                            value={form.imagen && !form.imagen.startsWith('data:image') ? form.imagen : ''}
                                            onChange={e => setForm({ ...form, imagen: e.target.value })}
                                            style={{ fontSize: 11, padding: '4px 8px', height: 26, flex: 1 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ESCALAS DE PRECIOS MIX POINT */}
                        {/* ESCALAS DE PRECIOS MIX POINT */}
                        <div style={{ background: '#faf8f2', border: '1px solid #e2dac9', borderRadius: 8, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                    💰 Precios de venta y escalas mayoristas (ARS)
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={autocalcularEscalas}
                                    style={{
                                        background: '#ecfdf5',
                                        borderColor: '#a7f3d0',
                                        color: '#047857',
                                        fontWeight: 600,
                                        fontSize: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5
                                    }}
                                    title="Calcular escalas mayoristas con 1 clic: -5% (5k), -10% (10k), -15% (25k), -18% (30k)"
                                >
                                    🪄 Autocalcular escalas (-5%, -10%, -15%, -18%)
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                <div className="field">
                                    <label style={{ fontWeight: 700, color: '#047857' }}>Precio 1 kg (Base) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={form.precio_venta}
                                        onChange={e => setForm({ ...form, precio_venta: Number(e.target.value) })}
                                        style={{ borderColor: '#86efac', fontWeight: 600 }}
                                    />
                                </div>
                                <div className="field">
                                    <label>Precio escala 5 kg (-5%)</label>
                                    <input type="number" step="0.01" value={form.precio_5kg} onChange={e => setForm({ ...form, precio_5kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Precio escala 10 kg (-10%)</label>
                                    <input type="number" step="0.01" value={form.precio_10kg} onChange={e => setForm({ ...form, precio_10kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Precio escala 25 kg (-15%)</label>
                                    <input type="number" step="0.01" value={form.precio_25kg} onChange={e => setForm({ ...form, precio_25kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Precio escala 30 kg (-18%)</label>
                                    <input type="number" step="0.01" value={form.precio_30kg} onChange={e => setForm({ ...form, precio_30kg: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label>Costo de compra estimado</label>
                                    <input type="number" step="0.01" value={form.precio_compra} onChange={e => setForm({ ...form, precio_compra: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>

                        {/* CONFIGURACIÓN CARRUSEL DE OFERTAS HOME */}
                        <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 8,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10
                        }}>
                            <div>
                                <label style={{ fontWeight: 700, fontSize: 13, color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(form.destacado_carrusel)}
                                        onChange={(e) => setForm({ ...form, destacado_carrusel: e.target.checked })}
                                    />
                                    ⭐ Mostrar en Carrusel de Inicio (distribuidora-mix-point.com.ar)
                                </label>
                                <span style={{ fontSize: 11, color: '#15803d', display: 'block', marginTop: 2, marginLeft: 24 }}>
                                    Se mostrará automáticamente en el slider de ofertas destacadas de la portada.
                                </span>
                            </div>
                            {form.destacado_carrusel && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>Etiqueta:</span>
                                    <input
                                        type="text"
                                        value={form.badge_carrusel || '🔥 OFERTA'}
                                        onChange={(e) => setForm({ ...form, badge_carrusel: e.target.value })}
                                        placeholder="Ej: 🔥 OFERTA"
                                        style={{ width: 140, fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #86efac' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="field" style={{ maxWidth: 200 }}>
                            <label>Stock mínimo de alerta</label>
                            <input type="number" step="0.01" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: Number(e.target.value) })} />
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                            {editando ? (
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => confirmarEliminar(editando)}
                                    style={{ color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                    🗑️ Eliminar este producto
                                </button>
                            ) : <div />}
                            <div className="row gap-sm">
                                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar producto</button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL AJUSTE DE STOCK */}
            {ajusteProducto && (
                <Modal title={`Ajustar stock — ${ajusteProducto.nombre}`} onClose={() => setAjusteProducto(null)} width={480}>
                    <form onSubmit={guardarAjuste} className="stack gap-md">
                        <p className="text-sm muted">
                            Stock actual registrado: <strong className="mono">{ajusteProducto.stock_actual} {ajusteProducto.unidad_medida}</strong>.
                            Ingresá un valor positivo para sumar o negativo para restar (mermas, roturas, etc.).
                        </p>
                        <div className="field">
                            <label>Cantidad a ajustar ({ajusteProducto.unidad_medida}) *</label>
                            <input type="number" step="0.01" required placeholder="Ej: -5 o 10" value={ajusteCantidad} onChange={e => setAjusteCantidad(e.target.value)} autoFocus />
                        </div>

                        {Number(ajusteCantidad) < 0 && ajusteLotesDisponibles.length > 0 && (
                            <div className="field">
                                <label>Lote específico a descontar (opcional)</label>
                                <select value={ajusteLoteId} onChange={e => setAjusteLoteId(e.target.value)}>
                                    <option value="">Descontar por FEFO (más próximo a vencer)</option>
                                    {ajusteLotesDisponibles.map(l => (
                                        <option key={l.id} value={l.id}>
                                            Lote {l.numero_lote || l.id} · Disp: {l.cantidad_actual} {ajusteProducto.unidad_medida} (Vence: {l.fecha_vencimiento || 'S/F'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {Number(ajusteCantidad) > 0 && (
                            <div className="form-grid">
                                <div className="field">
                                    <label>Asignar a lote existente (opcional)</label>
                                    <select value={ajusteLoteId} onChange={e => setAjusteLoteId(e.target.value)}>
                                        <option value="">Crear nuevo lote de ajuste</option>
                                        {ajusteLotesDisponibles.map(l => (
                                            <option key={l.id} value={l.id}>
                                                Lote {l.numero_lote || l.id} (Vence: {l.fecha_vencimiento || 'S/F'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {!ajusteLoteId && (
                                    <div className="field">
                                        <label>Fecha Vto. para nuevo lote</label>
                                        <input type="date" value={ajusteVencimiento} onChange={e => setAjusteVencimiento(e.target.value)} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="field">
                            <label>Motivo del ajuste</label>
                            <input placeholder="Ej: merma, rotura de bolsa, conteo físico" value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)} />
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setAjusteProducto(null)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Aplicar ajuste</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL BUSCADOR MÁGICO DE FOTOS */}
            <ImageFinderModal
                isOpen={finderOpen}
                initialQuery={form.nombre}
                onClose={() => setFinderOpen(false)}
                onSelectImage={(url) => {
                    setForm(prev => ({ ...prev, imagen: url }));
                    setFinderOpen(false);
                }}
            />

            {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
            {productoAEliminar && (
                <Modal title="Eliminar producto del catálogo" onClose={() => setProductoAEliminar(null)} width={480}>
                    <div className="stack gap-md">
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 32, lineHeight: 1 }}>⚠️</div>
                            <div>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: 16 }}>¿Deseas eliminar este producto?</h4>
                                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                    Estás por retirar <strong style={{ color: 'var(--color-text)' }}>{productoAEliminar.nombre}</strong> {productoAEliminar.codigo ? `(${productoAEliminar.codigo})` : ''} del catálogo activo.
                                </p>
                            </div>
                        </div>

                        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#991b1b', lineHeight: 1.4 }}>
                            ℹ️ El producto dejará de ser visible en el catálogo de gestión y en la tienda web de ventas. Las ventas o remitos históricos se mantendrán preservados de forma segura en las auditorías contables.
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => setProductoAEliminar(null)}
                                disabled={eliminando}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-danger" 
                                onClick={ejecutarEliminar}
                                disabled={eliminando}
                                style={{ fontWeight: 700, background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                            >
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar producto'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
