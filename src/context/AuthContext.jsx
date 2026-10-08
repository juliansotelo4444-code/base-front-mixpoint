import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);
const ONE_HOUR_MS = 60 * 60 * 1000;

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(() => {
        const stored = localStorage.getItem('usuario');
        const loginTime = localStorage.getItem('login_time');
        if (stored && loginTime) {
            const elapsed = Date.now() - parseInt(loginTime, 10);
            if (elapsed > ONE_HOUR_MS) {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                localStorage.removeItem('login_time');
                return null;
            }
            return JSON.parse(stored);
        }
        return null;
    });

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('login_time');
        setUsuario(null);
    }

    async function login(email, password) {
        const { data } = await client.post('/auth/login', { email, password });
        const now = Date.now();
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        localStorage.setItem('login_time', now.toString());
        setUsuario(data.usuario);
    }

    // Refrescar datos del usuario actual (útil si se le cambiaron permisos)
    async function refrescarUsuario() {
        try {
            const { data } = await client.get('/auth/me');
            if (data?.usuario) {
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                setUsuario(data.usuario);
            }
        } catch (err) {
            console.error('Error al refrescar usuario:', err);
        }
    }

    /**
     * Verifica si el usuario actual tiene acceso a una sección/ruta específica.
     * Los administradores tienen acceso irrestricto a todo el sistema.
     * Para otros roles:
     * - Si tiene permisos configurados (array no vacío): tiene acceso si la ruta está en su lista.
     * - Si no tiene permisos configurados (array vacío o undefined): se aplican los permisos por defecto de su rol.
     */
    function tienePermiso(ruta) {
        if (!usuario) return false;
        if (usuario.rol === 'admin') return true;

        const permisos = Array.isArray(usuario.permisos) ? usuario.permisos : [];
        if (permisos.length > 0) {
            return permisos.includes(ruta);
        }

        // Permisos por defecto según su rol si no se han especificado permisos personalizados
        if (usuario.rol === 'ventas') {
            return ['/', '/remitos', '/pedidos-web', '/catalogo-flyers', '/clientes', '/productos', '/manual'].includes(ruta);
        }
        if (usuario.rol === 'deposito') {
            return ['/', '/deposito-kanban', '/recepciones', '/produccion', '/productos', '/manual'].includes(ruta);
        }
        if (usuario.rol === 'administracion') {
            return ['/', '/remitos', '/pedidos-web', '/clientes', '/proveedores', '/gastos', '/conciliacion', '/reportes-diarios', '/sincronizacion-sheets', '/productos', '/manual'].includes(ruta);
        }

        return false;
    }

    // Comprobar expiración periódica de la sesión de 1 hora
    useEffect(() => {
        if (!usuario) return;
        const interval = setInterval(() => {
            const loginTime = localStorage.getItem('login_time');
            if (loginTime) {
                const elapsed = Date.now() - parseInt(loginTime, 10);
                if (elapsed >= ONE_HOUR_MS) {
                    alert('Tu sesión de 1 hora ha expirado por motivos de seguridad. Por favor, ingresá nuevamente.');
                    logout();
                    window.location.href = '/login';
                }
            }
        }, 30000); // Chequea cada 30 segundos

        return () => clearInterval(interval);
    }, [usuario]);

    return (
        <AuthContext.Provider value={{ usuario, login, logout, tienePermiso, refrescarUsuario }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
