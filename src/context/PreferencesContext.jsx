import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const PreferencesContext = createContext(null);

const DEFAULT_PREFERENCES = {
    shortcuts: ['/pedidos-web', '/remitos', '/productos'],
    tableDensity: 'comfortable', // 'compact', 'comfortable', 'spacious'
    dashboardMetrics: {
        ventas: true,
        compras: true,
        gastos: true,
        stock: true,
        graficos: true,
        alertas: true
    },
    hudMode: 'classic' // 'classic' | 'tactical'
};

export function PreferencesProvider({ children }) {
    const { usuario } = useAuth();
    const [preferences, setPreferences] = useState(() => {
        // Inicializar desde localStorage o usuario
        const local = localStorage.getItem('mixpoint_user_prefs');
        if (local) {
            try {
                return { ...DEFAULT_PREFERENCES, ...JSON.parse(local) };
            } catch (e) {
                // fall through
            }
        }
        if (usuario && usuario.preferencias) {
            return { ...DEFAULT_PREFERENCES, ...usuario.preferencias };
        }
        return DEFAULT_PREFERENCES;
    });

    const [isSaving, setIsSaving] = useState(false);

    // Cargar preferencias del backend cuando el usuario se autentica
    useEffect(() => {
        if (!usuario) return;
        let active = true;

        async function fetchPrefs() {
            try {
                const { data } = await client.get('/usuarios/me/preferencias');
                if (active && data && data.preferencias) {
                    setPreferences(prev => {
                        const merged = { ...DEFAULT_PREFERENCES, ...prev, ...data.preferencias };
                        localStorage.setItem('mixpoint_user_prefs', JSON.stringify(merged));
                        return merged;
                    });
                }
            } catch (err) {
                // Modo offline o sin conexión: usar local
            }
        }

        fetchPrefs();
        return () => { active = false; };
    }, [usuario?.id]);

    // Función para actualizar preferencias en estado, localStorage y persistir en PostgreSQL
    const updatePreferences = useCallback(async (newPrefs) => {
        setPreferences(prev => {
            const updated = {
                ...prev,
                ...newPrefs,
                dashboardMetrics: {
                    ...prev.dashboardMetrics,
                    ...(newPrefs.dashboardMetrics || {})
                }
            };
            localStorage.setItem('mixpoint_user_prefs', JSON.stringify(updated));

            // Guardar asíncronamente en backend
            if (usuario) {
                setIsSaving(true);
                client.put('/usuarios/me/preferencias', { preferencias: updated })
                    .catch(e => console.warn('Error al guardar preferencias en backend:', e.message))
                    .finally(() => setIsSaving(false));
            }

            return updated;
        });
    }, [usuario]);

    const toggleShortcut = useCallback((path) => {
        setPreferences(prev => {
            const exists = prev.shortcuts.includes(path);
            const shortcuts = exists
                ? prev.shortcuts.filter(p => p !== path)
                : [...prev.shortcuts, path];
            const updated = { ...prev, shortcuts };
            localStorage.setItem('mixpoint_user_prefs', JSON.stringify(updated));
            if (usuario) {
                client.put('/usuarios/me/preferencias', { preferencias: updated }).catch(() => {});
            }
            return updated;
        });
    }, [usuario]);

    return (
        <PreferencesContext.Provider value={{
            preferences,
            updatePreferences,
            toggleShortcut,
            isSaving
        }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    return useContext(PreferencesContext);
}
