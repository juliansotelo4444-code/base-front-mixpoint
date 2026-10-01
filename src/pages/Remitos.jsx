import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ProductPicker from '../components/ProductPicker';
import RemitoImprimible from '../components/RemitoImprimible';
import HojaDeRutaModal from '../components/HojaDeRutaModal';
import VoiceSearchButton from '../components/VoiceSearchButton';
import { IconPlus, IconBuscar } from '../components/Icons';
import { getFechaHoyLocal, formatearFecha } from '../utils/fechas';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

// Definición de los 7 estados del pipeline de pedidos Mix Point
export const ESTADOS = {
    pendiente: { label: 'Pendiente', badgeClass: 'badge-status-pendiente', icon: '🟡' },
    en_preparacion: { label: 'En Preparación', badgeClass: 'badge-status-preparacion', icon: '🔵' },
    esperando_pago: { label: 'Esperando Pago', badgeClass: 'badge-status-esperando-pago', icon: '🟣' },
    en_camino: { label: 'En Camino', badgeClass: 'badge-status-camino', icon: '🟠' },
    entregado: { label: 'Entregado', badgeClass: 'badge-status-entregado', icon: '🟢' },
    facturado: { label: 'Facturado', badgeClass: 'badge-status-facturado', icon: '🔷' },
    cancelado: { label: 'Cancelado', badgeClass: 'badge-status-cancelado', icon: '🔴' },
    anulado: { label: 'Anulado', badgeClass: 'badge-status-cancelado', icon: '🔴' }
};

export const PIPELINE_STEPS = [
    'pendiente',
    'en_preparacion',
    'esperando_pago',
    'en_camino',
    'entregado',
    'facturado'
];

