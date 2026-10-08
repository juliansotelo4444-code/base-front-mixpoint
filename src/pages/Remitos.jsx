import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ProductPicker from '../components/ProductPicker';
import RemitoImprimible from '../components/RemitoImprimible';
import HojaDeRutaModal from '../components/HojaDeRutaModal';
import VoiceSearchButton from '../components/VoiceSearchButton';
import EtiquetaDespachoModal from '../components/EtiquetaDespachoModal';
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

// Definición de los estados de validación y cobranza de pago
export const ESTADOS_PAGO = {
    pendiente: { label: '⏳ Pago Pendiente', badgeClass: 'badge-pago-pendiente', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
    pagado: { label: '✓ Pagado / Validado', badgeClass: 'badge-pago-validado', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
    parcial: { label: '🌓 Pago Parcial', badgeClass: 'badge-pago-parcial', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    en_revision: { label: '🔍 En Revisión', badgeClass: 'badge-pago-revision', color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
    cuenta_corriente: { label: '📑 A Cuenta Cte.', badgeClass: 'badge-pago-cta', color: '#475569', bg: '#F8FAFC', border: '#CBD5E1' },
    bonificado: { label: '🎁 Bonificado / 100%', badgeClass: 'badge-pago-bonificado', color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' }
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
    const [estadoPagoFiltro, setEstadoPagoFiltro] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [clienteRapidoOpen, setClienteRapidoOpen] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [remitoParaImprimir, setRemitoParaImprimir] = useState(null);
    const [hojaDeRutaOpen, setHojaDeRutaOpen] = useState(false);
    const [etiquetaModalRemito, setEtiquetaModalRemito] = useState(null);
    const [remitoRecienCreado, setRemitoRecienCreado] = useState(null);
    const [seleccionados, setSeleccionados] = useState([]);
    const [error, setError] = useState('');
    const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

    // Formulario de Remito
    const [clienteId, setClienteId] = useState('');
    const [fecha, setFecha] = useState(getFechaHoyLocal());
    const [direccion, setDireccion] = useState('');
    const [transportista, setTransportista] = useState('');
    const [bultosForm, setBultosForm] = useState(1);
    const [pesoKgForm, setPesoKgForm] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [permitirSinStock, setPermitirSinStock] = useState(true);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    const [items, setItems] = useState([{ producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);

    // Formulario de Edición de Remito (Transaccional ACID)
    const [remitoParaEditar, setRemitoParaEditar] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [editForm, setEditForm] = useState({
        cliente_id: '',
        fecha: '',
        direccion_entrega: '',
        transportista: '',
        bultos: 1,
        peso_kg: '',
        valor_declarado: '',
        observaciones: '',
        descuento_porcentaje: 0,
        permitir_sin_stock: true,
        motivo_edicion: ''
    });
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);
    const [errorEdicion, setErrorEdicion] = useState('');

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
            const { data } = await client.get('/remitos', {
                params: {
                    estado: estadoFiltro || undefined,
                    estado_pago: estadoPagoFiltro || undefined
                }
            });
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
    }, [estadoFiltro, estadoPagoFiltro]);

    const remitosFiltrados = q
        ? remitos.filter(r => (r.cliente_nombre && r.cliente_nombre.toLowerCase().includes(q.toLowerCase())) || (r.numero && r.numero.toLowerCase().includes(q.toLowerCase())))
        : remitos;

    function abrirNuevo() {
        setClienteId('');
        setFecha(getFechaHoyLocal());
        setDireccion('');
        setTransportista('');
        setBultosForm(1);
        setPesoKgForm('');
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
                bultos: Number(bultosForm) || 1,
                peso_kg: pesoKgForm ? Number(pesoKgForm) : undefined,
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
            // Cargar datos completos para ofrecer inmediatamente Remito A4 o Etiquetas de Despacho
            const { data: remitoCompleto } = await client.get(`/remitos/${data.id}`);
            setRemitoRecienCreado(remitoCompleto);
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

    async function abrirEtiquetas(r) {
        try {
            const { data } = await client.get(`/remitos/${r.id}`);
            setEtiquetaModalRemito(data);
        } catch (e) {
            setEtiquetaModalRemito(r);
        }
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

    async function cambiarEstadoPago(id, nuevoEstadoPago) {
        setCambiandoEstadoId(`pago-${id}`);
        try {
            await client.put(`/remitos/${id}/estado-pago`, { estado_pago: nuevoEstadoPago });
            await cargar();
            if (detalle && detalle.id === id) {
                const { data } = await client.get(`/remitos/${id}`);
                setDetalle(data);
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Error al actualizar estado de pago.');
        } finally {
            setCambiandoEstadoId(null);
        }
    }

    async function abrirEditarRemito(r) {
        setErrorEdicion('');
        try {
            const { data } = await client.get(`/remitos/${r.id}`);
            setRemitoParaEditar(data);
            setEditForm({
                cliente_id: String(data.cliente_id || ''),
                fecha: data.fecha ? String(data.fecha).slice(0, 10) : getFechaHoyLocal(),
                direccion_entrega: data.direccion_entrega || '',
                transportista: data.transportista || '',
                bultos: data.bultos || 1,
                peso_kg: data.peso_kg !== null && data.peso_kg !== undefined ? String(data.peso_kg) : '',
                valor_declarado: data.valor_declarado !== null && data.valor_declarado !== undefined ? String(data.valor_declarado) : '',
                observaciones: data.observaciones || '',
                descuento_porcentaje: data.descuento_porcentaje || 0,
                permitir_sin_stock: true,
                motivo_edicion: ''
            });
            if (data.items && data.items.length) {
                setEditItems(data.items.map(it => ({
                    producto_id: String(it.producto_id),
                    cantidad: it.cantidad,
                    precio_unitario: it.precio_unitario,
                    unidad_medida: it.unidad_medida || 'kg'
                })));
            } else {
                setEditItems([{ producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);
            }
        } catch (err) {
            alert('Error al cargar datos del remito para editar: ' + (err.response?.data?.error || err.message));
        }
    }

    function agregarEditItem() {
        setEditItems([...editItems, { producto_id: '', cantidad: '', precio_unitario: '', unidad_medida: 'kg' }]);
    }

    function quitarEditItem(i) {
        if (editItems.length === 1) return;
        setEditItems(editItems.filter((_, idx) => idx !== i));
    }

    function handleSelectProductoEdit(index, prodId, prod) {
        const nuevos = [...editItems];
        nuevos[index].producto_id = String(prodId);
        nuevos[index].unidad_medida = prod?.unidad_medida || 'kg';
        nuevos[index].precio_unitario = prod ? (prod.precio_mayorista || prod.precio_costo || 0) : '';
        setEditItems(nuevos);
    }

    async function guardarEdicion(e) {
        e.preventDefault();
        if (!remitoParaEditar) return;
        setErrorEdicion('');
        setGuardandoEdicion(true);

        try {
            const payload = {
                cliente_id: editForm.cliente_id ? Number(editForm.cliente_id) : remitoParaEditar.cliente_id,
                fecha: editForm.fecha,
                direccion_entrega: editForm.direccion_entrega,
                transportista: editForm.transportista,
                bultos: Number(editForm.bultos) || 1,
                peso_kg: editForm.peso_kg !== '' ? Number(editForm.peso_kg) : undefined,
                valor_declarado: editForm.valor_declarado !== '' ? Number(editForm.valor_declarado) : undefined,
                observaciones: editForm.observaciones,
                descuento_porcentaje: Number(editForm.descuento_porcentaje) || 0,
                permitir_sin_stock: editForm.permitir_sin_stock,
                motivo_edicion: editForm.motivo_edicion,
                items: editItems.map(it => ({
                    producto_id: Number(it.producto_id),
                    cantidad: Number(it.cantidad) || 0,
                    precio_unitario: Number(it.precio_unitario) || 0
                })).filter(it => it.producto_id > 0 && it.cantidad > 0)
            };

            if (!payload.items.length) {
                setErrorEdicion('Debe ingresar al menos un producto con cantidad válida.');
                setGuardandoEdicion(false);
                return;
            }

            const { data } = await client.put(`/remitos/${remitoParaEditar.id}`, payload);
            setRemitoParaEditar(null);
            await cargar();
            setRemitoParaImprimir(data);
        } catch (err) {
            setErrorEdicion(err.response?.data?.error || err.message || 'Error guardando edición.');
        } finally {
            setGuardandoEdicion(false);
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
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setHojaDeRutaOpen(true)}
                                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', fontWeight: 600 }}
                            >
                                🚚 Hoja de Ruta ({seleccionados.length})
                            </button>
                            {seleccionados.length === 1 && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => abrirEtiquetas({ id: seleccionados[0] })}
                                    style={{ borderColor: 'var(--color-primary-dark)', color: 'var(--color-primary-dark)', fontWeight: 600 }}
                                >
                                    🏷️ Etiqueta de Despacho
                                </button>
                            )}
                        </>
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
                        <option value="">Todos los estados logísticos</option>
                        <option value="pendiente">🟡 Pendiente</option>
                        <option value="en_preparacion">🔵 En Preparación</option>
                        <option value="esperando_pago">🟣 Esperando Pago</option>
                        <option value="en_camino">🟠 En Camino</option>
                        <option value="entregado">🟢 Entregado</option>
                        <option value="facturado">🔷 Facturado</option>
                        <option value="cancelado">🔴 Cancelado / Anulado</option>
                    </select>

                    <select
                        value={estadoPagoFiltro}
                        onChange={e => setEstadoPagoFiltro(e.target.value)}
                        style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                    >
                        <option value="">Todos los estados de pago</option>
                        <option value="pendiente">⏳ Pago Pendiente</option>
                        <option value="pagado">✓ Pagado / Validado</option>
                        <option value="parcial">🌓 Pago Parcial</option>
                        <option value="en_revision">🔍 En Revisión</option>
                        <option value="cuenta_corriente">📑 A Cuenta Cte.</option>
                        <option value="bonificado">🎁 Bonificado</option>
                    </select>
                </div>

                {/* VISTA TABLA PARA ESCRITORIO */}
                <div className="desktop-only-table table-wrap">
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
                                <th style={{ minWidth: 85, whiteSpace: 'nowrap' }}>Número</th>
                                <th style={{ minWidth: 150 }}>Cliente</th>
                                <th style={{ minWidth: 90, whiteSpace: 'nowrap' }}>Fecha</th>
                                <th style={{ minWidth: 140, whiteSpace: 'nowrap' }}>Estado Tracker</th>
                                <th style={{ minWidth: 130, whiteSpace: 'nowrap' }}>Validación Pago</th>
                                <th className="text-right" style={{ minWidth: 100, whiteSpace: 'nowrap' }}>Total</th>
                                <th className="text-right" style={{ minWidth: 260, whiteSpace: 'nowrap' }}>Acciones Rápidas</th>
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
                                        <td className="mono" style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-primary-dark)', whiteSpace: 'nowrap' }} onClick={() => verDetalle(r)}>
                                            {r.numero}
                                        </td>
                                        <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => verDetalle(r)}>
                                            <div>{r.cliente_nombre}</div>
                                            {r.cliente_telefono && (
                                                <div style={{ marginTop: 2 }}>
                                                    <a
                                                        href={buildWhatsAppLink(r)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            fontSize: 11,
                                                            color: '#059669',
                                                            textDecoration: 'none',
                                                            fontWeight: 600,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                        title="Abrir chat de WhatsApp con el cliente"
                                                    >
                                                        💬 {r.cliente_telefono}
                                                    </a>
                                                </div>
                                            )}
                                        </td>
                                        <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatearFecha(r.fecha)}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
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
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {(() => {
                                                const estadoPagoKey = r.estado_pago || (r.pago_validado ? 'pagado' : 'pendiente');
                                                const infoPago = ESTADOS_PAGO[estadoPagoKey] || ESTADOS_PAGO.pendiente;
                                                const isCambiandoPago = cambiandoEstadoId === `pago-${r.id}`;

                                                return (
                                                    <select
                                                        value={estadoPagoKey}
                                                        disabled={isCambiandoPago}
                                                        onChange={(e) => cambiarEstadoPago(r.id, e.target.value)}
                                                        className={`badge ${infoPago.badgeClass}`}
                                                        style={{
                                                            border: `1px solid ${infoPago.border}`,
                                                            background: infoPago.bg,
                                                            color: infoPago.color,
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                            fontWeight: 600,
                                                            appearance: 'none',
                                                            WebkitAppearance: 'none'
                                                        }}
                                                        title="Clic para cambiar el estado de pago del pedido"
                                                    >
                                                        <option value="pendiente">⏳ Pago Pendiente</option>
                                                        <option value="pagado">✓ Pagado / Validado</option>
                                                        <option value="parcial">🌓 Pago Parcial</option>
                                                        <option value="en_revision">🔍 En Revisión</option>
                                                        <option value="cuenta_corriente">📑 A Cuenta Cte.</option>
                                                        <option value="bonificado">🎁 Bonificado</option>
                                                    </select>
                                                );
                                            })()}
                                        </td>
                                        <td className="text-right mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {fmtMoney(r.total)}
                                            {Number(r.descuento_porcentaje) > 0 && (
                                                <div className="text-xs" style={{ color: '#B23A3A' }}>
                                                    (-{r.descuento_porcentaje}%)
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                                            <div className="row gap-xs" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                                {/* Botón WhatsApp de 1 toque */}
                                                <a
                                                    href={buildWhatsAppLink(r)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ color: '#047857', borderColor: '#A7F3D0', background: '#ECFDF5', padding: '5px 8px', fontSize: 12 }}
                                                    title="Enviar estado y datos de pago por WhatsApp (1167873243)"
                                                >
                                                    📲 WA
                                                </a>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => abrirEditarRemito(r)}
                                                    title="Editar remito y rebalancear stock (ACID)"
                                                    style={{ borderColor: '#F59E0B', color: '#B45309', fontWeight: 600, padding: '5px 8px', fontSize: 12 }}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => imprimirRemito(r.id)}
                                                    title="Imprimir remito con QR mixpoint2026"
                                                    style={{ padding: '5px 8px', fontSize: 12 }}
                                                >
                                                    🖨️ QR
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => abrirEtiquetas(r)}
                                                    title="Generar etiquetas de despacho con transporte, bultos y peso"
                                                    style={{ borderColor: 'var(--color-primary-dark)', color: 'var(--color-primary-dark)', fontWeight: 600, padding: '5px 8px', fontSize: 12 }}
                                                >
                                                    🏷️ Etiqueta
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => verDetalle(r)}
                                                    style={{ padding: '5px 8px', fontSize: 12 }}
                                                    title="Ver detalle del remito"
                                                >
                                                    👁️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* VISTA DE CARDS OPTIMIZADA PARA CELULARES */}
                <div className="mobile-only-cards">
                    {remitosFiltrados.map(r => {
                        const estadoInfo = ESTADOS[r.estado] || { label: r.estado, badgeClass: 'badge-neutral', icon: '⚪' };
                        const isCambiando = cambiandoEstadoId === r.id;
                        const estaSel = seleccionados.includes(r.id);

                        return (
                            <div key={`mob-${r.id}`} className="remito-mobile-card" style={{ borderLeft: `4px solid ${r.pago_validado ? '#10B981' : '#F59E0B'}` }}>
                                <div className="remito-mobile-header">
                                    <div className="row gap-xs" style={{ alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={estaSel}
                                            onChange={(e) => {
                                                if (e.target.checked) setSeleccionados([...seleccionados, r.id]);
                                                else setSeleccionados(seleccionados.filter(id => id !== r.id));
                                            }}
                                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                        />
                                        <strong className="mono" style={{ fontSize: 15, color: 'var(--color-primary-dark)', cursor: 'pointer' }} onClick={() => verDetalle(r)}>
                                            {r.numero}
                                        </strong>
                                    </div>
                                    <span className="mono muted text-xs">
                                        📅 {formatearFecha(r.fecha)}
                                    </span>
                                </div>

                                <div className="remito-mobile-body" onClick={() => verDetalle(r)} style={{ cursor: 'pointer' }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                                        {r.cliente_nombre}
                                    </div>
                                    {r.cliente_telefono && (
                                        <div className="text-xs" style={{ color: '#059669', fontWeight: 600 }}>
                                            💬 {r.cliente_telefono}
                                        </div>
                                    )}
                                </div>

                                <div className="spread" style={{ alignItems: 'center', marginTop: 2 }}>
                                    <div className="row gap-xs" style={{ alignItems: 'center' }}>
                                        <select
                                            value={r.estado}
                                            disabled={isCambiando}
                                            onChange={(e) => cambiarEstado(r.id, e.target.value)}
                                            className={`badge ${estadoInfo.badgeClass}`}
                                            style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', fontWeight: 600, fontSize: 11 }}
                                        >
                                            <option value="pendiente">🟡 Pendiente</option>
                                            <option value="en_preparacion">🔵 En Prep.</option>
                                            <option value="esperando_pago">🟣 Esp. Pago</option>
                                            <option value="en_camino">🟠 En Camino</option>
                                            <option value="entregado">🟢 Entregado</option>
                                            <option value="facturado">🔷 Facturado</option>
                                            <option value="cancelado">🔴 Cancelado</option>
                                        </select>
                                        <select
                                            value={r.estado_pago || (r.pago_validado ? 'pagado' : 'pendiente')}
                                            disabled={cambiandoEstadoId === `pago-${r.id}`}
                                            onChange={(e) => cambiarEstadoPago(r.id, e.target.value)}
                                            className={`badge ${ESTADOS_PAGO[r.estado_pago || (r.pago_validado ? 'pagado' : 'pendiente')]?.badgeClass || 'badge-pago-pendiente'}`}
                                            style={{ border: 'none', cursor: 'pointer', padding: '4px 6px', fontWeight: 600, fontSize: 10.5 }}
                                            title="Cambiar estado de pago"
                                        >
                                            <option value="pendiente">⏳ Pendiente</option>
                                            <option value="pagado">✓ Pagado</option>
                                            <option value="parcial">🌓 Parcial</option>
                                            <option value="en_revision">🔍 Revisión</option>
                                            <option value="cuenta_corriente">📑 Cta. Cte.</option>
                                            <option value="bonificado">🎁 Bonif.</option>
                                        </select>
                                    </div>

                                    <div className="text-right mono" style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>
                                        {fmtMoney(r.total)}
                                    </div>
                                </div>

                                <div className="remito-mobile-actions">
                                    <a
                                        href={buildWhatsAppLink(r)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        style={{ color: '#047857', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                                    >
                                        📲 WhatsApp
                                    </a>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => abrirEditarRemito(r)}
                                        style={{ borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => imprimirRemito(r.id)}
                                    >
                                        🖨️ Remito QR
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => abrirEtiquetas(r)}
                                        style={{ borderColor: 'var(--color-primary-dark)', color: 'var(--color-primary-dark)', fontWeight: 600 }}
                                    >
                                        🏷️ Etiqueta
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!loading && remitosFiltrados.length === 0 && (
                    <div className="empty-state">
                        <div className="icon">🧾</div>
                        <p>No hay remitos registrados que coincidan.</p>
                    </div>
                )}
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
                                <label>Transportista / Chofer / Expreso</label>
                                <input
                                    placeholder="Ej: Flete propio / Vía Cargo"
                                    value={transportista}
                                    onChange={e => setTransportista(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label>Bultos estimados</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    value={bultosForm}
                                    onChange={e => setBultosForm(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label>Peso estimado en kg (opcional)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="Automático según ítems"
                                    value={pesoKgForm}
                                    onChange={e => setPesoKgForm(e.target.value)}
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
                                                <div className="item-col-precio">
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
                                                <div className="item-col-subtotal">
                                                    <label className="text-xs muted" style={{ display: 'block', fontWeight: 400 }}>Subtotal</label>
                                                    <div className="mono" style={{ fontWeight: 700, fontSize: 14, paddingTop: 4, color: 'var(--color-primary-dark)' }}>
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
                                <span className={`badge ${ESTADOS[detalle.estado]?.badgeClass || 'badge-neutral'}`} style={{ fontSize: 13, marginBottom: 6, display: 'inline-block' }}>
                                    {ESTADOS[detalle.estado]?.label || detalle.estado}
                                </span>
                                <div>
                                    {(() => {
                                        const pKey = detalle.estado_pago || (detalle.pago_validado ? 'pagado' : 'pendiente');
                                        const pInfo = ESTADOS_PAGO[pKey] || ESTADOS_PAGO.pendiente;
                                        return (
                                            <select
                                                value={pKey}
                                                onChange={(e) => cambiarEstadoPago(detalle.id, e.target.value)}
                                                className={`badge ${pInfo.badgeClass}`}
                                                style={{
                                                    border: `1px solid ${pInfo.border}`,
                                                    background: pInfo.bg,
                                                    color: pInfo.color,
                                                    fontSize: 12,
                                                    cursor: 'pointer',
                                                    padding: '5px 10px',
                                                    fontWeight: 700
                                                }}
                                                title="Cambiar estado de cobranza/pago"
                                            >
                                                <option value="pendiente">⏳ Pago Pendiente</option>
                                                <option value="pagado">✓ Pagado / Validado</option>
                                                <option value="parcial">🌓 Pago Parcial</option>
                                                <option value="en_revision">🔍 En Revisión</option>
                                                <option value="cuenta_corriente">📑 A Cuenta Corriente</option>
                                                <option value="bonificado">🎁 Bonificado (100%)</option>
                                            </select>
                                        );
                                    })()}
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
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        const r = detalle;
                                        setDetalle(null);
                                        abrirEtiquetas(r);
                                    }}
                                    style={{ borderColor: 'var(--color-primary-dark)', color: 'var(--color-primary-dark)', fontWeight: 600 }}
                                >
                                    🏷️ Etiqueta de Despacho
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        const r = detalle;
                                        setDetalle(null);
                                        abrirEditarRemito(r);
                                    }}
                                    style={{ borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                                >
                                    ✏️ Editar Remito
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

            {/* MODAL DE CONFIRMACIÓN POST-CREACIÓN DE REMITO */}
            {remitoRecienCreado && (
                <Modal title="🎉 Remito Emitido con Éxito" onClose={() => setRemitoRecienCreado(null)} width={540}>
                    <div className="stack gap-md" style={{ textAlign: 'center', padding: '10px 4px' }}>
                        <div style={{ fontSize: 44 }}>📦</div>
                        <h3 style={{ fontSize: 19, margin: 0, color: 'var(--color-primary-dark)' }}>
                            Remito #{remitoRecienCreado.numero} Emitido
                        </h3>
                        <p className="text-sm muted" style={{ margin: 0 }}>
                            Cliente: <strong>{remitoRecienCreado.cliente_nombre}</strong> · Total: <strong>{fmtMoney(remitoRecienCreado.total)}</strong>
                        </p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                            marginTop: 12
                        }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                    padding: '16px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    borderRadius: 8,
                                    border: '1.5px solid var(--color-border-strong)'
                                }}
                                onClick={() => {
                                    const r = remitoRecienCreado;
                                    setRemitoRecienCreado(null);
                                    imprimirRemito(r.id);
                                }}
                            >
                                <span style={{ fontSize: 26 }}>🖨️</span>
                                <span style={{ fontWeight: 700, fontSize: 13.5 }}>Imprimir Remito A4</span>
                                <span className="text-xs muted">Comprobante comercial con QR</span>
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{
                                    padding: '16px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    borderRadius: 8
                                }}
                                onClick={() => {
                                    const r = remitoRecienCreado;
                                    setRemitoRecienCreado(null);
                                    abrirEtiquetas(r);
                                }}
                            >
                                <span style={{ fontSize: 26 }}>🏷️</span>
                                <span style={{ fontWeight: 700, fontSize: 13.5 }}>Etiquetas de Despacho</span>
                                <span className="text-xs" style={{ opacity: 0.9 }}>Bultos, transporte y peso</span>
                            </button>
                        </div>

                        <div style={{ marginTop: 10 }}>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setRemitoRecienCreado(null)}
                            >
                                Continuar en el listado
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL EDITAR REMITO (TRANSACCIONAL ACID CON REBALANCEO DE STOCK) */}
            {remitoParaEditar && (
                <Modal title={`✏️ Editar Remito #${remitoParaEditar.numero}`} onClose={() => setRemitoParaEditar(null)} width={880}>
                    <form onSubmit={guardarEdicion} className="stack gap-md">
                        {errorEdicion && <div className="alert-banner error">{errorEdicion}</div>}

                        <div className="alert-banner info" style={{ fontSize: 13, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                            ℹ️ <strong>Lógica Transaccional ACID:</strong> Al guardar, el backend revierte automáticamente el stock anterior en lotes y cuenta corriente, valida la nueva mercadería y descuenta las cantidades actualizadas de manera atómica con registro en auditoría.
                        </div>

                        <div className="form-grid">
                            <div className="field">
                                <label>Cliente destinatario *</label>
                                <select
                                    value={editForm.cliente_id}
                                    onChange={e => {
                                        const cId = e.target.value;
                                        const c = clientes.find(x => x.id === Number(cId));
                                        setEditForm({
                                            ...editForm,
                                            cliente_id: cId,
                                            direccion_entrega: c?.direccion || editForm.direccion_entrega
                                        });
                                    }}
                                    required
                                >
                                    <option value="">Seleccionar cliente…</option>
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.razon_social} {c.telefono ? `(${c.telefono})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label>Fecha de emisión *</label>
                                <input
                                    type="date"
                                    value={editForm.fecha}
                                    onChange={e => setEditForm({ ...editForm, fecha: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Dirección de entrega</label>
                                <input
                                    placeholder="Ej: Av. Rivadavia 1234, Morón"
                                    value={editForm.direccion_entrega}
                                    onChange={e => setEditForm({ ...editForm, direccion_entrega: e.target.value })}
                                />
                            </div>

                            <div className="field">
                                <label>Transporte / Chofer</label>
                                <input
                                    placeholder="Ej: Logística Mix / Flete Propio"
                                    value={editForm.transportista}
                                    onChange={e => setEditForm({ ...editForm, transportista: e.target.value })}
                                />
                            </div>

                            <div className="field">
                                <label>Bultos</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editForm.bultos}
                                    onChange={e => setEditForm({ ...editForm, bultos: e.target.value })}
                                />
                            </div>

                            <div className="field">
                                <label>Peso estimado (kg)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Calculado según ítems"
                                    value={editForm.peso_kg}
                                    onChange={e => setEditForm({ ...editForm, peso_kg: e.target.value })}
                                />
                            </div>

                            <div className="field">
                                <label>Descuento comercial (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={editForm.descuento_porcentaje}
                                    onChange={e => setEditForm({ ...editForm, descuento_porcentaje: e.target.value })}
                                />
                            </div>

                            <div className="field">
                                <label>Motivo de edición (para Auditoría) *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Corrección de cantidad a pedido del cliente"
                                    value={editForm.motivo_edicion}
                                    onChange={e => setEditForm({ ...editForm, motivo_edicion: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* LISTA DE ÍTEMS EDITABLES */}
                        <div className="stack gap-xs">
                            <div className="spread">
                                <label style={{ fontWeight: 700 }}>
                                    Mercadería del Remito (Edición de cantidades y precios)
                                </label>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={agregarEditItem}>
                                    <IconPlus /> Agregar producto
                                </button>
                            </div>

                            <div className="stack gap-sm">
                                {editItems.map((it, i) => {
                                    const prod = productos.find(p => p.id === Number(it.producto_id));

                                    return (
                                        <div key={i} className="item-row-card">
                                            <div className="item-row-header">
                                                <div className="item-row-product">
                                                    <ProductPicker
                                                        productos={productos}
                                                        value={it.producto_id}
                                                        onChange={(id, p) => handleSelectProductoEdit(i, id, p)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm item-row-delete"
                                                    onClick={() => quitarEditItem(i)}
                                                    disabled={editItems.length === 1}
                                                    style={{ color: 'var(--color-danger)' }}
                                                    title="Quitar producto"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="item-row-details">
                                                <div className="item-col-cant">
                                                    <label className="text-xs muted">Cantidad ({prod?.unidad_medida || 'kg'})</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Cantidad"
                                                        value={it.cantidad}
                                                        onChange={e => {
                                                            const copy = [...editItems];
                                                            copy[i].cantidad = e.target.value;
                                                            setEditItems(copy);
                                                        }}
                                                        style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                                        required
                                                    />
                                                </div>
                                                <div className="item-col-precio">
                                                    <label className="text-xs muted">Precio Unitario ($)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="P. Unitario ($)"
                                                        value={it.precio_unitario}
                                                        onChange={e => {
                                                            const copy = [...editItems];
                                                            copy[i].precio_unitario = e.target.value;
                                                            setEditItems(copy);
                                                        }}
                                                        style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid var(--color-border-strong)' }}
                                                        required
                                                    />
                                                </div>
                                                <div className="item-col-subtotal">
                                                    <label className="text-xs muted" style={{ display: 'block', fontWeight: 400 }}>Subtotal</label>
                                                    <div className="mono" style={{ fontWeight: 700, fontSize: 14, paddingTop: 4, color: 'var(--color-primary-dark)' }}>
                                                        {fmtMoney((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Observaciones */}
                        <div className="field">
                            <label>Observaciones / Instrucciones de entrega</label>
                            <textarea
                                rows={2}
                                value={editForm.observaciones}
                                onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })}
                            />
                        </div>

                        {/* RESUMEN Y BOTONES */}
                        <div className="spread" style={{ padding: '12px 0', borderTop: '2px solid var(--color-border)' }}>
                            <div className="row gap-md" style={{ alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.permitir_sin_stock}
                                        onChange={e => setEditForm({ ...editForm, permitir_sin_stock: e.target.checked })}
                                    />
                                    Permitir emitir sin stock físico suficiente
                                </label>
                            </div>
                            <div className="row gap-sm">
                                <button type="button" className="btn btn-ghost" onClick={() => setRemitoParaEditar(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={guardandoEdicion}>
                                    {guardandoEdicion ? 'Guardando cambios (ACID)...' : '💾 Guardar Cambios y Actualizar Stock'}
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* VISTA IMPRIMIBLE DE REMITO (A4 / PDF) CON QR Y ALIAS MIXPOINT2026 */}
            {remitoParaImprimir && (
                <RemitoImprimible
                    remito={remitoParaImprimir}
                    onClose={() => setRemitoParaImprimir(null)}
                    onAbrirEtiquetas={(r) => {
                        setRemitoParaImprimir(null);
                        abrirEtiquetas(r);
                    }}
                />
            )}

            {/* MODAL ETIQUETAS DE DESPACHO PARA TRANSPORTE Y BULTOS */}
            {etiquetaModalRemito && (
                <EtiquetaDespachoModal
                    remito={etiquetaModalRemito}
                    onClose={() => setEtiquetaModalRemito(null)}
                    onUpdated={(actualizado) => {
                        setEtiquetaModalRemito(actualizado);
                        cargar();
                    }}
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
