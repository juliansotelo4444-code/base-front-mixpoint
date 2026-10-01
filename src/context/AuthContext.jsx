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
        <AuthContext.Provider value={{ usuario, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
