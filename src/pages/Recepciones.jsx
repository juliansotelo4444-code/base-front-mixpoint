import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ProductPicker from '../components/ProductPicker';
import { IconPlus, IconBuscar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

export default function Recepciones() {
    const [tabActiva, setTabActiva] = useState('por_producto'); // 'por_producto' o 'comprobantes'
    const [recepciones, setRecepciones] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState('');

    // Formulario de nueva recepción
    const [proveedorId, setProveedorId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [numeroRemitoProveedor, setNumeroRemitoProveedor] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [items, setItems] = useState([{ producto_id: '', cantidad: '', precio_unitario: '', numero_lote: '', fecha_vencimiento: '' }]);

    // Estado para la pestaña de Consulta por Producto con Costo Pagado
    const [prodFiltroId, setProdFiltroId] = useState('');
    const [qHistorial, setQHistorial] = useState('');
    const [provFiltroId, setProvFiltroId] = useState('');
    const [desdeFiltro, setDesdeFiltro] = useState('');
    const [hastaFiltro, setHastaFiltro] = useState('');
    const [historialItems, setHistorialItems] = useState([]);
    const [historialMetricas, setHistorialMetricas] = useState(null);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    async function cargarRecepciones() {
        setLoading(true);
        try {
            const { data } = await client.get('/recepciones');
            setRecepciones(data);
        } catch (e) {
            console.error('Error cargando recepciones:', e);
        } finally {
            setLoading(false);
        }
    }

    const cargarHistorialProductos = useCallback(async () => {
        setCargandoHistorial(true);
        try {
            const params = {};
            if (prodFiltroId) params.producto_id = prodFiltroId;
            if (qHistorial) params.q = qHistorial;
            if (provFiltroId) params.proveedor_id = provFiltroId;
            if (desdeFiltro) params.desde = desdeFiltro;
            if (hastaFiltro) params.hasta = hastaFiltro;

            const { data } = await client.get('/recepciones/historial-producto', { params });
            setHistorialItems(data.items || []);
            setHistorialMetricas(data.metricas || null);
        } catch (e) {
            console.error('Error cargando historial de productos:', e);
        } finally {
            setCargandoHistorial(false);
        }
    }, [prodFiltroId, qHistorial, provFiltroId, desdeFiltro, hastaFiltro]);

    useEffect(() => {
        client.get('/proveedores', { params: { activo: 1 } }).then(r => setProveedores(r.data)).catch(console.error);
        client.get('/productos', { params: { activo: 1 } }).then(r => setProductos(r.data)).catch(console.error);
        cargarRecepciones();
    }, []);

    useEffect(() => {
        cargarHistorialProductos();
    }, [cargarHistorialProductos]);

    const filtradas = q
        ? recepciones.filter(r => (r.proveedor_nombre && r.proveedor_nombre.toLowerCase().includes(q.toLowerCase())) || (r.numero && r.numero.toLowerCase().includes(q.toLowerCase())))
        : recepciones;

    function abrirNuevo() {
        setProveedorId(''); setFecha(new Date().toISOString().slice(0, 10)); setNumeroRemitoProveedor(''); setNumeroFactura(''); setObservaciones('');
        setItems([{ producto_id: '', cantidad: '', precio_unitario: '', numero_lote: '', fecha_vencimiento: '' }]);
        setError('');
        setModalOpen(true);
    }

    function actualizarItem(i, campo, valor) {
        const nuevos = [...items];
        nuevos[i] = { ...nuevos[i], [campo]: valor };
        setItems(nuevos);
    }

    function handleSelectProducto(i, id, p) {
        const nuevos = [...items];
        nuevos[i] = {
            ...nuevos[i],
            producto_id: id,
            precio_unitario: (p && Number(p.precio_compra) > 0) ? p.precio_compra : nuevos[i].precio_unitario
        };
        setItems(nuevos);
    }

    function agregarItem() { setItems([...items, { producto_id: '', cantidad: '', precio_unitario: '', numero_lote: '', fecha_vencimiento: '' }]); }
    function quitarItem(i) { setItems(items.filter((_, idx) => idx !== i)); }

    const total = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);

    async function guardar(e) {
        e.preventDefault();
        setError('');
        const itemsValidos = items.filter(it => it.producto_id && it.cantidad);
        if (!proveedorId || itemsValidos.length === 0) {
            setError('Elegí un proveedor y al menos un producto con cantidad.');
            return;
        }
        try {
            await client.post('/recepciones', {
                proveedor_id: Number(proveedorId), fecha,
                numero_remito_proveedor: numeroRemitoProveedor, numero_factura: numeroFactura, observaciones,
                items: itemsValidos.map(it => ({
                    producto_id: Number(it.producto_id), cantidad: Number(it.cantidad), precio_unitario: Number(it.precio_unitario) || 0,
                    numero_lote: it.numero_lote || null, fecha_vencimiento: it.fecha_vencimiento || null
                }))
            });
            setModalOpen(false);
            cargarRecepciones();
            cargarHistorialProductos();
            // Actualizar catálogo de productos para reflejar nuevos costos y stocks
            client.get('/productos', { params: { activo: 1 } }).then(r => setProductos(r.data)).catch(console.error);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar la recepción.');
        }
    }

    async function verDetalle(r) {
        const id = r.recepcion_id || r.id;
        const { data } = await client.get(`/recepciones/${id}`);
        setDetalle(data);
    }

    async function anular(id) {
        if (!confirm('¿Anular esta recepción? Esto revierte el stock ingresado y los lotes generados.')) return;
        try {
            await client.post(`/recepciones/${id}/anular`);
            cargarRecepciones();
            cargarHistorialProductos();
            setDetalle(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Error al anular la recepción.');
        }
    }

    const productoFiltroObj = productos.find(p => p.id === Number(prodFiltroId));

    return (
        <div className="stack gap-lg">
            {/* ENCABEZADO */}
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700 }}>Ingresos de Mercadería y Costos</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Control de recepciones a proveedores, historial de costos pagados y trazabilidad de lotes.
                    </p>
                </div>
                <div className="row gap-sm">
                    <button className="btn btn-primary" onClick={abrirNuevo}>
                        <IconPlus /> Nueva recepción
                    </button>
                </div>
            </div>

            {/* SELECTOR DE PESTAÑAS (TABS) */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--color-border)', paddingBottom: 2 }}>
                <button
                    type="button"
                    onClick={() => setTabActiva('por_producto')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        background: tabActiva === 'por_producto' ? 'var(--color-surface)' : 'transparent',
                        borderBottom: tabActiva === 'por_producto' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        borderRadius: '6px 6px 0 0',
                        fontWeight: tabActiva === 'por_producto' ? 700 : 500,
                        color: tabActiva === 'por_producto' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: tabActiva === 'por_producto' ? '0 -1px 3px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    <span>🔍</span> Ingresos por Producto & Costo Pagado
                    {historialItems.length > 0 && (
                        <span className="badge badge-neutral" style={{ fontSize: 11, padding: '1px 6px' }}>
                            {historialItems.length}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setTabActiva('comprobantes')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        background: tabActiva === 'comprobantes' ? 'var(--color-surface)' : 'transparent',
                        borderBottom: tabActiva === 'comprobantes' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        borderRadius: '6px 6px 0 0',
                        fontWeight: tabActiva === 'comprobantes' ? 700 : 500,
                        color: tabActiva === 'comprobantes' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: tabActiva === 'comprobantes' ? '0 -1px 3px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    <span>📦</span> Comprobantes de Recepción
                    <span className="badge badge-neutral" style={{ fontSize: 11, padding: '1px 6px' }}>
                        {recepciones.length}
                    </span>
                </button>
            </div>

            {/* ======================================================== */}
            {/* PESTAÑA 1: INGRESO POR PRODUCTO & COSTO PAGADO            */}
            {/* ======================================================== */}
            {tabActiva === 'por_producto' && (
                <div className="stack gap-md">
                    {/* PANEL DE FILTROS SUPERIOR */}
                    <div className="card" style={{ padding: '16px 20px', background: 'var(--color-surface)' }}>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
                                🏷️ Seleccionar producto para consultar historial de costos pagados:
                            </label>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{ flex: 1, minWidth: 260 }}>
                                    <ProductPicker
                                        productos={productos}
                                        value={prodFiltroId}
                                        onChange={(id) => setProdFiltroId(String(id))}
                                        placeholder="Elegí o buscá un producto para auditar sus compras y costos…"
                                    />
                                </div>
                                {prodFiltroId && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setProdFiltroId('')}
                                        title="Ver todos los productos"
                                        style={{ height: 38, border: '1px solid var(--color-border)' }}
                                    >
                                        ✕ Quitar filtro de producto
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* FILTROS SECUNDARIOS */}
                        <div className="row gap-md" style={{ flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 4 }}>Búsqueda rápida</label>
                                <div className="row gap-xs" style={{ background: 'var(--color-surface-sunken)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                                    <IconBuscar style={{ color: 'var(--color-text-muted)', width: 14, height: 14 }} />
                                    <input
                                        placeholder="Filtrar por texto o código…"
                                        value={qHistorial}
                                        onChange={e => setQHistorial(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13 }}
                                    />
                                </div>
                            </div>

                            <div style={{ minWidth: 170 }}>
                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 4 }}>Proveedor</label>
                                <select
                                    value={provFiltroId}
                                    onChange={e => setProvFiltroId(e.target.value)}
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                                >
                                    <option value="">Todos los proveedores</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                                </select>
                            </div>

                            <div style={{ minWidth: 135 }}>
                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 4 }}>Desde</label>
                                <input
                                    type="date"
                                    value={desdeFiltro}
                                    onChange={e => setDesdeFiltro(e.target.value)}
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                                />
                            </div>

                            <div style={{ minWidth: 135 }}>
                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 4 }}>Hasta</label>
                                <input
                                    type="date"
                                    value={hastaFiltro}
                                    onChange={e => setHastaFiltro(e.target.value)}
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12.5 }}
                                />
                            </div>

                            {(qHistorial || provFiltroId || desdeFiltro || hastaFiltro) && (
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => { setQHistorial(''); setProvFiltroId(''); setDesdeFiltro(''); setHastaFiltro(''); }}
                                    style={{ height: 34, fontSize: 12 }}
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>

                    {/* TARJETAS RESUMEN DE COSTOS (KPIs) */}
                    {historialMetricas && historialMetricas.total_ingresos > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                            <div className="card" style={{ padding: '14px 18px', background: 'var(--color-surface)', borderLeft: '4px solid var(--color-primary)' }}>
                                <span className="text-xs muted" style={{ fontWeight: 600, textTransform: 'uppercase' }}>🏷️ Último Costo Pagado</span>
                                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary-dark)', marginTop: 4 }}>
                                    {fmtMoney(historialMetricas.ultimo_costo)}
                                </div>
                                <span className="text-xs muted" style={{ marginTop: 2, display: 'block' }}>
                                    {productoFiltroObj ? `por ${productoFiltroObj.unidad_medida}` : 'última recepción'}
                                </span>
                            </div>

                            <div className="card" style={{ padding: '14px 18px', background: 'var(--color-surface)', borderLeft: '4px solid #3E7A52' }}>
                                <span className="text-xs muted" style={{ fontWeight: 600, textTransform: 'uppercase' }}>📊 Costo Promedio Ponderado</span>
                                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: '#3E7A52', marginTop: 4 }}>
                                    {fmtMoney(historialMetricas.costo_promedio)}
                                </div>
                                <span className="text-xs muted" style={{ marginTop: 2, display: 'block' }}>
                                    Ponderado por volumen comprado
                                </span>
                            </div>

                            <div className="card" style={{ padding: '14px 18px', background: 'var(--color-surface)', borderLeft: '4px solid #2B5998' }}>
                                <span className="text-xs muted" style={{ fontWeight: 600, textTransform: 'uppercase' }}>📦 Cantidad Total Ingresada</span>
                                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: '#2B5998', marginTop: 4 }}>
                                    {historialMetricas.total_cantidad} {productoFiltroObj ? productoFiltroObj.unidad_medida : ''}
                                </div>
                                <span className="text-xs muted" style={{ marginTop: 2, display: 'block' }}>
                                    en {historialMetricas.total_ingresos} ingresos registrados
                                </span>
                            </div>

                            <div className="card" style={{ padding: '14px 18px', background: 'var(--color-surface)', borderLeft: '4px solid #8A6D3B' }}>
                                <span className="text-xs muted" style={{ fontWeight: 600, textTransform: 'uppercase' }}>💰 Inversión Total</span>
                                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: '#8A6D3B', marginTop: 4 }}>
                                    {fmtMoney(historialMetricas.total_invertido)}
                                </div>
                                <span className="text-xs muted" style={{ marginTop: 2, display: 'block' }}>
                                    Rango: {fmtMoney(historialMetricas.costo_minimo)} — {fmtMoney(historialMetricas.costo_maximo)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* TABLA DE RESULTADOS */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {productoFiltroObj
                                    ? `Historial de ingresos de "${productoFiltroObj.nombre}" (${historialItems.length} registros)`
                                    : `Ingresos de mercadería registrados (${historialItems.length} entradas)`}
                            </div>
                            {cargandoHistorial && <span className="muted text-xs">Cargando registros...</span>}
                        </div>

                        {historialItems.length === 0 ? (
                            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                {cargandoHistorial ? (
                                    <p>Consultando ingresos de mercadería...</p>
                                ) : (
                                    <div>
                                        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No se encontraron ingresos de mercadería</p>
                                        <p className="text-sm">
                                            {prodFiltroId
                                                ? 'Este producto aún no cuenta con ingresos registrados a través de recepciones de proveedores.'
                                                : 'Probá ajustando los filtros de búsqueda o fecha arriba.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>N° Recepción</th>
                                            <th>Producto</th>
                                            <th>Proveedor</th>
                                            <th>Remito / Factura</th>
                                            <th className="text-right">Cantidad</th>
                                            <th className="text-right" style={{ background: 'var(--color-primary-tint)', color: 'var(--color-primary-dark)' }}>
                                                💵 Costo Pagado (Unit.)
                                            </th>
                                            <th className="text-right">Subtotal</th>
                                            <th>Lote / Vto.</th>
                                            <th className="text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historialItems.map((it) => (
                                            <tr key={it.item_id}>
                                                <td className="mono text-sm" style={{ whiteSpace: 'nowrap' }}>
                                                    {it.fecha ? String(it.fecha).slice(0, 10) : '-'}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-xs mono"
                                                        onClick={() => verDetalle(it)}
                                                        style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}
                                                        title="Ver comprobante completo"
                                                    >
                                                        {it.recepcion_numero}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.producto_nombre}</div>
                                                    <span className="mono muted text-xs">{it.producto_codigo}</span>
                                                </td>
                                                <td style={{ fontSize: 13 }}>
                                                    {it.proveedor_nombre}
                                                </td>
                                                <td className="muted text-xs">
                                                    {it.numero_factura ? `Fac: ${it.numero_factura}` : ''}
                                                    {it.numero_remito_proveedor ? ` ${it.numero_factura ? '| ' : ''}Rem: ${it.numero_remito_proveedor}` : ''}
                                                    {!it.numero_factura && !it.numero_remito_proveedor && '-'}
                                                </td>
                                                <td className="text-right mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {it.cantidad} {it.unidad_medida}
                                                </td>
                                                <td className="text-right mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-primary-dark)', background: 'var(--color-primary-tint)' }}>
                                                    {fmtMoney(it.costo_unitario_pagado)}
                                                </td>
                                                <td className="text-right mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {fmtMoney(it.subtotal)}
                                                </td>
                                                <td className="text-xs mono">
                                                    {it.numero_lote ? (
                                                        <span style={{ background: 'var(--color-surface-sunken)', padding: '2px 5px', borderRadius: 4 }}>
                                                            {it.numero_lote}
                                                        </span>
                                                    ) : '-'}
                                                    {it.fecha_vencimiento && (
                                                        <span className="muted" style={{ display: 'block', fontSize: 10.5 }}>
                                                            Vto: {String(it.fecha_vencimiento).slice(0, 10)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-xs"
                                                        onClick={() => verDetalle(it)}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* PESTAÑA 2: COMPROBANTES DE RECEPCIÓN (LISTA GENERAL)     */}
            {/* ======================================================== */}
            {tabActiva === 'comprobantes' && (
                <div className="card">
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                        <div className="row gap-sm" style={{ maxWidth: 380 }}>
                            <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            <input
                                placeholder="Buscar por proveedor o número de recepción…"
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }} className="muted">Cargando recepciones...</div>
                    ) : filtradas.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center' }} className="muted">No hay recepciones registradas.</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Proveedor</th>
                                    <th>Fecha</th>
                                    <th>Factura / Remito Prov.</th>
                                    <th className="text-right">Total ($)</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map(r => (
                                    <tr key={r.id}>
                                        <td className="mono" style={{ fontWeight: 600 }}>{r.numero}</td>
                                        <td>{r.proveedor_nombre}</td>
                                        <td className="mono text-sm">{r.fecha ? String(r.fecha).slice(0, 10) : ''}</td>
                                        <td className="muted text-sm">
                                            {r.numero_factura ? `Fac: ${r.numero_factura}` : ''}
                                            {r.numero_remito_proveedor ? ` Rem: ${r.numero_remito_proveedor}` : ''}
                                            {!r.numero_factura && !r.numero_remito_proveedor && '-'}
                                        </td>
                                        <td className="text-right mono" style={{ fontWeight: 600 }}>{fmtMoney(r.total)}</td>
                                        <td>
                                            <span className={`badge ${r.estado === 'anulada' ? 'badge-danger' : 'badge-success'}`}>
                                                {r.estado}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button className="btn btn-ghost btn-sm" onClick={() => verDetalle(r)}>
                                                Ver detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* MODAL NUEVA RECEPCIÓN */}
            {modalOpen && (
                <Modal title="Nueva recepción de mercadería" onClose={() => setModalOpen(false)} width={740}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert alert-danger">{error}</div>}

                        <div className="form-grid">
                            <div className="field">
                                <label>Proveedor *</label>
                                <select required value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                                    <option value="">Seleccionar proveedor…</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Fecha de ingreso</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                            </div>
                            <div className="field">
                                <label>N° remito del proveedor</label>
                                <input placeholder="Ej: R-0001-0004523" value={numeroRemitoProveedor} onChange={e => setNumeroRemitoProveedor(e.target.value)} />
                            </div>
                            <div className="field">
                                <label>N° factura</label>
                                <input placeholder="Ej: FC-A-0001-0001234" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div className="spread" style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                    Productos recibidos (cada uno genera un lote y actualiza el costo de compra en catálogo)
                                </label>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={agregarItem}>
                                    <IconPlus /> Agregar ítem
                                </button>
                            </div>
                            <div className="stack gap-sm">
                                {items.map((it, i) => (
                                    <div key={i} className="card" style={{ padding: 12, background: 'var(--color-surface-sunken)' }}>
                                        <div className="recepcion-item-top">
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <ProductPicker
                                                    productos={productos}
                                                    value={it.producto_id}
                                                    onChange={(id, p) => handleSelectProducto(i, id, p)}
                                                    placeholder="Buscar producto por nombre o código…"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => quitarItem(i)}
                                                disabled={items.length === 1}
                                                style={{ color: 'var(--color-danger)' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="recepcion-item-grid" style={{ marginTop: 8 }}>
                                            <div>
                                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 2 }}>Cantidad</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Cantidad"
                                                    value={it.cantidad}
                                                    onChange={e => actualizarItem(i, 'cantidad', e.target.value)}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 2 }}>Costo Unitario ($)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Costo pagado ($)"
                                                    value={it.precio_unitario}
                                                    onChange={e => actualizarItem(i, 'precio_unitario', e.target.value)}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 2 }}>N° Lote (opcional)</label>
                                                <input
                                                    placeholder="Ej: LOTE-2026-A"
                                                    value={it.numero_lote}
                                                    onChange={e => actualizarItem(i, 'numero_lote', e.target.value)}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs muted" style={{ display: 'block', marginBottom: 2 }}>Vencimiento</label>
                                                <input
                                                    type="date"
                                                    value={it.fecha_vencimiento}
                                                    onChange={e => actualizarItem(i, 'fecha_vencimiento', e.target.value)}
                                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="field">
                            <label>Observaciones</label>
                            <textarea rows={2} placeholder="Comentarios del proveedor, calidad recibida, etc." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                        </div>

                        <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                            <span className="muted text-sm">Total de la recepción</span>
                            <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                {fmtMoney(total)}
                            </span>
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Registrar recepción y actualizar stock</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL DETALLE DE RECEPCIÓN */}
            {detalle && (
                <Modal title={`Recepción ${detalle.numero}`} onClose={() => setDetalle(null)} width={660}>
                    <div className="stack gap-md">
                        <div className="spread" style={{ alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{detalle.proveedor_nombre}</h3>
                                <p className="text-sm muted" style={{ marginTop: 2 }}>
                                    Fecha: <span className="mono">{detalle.fecha ? String(detalle.fecha).slice(0, 10) : ''}</span>
                                    {detalle.numero_factura && ` • Factura: ${detalle.numero_factura}`}
                                    {detalle.numero_remito_proveedor && ` • Remito: ${detalle.numero_remito_proveedor}`}
                                </p>
                                {detalle.observaciones && (
                                    <p className="text-xs" style={{ marginTop: 4, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                        "{detalle.observaciones}"
                                    </p>
                                )}
                            </div>
                            <span className={`badge ${detalle.estado === 'anulada' ? 'badge-danger' : 'badge-success'}`}>
                                {detalle.estado}
                            </span>
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th className="text-right">Cant.</th>
                                    <th className="text-right" style={{ color: 'var(--color-primary-dark)' }}>Costo Pagado</th>
                                    <th className="text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(detalle.items || []).map(it => (
                                    <tr key={it.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{it.producto_nombre}</div>
                                            {it.numero_lote && <span className="mono text-xs muted">Lote: {it.numero_lote}</span>}
                                        </td>
                                        <td className="text-right mono">{it.cantidad} {it.unidad_medida}</td>
                                        <td className="text-right mono" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                            {fmtMoney(it.precio_unitario)}
                                        </td>
                                        <td className="text-right mono" style={{ fontWeight: 600 }}>{fmtMoney(it.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                            <span className="muted">Total comprobante</span>
                            <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary-dark)' }}>
                                {fmtMoney(detalle.total)}
                            </span>
                        </div>

                        {detalle.estado !== 'anulada' && (
                            <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                                <span className="text-xs muted">¿Hubo un error en la carga de este comprobante?</span>
                                <button className="btn btn-danger btn-sm" onClick={() => anular(detalle.id)}>
                                    Anular recepción y revertir stock
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
