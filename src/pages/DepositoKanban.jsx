import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useKanbanSocket from '../hooks/useKanbanSocket';
import HojaDeRutaModal from '../components/HojaDeRutaModal';
import EtiquetaDespachoModal from '../components/EtiquetaDespachoModal';
import RemitoImprimible from '../components/RemitoImprimible';
import { formatearFecha } from '../utils/fechas';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

function formatWhatsAppLink(telefono, clienteNombre, remitoNumero) {
    if (!telefono) return null;
    let tel = String(telefono).replace(/\D/g, '');
    if (tel.startsWith('0')) tel = tel.slice(1);
    if (tel.startsWith('15')) tel = '11' + tel.slice(2);
    if (!tel.startsWith('549') && tel.length >= 10) tel = '549' + tel;
    const msg = `¡Hola ${clienteNombre || 'Cliente'}! Tu pedido #${remitoNumero} está en preparación en el depósito central de Mix Point.`;
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

export default function DepositoKanban() {
    const { usuario } = useAuth();
    const [columnas, setColumnas] = useState({
        pendiente: [],
        armando: [],
        listo: []
    });
    const [cargando, setCargando] = useState(true);
    const [seleccionados, setSeleccionados] = useState([]);
    const [notificacion, setNotificacion] = useState(null); // { tipo: 'info' | 'error' | 'success', texto: '' }
    const [arrastrandoId, setArrastrandoId] = useState(null);
    const [filtroTexto, setFiltroTexto] = useState('');

    // Modales
    const [hojaDeRutaOpen, setHojaDeRutaOpen] = useState(false);
    const [etiquetaModalRemito, setEtiquetaModalRemito] = useState(null);
    const [remitoParaVer, setRemitoParaVer] = useState(null);

    // Cargar tablero desde API
    const cargarTablero = useCallback(async () => {
        try {
            const data = await api.get('/deposito/kanban');
            if (data?.columnas) {
                setColumnas(data.columnas);
            }
        } catch (err) {
            console.error('Error al cargar pedidos del depósito:', err);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarTablero();
    }, [cargarTablero]);

    // Manejar eventos de Socket.io en tiempo real
    const handleEventoSocket = useCallback((evento, payload) => {
        console.log(`📡 [Socket Evento] ${evento}`, payload);
        // Mostrar notificación toast no intrusiva
        if (evento === 'remito:asignado') {
            mostrarToast(`⚡ Pedido #${payload.numero} tomado por ${payload.operario_nombre}`, 'info');
        } else if (evento === 'remito:creado') {
            mostrarToast(`📥 Nuevo pedido #${payload.numero} ingresó al depósito`, 'info');
        } else if (evento === 'kanban:movido') {
            mostrarToast(`📦 Pedido #${payload.numero} movido a "${payload.columna_destino}"`, 'info');
        }
        // Refrescar estado del tablero
        cargarTablero();
    }, [cargarTablero]);

    const { conectado } = useKanbanSocket(handleEventoSocket);

    function mostrarToast(texto, tipo = 'info') {
        setNotificacion({ texto, tipo });
        setTimeout(() => {
            setNotificacion(null);
        }, 4500);
    }

    // Tomar pedido (Control Atómico de Concurrencia)
    async function handleTomarPedido(pedido) {
        try {
            await api.post(`/deposito/remitos/${pedido.id}/tomar`);
            mostrarToast(`Tomaste el pedido #${pedido.numero}. ¡A armar! 🚀`, 'success');
            cargarTablero();
        } catch (err) {
            if (err.response?.status === 409) {
                mostrarToast(`⚠️ CONFLICTO: ${err.response.data.error}`, 'error');
            } else {
                mostrarToast(err.response?.data?.error || 'No se pudo tomar el pedido.', 'error');
            }
            cargarTablero();
        }
    }

    // Liberar pedido
    async function handleLiberarPedido(pedido) {
        try {
            await api.post(`/deposito/remitos/${pedido.id}/liberar`);
            mostrarToast(`Pedido #${pedido.numero} liberado al depósito.`, 'info');
            cargarTablero();
        } catch (err) {
            mostrarToast(err.response?.data?.error || 'No se pudo liberar el pedido.', 'error');
        }
    }

    // Arrastrar y Soltar (Drag & Drop)
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', String(id));
        setArrastrandoId(id);
    };

    const handleDragEnd = () => {
        setArrastrandoId(null);
    };

    const handleDrop = async (e, columnaDestino) => {
        e.preventDefault();
        const remitoId = e.dataTransfer.getData('text/plain') || arrastrandoId;
        setArrastrandoId(null);
        if (!remitoId) return;

        try {
            await api.put(`/deposito/remitos/${remitoId}/mover-columna`, { destino: columnaDestino });
            mostrarToast(`Pedido movido a ${columnaDestino.toUpperCase()}`, 'success');
            cargarTablero();
        } catch (err) {
            mostrarToast(err.response?.data?.error || 'Error al mover pedido.', 'error');
        }
    };

    // Selección múltiple (Batching)
    const toggleSeleccion = (id) => {
        setSeleccionados((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const seleccionarTodosColumna = (lista) => {
        const ids = lista.map((p) => p.id);
        const yaEstanTodos = ids.every((id) => seleccionados.includes(id));
        if (yaEstanTodos) {
            setSeleccionados((prev) => prev.filter((id) => !ids.includes(id)));
        } else {
            setSeleccionados((prev) => Array.from(new Set([...prev, ...ids])));
        }
    };

    // Acciones Batch
    async function handleBatchCambiarEstado(destino) {
        if (!seleccionados.length) return;
        try {
            await api.post('/deposito/batch/cambiar-estado', {
                remito_ids: seleccionados,
                destino
            });
            mostrarToast(`${seleccionados.length} pedidos actualizados con éxito.`, 'success');
            setSeleccionados([]);
            cargarTablero();
        } catch (err) {
            mostrarToast(err.response?.data?.error || 'Error en operación por lote.', 'error');
        }
    }

    // Filtrar pedidos según buscador
    const filtrarLista = (lista) => {
        if (!filtroTexto.trim()) return lista;
        const q = filtroTexto.toLowerCase();
        return lista.filter(
            (p) =>
                (p.numero && p.numero.toLowerCase().includes(q)) ||
                (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(q)) ||
                (p.transportista && p.transportista.toLowerCase().includes(q)) ||
                (p.operario_nombre && p.operario_nombre.toLowerCase().includes(q))
        );
    };

    const configColumnas = [
        {
            key: 'pendiente',
            titulo: '🟡 Pendientes de Picking',
            subtitulo: 'Sin asignar o esperando inicio',
            bordeColor: '#F59E0B',
            bgGlow: 'rgba(245, 158, 11, 0.04)',
            badgeBg: '#FEF3C7',
            badgeColor: '#92400E'
        },
        {
            key: 'armando',
            titulo: '🔵 En Preparación (Mesa)',
            subtitulo: 'Bloqueado por operario activo',
            bordeColor: '#3B82F6',
            bgGlow: 'rgba(59, 130, 246, 0.04)',
            badgeBg: '#DBEAFE',
            badgeColor: '#1E40AF'
        },
        {
            key: 'listo',
            titulo: '🟢 Listos para Despacho',
            subtitulo: 'Embalados o en camino',
            bordeColor: '#10B981',
            bgGlow: 'rgba(16, 185, 129, 0.04)',
            badgeBg: '#D1FAE5',
            badgeColor: '#065F46'
        }
    ];

    return (
        <div className="container" style={{ maxWidth: '100%', margin: '0 auto', padding: '20px 16px' }}>
            {/* NOTIFICACIÓN TOAST FLOTANTE */}
            <AnimatePresence>
                {notificacion && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            top: 24,
                            right: 24,
                            zIndex: 9999,
                            padding: '12px 20px',
                            borderRadius: 12,
                            background: notificacion.tipo === 'error' ? '#991B1B' : notificacion.tipo === 'success' ? '#065F46' : '#1E293B',
                            color: '#FFFFFF',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                            fontSize: 14,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                    >
                        <span>{notificacion.tipo === 'error' ? '⚠️' : notificacion.tipo === 'success' ? '✅' : '⚡'}</span>
                        <span>{notificacion.texto}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ENCABEZADO SUPERIOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--color-primary-dark, #1A382B)' }}>
                            🏭 Depósito Central · Tablero Kanban
                        </h1>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            background: conectado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: conectado ? '#059669' : '#DC2626'
                        }}>
                            <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: conectado ? '#10B981' : '#EF4444',
                                display: 'inline-block'
                            }} />
                            {conectado ? 'Sincronizado en tiempo real' : 'Reconectando socket...'}
                        </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: 14 }}>
                        Control de concurrencia atómica, asignación de operarios y despacho en lote.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar remito, cliente, operario..."
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                        className="input"
                        style={{ width: 260, fontSize: 13 }}
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={cargarTablero}
                        title="Refrescar datos"
                        style={{ fontSize: 13 }}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* TABLERO KANBAN DE 3 COLUMNAS */}
            {cargando ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
                    <div>Cargando pedidos del depósito...</div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 16,
                    alignItems: 'start'
                }}>
                    {configColumnas.map((col) => {
                        const lista = filtrarLista(columnas[col.key] || []);

                        return (
                            <div
                                key={col.key}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, col.key)}
                                style={{
                                    background: col.bgGlow,
                                    borderRadius: 16,
                                    border: `1.5px solid ${col.bordeColor}44`,
                                    padding: 14,
                                    minHeight: 520,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backdropFilter: 'blur(8px)',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                {/* CABECERA DE COLUMNA */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 12,
                                    paddingBottom: 8,
                                    borderBottom: `2px solid ${col.bordeColor}`
                                }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
                                            {col.titulo}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                                            {col.subtitulo}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{
                                            background: col.badgeBg,
                                            color: col.badgeColor,
                                            padding: '2px 8px',
                                            borderRadius: 12,
                                            fontSize: 12,
                                            fontWeight: 800
                                        }}>
                                            {lista.length}
                                        </span>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => seleccionarTodosColumna(lista)}
                                            title="Seleccionar todos los de esta columna"
                                            style={{ padding: '2px 6px', fontSize: 11 }}
                                        >
                                            ☑️
                                        </button>
                                    </div>
                                </div>

                                {/* LISTA DE TARJETAS CON ANIMACIONES FRAMER MOTION */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                    <AnimatePresence>
                                        {lista.map((pedido) => {
                                            const estaSeleccionado = seleccionados.includes(pedido.id);
                                            const esMio = pedido.operario_asignado_id === usuario?.id;
                                            const whatsappUrl = formatWhatsAppLink(pedido.cliente_telefono, pedido.cliente_nombre, pedido.numero);

                                            return (
                                                <motion.div
                                                    key={pedido.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ duration: 0.2 }}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, pedido.id)}
                                                    onDragEnd={handleDragEnd}
                                                    style={{
                                                        background: '#ffffff',
                                                        borderRadius: 12,
                                                        padding: 14,
                                                        border: estaSeleccionado
                                                            ? '2px solid #2563EB'
                                                            : esMio
                                                            ? '2px solid #3B82F6'
                                                            : '1px solid #E5E7EB',
                                                        boxShadow: arrastrandoId === pedido.id
                                                            ? '0 12px 28px rgba(0,0,0,0.18)'
                                                            : '0 2px 6px rgba(0,0,0,0.05)',
                                                        cursor: 'grab',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    {/* FILA SUPERIOR: Checkbox, Número y Fecha */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={estaSeleccionado}
                                                                onChange={() => toggleSeleccion(pedido.id)}
                                                                style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                                                            />
                                                            <strong style={{ fontSize: 14, color: '#1F2937' }}>
                                                                {pedido.numero}
                                                            </strong>
                                                        </div>
                                                        <span style={{ fontSize: 11.5, color: '#6B7280' }}>
                                                            📅 {formatearFecha(pedido.fecha)}
                                                        </span>
                                                    </div>

                                                    {/* CLIENTE Y TELÉFONO WHATSAPP */}
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>
                                                            {pedido.cliente_nombre}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                                            {pedido.cliente_localidad && (
                                                                <span style={{ fontSize: 11.5, color: '#6B7280' }}>
                                                                    📍 {pedido.cliente_localidad}
                                                                </span>
                                                            )}
                                                            {pedido.cliente_telefono && whatsappUrl && (
                                                                <a
                                                                    href={whatsappUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 4,
                                                                        fontSize: 11.5,
                                                                        color: '#059669',
                                                                        fontWeight: 700,
                                                                        textDecoration: 'none',
                                                                        background: '#ECFDF5',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 4
                                                                    }}
                                                                    title="Chatear por WhatsApp con el cliente"
                                                                >
                                                                    💬 {pedido.cliente_telefono}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* DATOS DE PICKING: Bultos, Peso, Ítems */}
                                                    <div style={{
                                                        background: '#F9FAFB',
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        fontSize: 12,
                                                        color: '#4B5563',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginBottom: 10
                                                    }}>
                                                        <span>📦 {pedido.bultos || 1} bultos</span>
                                                        <span>⚖️ {pedido.peso_kg ? `${pedido.peso_kg} kg` : '—'}</span>
                                                        <span>📋 {pedido.items_cantidad || 0} ítems</span>
                                                    </div>

                                                    {/* OPERARIO ASIGNADO O BLOQUEO */}
                                                    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        {pedido.operario_nombre ? (
                                                            <span style={{
                                                                fontSize: 11.5,
                                                                fontWeight: 700,
                                                                padding: '3px 8px',
                                                                borderRadius: 6,
                                                                background: esMio ? '#DBEAFE' : '#FEE2E2',
                                                                color: esMio ? '#1E40AF' : '#991B1B',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5
                                                            }}>
                                                                <span>{esMio ? '👤 Mi pedido' : '🔒 Asignado a:'}</span>
                                                                <strong>{pedido.operario_nombre}</strong>
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                                                                Libre para tomar
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A382B' }}>
                                                            {fmtMoney(pedido.total)}
                                                        </span>
                                                    </div>

                                                    {/* BOTONES DE ACCIÓN RÁPIDA */}
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #F3F4F6', paddingTop: 8 }}>
                                                        {!pedido.operario_asignado_id ? (
                                                            <button
                                                                className="btn btn-primary"
                                                                onClick={() => handleTomarPedido(pedido)}
                                                                style={{ flex: 1, fontSize: 12, padding: '5px 8px' }}
                                                            >
                                                                ✋ Tomar Pedido
                                                            </button>
                                                        ) : (esMio || usuario?.rol === 'admin') ? (
                                                            <button
                                                                className="btn btn-ghost"
                                                                onClick={() => handleLiberarPedido(pedido)}
                                                                style={{ fontSize: 11.5, padding: '4px 8px', color: '#6B7280' }}
                                                                title="Liberar para otro operario"
                                                            >
                                                                🔓 Liberar
                                                            </button>
                                                        ) : null}

                                                        {/* Ver remito o imprimir */}
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={async () => {
                                                                const { data } = await api.client.get(`/remitos/${pedido.id}`);
                                                                setRemitoParaVer(data);
                                                            }}
                                                            style={{ fontSize: 11.5, padding: '4px 8px' }}
                                                            title="Ver Remito completo"
                                                        >
                                                            👁️ Ver
                                                        </button>

                                                        {/* Generar etiquetas de despacho */}
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={async () => {
                                                                const { data } = await api.client.get(`/remitos/${pedido.id}`);
                                                                setEtiquetaModalRemito(data);
                                                            }}
                                                            style={{ fontSize: 11.5, padding: '4px 8px' }}
                                                            title="Imprimir etiquetas de despacho"
                                                        >
                                                            🏷️ Etiqueta
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* BARRA FLOTANTE DE ACCIONES POR LOTE (BATCHING) */}
            <AnimatePresence>
                {seleccionados.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        style={{
                            position: 'fixed',
                            bottom: 24,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 999,
                            background: 'rgba(17, 24, 39, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 16,
                            padding: '12px 24px',
                            color: '#FFFFFF',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            flexWrap: 'wrap'
                        }}
                    >
                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                            📦 {seleccionados.length} pedidos seleccionados
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                                className="btn"
                                onClick={() => handleBatchCambiarEstado('armando')}
                                style={{ background: '#2563EB', color: '#fff', fontSize: 12.5, padding: '6px 12px', border: 'none' }}
                            >
                                🔵 Pasar a Armando
                            </button>
                            <button
                                className="btn"
                                onClick={() => handleBatchCambiarEstado('listo')}
                                style={{ background: '#059669', color: '#fff', fontSize: 12.5, padding: '6px 12px', border: 'none' }}
                            >
                                🟢 Pasar a Listo
                            </button>
                            <button
                                className="btn"
                                onClick={() => setHojaDeRutaOpen(true)}
                                style={{ background: '#7C3AED', color: '#fff', fontSize: 12.5, padding: '6px 12px', border: 'none' }}
                            >
                                📋 Hoja de Ruta Consolidada
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setSeleccionados([])}
                                style={{ color: '#9CA3AF', fontSize: 12, padding: '6px 10px' }}
                            >
                                Deseleccionar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODALES ADICIONALES */}
            {hojaDeRutaOpen && (
                <HojaDeRutaModal
                    remitoIds={seleccionados}
                    onClose={() => setHojaDeRutaOpen(false)}
                />
            )}

            {etiquetaModalRemito && (
                <EtiquetaDespachoModal
                    remito={etiquetaModalRemito}
                    onClose={() => setEtiquetaModalRemito(null)}
                />
            )}

            {remitoParaVer && (
                <RemitoImprimible
                    remito={remitoParaVer}
                    onClose={() => setRemitoParaVer(null)}
                    onAbrirEtiquetas={(r) => {
                        setRemitoParaVer(null);
                        setEtiquetaModalRemito(r);
                    }}
                />
            )}
        </div>
    );
}
