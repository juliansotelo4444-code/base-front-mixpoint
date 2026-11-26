import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import {
    IconDashboard, IconRemito, IconCarrito, IconRecepcion, IconProducto,
    IconClientes, IconProveedores, IconGastos, IconUsuarios, IconLogout,
    IconMenu, IconClose, IconMix, IconSync, IconBanco, IconReporte, IconFlyer,
    IconManual, IconCamion
} from './Icons';
import NotificacionesDropdown from './NotificacionesDropdown';
import JarvisWidget from './JarvisWidget';
import OfflineBanner from './OfflineBanner';
import PreferenciasModal from './PreferenciasModal';

const NAV_ITEMS = [
    { to: '/', label: 'Panel', icon: IconDashboard, end: true },
    { to: '/remitos', label: 'Remitos', icon: IconRemito },
    { to: '/mi-ruta', label: 'Mi Ruta de Reparto', icon: IconCamion },
    { to: '/deposito-kanban', label: 'Preparación & Despacho', icon: IconCamion },
    { to: '/pagos-mp', label: 'Pagos Mercado Pago', icon: IconBanco },
    { to: '/pedidos-web', label: 'Pedidos Web', icon: IconCarrito },
    { to: '/retencion', label: 'Retención y Cupones', icon: IconCarrito },
    { to: '/catalogo-flyers', label: 'Catálogo y Flyers', icon: IconFlyer },
    { to: '/carrusel-ofertas', label: 'Carrusel de Ofertas', icon: IconMix },
    { to: '/recepciones', label: 'Recepción de mercadería', icon: IconRecepcion },
    { to: '/produccion', label: 'Armado de Mixes', icon: IconMix },
    { to: '/productos', label: 'Productos y stock', icon: IconProducto },
    { to: '/clientes', label: 'Clientes', icon: IconClientes },
    { to: '/conciliacion', label: 'Conciliación Bancaria', icon: IconBanco },
    { to: '/reportes-diarios', label: 'Reportes 8:00 AM', icon: IconReporte },
    { to: '/proveedores', label: 'Proveedores', icon: IconProveedores },
    { to: '/gastos', label: 'Gastos', icon: IconGastos },
    { to: '/auditoria', label: 'Historial / Auditoría', icon: IconReporte },
    { to: '/manual', label: 'Manual de Uso', icon: IconManual },
    { to: '/usuarios', label: 'Usuarios', icon: IconUsuarios, adminOnly: true },
];

