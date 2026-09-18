import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ProductPicker from '../components/ProductPicker';
import RemitoImprimible from '../components/RemitoImprimible';
import { IconPlus, IconBuscar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

const ESTADOS = {
    pendiente: 'badge-warning',
    entregado: 'badge-primary',
    facturado: 'badge-success',
    anulado: 'badge-danger'
};

export default function Remitos() {
    const [remitos, setRemitos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [q, setQ] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [remitoParaImprimir, setRemitoParaImprimir] = useState(null);
    const [error, setError] = useState('');

    const [clienteId, setClienteId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [direccion, setDireccion] = useState('');
    const [transportista, setTransportista] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [permitirSinStock, setPermitirSinStock] = useState(true);
    const [items, setItems] = useState([{ producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);

    async function cargar() {
        setLoading(true);
        const { data } = await client.get('/remitos', { params: { estado: estadoFiltro || undefined } });
        setRemitos(data);
        setLoading(false);
    }

    useEffect(() => {
        client.get('/clientes', { params: { activo: 1 } }).then(r => setClientes(r.data));
        client.get('/productos', { params: { activo: 1 } }).then(r => setProductos(r.data));
    }, []);

    useEffect(() => { cargar(); }, [estadoFiltro]);

    const remitosFiltrados = q
        ? remitos.filter(r => (r.cliente_nombre && r.cliente_nombre.toLowerCase().includes(q.toLowerCase())) || (r.numero && r.numero.toLowerCase().includes(q.toLowerCase())))
        : remitos;

    function abrirNuevo() {
        setClienteId('');
        setFecha(new Date().toISOString().slice(0, 10));
        setDireccion('');
        setTransportista('');
        setObservaciones('');
        setPermitirSinStock(true);
        setItems([{ producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);
        setError('');
        setModalOpen(true);
    }

    // Sugiere el precio unitario según cliente o cantidad
    function calcularPrecioSugerido(prod, cant, clienteObj) {
        if (!prod) return 0;
        const c = Number(cant) || 0;
        const lista = clienteObj?.lista_precio;

        if (lista === 'treintaKg' && Number(prod.precio_30kg) > 0) return Number(prod.precio_30kg);
        if (lista === 'veinticincoKg' && Number(prod.precio_25kg) > 0) return Number(prod.precio_25kg);
        if (lista === 'diezKg' && Number(prod.precio_10kg) > 0) return Number(prod.precio_10kg);
        if (lista === 'cincoKg' && Number(prod.precio_5kg) > 0) return Number(prod.precio_5kg);

        // Por volumen si no está forzado por lista
        if (c >= 30 && Number(prod.precio_30kg) > 0) return Number(prod.precio_30kg);
        if (c >= 25 && Number(prod.precio_25kg) > 0) return Number(prod.precio_25kg);
        if (c >= 10 && Number(prod.precio_10kg) > 0) return Number(prod.precio_10kg);
        if (c >= 5 && Number(prod.precio_5kg) > 0) return Number(prod.precio_5kg);

        return Number(prod.precio_venta) || 0;
    }

    function handleSelectProducto(index, prodId, prod) {
        const nuevos = [...items];
        const clienteActual = clientes.find(c => c.id === Number(clienteId));
        nuevos[index] = {
            ...nuevos[index],
            producto_id: prodId,
            unidad_medida: prod?.unidad_medida || 'kg',
            precio_unitario: calcularPrecioSugerido(prod, nuevos[index].cantidad, clienteActual)
        };
        setItems(nuevos);
    }

    function actualizarCantidad(index, cant) {
        const nuevos = [...items];
        const prod = productos.find(p => p.id === Number(nuevos[index].producto_id));
        const clienteActual = clientes.find(c => c.id === Number(clienteId));
        nuevos[index].cantidad = cant;
        // Solo recalculamos el precio si el usuario aún no ingresó un precio personalizado o cambió de escala
        if (prod) {
            nuevos[index].precio_unitario = calcularPrecioSugerido(prod, cant, clienteActual);
        }
        setItems(nuevos);
    }

    function actualizarPrecioManual(index, precio) {
        const nuevos = [...items];
        nuevos[index].precio_unitario = precio;
        setItems(nuevos);
    }

    function agregarItem() {
        setItems([...items, { producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);
    }

    function quitarItem(i) {
        setItems(items.filter((_, idx) => idx !== i));
    }

    const total = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);

    async function guardar(e) {
        e.preventDefault();
        setError('');
        const itemsValidos = items.filter(it => it.producto_id && Number(it.cantidad) > 0);
        if (!clienteId || itemsValidos.length === 0) {
            setError('Elegí un cliente y al menos un producto con cantidad válida.');
            return;
        }

        try {
            const { data } = await client.post('/remitos', {
                cliente_id: Number(clienteId),
                fecha,
                direccion_entrega: direccion,
                transportista,
                observaciones,
                permitir_sin_stock: permitirSinStock,
                items: itemsValidos.map(it => ({
                    producto_id: Number(it.producto_id),
                    cantidad: Number(it.cantidad),
                    precio_unitario: Number(it.precio_unitario) || 0
                }))
            });

            setModalOpen(false);
            cargar();
            // Abrir directamente la vista imprimible del remito recién creado
            imprimirRemito(data.id);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear el remito.');
        }
    }

    async function verDetalle(r) {
        const { data } = await client.get(`/remitos/${r.id}`);
        setDetalle(data);
    }

    async function imprimirRemito(id) {
        const { data } = await client.get(`/remitos/${id}`);
        setRemitoParaImprimir(data);
    }

    async function cambiarEstado(id, estado) {
        await client.put(`/remitos/${id}/estado`, { estado });
        cargar();
        setDetalle(null);
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Remitos comerciales</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        {remitos.length} remitos registrados · Distribuidora Mix Point
                    </p>
                </div>
                <button className="btn btn-primary" onClick={abrirNuevo} style={{ fontSize: 14 }}>
                    <IconPlus /> Generar nuevo remito
                </button>
            </div>

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 10 }}>
                    <div className="row gap-sm" style={{ maxWidth: 360, flex: 1 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input
                            placeholder="Buscar por cliente o número de remito…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                        />
                    </div>
                    <select
                        value={estadoFiltro}
                        onChange={e => setEstadoFiltro(e.target.value)}
                        style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                    >
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="entregado">Entregado</option>
                        <option value="facturado">Facturado</option>
                        <option value="anulado">Anulado</option>
                    </select>
                </div>

                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Cliente</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th className="text-right">Total</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {remitosFiltrados.map(r => (
                                <tr key={r.id}>
                                    <td className="mono" style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary-dark)' }} onClick={() => verDetalle(r)}>
                                        {r.numero}
                                    </td>
                                    <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => verDetalle(r)}>
                                        {r.cliente_nombre}
                                    </td>
                                    <td className="mono">{r.fecha}</td>
                                    <td><span className={`badge ${ESTADOS[r.estado]}`}>{r.estado}</span></td>
                                    <td className="text-right mono" style={{ fontWeight: 600 }}>{fmtMoney(r.total)}</td>
                                    <td className="text-right">
                                        <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => imprimirRemito(r.id)}
                                                title="Imprimir o guardar PDF"
                                            >
                                                🖨️ Imprimir / PDF
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => verDetalle(r)}
                                            >
                                                Ver detalle
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && remitosFiltrados.length === 0 && (
                        <div className="empty-state">
                            <div className="icon">🧾</div>
                            <p>No hay remitos registrados que coincidan.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL NUEVO REMITO */}
            {modalOpen && (
                <Modal title="Generar nuevo remito" onClose={() => setModalOpen(false)} width={860}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        <div className="form-grid">
                            <div className="field">
                                <label>Cliente destinatario *</label>
                                <select
                                    required
                                    value={clienteId}
                                    onChange={e => {
                                        const cId = e.target.value;
                                        setClienteId(cId);
                                        const c = clientes.find(x => x.id === Number(cId));
                                        if (c && c.direccion) setDireccion(c.direccion);
                                    }}
                                >
                                    <option value="">Seleccionar cliente…</option>
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.razon_social} ({c.condicion_iva || 'CF'}) {c.lista_precio ? `· Lista: ${c.lista_precio}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>Fecha de emisión</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                            </div>
                            <div className="field">
                                <label>Dirección de entrega</label>
                                <input
                                    placeholder="Ej: Av. Corrientes 4520, CABA o Retiro en depósito"
                                    value={direccion}
                                    onChange={e => setDireccion(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label>Transportista / Chofer</label>
                                <input
                                    placeholder="Ej: Flete propio / Juan Pérez"
                                    value={transportista}
                                    onChange={e => setTransportista(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="spread" style={{ marginBottom: 8, marginTop: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                    Mercadería a entregar (Catálogo Mix Point)
                                </label>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={agregarItem}>
                                    <IconPlus /> Agregar ítem
                                </button>
                            </div>

                            <div className="stack gap-sm">
                                {items.map((it, i) => {
                                    const prod = productos.find(p => p.id === Number(it.producto_id));
                                    const excedeStock = prod && Number(it.cantidad) > Number(prod.stock_actual);

                                    return (
                                        <div key={i} className="item-row-card">
                                            <div className="item-row-header">
                                                <div className="item-row-product">
                                                    <ProductPicker
                                                        productos={productos}
                                                        value={it.producto_id}
                                                        onChange={(id, p) => handleSelectProducto(i, id, p)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm item-row-delete"
                                                    onClick={() => quitarItem(i)}
                                                    disabled={items.length === 1}
                                                    style={{ color: 'var(--color-danger)' }}
                                                    title="Quitar producto"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="item-row-details">
                                                <div className="item-col-cant">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder={`Cant. (${prod?.unidad_medida || 'kg'})`}
                                                        value={it.cantidad}
                                                        onChange={e => actualizarCantidad(i, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 10px',
                                                            borderRadius: 6,
                                                            border: `1px solid ${excedeStock && !permitirSinStock ? 'var(--color-danger)' : 'var(--color-border-strong)'}`
                                                        }}
                                                    />
                                                </div>
                                                <div className="item-col-precio">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="P. Unitario ($)"
                                                        value={it.precio_unitario}
                                                        onChange={e => actualizarPrecioManual(i, e.target.value)}
                                                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                                    />
                                                </div>
                                                <div className="item-col-subtotal mono">
                                                    {fmtMoney((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="spread" style={{ background: '#f6f3eb', padding: '10px 14px', borderRadius: 6 }}>
                            <label className="row gap-xs text-sm" style={{ cursor: 'pointer', margin: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={permitirSinStock}
                                    onChange={e => setPermitirSinStock(e.target.checked)}
                                />
                                <span>Permitir emitir remito sin stock previo (mercadería física en depósito / en tránsito)</span>
                            </label>
                        </div>

                        <div className="field">
                            <label>Observaciones del remito</label>
                            <textarea
                                rows={2}
                                placeholder="Anotaciones para el chofer o el cliente..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            />
                        </div>

                        <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                            <span className="muted">Total del remito:</span>
                            <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                {fmtMoney(total)}
                            </span>
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
                                ✅ Confirmar y Generar Remito
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL DETALLE DE REMITO */}
            {detalle && (
                <Modal title={`Remito ${detalle.numero}`} onClose={() => setDetalle(null)} width={680}>
                    <div className="stack gap-md">
                        <div className="spread">
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 16 }}>{detalle.cliente_nombre}</p>
                                <p className="text-sm muted">
                                    CUIT: {detalle.cliente_cuit || '—'} · Condición IVA: {detalle.cliente_condicion_iva || 'CF'}
                                </p>
                                <p className="text-sm muted">
                                    Fecha: {detalle.fecha} {detalle.direccion_entrega && `· Entrega: ${detalle.direccion_entrega}`}
                                </p>
                            </div>
                            <span className={`badge ${ESTADOS[detalle.estado]}`}>{detalle.estado}</span>
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th className="text-right">Cant.</th>
                                    <th className="text-right">Precio</th>
                                    <th className="text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalle.items.map(it => (
                                    <tr key={it.id}>
                                        <td className="mono text-sm">{it.producto_codigo || `MP-${it.producto_id}`}</td>
                                        <td><strong>{it.producto_nombre}</strong></td>
                                        <td className="text-right mono">{it.cantidad} {it.unidad_medida}</td>
                                        <td className="text-right mono">{fmtMoney(it.precio_unitario)}</td>
                                        <td className="text-right mono" style={{ fontWeight: 600 }}>{fmtMoney(it.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="spread" style={{ padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
                            <span className="muted">Total del comprobante:</span>
                            <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary-dark)' }}>
                                {fmtMoney(detalle.total)}
                            </span>
                        </div>

                        <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                    const id = detalle.id;
                                    setDetalle(null);
                                    imprimirRemito(id);
                                }}
                            >
                                🖨️ Imprimir Remito / Guardar PDF
                            </button>

                            {detalle.estado !== 'anulado' && (
                                <div className="row gap-xs">
                                    {detalle.estado === 'pendiente' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => cambiarEstado(detalle.id, 'entregado')}>
                                            Marcar entregado
                                        </button>
                                    )}
                                    {detalle.estado === 'entregado' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => cambiarEstado(detalle.id, 'facturado')}>
                                            Marcar facturado
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => {
                                            if (confirm('¿Anular remito? Esto devolverá el stock a los lotes.')) {
                                                cambiarEstado(detalle.id, 'anulado');
                                            }
                                        }}
                                    >
                                        Anular
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* VISTA IMPRIMIBLE DE REMITO (A4 / PDF) */}
            {remitoParaImprimir && (
                <RemitoImprimible
                    remito={remitoParaImprimir}
                    onClose={() => setRemitoParaImprimir(null)}
                />
            )}
        </div>
    );
}
