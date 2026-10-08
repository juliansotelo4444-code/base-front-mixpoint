import { useState } from 'react';
import { createPortal } from 'react-dom';
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
    if (typeof document === 'undefined') return null;

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

    return createPortal(
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
                    
                    {/* 1. Modo / Tema Visual Completo */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🎨</span> 1. Tema Visual y Ambiente
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                            {[
                                {
                                    key: 'clasico',
                                    name: 'Dorado Mix Point',
                                    badge: '🏛️ Clásico',
                                    bg: '#11141D',
                                    accent: '#C9A227',
                                    desc: 'Navy profundo y acentos dorados clásicos'
                                },
                                {
                                    key: 'dark',
                                    name: 'Modo Noche OLED',
                                    badge: '🌙 Dark',
                                    bg: '#0D1117',
                                    accent: '#58A6FF',
                                    desc: 'Fondo negro suave para no cansar la vista'
                                },
                                {
                                    key: 'verde_natural',
                                    name: 'Botánico / Dietética',
                                    badge: '🌿 Natural',
                                    bg: '#0E2519',
                                    accent: '#2D7A4F',
                                    desc: 'Verde orgánico y fresco para frutos secos'
                                },
                                {
                                    key: 'marino',
                                    name: 'Azul Ejecutivo',
                                    badge: '💼 Corporativo',
                                    bg: '#0F1D36',
                                    accent: '#1D58D8',
                                    desc: 'Azul sobrio para finanzas y balance'
                                },
                                {
                                    key: 'terracota',
                                    name: 'Terracota Rústico',
                                    badge: '🌰 Tostado',
                                    bg: '#261713',
                                    accent: '#B84724',
                                    desc: 'Tonos cálidos y artesanales de frutos'
                                },
                                {
                                    key: 'tactical',
                                    name: 'Operaciones HUD',
                                    badge: '⚡ Táctico',
                                    bg: '#0A0D14',
                                    accent: '#FF9800',
                                    desc: 'Radar ámbar y centro de comando industrial'
                                }
                            ].map(theme => {
                                const isSelected = (preferences.theme === theme.key) || (theme.key === 'tactical' && preferences.hudMode === 'tactical');
                                return (
                                    <button
                                        key={theme.key}
                                        type="button"
                                        onClick={() => {
                                            if (theme.key === 'tactical') {
                                                updatePreferences({ theme: 'tactical', hudMode: 'tactical' });
                                            } else {
                                                updatePreferences({ theme: theme.key, hudMode: 'classic' });
                                            }
                                            showSavedFeedback();
                                        }}
                                        style={{
                                            padding: '12px',
                                            borderRadius: 8,
                                            border: `2px solid ${isSelected ? theme.accent : 'rgba(255, 255, 255, 0.08)'}`,
                                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                            color: '#F5F1E3',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: theme.bg, border: `1px solid ${theme.accent}`, color: theme.accent, fontWeight: 700 }}>
                                                {theme.badge}
                                            </span>
                                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: theme.accent, boxShadow: isSelected ? `0 0 8px ${theme.accent}` : 'none' }} />
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 12.5, color: isSelected ? theme.accent : '#F5F1E3' }}>
                                            {theme.name}
                                        </div>
                                        <div style={{ fontSize: 10.5, color: '#A9A79B', lineHeight: 1.3 }}>
                                            {theme.desc}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Color de Acento Personalizado */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>✨</span> 2. Color de Resaltado (Acentos)
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {[
                                { key: 'gold', name: 'Dorado', color: '#C9A227' },
                                { key: 'orange', name: 'Naranja', color: '#EA580C' },
                                { key: 'emerald', name: 'Esmeralda', color: '#059669' },
                                { key: 'blue', name: 'Azul Zafiro', color: '#2563EB' },
                                { key: 'purple', name: 'Amatista', color: '#7C3AED' },
                                { key: 'ruby', name: 'Rubí', color: '#E11D48' }
                            ].map(acc => {
                                const isSelected = (preferences.accentColor || 'gold') === acc.key;
                                return (
                                    <button
                                        key={acc.key}
                                        type="button"
                                        onClick={() => {
                                            updatePreferences({ accentColor: acc.key });
                                            showSavedFeedback();
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '6px 12px',
                                            borderRadius: 20,
                                            border: `1.5px solid ${isSelected ? acc.color : 'rgba(255, 255, 255, 0.1)'}`,
                                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                            color: '#F5F1E3',
                                            fontSize: 12,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: acc.color, boxShadow: `0 0 6px ${acc.color}` }} />
                                        <span>{acc.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Tipografía y Tamaño de Texto */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🔤</span> 3. Tipografía y Escala de Lectura
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {/* Fuente */}
                            <div>
                                <label style={{ fontSize: 11, color: '#A9A79B', marginBottom: 4, display: 'block' }}>Familia tipográfica:</label>
                                <select
                                    value={preferences.fontFamily || 'editorial'}
                                    onChange={(e) => {
                                        updatePreferences({ fontFamily: e.target.value });
                                        showSavedFeedback();
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: 6,
                                        backgroundColor: '#1C2230',
                                        color: '#F5F1E3',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        fontSize: 12
                                    }}
                                >
                                    <option value="editorial">Elegante Editorial (Playfair + Poppins)</option>
                                    <option value="modern">Moderna y Limpia (Inter)</option>
                                    <option value="mono">Técnica / Compacta (IBM Plex)</option>
                                </select>
                            </div>

                            {/* Tamaño */}
                            <div>
                                <label style={{ fontSize: 11, color: '#A9A79B', marginBottom: 4, display: 'block' }}>Tamaño de interfaz:</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                    {[
                                        { key: 'sm', label: 'Compacto' },
                                        { key: 'md', label: 'Estándar' },
                                        { key: 'lg', label: 'Grande' }
                                    ].map(sz => (
                                        <button
                                            key={sz.key}
                                            type="button"
                                            onClick={() => {
                                                updatePreferences({ fontSize: sz.key });
                                                showSavedFeedback();
                                            }}
                                            style={{
                                                padding: '6px 4px',
                                                borderRadius: 6,
                                                border: `1px solid ${(preferences.fontSize || 'md') === sz.key ? '#C9A227' : 'rgba(255, 255, 255, 0.1)'}`,
                                                backgroundColor: (preferences.fontSize || 'md') === sz.key ? 'rgba(201, 162, 39, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                                color: '#F5F1E3',
                                                fontSize: 11,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {sz.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Densidad de Tablas y Listados */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 6 }}>
                            4. Densidad de Tablas y Listados
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

                    {/* 5. Accesos Rápidos */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 4 }}>
                            5. Accesos Rápidos Fijados en Menú Lateral
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

                    {/* 6. Métricas Visibles en Dashboard */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F6EDCD', marginBottom: 6 }}>
                            6. Tarjetas Visibles en el Dashboard
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
        </div>,
        document.body
    );
}
