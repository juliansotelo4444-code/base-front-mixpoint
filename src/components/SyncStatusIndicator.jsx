import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { IconSync } from './Icons';

export default function SyncStatusIndicator() {
    const [status, setStatus] = useState({
        estado: 'inactivo',
        ultima_sincronizacion: null,
        catalogo_actualizado: 0,
        pedidos_nuevos: 0,
        modo: 'unidireccional_estricto',
        error: null
    });
    const [cargando, setCargando] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const dropdownRef = useRef(null);

    async function cargarEstado() {
        try {
            const { data } = await client.get('/integraciones/sync-status');
            if (data) setStatus(data);
        } catch (e) {
            // Ignorar si el usuario no tiene permisos o está offline
        }
    }

    async function dispararSincronizacionManual() {
        try {
            setCargando(true);
            await client.post('/integraciones/sync-unidireccional');
            await cargarEstado();
        } catch (e) {
            console.error('Error al forzar sync:', e.message);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarEstado();
        const interval = setInterval(cargarEstado, 20000);
        return () => clearInterval(interval);
    }, []);

    // Cerrar al clickear afuera
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setMenuAbierto(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isSyncing = cargando || status.estado === 'sincronizando';
    const isError = status.estado === 'error';
    const isSuccess = status.estado === 'sincronizado';

    const dotColor = isSyncing ? '#EAB308' : isError ? '#EF4444' : isSuccess ? '#10B981' : '#9CA3AF';
    const labelText = isSyncing ? 'Sincronizando...' : isError ? 'Error Sheets' : isSuccess ? 'Sheets al día' : 'Sheets';

    const fechaFormateada = status.ultima_sincronizacion
        ? new Intl.DateTimeFormat('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: 'numeric',
            month: 'short'
        }).format(new Date(status.ultima_sincronizacion))
        : 'Pendiente';

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setMenuAbierto(!menuAbierto)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--color-text-on-dark)',
                    transition: 'all 0.15s ease'
                }}
                title="Estado de sincronización unidireccional con Google Sheets"
            >
                <span
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        display: 'inline-block',
                        boxShadow: isSyncing ? `0 0 6px ${dotColor}` : 'none'
                    }}
                />
                <span style={{ fontSize: 11.5, letterSpacing: '0.02em' }}>{labelText}</span>
            </button>

            {menuAbierto && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 280,
                        backgroundColor: '#11141D',
                        border: '1px solid rgba(201, 162, 39, 0.3)',
                        borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                        padding: 14,
                        zIndex: 1000,
                        color: '#F5F1E3',
                        fontSize: 12,
                        animation: 'fadeInUp 0.18s ease'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: '#C9A227', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <IconSync style={{ width: 14, height: 14 }} /> Sincronización Sheets
                        </div>
                        <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(201, 162, 39, 0.2)',
                            color: '#F6EDCD'
                        }}>
                            Unidireccional
                        </span>
                    </div>

                    <p style={{ fontSize: 11, color: '#A9A79B', marginBottom: 12, lineHeight: 1.4 }}>
                        Google Sheets es la única interfaz de carga. El sistema solo lee los datos y nunca escribe sobre la planilla.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#A9A79B' }}>Última sync:</span>
                            <span style={{ fontWeight: 600 }}>{fechaFormateada}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#A9A79B' }}>Catálogo procesado:</span>
                            <span style={{ fontWeight: 600 }}>{status.catalogo_actualizado || 0} ítems</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#A9A79B' }}>Pedidos nuevos:</span>
                            <span style={{ fontWeight: 600 }}>{status.pedidos_nuevos || 0}</span>
                        </div>
                        {status.error && (
                            <div style={{ color: '#EF4444', fontSize: 10.5, marginTop: 4 }}>
                                ⚠️ {status.error}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={dispararSincronizacionManual}
                        disabled={isSyncing}
                        className="btn btn-primary btn-sm"
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            fontSize: 11.5,
                            padding: '6px 12px'
                        }}
                    >
                        {isSyncing ? 'Sincronizando ahora...' : '🔄 Sincronizar ahora'}
                    </button>
                </div>
            )}
        </div>
    );
}
