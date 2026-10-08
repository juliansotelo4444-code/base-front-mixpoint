import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { formatearFecha } from '../utils/fechas';
import { IconCamion, IconClose } from './Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

// Plantillas de mensajes estilo Mercado Envíos
const PLANTILLAS_TRACKING = {
    en_preparacion: {
        id: 'en_preparacion',
        titulo: '📦 En Preparación',
        badge: 'Embalando pedido',
        colorBadge: '#2563EB',
        bgBadge: '#DBEAFE',
        generarTexto: ({ pedido, datos }) => {
            return `📦 *MIX POINT - SEGUIMIENTO DE ENVÍO*\n` +
                `Hola *${pedido.cliente_nombre || 'Estimado/a'}*, te informamos el estado de tu pedido:\n\n` +
                `📋 *Pedido:* #${pedido.numero}\n` +
                `🟡 *Estado actual:* ¡En preparación en nuestro depósito!\n` +
                `📦 *Bultos estimados:* ${datos.bultos || pedido.bultos || 1} bulto(s)\n` +
                `⚖️ *Peso aprox:* ${datos.peso_kg || pedido.peso_kg || '—'} kg\n\n` +
                `Estamos chequeando la calidad y preparando tu despacho. Te avisaremos apenas el transportista salga hacia tu dirección.\n\n` +
                `_Mix Point - Calidad Premium en Frutos Secos_`;
        }
    },
    en_camino: {
        id: 'en_camino',
        titulo: '🚚 En Camino (Salió a Reparto)',
        badge: 'En ruta de entrega',
        colorBadge: '#D97706',
        bgBadge: '#FEF3C7',
        generarTexto: ({ pedido, datos }) => {
            const chofer = datos.transportista || pedido.transportista || 'Mix Point Logística';
            const destino = datos.direccion_entrega || pedido.direccion_entrega || pedido.cliente_localidad || 'Tu dirección registrada';
            const franja = datos.franja_horaria ? `\n⏰ *Franja estimada:* ${datos.franja_horaria}` : '';

            return `🚚 *¡TU PEDIDO YA ESTÁ EN CAMINO!* (Mix Point)\n\n` +
                `Hola *${pedido.cliente_nombre || 'Estimado/a'}*, el chofer ya tiene tu paquete en el vehículo y salió hacia tu domicilio.\n\n` +
                `📋 *Pedido:* #${pedido.numero}\n` +
                `📍 *Dirección de destino:* ${destino}\n` +
                `🚛 *Transporte / Chofer:* ${chofer}${franja}\n` +
                `📦 *Bultos a entregar:* ${datos.bultos || pedido.bultos || 1}\n\n` +
                `Por favor tené disponible a alguien mayor para la recepción o el comprobante de pago si correspondiese.\n\n` +
                `_¡Gracias por confiar en Mix Point!_`;
        }
    },
    proximo: {
        id: 'proximo',
        titulo: '📍 Próximo a tu Domicilio (A 10-15 min)',
        badge: 'Cerca de entregar',
        colorBadge: '#7C3AED',
        bgBadge: '#EDE9FE',
        generarTexto: ({ pedido, datos }) => {
            const chofer = datos.transportista || pedido.transportista || 'El chofer de reparto';
            return `📍 *¡ATENTO! EL CHOFER ESTÁ LLEGANDO* (Mix Point)\n\n` +
                `Hola *${pedido.cliente_nombre || 'Estimado/a'}*, te avisamos que *${chofer}* se encuentra a pocos minutos (10 a 15 min) de tu dirección:\n` +
                `🏠 *Destino:* ${datos.direccion_entrega || pedido.direccion_entrega || pedido.cliente_localidad || 'tu domicilio'}\n\n` +
                `📋 *Pedido:* #${pedido.numero}\n\n` +
                `¡Ya casi lo tenés! Muchas gracias por recibirnos.`;
        }
    },
    entregado: {
        id: 'entregado',
        titulo: '✅ Pedido Entregado',
        badge: 'Completado con éxito',
        colorBadge: '#059669',
        bgBadge: '#D1FAE5',
        generarTexto: ({ pedido, datos }) => {
            return `✅ *¡ENTREGA EXITOSA!* (Mix Point)\n\n` +
                `Hola *${pedido.cliente_nombre || 'Estimado/a'}*, tu pedido *#${pedido.numero}* ha sido entregado en destino.\n\n` +
                `Esperamos que disfrutes tus productos frescos y de calidad premium. Si tenés alguna consulta sobre tu pedido, estamos a tu disposición por este canal.\n\n` +
                `⭐️ _¡Muchas gracias por elegir Mix Point! Que lo disfrutes._`;
        }
    },
    no_atendio: {
        id: 'no_atendio',
        titulo: '⚠️ Visita sin Éxito / Reprogramar',
        badge: 'No atendió en destino',
        colorBadge: '#DC2626',
        bgBadge: '#FEE2E2',
        generarTexto: ({ pedido, datos }) => {
            return `⚠️ *VISITA DE ENTREGA SIN ÉXITO* (Mix Point)\n\n` +
                `Hola *${pedido.cliente_nombre || 'Estimado/a'}*, el chofer de Mix Point estuvo en tu domicilio para entregar el pedido *#${pedido.numero}* pero no pudimos coordinar la recepción.\n\n` +
                `Por favor avisanos por este medio cuándo podemos volver a pasar o si preferís coordinar otro horario de entrega.\n\n` +
                `_Equipo de Logística Mix Point_`;
        }
    }
};

