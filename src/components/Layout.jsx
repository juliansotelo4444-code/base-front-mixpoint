import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    IconDashboard, IconRemito, IconCarrito, IconRecepcion, IconProducto,
    IconClientes, IconProveedores, IconGastos, IconUsuarios, IconLogout,
    IconMenu, IconClose
} from './Icons';

const NAV_ITEMS = [
    { to: '/', label: 'Panel', icon: IconDashboard, end: true },
    { to: '/remitos', label: 'Remitos', icon: IconRemito },
    { to: '/pedidos-web', label: 'Pedidos Web', icon: IconCarrito },
    { to: '/recepciones', label: 'Recepción de mercadería', icon: IconRecepcion },
    { to: '/productos', label: 'Productos y stock', icon: IconProducto },
    { to: '/clientes', label: 'Clientes', icon: IconClientes },
    { to: '/proveedores', label: 'Proveedores', icon: IconProveedores },
    { to: '/gastos', label: 'Gastos', icon: IconGastos },
    { to: '/usuarios', label: 'Usuarios', icon: IconUsuarios, adminOnly: true },
];

export default function Layout() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    function cerrarMenu() {
        setMenuAbierto(false);
    }

    return (
        <div className="app-root-layout">
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
                <div className="row gap-xs">
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
                    {/* Botón cerrar visible sólo en móvil */}
                    <button className="sidebar-close-btn" onClick={cerrarMenu} aria-label="Cerrar menú">
                        <IconClose />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.filter(item => !item.adminOnly || usuario?.rol === 'admin').map(({ to, label, icon: Icon, end }) => (
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
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{usuario?.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-on-dark-muted)', marginBottom: 10, textTransform: 'capitalize' }}>
                        {usuario?.rol}
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
            <main className="main-content">
                <Outlet />
            </main>

            {/* BARRA INFERIOR DE ACCESO RÁPIDO PARA CELULARES */}
            <nav className="mobile-bottom-bar no-print">
                <NavLink to="/" end className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
                    <IconDashboard />
                    <span>Panel</span>
                </NavLink>
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