export function buildWhatsAppLink(remito) {
    let tel = (remito.cliente_telefono || '').replace(/\D/g, '');
    if (tel.startsWith('0')) tel = tel.slice(1);
    if (tel.startsWith('15')) tel = '11' + tel.slice(2);
    if (!tel.startsWith('549') && tel.length >= 10) tel = '549' + tel;
    if (!tel) tel = '5491167873243'; // Línea oficial Mix Point

    const estadoLabel = ESTADOS[remito.estado]?.label || remito.estado;
    const msg = `¡Hola ${remito.cliente_nombre || 'Cliente'}! Tu pedido #${remito.numero} de Mix Point se encuentra en estado: *${estadoLabel.toUpperCase()}*.\nTotal: ${fmtMoney(remito.total)}\nDatos de pago por transferencia:\nAlias: *mixpoint2026*\nLínea oficial WhatsApp: 1167873243\n¡Muchas gracias por elegir Mix Point!`;

    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

export default function Remitos() {
    const [remitos, setRemitos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [q, setQ] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [clienteRapidoOpen, setClienteRapidoOpen] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [remitoParaImprimir, setRemitoParaImprimir] = useState(null);
    const [hojaDeRutaOpen, setHojaDeRutaOpen] = useState(false);
    const [seleccionados, setSeleccionados] = useState([]);
    const [error, setError] = useState('');
    const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

    // Formulario de Remito
    const [clienteId, setClienteId] = useState('');
    const [fecha, setFecha] = useState(getFechaHoyLocal());
    const [direccion, setDireccion] = useState('');
    const [transportista, setTransportista] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [permitirSinStock, setPermitirSinStock] = useState(true);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    const [items, setItems] = useState([{ producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);

    // Formulario Cliente Rápido al Vuelo
    const [nuevoCliente, setNuevoCliente] = useState({
        razon_social: '',
        telefono: '',
        direccion: '',
        cuit: '',
        lista_precio: 'general',
        segmento: 'Comercio'
    });
    const [guardandoCliente, setGuardandoCliente] = useState(false);
    const [errorClienteRapido, setErrorClienteRapido] = useState('');

    async function cargar() {
        setLoading(true);
        try {
            const { data } = await client.get('/remitos', { params: { estado: estadoFiltro || undefined } });
            setRemitos(data);
        } catch (err) {
            console.error('Error al cargar remitos:', err);
        } finally {
            setLoading(false);
        }
    }

    async function cargarClientesYProductos() {
        try {
            const [cRes, pRes] = await Promise.all([
                client.get('/clientes', { params: { activo: 1 } }),
                client.get('/productos', { params: { activo: 1 } })
            ]);
            setClientes(cRes.data);
            setProductos(pRes.data);
        } catch (err) {
            console.error('Error al cargar clientes y productos:', err);
        }
    }

    useEffect(() => {
        cargarClientesYProductos();
    }, []);

    useEffect(() => {
        cargar();
    }, [estadoFiltro]);

    const remitosFiltrados = q
        ? remitos.filter(r => (r.cliente_nombre && r.cliente_nombre.toLowerCase().includes(q.toLowerCase())) || (r.numero && r.numero.toLowerCase().includes(q.toLowerCase())))
        : remitos;

    function abrirNuevo() {
        setClienteId('');
        setFecha(getFechaHoyLocal());
        setDireccion('');
        setTransportista('');
        setObservaciones('');
        setPermitirSinStock(true);
        setDescuentoPorcentaje(0);
        setItems([{ producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);
        setError('');
        setModalOpen(true);
    }

    // Sugiere el precio unitario según cliente o cantidad por escala mayorista
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

    // Cálculos de totales con descuento
    const subtotalBruto = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);
    const montoDescuento = subtotalBruto * (Number(descuentoPorcentaje) / 100);
    const totalFinal = Math.max(0, subtotalBruto - montoDescuento);

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
                descuento_porcentaje: Number(descuentoPorcentaje) || 0,
                items: itemsValidos.map(it => ({
                    producto_id: Number(it.producto_id),
                    cantidad: Number(it.cantidad),
                    precio_unitario: Number(it.precio_unitario) || 0
                }))
            });

            setModalOpen(false);
            cargar();
            imprimirRemito(data.id);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear el remito.');
        }
    }

    async function guardarClienteRapido(e) {
        e.preventDefault();
        setErrorClienteRapido('');
        if (!nuevoCliente.razon_social.trim()) {
            setErrorClienteRapido('La Razón Social o Nombre del cliente es obligatorio.');
            return;
        }

        setGuardandoCliente(true);
        try {
            const { data: creado } = await client.post('/clientes/rapido', nuevoCliente);
            // Recargar lista y auto-seleccionar
            const { data: todos } = await client.get('/clientes', { params: { activo: 1 } });
            setClientes(todos);
            setClienteId(String(creado.id));
            if (creado.direccion) setDireccion(creado.direccion);
            setClienteRapidoOpen(false);
            setNuevoCliente({ razon_social: '', telefono: '', direccion: '', cuit: '', lista_precio: 'general', segmento: 'Comercio' });
        } catch (err) {
            setErrorClienteRapido(err.response?.data?.error || 'Error al crear el cliente.');
        } finally {
            setGuardandoCliente(false);
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

    async function cambiarEstado(id, nuevoEstado) {
        setCambiandoEstadoId(id);
        try {
            await client.put(`/remitos/${id}/estado`, { estado: nuevoEstado });
            await cargar();
            if (detalle && detalle.id === id) {
                const { data } = await client.get(`/remitos/${id}`);
                setDetalle(data);
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Error al actualizar estado del pedido.');
        } finally {
            setCambiandoEstadoId(null);
        }
    }

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Remitos comerciales</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        {remitos.length} pedidos y remitos · Pipeline de 7 estados · Mix Point Mayorista
                    </p>
                </div>
                <div className="row gap-sm">
                    {seleccionados.length > 0 && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setHojaDeRutaOpen(true)}
                            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', fontWeight: 600 }}
                        >
                            🚚 Hoja de Ruta ({seleccionados.length})
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={abrirNuevo} style={{ fontSize: 14 }}>
                        <IconPlus /> Generar nuevo remito
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="spread" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 12 }}>
                    <div className="row gap-sm" style={{ maxWidth: 420, flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 10px' }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <input
                            placeholder="Buscar por cliente o remito…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent' }}
                        />
                        <VoiceSearchButton onResult={texto => setQ(texto)} placeholder="Hablar para buscar remitos..." />
                    </div>
                    <select
                        value={estadoFiltro}
                        onChange={e => setEstadoFiltro(e.target.value)}
                        style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                    >
                        <option value="">Todos los 7 estados</option>
                        <option value="pendiente">🟡 Pendiente</option>
                        <option value="en_preparacion">🔵 En Preparación</option>
                        <option value="esperando_pago">🟣 Esperando Pago</option>
                        <option value="en_camino">🟠 En Camino</option>
                        <option value="entregado">🟢 Entregado</option>
                        <option value="facturado">🔷 Facturado</option>
                        <option value="cancelado">🔴 Cancelado / Anulado</option>
                    </select>
                </div>

                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={remitosFiltrados.length > 0 && seleccionados.length === remitosFiltrados.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setSeleccionados(remitosFiltrados.map(r => r.id));
                                            else setSeleccionados([]);
                                        }}
                                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                                        title="Seleccionar todos"
                                    />
                                </th>
                                <th>Número</th>
                                <th>Cliente</th>
                                <th>Fecha</th>
                                <th>Estado Tracker</th>
                                <th>Validación Pago</th>
                                <th className="text-right">Total</th>
                                <th className="text-right">Acciones Rápidas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {remitosFiltrados.map(r => {
                                const estadoInfo = ESTADOS[r.estado] || { label: r.estado, badgeClass: 'badge-neutral', icon: '⚪' };
                                const isCambiando = cambiandoEstadoId === r.id;

                                return (
                                    <tr key={r.id}>
                                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={seleccionados.includes(r.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSeleccionados([...seleccionados, r.id]);
                                                    else setSeleccionados(seleccionados.filter(id => id !== r.id));
                                                }}
                                                style={{ cursor: 'pointer', width: 16, height: 16 }}
                                            />
                                        </td>
                                        <td className="mono" style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary-dark)' }} onClick={() => verDetalle(r)}>
                                            {r.numero}
                                        </td>
                                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => verDetalle(r)}>
                                            <div>{r.cliente_nombre}</div>
                                            {r.cliente_telefono && (
                                                <div className="muted mono" style={{ fontSize: 11 }}>📞 {r.cliente_telefono}</div>
                                            )}
                                        </td>
                                        <td className="mono">{formatearFecha(r.fecha)}</td>
                                        <td>
                                            <div className="row gap-xs">
                                                <select
                                                    value={r.estado}
                                                    disabled={isCambiando}
                                                    onChange={(e) => cambiarEstado(r.id, e.target.value)}
                                                    className={`badge ${estadoInfo.badgeClass}`}
                                                    style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', fontWeight: 600, appearance: 'none', WebkitAppearance: 'none' }}
                                                    title="Hacé clic para cambiar estado del pedido"
                                                >
                                                    <option value="pendiente">🟡 Pendiente</option>
                                                    <option value="en_preparacion">🔵 En Preparación</option>
                                                    <option value="esperando_pago">🟣 Esperando Pago</option>
                                                    <option value="en_camino">🟠 En Camino</option>
                                                    <option value="entregado">🟢 Entregado</option>
                                                    <option value="facturado">🔷 Facturado</option>
                                                    <option value="cancelado">🔴 Cancelado</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            {r.pago_validado ? (
                                                <span className="badge badge-pago-validado" title="Pago conciliado en banco">
                                                    ✓ Pago Validado
                                                </span>
                                            ) : (
                                                <span className="badge badge-pago-pendiente" title="Cobro en entrega o transferencia no validada">
                                                    ⏳ Pago Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right mono" style={{ fontWeight: 600 }}>
                                            {fmtMoney(r.total)}
                                            {Number(r.descuento_porcentaje) > 0 && (
                                                <div className="text-xs" style={{ color: '#B23A3A' }}>
                                                    (-{r.descuento_porcentaje}%)
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="row gap-xs" style={{ justifyContent: 'flex-end' }}>
                                                {/* Botón WhatsApp de 1 toque (Línea oficial 1167873243, sin saldo) */}
                                                <a
                                                    href={buildWhatsAppLink(r)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ color: '#047857', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                                                    title="Enviar estado y datos de pago por WhatsApp (1167873243)"
                                                >
                                                    📲 WhatsApp
                                                </a>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => imprimirRemito(r.id)}
                                                    title="Imprimir remito con QR mixpoint2026"
                                                >
                                                    🖨️ Remito QR
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => verDetalle(r)}
                                                >
                                                    Ver
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                <Modal title="Generar nuevo remito" onClose={() => setModalOpen(false)} width={880}>
                    <form onSubmit={guardar} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}
                        
                        <div className="form-grid">
                            <div className="field">
                                <div className="spread">
                                    <label>Cliente destinatario *</label>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: 'var(--color-primary-dark)', padding: '2px 6px', fontWeight: 600 }}
                                        onClick={() => setClienteRapidoOpen(true)}
                                    >
                                        ⚡ + Crear cliente rápido
                                    </button>
                                </div>
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

                        {/* ITEMS DE MERCADERÍA CON EDICIÓN DE PRECIOS */}
                        <div>
                            <div className="spread" style={{ marginBottom: 8, marginTop: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                    Mercadería a entregar (Edición de precios por bulto/escala habilitada)
                                </label>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={agregarItem}>
                                    <IconPlus /> Agregar producto
                                </button>
                            </div>

                            <div className="stack gap-sm">
                                {items.map((it, i) => {
                                    const prod = productos.find(p => p.id === Number(it.producto_id));
                                    const excedeStock = prod && Number(it.cantidad) > Number(prod.stock_actual);

                                    return (
                                        <div key={i} className="item-row-card" style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
                                            <div className="item-row-header" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <ProductPicker
                                                        productos={productos}
                                                        value={it.producto_id}
                                                        onChange={(id, p) => handleSelectProducto(i, id, p)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => quitarItem(i)}
                                                    disabled={items.length === 1}
                                                    style={{ color: 'var(--color-danger)' }}
                                                    title="Quitar producto"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr', gap: 10, marginTop: 8 }}>
                                                <div>
                                                    <label className="text-xs muted">Cantidad ({prod?.unidad_medida || 'kg'})</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Cantidad"
                                                        value={it.cantidad}
                                                        onChange={e => actualizarCantidad(i, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '7px 9px',
                                                            borderRadius: 6,
                                                            border: `1px solid ${excedeStock && !permitirSinStock ? 'var(--color-danger)' : 'var(--color-border-strong)'}`
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs muted">Precio Unitario ($)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="P. Unitario ($)"
                                                        value={it.precio_unitario}
                                                        onChange={e => actualizarPrecioManual(i, e.target.value)}
                                                        style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                                    />
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <label className="text-xs muted">Subtotal</label>
                                                    <div className="mono" style={{ fontWeight: 600, fontSize: 15, paddingTop: 6 }}>
                                                        {fmtMoney((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* DESCUENTOS Y AJUSTES */}
                        <div className="spread" style={{ background: '#FAF9F4', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                            <div className="row gap-sm">
                                <label style={{ fontSize: 13, fontWeight: 600 }}>🏷️ Descuento general al remito (%):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={descuentoPorcentaje}
                                    onChange={e => setDescuentoPorcentaje(e.target.value)}
                                    style={{ width: 80, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {Number(descuentoPorcentaje) > 0 && (
                                    <div className="text-sm" style={{ color: '#B23A3A', marginBottom: 2 }}>
                                        Descuento ({descuentoPorcentaje}%): -{fmtMoney(montoDescuento)}
                                    </div>
                                )}
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                    Total: {fmtMoney(totalFinal)}
                                </div>
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
                                placeholder="Anotaciones de entrega..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            />
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ padding: '10px 22px' }}>
                                ✅ Emitir Remito y Abrir QR
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MINI MODAL CREAR CLIENTE RÁPIDO AL VUELO */}
            {clienteRapidoOpen && (
                <Modal title="Crear nuevo cliente al vuelo" onClose={() => setClienteRapidoOpen(false)} width={500}>
                    <form onSubmit={guardarClienteRapido} className="stack gap-md">
                        {errorClienteRapido && <div className="alert-banner error">{errorClienteRapido}</div>}
                        <div className="field">
                            <label>Razón Social / Nombre Fantasía *</label>
                            <input
                                required
                                placeholder="Ej: Dietética Naturalis / Juan Pérez"
                                value={nuevoCliente.razon_social}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, razon_social: e.target.value })}
                            />
                        </div>
                        <div className="form-grid">
                            <div className="field">
                                <label>Teléfono / WhatsApp</label>
                                <input
                                    placeholder="Ej: 1123456789"
                                    value={nuevoCliente.telefono}
                                    onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label>CUIT / DNI</label>
                                <input
                                    placeholder="Ej: 20-33444555-9"
                                    value={nuevoCliente.cuit}
                                    onChange={e => setNuevoCliente({ ...nuevoCliente, cuit: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="field">
                            <label>Dirección de Entrega</label>
                            <input
                                placeholder="Ej: Billinghurst 1240, CABA"
                                value={nuevoCliente.direccion}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                            />
                        </div>
                        <div className="form-grid">
                            <div className="field">
                                <label>Lista de Precios</label>
                                <select
                                    value={nuevoCliente.lista_precio}
                                    onChange={e => setNuevoCliente({ ...nuevoCliente, lista_precio: e.target.value })}
                                >
                                    <option value="general">General (1-5 kg)</option>
                                    <option value="cincoKg">Mayorista 5 kg</option>
                                    <option value="diezKg">Mayorista 10 kg</option>
                                    <option value="veinticincoKg">Mayorista 25 kg</option>
                                    <option value="treintaKg">Mayorista 30 kg</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Segmento</label>
                                <select
                                    value={nuevoCliente.segmento}
                                    onChange={e => setNuevoCliente({ ...nuevoCliente, segmento: e.target.value })}
                                >
                                    <option value="Comercio">Comercio</option>
                                    <option value="Dietética">Dietética</option>
                                    <option value="Mayorista">Distribuidor Mayorista</option>
                                    <option value="Particular">Particular / Consumo</option>
                                </select>
                            </div>
                        </div>
                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setClienteRapidoOpen(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={guardandoCliente}>
                                {guardandoCliente ? 'Guardando...' : 'Crear y Asignar'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL DETALLE DE REMITO CON VISUAL PIPELINE TRACKER */}
            {detalle && (
                <Modal title={`Remito ${detalle.numero}`} onClose={() => setDetalle(null)} width={740}>
                    <div className="stack gap-md">
                        {/* VISUAL STEPPER TRACKER DE 7 ESTADOS */}
                        <div className="pipeline-stepper">
                            {PIPELINE_STEPS.map((paso, idx) => {
                                const stepInfo = ESTADOS[paso];
                                const currentIdx = PIPELINE_STEPS.indexOf(detalle.estado);
                                const isCurrent = detalle.estado === paso;
                                const isPassed = currentIdx > idx;

                                return (
                                    <div key={paso} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <button
                                            type="button"
                                            onClick={() => cambiarEstado(detalle.id, paso)}
                                            className={`pipeline-step ${stepInfo.badgeClass} ${isCurrent ? 'active' : ''} ${isPassed ? 'completed' : ''}`}
                                            title={`Cambiar a ${stepInfo.label}`}
                                        >
                                            <span>{stepInfo.icon}</span>
                                            <span>{stepInfo.label}</span>
                                        </button>
                                        {idx < PIPELINE_STEPS.length - 1 && (
                                            <span className="pipeline-step-arrow">→</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="spread" style={{ background: '#FAF9F4', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 16 }}>{detalle.cliente_nombre}</p>
                                <p className="text-sm muted">
                                    CUIT: {detalle.cliente_cuit || '—'} · Condición: {detalle.cliente_condicion_iva || 'CF'}
                                </p>
                                <p className="text-sm muted">
                                    Fecha: {formatearFecha(detalle.fecha)} {detalle.direccion_entrega && `· Destino: ${detalle.direccion_entrega}`}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className={`badge ${ESTADOS[detalle.estado]?.badgeClass || 'badge-neutral'}`} style={{ fontSize: 13, marginBottom: 4 }}>
                                    {ESTADOS[detalle.estado]?.label || detalle.estado}
                                </span>
                                <div>
                                    {detalle.pago_validado ? (
                                        <span className="badge badge-pago-validado">✓ Pago Validado en Banco</span>
                                    ) : (
                                        <span className="badge badge-pago-pendiente">⏳ Cobro / Transferencia Pendiente</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th>Lote FEFO</th>
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
                                        <td className="mono text-xs muted">{it.numero_lote || 'L-GENERAL'}</td>
                                        <td className="text-right mono">{it.cantidad} {it.unidad_medida}</td>
                                        <td className="text-right mono">{fmtMoney(it.precio_unitario)}</td>
                                        <td className="text-right mono" style={{ fontWeight: 600 }}>{fmtMoney(it.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="spread" style={{ padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
                            <span className="muted">Total comprobante:</span>
                            <span className="mono" style={{ fontWeight: 700, fontSize: 19, color: 'var(--color-primary-dark)' }}>
                                {fmtMoney(detalle.total)}
                            </span>
                        </div>

                        <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                            <div className="row gap-xs">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        const id = detalle.id;
                                        setDetalle(null);
                                        imprimirRemito(id);
                                    }}
                                >
                                    🖨️ Imprimir Remito QR
                                </button>
                                <a
                                    href={buildWhatsAppLink(detalle)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: '#047857', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                                >
                                    📲 WhatsApp (1167873243)
                                </a>
                            </div>

                            {detalle.estado !== 'anulado' && detalle.estado !== 'cancelado' && (
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => {
                                        if (confirm('¿Cancelar/Anular remito? Si el stock fue descontado al entregar, volverá automáticamente a los lotes.')) {
                                            cambiarEstado(detalle.id, 'cancelado');
                                        }
                                    }}
                                >
                                    ✕ Cancelar Remito
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* VISTA IMPRIMIBLE DE REMITO (A4 / PDF) CON QR Y ALIAS MIXPOINT2026 */}
            {remitoParaImprimir && (
                <RemitoImprimible
                    remito={remitoParaImprimir}
                    onClose={() => setRemitoParaImprimir(null)}
                />
            )}

            {/* HOJA DE RUTA Y PICKING DE DEPÓSITO */}
            {hojaDeRutaOpen && (
                <HojaDeRutaModal
                    remitoIds={seleccionados}
                    onClose={() => setHojaDeRutaOpen(false)}
                />
            )}
        </div>
    );
}