export default function TrackingDespachoModal({ pedido, onClose, onActualizado }) {
    if (!pedido) return null;

    // Estado local para datos de despacho editables
    const [transportista, setTransportista] = useState(pedido.transportista || '');
    const [direccionEntrega, setDireccionEntrega] = useState(pedido.direccion_entrega || pedido.cliente_direccion || '');
    const [bultos, setBultos] = useState(pedido.bultos || 1);
    const [pesoKg, setPesoKg] = useState(pedido.peso_kg || '');
    const [franjaHoraria, setFranjaHoraria] = useState('');
    const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(
        pedido.estado === 'entregado' ? 'entregado' :
        pedido.estado === 'en_camino' ? 'en_camino' : 'en_preparacion'
    );
    const [mensajeEditado, setMensajeEditado] = useState('');
    const [editandoMensaje, setEditandoMensaje] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [notifCopiado, setNotifCopiado] = useState(false);

    // Obtener texto generado actual
    const getMensajeActual = () => {
        if (editandoMensaje && mensajeEditado) return mensajeEditado;
        const plantilla = PLANTILLAS_TRACKING[plantillaSeleccionada];
        if (!plantilla) return '';
        return plantilla.generarTexto({
            pedido,
            datos: {
                transportista,
                direccion_entrega: direccionEntrega,
                bultos,
                peso_kg: pesoKg,
                franja_horaria: franjaHoraria
            }
        });
    };

    // Formatear enlace de WhatsApp
    const construirEnlaceWhatsApp = () => {
        if (!pedido.cliente_telefono) return null;
        let tel = String(pedido.cliente_telefono).replace(/\D/g, '');
        if (tel.startsWith('0')) tel = tel.slice(1);
        if (tel.startsWith('15')) tel = '11' + tel.slice(2);
        if (!tel.startsWith('549') && tel.length >= 10) tel = '549' + tel;
        const texto = getMensajeActual();
        return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
    };

    // Copiar mensaje al portapapeles
    const handleCopiarMensaje = () => {
        const txt = getMensajeActual();
        navigator.clipboard.writeText(txt);
        setNotifCopiado(true);
        setTimeout(() => setNotifCopiado(false), 2500);
    };

    // Cambiar estado logístico y guardar datos
    const handleActualizarEstado = async (nuevoEstado) => {
        setGuardando(true);
        try {
            // Actualizar columna kanban o estado en backend
            if (nuevoEstado === 'en_camino' || nuevoEstado === 'listo') {
                await api.put(`/deposito/remitos/${pedido.id}/mover-columna`, { destino: 'listo' });
            } else if (nuevoEstado === 'en_preparacion' || nuevoEstado === 'armando') {
                await api.put(`/deposito/remitos/${pedido.id}/mover-columna`, { destino: 'armando' });
            }

            if (onActualizado) onActualizado();
        } catch (err) {
            console.error('Error al actualizar estado logístico:', err);
            alert(err.response?.data?.error || 'No se pudo actualizar el estado');
        } finally {
            setGuardando(false);
        }
    };

    const direccionMaps = direccionEntrega || pedido.cliente_localidad;
    const urlGoogleMaps = direccionMaps
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionMaps)}`
        : null;

    const whatsappUrl = construirEnlaceWhatsApp();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    maxWidth: 780,
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #E2E8F0'
                }}
            >
                {/* CABECERA ESTILO MERCADO ENVÍOS */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #E2E8F0',
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: '#FFE600', // Amarillo icónico tipo Mercado Envíos
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1E293B',
                            fontWeight: 900
                        }}>
                            <IconCamion width={26} height={26} strokeWidth={2} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>
                                    Despacho & Tracking en Vivo
                                </h2>
                                <span style={{
                                    background: '#FFE600',
                                    color: '#000',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 800
                                }}>
                                    ENVÍOS
                                </span>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#94A3B8' }}>
                                Remito #{pedido.numero} · {pedido.cliente_nombre}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: 6,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <IconClose width={22} height={22} />
                    </button>
                </div>

                {/* CONTENIDO DEL MODAL */}
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* BARRA DE ESTADO / LÍNEA DE TIEMPO MERCADO ENVÍOS */}
                    <div style={{
                        background: '#F8FAFC',
                        borderRadius: 12,
                        padding: '16px 20px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.5px' }}>
                            Seguimiento de la Entrega (Progreso)
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            position: 'relative'
                        }}>
                            {/* Línea conectora */}
                            <div style={{
                                position: 'absolute',
                                left: '5%',
                                right: '5%',
                                top: '16px',
                                height: 4,
                                background: '#E2E8F0',
                                zIndex: 1
                            }} />

                            {/* Pasos */}
                            {[
                                { num: 1, label: 'En Preparación', activo: true, emoji: '📦' },
                                { num: 2, label: 'En Camino', activo: pedido.estado === 'en_camino' || pedido.estado === 'entregado', emoji: '🚚' },
                                { num: 3, label: 'Entregado', activo: pedido.estado === 'entregado', emoji: '✅' }
                            ].map((paso, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    zIndex: 2,
                                    background: '#F8FAFC',
                                    padding: '0 8px'
                                }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: paso.activo ? '#10B981' : '#CBD5E1',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        fontWeight: 800,
                                        boxShadow: paso.activo ? '0 0 0 4px #D1FAE5' : 'none',
                                        transition: 'all 0.2s'
                                    }}>
                                        {paso.emoji}
                                    </div>
                                    <span style={{
                                        fontSize: 12,
                                        fontWeight: paso.activo ? 700 : 500,
                                        color: paso.activo ? '#0F172A' : '#64748B',
                                        marginTop: 6
                                    }}>
                                        {paso.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FICHA RÁPIDA DE DESTINO & TRANSPORTISTA */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        {/* Tarjeta Dirección de Entrega */}
                        <div style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: 16,
                            background: '#FFFFFF'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <strong style={{ fontSize: 13, color: '#334155' }}>📍 Domicilio de Destino</strong>
                                {urlGoogleMaps && (
                                    <a
                                        href={urlGoogleMaps}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: 11.5,
                                            color: '#2563EB',
                                            textDecoration: 'none',
                                            fontWeight: 700,
                                            background: '#EFF6FF',
                                            padding: '2px 8px',
                                            borderRadius: 6
                                        }}
                                    >
                                        🗺️ Abrir en Maps
                                    </a>
                                )}
                            </div>
                            <input
                                type="text"
                                className="input"
                                value={direccionEntrega}
                                onChange={(e) => setDireccionEntrega(e.target.value)}
                                placeholder="Calle, Altura, Localidad..."
                                style={{ width: '100%', fontSize: 13, marginBottom: 8 }}
                            />
                            <div style={{ fontSize: 12, color: '#64748B' }}>
                                <strong>Localidad:</strong> {pedido.cliente_localidad || 'No especificada'}
                            </div>
                        </div>

                        {/* Tarjeta Transportista y Datos Logísticos */}
                        <div style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: 16,
                            background: '#FFFFFF'
                        }}>
                            <strong style={{ fontSize: 13, color: '#334155', display: 'block', marginBottom: 8 }}>
                                🚛 Transporte & Bultos
                            </strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                                <div>
                                    <label style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Chofer / Empresa</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={transportista}
                                        onChange={(e) => setTransportista(e.target.value)}
                                        placeholder="Ej: Reparto Propio"
                                        style={{ width: '100%', fontSize: 12 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Bultos</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="input"
                                        value={bultos}
                                        onChange={(e) => setBultos(e.target.value)}
                                        style={{ width: '100%', fontSize: 12 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Peso (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input"
                                        value={pesoKg}
                                        onChange={(e) => setPesoKg(e.target.value)}
                                        placeholder="0.0"
                                        style={{ width: '100%', fontSize: 12 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SELECTOR DE PLANTILLAS ESTILO MERCADO ENVÍOS */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <strong style={{ fontSize: 14, color: '#1E293B' }}>
                                📲 Notificación al Cliente por WhatsApp (Estilo Mercado Envíos)
                            </strong>
                            <span style={{ fontSize: 12, color: '#64748B' }}>
                                Tel: <strong>{pedido.cliente_telefono || 'Sin registrar'}</strong>
                            </span>
                        </div>

                        {/* Botones de Selección de Mensaje */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                            {Object.values(PLANTILLAS_TRACKING).map((p) => {
                                const activo = plantillaSeleccionada === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setPlantillaSeleccionada(p.id);
                                            setEditandoMensaje(false);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: activo ? `2px solid ${p.colorBadge}` : '1px solid #E2E8F0',
                                            background: activo ? p.bgBadge : '#FFFFFF',
                                            color: activo ? p.colorBadge : '#475569',
                                            fontWeight: activo ? 800 : 500,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <span>{p.titulo}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Previsualización del Mensaje */}
                        <div style={{
                            background: '#EFEAE2', // Color de fondo típico de chat de WhatsApp
                            borderRadius: 12,
                            padding: 16,
                            border: '1px solid #D1D7DB',
                            position: 'relative'
                        }}>
                            {/* Globo de WhatsApp */}
                            <div style={{
                                background: '#FFFFFF',
                                borderRadius: '8px 8px 8px 0px',
                                padding: '12px 16px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                whiteSpace: 'pre-wrap',
                                fontSize: 13,
                                color: '#111B21',
                                lineHeight: '1.5',
                                fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'
                            }}>
                                {editandoMensaje ? (
                                    <textarea
                                        rows={8}
                                        value={mensajeEditado}
                                        onChange={(e) => setMensajeEditado(e.target.value)}
                                        style={{
                                            width: '100%',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: 6,
                                            padding: 8,
                                            fontSize: 13,
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                ) : (
                                    getMensajeActual()
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!editandoMensaje) {
                                            setMensajeEditado(getMensajeActual());
                                        }
                                        setEditandoMensaje(!editandoMensaje);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563EB',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    {editandoMensaje ? '🔒 Usar plantilla automática' : '✏️ Personalizar texto antes de enviar'}
                                </button>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={handleCopiarMensaje}
                                        className="btn btn-ghost"
                                        style={{ fontSize: 12, padding: '4px 8px' }}
                                    >
                                        {notifCopiado ? '✅ Copiado' : '📋 Copiar texto'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN PRINCIPALES */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                        borderTop: '1px solid #E2E8F0',
                        paddingTop: 16
                    }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => handleActualizarEstado('en_camino')}
                                disabled={guardando}
                                className="btn"
                                style={{
                                    background: '#D97706',
                                    color: '#FFFFFF',
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    border: 'none',
                                    padding: '8px 14px'
                                }}
                            >
                                🚚 Marcar En Camino
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActualizarEstado('listo')}
                                disabled={guardando}
                                className="btn"
                                style={{
                                    background: '#059669',
                                    color: '#FFFFFF',
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    border: 'none',
                                    padding: '8px 14px'
                                }}
                            >
                                ✅ Marcar Entregado
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary"
                                style={{ fontSize: 13 }}
                            >
                                Cerrar
                            </button>

                            {whatsappUrl ? (
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn"
                                    style={{
                                        background: '#25D366', // Verde oficial de WhatsApp
                                        color: '#FFFFFF',
                                        fontSize: 13,
                                        fontWeight: 800,
                                        padding: '10px 18px',
                                        borderRadius: 8,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)'
                                    }}
                                >
                                    <span>💬 Enviar WhatsApp Mercado Envíos</span>
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="btn"
                                    style={{
                                        background: '#E2E8F0',
                                        color: '#94A3B8',
                                        fontSize: 13,
                                        cursor: 'not-allowed'
                                    }}
                                >
                                    Sin teléfono para WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
