import { useState, useEffect } from 'react';

export default function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div style={{
            background: '#991B1B',
            color: '#FFFFFF',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 9999
        }}>
            <span>📡</span>
            <span><strong>Modo Offline:</strong> Estás trabajando sin conexión a Internet. Los cambios se sincronizarán cuando se restablezca la red.</span>
        </div>
    );
}
