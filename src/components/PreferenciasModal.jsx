import { useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { IconClose } from './Icons';

const AVAILABLE_SHORTCUTS = [
    { to: '/pedidos-web', label: 'Pedidos Web', icon: '🛒' },
    { to: '/remitos', label: 'Remitos', icon: '📄' },
    { to: '/catalogo-flyers', label: 'Catálogo y Flyers', icon: '🖼️' },
    { to: '/productos', label: 'Productos y Stock', icon: '📦' },
    { to: '/recepciones', label: 'Recepción mercadería', icon: '📥' },
    { to: '/produccion', label: 'Armado de Mixes', icon: '🥣' },
    { to: '/conciliacion', label: 'Conciliación Bancaria', icon: '🏦' },
    { to: '/reportes-diarios', label: 'Reportes 8:00 AM', icon: '📊' },
    { to: '/clientes', label: 'Clientes', icon: '👥' },
    { to: '/gastos', label: 'Gastos', icon: '💸' }
];

export default function PreferenciasModal({ isOpen, onClose }) {
    const { preferences, updatePreferences, toggleShortcut, isSaving } = usePreferences();
    const [guardadoMsg, setGuardadoMsg] = useState(false);

    if (!isOpen) return null;

    const density = preferences.tableDensity || 'comfortable';
    const metrics = preferences.dashboardMetrics || {};
    const hudMode = preferences.hudMode || 'classic';

    function handleMetricToggle(key) {
        updatePreferences({
            dashboardMetrics: {
                ...metrics,
                [key]: !metrics[key]
            }
        });
        showSavedFeedback();
    }

    function handleDensityChange(val) {
        updatePreferences({ tableDensity: val });
        showSavedFeedback();
    }

    function handleHudModeChange(val) {
        updatePreferences({ hudMode: val });
        showSavedFeedback();
    }

    function showSavedFeedback() {
        setGuardadoMsg(true);
        setTimeout(() => setGuardadoMsg(false), 2000);
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: 16,
                backdropFilter: 'blur(3px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#11141D',
                    color: '#F5F1E3',
                    borderRadius: 12,
                    border: '1px solid rgba(201, 162, 39, 0.35)',
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                    width: '100%',
                    maxWidth: 580,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'fadeInUp 0.2s ease'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>⚙️</span>
                        <div>
                            <h3 style={{ fontSize: 17, color: '#C9A227', margin: 0 }}>Personalización y Preferencias</h3>
                            <p style={{ fontSize: 11.5, color: '#A9A79B', margin: 0 }}>Adaptá la interfaz de Mix Point a tu estilo de trabajo</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#A9A79B',
                            cursor: 'pointer',
                            padding: 4
                        }}
                    >
                        <IconClose />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Modo Visual */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 6 }}>
                            1. Modo de Visualización del Panel
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <button
                                type="button"
                                onClick={() => handleHudModeChange('classic')}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 8,
                                    border: `2px solid ${hudMode === 'classic' ? '#C9A227' : 'rgba(255, 255, 255, 0.1)'}`,
                                    backgroundColor: hudMode === 'classic' ? 'rgba(201, 162, 39, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                    color: '#F5F1E3',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🏛️ Clásico Corporativo</div>
                                <div style={{ fontSize: 11, color: '#A9A79B' }}>Navy profundo y fondo crema con tipografía serif y acentos dorados.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleHudModeChange('tactical')}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 8,
                                    border: `2px solid ${hudMode === 'tactical' ? '#FF9800' : 'rgba(255, 255, 255, 0.1)'}`,
                                    backgroundColor: hudMode === 'tactical' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    color: '#F5F1E3',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#FF9800' }}>⚡ Operaciones Tácticas HUD</div>
                                <div style={{ fontSize: 11, color: '#A9A79B' }}>Centro de mando oscuro con radar industrial y gradientes ámbar/verde.</div>
                            </button>
                        </div>
                    </div>

                    {/* Densidad de Tablas */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 6 }}>
                            2. Densidad de Tablas y Listados
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[
                                { key: 'compact', label: 'Compacta', desc: 'Más filas' },
                                { key: 'comfortable', label: 'Cómoda', desc: 'Estándar' },
                                { key: 'spacious', label: 'Espaciosa', desc: 'Táctil' }
                            ].map(item => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleDensityChange(item.key)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        border: `1.5px solid ${density === item.key ? '#C9A227' : 'rgba(255, 255, 255, 0.1)'}`,
                                        backgroundColor: density === item.key ? 'rgba(201, 162, 39, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        color: '#F5F1E3',
                                        cursor: 'pointer',
                                        fontSize: 12
                                    }}
                                >
                                    <div style={{ fontWeight: 600 }}>{item.label}</div>
                                    <div style={{ fontSize: 10, color: '#A9A79B' }}>{item.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Accesos Rápidos */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 4 }}>
                            3. Accesos Rápidos Fijados en Menú Lateral
                        </div>
                        <p style={{ fontSize: 11, color: '#A9A79B', marginBottom: 8 }}>
                            Marcá las secciones que querés tener fijadas arriba de todo en la barra lateral:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
                            {AVAILABLE_SHORTCUTS.map(sc => {
                                const isPinned = (preferences.shortcuts || []).includes(sc.to);
                                return (
                                    <button
                                        key={sc.to}
                                        type="button"
                                        onClick={() => {
                                            toggleShortcut(sc.to);
                                            showSavedFeedback();
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            border: `1px solid ${isPinned ? '#C9A227' : 'rgba(255, 255, 255, 0.08)'}`,
                                            backgroundColor: isPinned ? 'rgba(201, 162, 39, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                            color: isPinned ? '#F5F1E3' : '#A9A79B',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <span>{sc.icon}</span>
                                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.label}</span>
                                        <span>{isPinned ? '📌' : '➕'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Métricas Visibles en Dashboard */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 6 }}>
                            4. Tarjetas Visibles en el Dashboard
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { key: 'ventas', label: 'Ventas del mes ($)' },
                                { key: 'compras', label: 'Compras del mes ($)' },
                                { key: 'gastos', label: 'Gastos operativos ($)' },
                                { key: 'stock', label: 'Stock valorizado ($)' },
                                { key: 'graficos', label: 'Gráfico de Facturación' },
                                { key: 'alertas', label: 'Alertas de Stock' }
                            ].map(item => (
                                <label
                                    key={item.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 12.5,
                                        cursor: 'pointer',
                                        padding: '6px 8px',
                                        borderRadius: 4,
                                        background: 'rgba(255, 255, 255, 0.02)'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={metrics[item.key] !== false}
                                        onChange={() => handleMetricToggle(item.key)}
                                        style={{ accentColor: '#C9A227', cursor: 'pointer' }}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}>
                    <div style={{ fontSize: 12, color: guardadoMsg ? '#10B981' : isSaving ? '#EAB308' : '#A9A79B' }}>
                        {guardadoMsg ? '✓ Preferencias guardadas' : isSaving ? 'Guardando...' : 'Sincronizado con tu usuario en PostgreSQL'}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-primary btn-sm"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
}
