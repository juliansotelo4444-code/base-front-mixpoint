import axios from 'axios';

// En red local, cada empleado abre el frontend desde su navegador apuntando
// a la IP del servidor. El backend corre en el puerto 4000 de esa misma PC.
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`;

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            if (window.location.pathname !== '/login') window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default client;
