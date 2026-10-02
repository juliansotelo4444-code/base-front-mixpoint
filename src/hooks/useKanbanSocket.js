import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`;
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Hook para sincronización en tiempo real con Socket.io en el Depósito
 */
export function useKanbanSocket(onEvento) {
    const [conectado, setConectado] = useState(false);
    const socketRef = useRef(null);
    const callbackRef = useRef(onEvento);

    useEffect(() => {
        callbackRef.current = onEvento;
    }, [onEvento]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const socket = io(SOCKET_URL, {
            auth: { token },
            query: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('⚡ [Socket] Conectado al servidor de depósito en tiempo real');
            setConectado(true);
            socket.emit('join:room', 'deposito');
        });

        socket.on('disconnect', () => {
            console.log('🔌 [Socket] Desconectado del servidor');
            setConectado(false);
        });

        const eventos = [
            'remito:creado',
            'remito:asignado',
            'remito:liberado',
            'remito:editado',
            'remito:estado_cambiado',
            'kanban:movido',
            'kanban:batch_actualizado'
        ];

        eventos.forEach((evento) => {
            socket.on(evento, (payload) => {
                if (callbackRef.current) {
                    callbackRef.current(evento, payload);
                }
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return { conectado, socket: socketRef.current };
}

export default useKanbanSocket;