export default function Layout() {
    const { usuario, logout, tienePermiso } = useAuth();
    const { preferences, updatePreferences } = usePreferences();
    const navigate = useNavigate();
    const location = useLocation();

    const [menuAbierto, setMenuAbierto] = useState(false);
    const [modalPrefsAbierto, setModalPrefsAbierto] = useState(false);

    const highVisibility = Boolean(preferences?.highVisibility);

    function toggleHighVisibility() {
        if (highVisibility) {
            updatePreferences({ highVisibility: false, fontSize: 'md' });
        } else {
            updatePreferences({
                highVisibility: true,
                fontSize: 'xl',
                tableDensity: 'spacious',
                fontFamily: 'modern'
            });
        }
    }

    function handleLogout() {
        logout();
        navigate('/login');
    }

    function cerrarMenu() {
        setMenuAbierto(false);
    }

    const fechaHoyFormato = new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    }).format(new Date());

    const densityClass = `density-${preferences?.tableDensity || 'comfortable'}`;
    const hudClass = preferences?.hudMode === 'tactical' ? 'tactical-theme' : '';
    const pinnedShortcuts = (preferences?.shortcuts || []).map(path =>
        NAV_ITEMS.find(item => item.to === path)
    ).filter(item => Boolean(item) && tienePermiso(item.to));

    return (
        <div className={`app-root-layout ${hudClass}`}>
            <OfflineBanner />

            {/* BARRA SUPERIOR EXCLUSIVA PARA MÓVIL */}
            <header className="mobile-topbar no-print">
                <div className="row gap-sm">
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMenuAbierto(true)}
                        aria-label="Abrir menú"
                    >
                        <IconMenu />
                    </button>
                    <div className="row gap-xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                        <img
                            src="/logo-mixpoint.png"
                            alt="Mix Point"
                            className="mobile-topbar-logo"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span className="mobile-topbar-brand">MIX POINT</span>
                    </div>
                </div>
                <div className="row gap-xs" style={{ alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={toggleHighVisibility}
                        style={{
                            background: highVisibility ? '#FACC15' : 'transparent',
                            border: highVisibility ? '1px solid #FACC15' : '1px solid rgba(255,255,255,0.2)',
                            color: highVisibility ? '#000000' : 'var(--color-text-on-dark)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 700,
                            padding: '3px 7px'
                        }}
                        title={highVisibility ? 'Desactivar Modo Alta Visibilidad' : 'Activar Modo Alta Visibilidad (Lectura Fácil)'}
                    >
                        👁️
                    </button>
                    <button
                        type="button"
                        onClick={() => setModalPrefsAbierto(true)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-on-dark-muted)',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: '4px 6px'
                        }}
                        title="Personalizar interfaz"
                    >
                        ⚙️
                    </button>
                    <NotificacionesDropdown />
                    <div className="user-avatar-pill" title={usuario?.nombre || 'Usuario'}>
                        {(usuario?.nombre || 'U').charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            {/* FONDO OSCURO DE TELÓN PARA MÓVIL (BACKDROP) */}
            {menuAbierto && (
                <div className="sidebar-backdrop no-print" onClick={cerrarMenu} />
            )}

            {/* BARRA LATERAL (DESKTOP) / CAJÓN DESLIZANTE (MÓVIL) */}
            <aside className={`app-sidebar ${menuAbierto ? 'open' : ''} no-print`}>
                <div className="sidebar-header">
                    <div className="row gap-sm">
                        <img
                            src="/logo-mixpoint.png"
                            alt="Mix Point"
                            className="sidebar-logo"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                            <div className="sidebar-brand-name">MIX POINT</div>
                            <div className="sidebar-brand-sub">DISTRIBUIDORA MAYORISTA</div>
                        </div>
                    </div>
                    <button className="sidebar-close-btn" onClick={cerrarMenu} aria-label="Cerrar menú">
                        <IconClose />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {/* SECCIÓN ACCESOS RÁPIDOS FIJADOS POR USUARIO */}
                    {pinnedShortcuts.length > 0 && (
                        <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <div style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                color: 'var(--color-primary)',
                                padding: '4px 14px',
                                textTransform: 'uppercase',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>📌 Accesos Rápidos</span>
                                <button
                                    type="button"
                                    onClick={() => setModalPrefsAbierto(true)}
                                    style={{ background: 'transparent', border: 'none', color: '#A9A79B', cursor: 'pointer', fontSize: 11 }}
                                    title="Configurar accesos rápidos"
                                >
                                    Editar
                                </button>
                            </div>
                            {pinnedShortcuts.map(({ to, label, icon: Icon, end }) => (
                                <NavLink
                                    key={`pin-${to}`}
                                    to={to}
                                    end={end}
                                    onClick={cerrarMenu}
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                    style={{ paddingLeft: 16 }}
                                >
                                    <Icon />
                                    <span>{label}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}

                    <div style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--color-text-on-dark-muted)',
                        padding: '4px 14px 8px 14px',
                        textTransform: 'uppercase'
                    }}>
                        Módulos Generales
                    </div>

                    {NAV_ITEMS.filter(item => {
                        if (item.adminOnly) return usuario?.rol === 'admin';
                        return tienePermiso(item.to);
                    }).map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={cerrarMenu}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{usuario?.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-on-dark-muted)', textTransform: 'capitalize' }}>
                                {usuario?.rol}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                                type="button"
                                onClick={toggleHighVisibility}
                                className="btn btn-ghost btn-xs"
                                style={{
                                    background: highVisibility ? '#FACC15' : 'transparent',
                                    color: highVisibility ? '#000000' : 'var(--color-text-on-dark-muted)',
                                    padding: '4px 7px',
                                    fontSize: 12,
                                    fontWeight: 700
                                }}
                                title={highVisibility ? 'Desactivar Lectura Fácil' : 'Activar Modo Alta Visibilidad'}
                            >
                                👁️
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalPrefsAbierto(true)}
                                className="btn btn-ghost btn-xs"
                                style={{ color: 'var(--color-text-on-dark-muted)', padding: '4px 8px', fontSize: 12 }}
                                title="Personalización y preferencias"
                            >
                                ⚙️
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-text-on-dark-muted)', width: '100%', justifyContent: 'flex-start' }}
                    >
                        <IconLogout /> Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <main className={`main-content ${densityClass}`} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* BARRA SUPERIOR PARA DESKTOP */}
                <div className="desktop-topbar no-print" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    padding: '8px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(17, 20, 29, 0.6)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {preferences?.hudMode === 'tactical' && (
                            <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#FF9800',
                                letterSpacing: '0.08em',
                                background: 'rgba(255, 152, 0, 0.12)',
                                padding: '2px 8px',
                                borderRadius: 4,
                                border: '1px solid rgba(255, 152, 0, 0.3)'
                            }}>
                                ⚡ TACTICAL HUD
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--color-text-on-dark-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                            📅 {fechaHoyFormato}
                        </div>
                        <button
                            type="button"
                            onClick={toggleHighVisibility}
                            className="btn btn-ghost btn-sm"
                            style={{
                                background: highVisibility ? '#FACC15' : 'transparent',
                                color: highVisibility ? '#000000' : 'var(--color-text-on-dark)',
                                borderColor: highVisibility ? '#FACC15' : 'rgba(255, 255, 255, 0.22)',
                                fontSize: 12,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                            }}
                            title="Activar/Desactivar contraste alto y letras más grandes para mejor lectura"
                        >
                            👁️ {highVisibility ? 'Lectura Fácil ✓' : 'Lectura Fácil'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setModalPrefsAbierto(true)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-text-on-dark)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            ⚙️ Preferencias
                        </button>
                        <NotificacionesDropdown />
                    </div>
                </div>

                <div key={location.pathname} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Outlet />
                </div>
            </main>

            {/* ASISTENTE INTELIGENTE CON VOZ "JARVIS" (OMNIPRESENTE) */}
            <JarvisWidget />

            {/* MODAL DE PREFERENCIAS */}
            <PreferenciasModal
                isOpen={modalPrefsAbierto}
                onClose={() => setModalPrefsAbierto(false)}
            />

            {/* BARRA INFERIOR DE ACCESO RÁPIDO PARA CELULARES */}
            <nav className="mobile-bottom-bar no-print">
                <NavLink to="/" end className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                    <IconDashboard />
                    <span>Panel</span>
                </NavLink>
                {usuario?.rol === 'repartidor' ? (
                    <>
                        <NavLink to="/mi-ruta" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                            <IconCamion />
                            <span>Mi Ruta</span>
                        </NavLink>
                        <NavLink to="/pagos-mp" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                            <IconBanco />
                            <span>Pagos MP</span>
                        </NavLink>
                        <NavLink to="/remitos" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                            <IconRemito />
                            <span>Remitos</span>
                        </NavLink>
                    </>
                ) : (
                    <>
                        <NavLink to="/remitos" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                            <IconRemito />
                            <span>Remitos</span>
                        </NavLink>
                        <NavLink to="/pedidos-web" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                            <IconCarrito />
                            <span>Pedidos</span>
                        </NavLink>
                        <NavLink to="/productos" className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                            <IconProducto />
                            <span>Stock</span>
                        </NavLink>
                    </>
                )}
                <button
                    type="button"
                    className={`bottom-tab ${menuAbierto ? 'active' : ''}`}
                    onClick={() => setMenuAbierto(!menuAbierto)}
                >
                    <IconMenu />
                    <span>Más</span>
                </button>
            </nav>
        </div>
    );
}
