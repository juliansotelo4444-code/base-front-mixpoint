import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    IconDashboard, IconRemito, IconRecepcion, IconProducto,
    IconClientes, IconProveedores, IconGastos, IconUsuarios, IconLogout
} from './Icons';

const NAV_ITEMS = [
    { to: '/', label: 'Panel', icon: IconDashboard, end: true },
    { to: '/remitos', label: 'Remitos', icon: IconRemito },
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

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside style={{
                width: 'var(--sidebar-width)', background: 'var(--color-sidebar)',
                color: 'var(--color-text-on-dark)', display: 'flex', flexDirection: 'column',
                position: 'sticky', top: 0, height: '100vh', flexShrink: 0
            }}>
                <div style={{ padding: '22px 22px 18px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--color-primary)' }}>
                        MIX POINT                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-on-dark-muted)', marginTop: 2 }}>
                        Gestión interna
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {NAV_ITEMS.filter(item => !item.adminOnly || usuario?.rol === 'admin').map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: 11,
                                padding: '10px 12px', borderRadius: 7,
                                fontSize: 13.5, fontWeight: 500, textDecoration: 'none',
                                color: isActive ? '#fff' : 'var(--color-text-on-dark-muted)',
                                background: isActive ? 'var(--color-sidebar-hover)' : 'transparent',
                                borderLeft: isActive ? '2.5px solid var(--color-primary)' : '2.5px solid transparent'
                            })}
                        >
                            <Icon />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{usuario?.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-on-dark-muted)', marginBottom: 10, textTransform: 'capitalize' }}>{usuario?.rol}</div>
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-on-dark-muted)', width: '100%', justifyContent: 'flex-start' }}>
                        <IconLogout /> Cerrar sesión
                    </button>
                </div>
            </aside>

            <main style={{ flex: 1, minWidth: 0, padding: '28px 36px 60px' }}>
                <Outlet />
            </main>
        </div>
    );
}
