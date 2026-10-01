import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { IconCampana, IconCheck, IconAlerta, IconClose } from './Icons';

export default function NotificacionesDropdown() {
    const [abierto, setAbierto] = useState(false);
    const [notificaciones, setNotificaciones] = useState([]);
    const [noLeidas, setNoLeidas] = useState(0);
    const [cargando, setCargando] = useState(false);
    const dropdownRef = useRef(null);

    async function cargarNotificaciones() {
        try {
            const data = await api.get('/notificaciones?limite=20');
            setNotificaciones(data.notificaciones || []);
            setNoLeidas(data.no_leidas || 0);
        } catch (err) {
            console.error('Error cargando notificaciones:', err);
        }
    }

    useEffect(() => {
        cargarNotificaciones();
        const interval = setInterval(cargarNotificaciones, 30000); // Polling cada 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickAfuera(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setAbierto(false);
            }
        }
        if (abierto) {
            document.addEventListener('mousedown', handleClickAfuera);
        }
        return () => document.removeEventListener('mousedown', handleClickAfuera);
    }, [abierto]);

    async function marcarComoLeida(id, e) {
        if (e) e.stopPropagation();
        try {
            await api.put(`/notificaciones/${id}/leer`);
            setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
            setNoLeidas(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marcando notificación:', err);
        }
    }

    async function marcarTodasLeidas() {
        try {
            await api.post('/notificaciones/marcar-todas');
            setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
            setNoLeidas(0);
        } catch (err) {
            console.error('Error marcando todas:', err);
        }
    }

    async function forzarEscaneoStock() {
        setCargando(true);
        try {
            await api.post('/notificaciones/verificar-stock');
            await cargarNotificaciones();
        } catch (err) {
            console.error('Error verificando stock:', err);
        } finally {
            setCargando(false);
        }
    }

    function formatearFecha(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const hoy = new Date();
        const diffMin = Math.round((hoy - d) / 60000);
        if (diffMin < 1) return 'Recién';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        const diffHoras = Math.round(diffMin / 60);
        if (diffHoras < 24) return `Hace ${diffHoras} h`;
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    }

    return (
        <div className="notificaciones-container" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                type="button"
                className="icon-btn notificaciones-bell"
                onClick={() => setAbierto(!abierto)}
                title="Centro de Notificaciones y Alertas"
                style={{
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-on-dark, #fff)',
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <IconCampana style={{ width: 20, height: 20 }} />
                {noLeidas > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'var(--color-danger, #ef4444)',
                        color: '#fff',
                        fontSize: 10.5,
                        fontWeight: 700,
                        minWidth: 17,
                        height: 17,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 0 0 2px #11141d'
                    }}>
                        {noLeidas > 99 ? '99+' : noLeidas}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="notificaciones-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 340,
                    maxHeight: 460,
                    background: '#191E2D',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#131722'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>Notificaciones</span>
                            {noLeidas > 0 && (
                                <span style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 10
                                }}>
                                    {noLeidas} nuevas
                                </span>
                            )}
                        </div>
                        {noLeidas > 0 && (
                            <button
                                onClick={marcarTodasLeidas}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary, #C9A227)',
                                    fontSize: 11.5,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Marcar todas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
                        {notificaciones.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#8e9aa8', fontSize: 13 }}>
                                <IconCheck style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.5, color: '#10b981' }} />
                                <div>No tenés notificaciones pendientes</div>
                            </div>
                        ) : (
                            notificaciones.map(n => {
                                const esDanger = n.nivel === 'danger';
                                const esWarning = n.nivel === 'warning';
                                const bordeColor = esDanger ? '#ef4444' : (esWarning ? '#f59e0b' : '#3b82f6');

                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => !n.leida && marcarComoLeida(n.id)}
                                        style={{
                                            padding: '10px 14px',
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                            borderLeft: `4px solid ${bordeColor}`,
                                            background: n.leida ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                                            cursor: n.leida ? 'default' : 'pointer',
                                            transition: 'background 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                            <span style={{
                                                fontSize: 12.5,
                                                fontWeight: n.leida ? 500 : 700,
                                                color: n.leida ? '#cbd5e1' : '#fff'
                                            }}>
                                                {n.titulo}
                                            </span>
                                            <span style={{ fontSize: 10.5, color: '#64748b', whiteSpace: 'nowrap', marginLeft: 8 }}>
                                                {formatearFecha(n.created_at)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.35 }}>
                                            {n.mensaje}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '8px 14px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: '#131722',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <button
                            onClick={forzarEscaneoStock}
                            disabled={cargando}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: 11,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <IconAlerta style={{ width: 14, height: 14 }} />
                            {cargando ? 'Escaneando stock...' : 'Escanear Stock'}
                        </button>
                        <button
                            onClick={() => setAbierto(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                fontSize: 11,
                                cursor: 'pointer'
                            }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
