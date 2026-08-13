import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Productos from './pages/Productos';
import Remitos from './pages/Remitos';
import Recepciones from './pages/Recepciones';
import Gastos from './pages/Gastos';
import Usuarios from './pages/Usuarios';

function RutaPrivada({ children }) {
    const { usuario } = useAuth();
    if (!usuario) return <Navigate to="/login" replace />;
    return children;
}

function RutaAdmin({ children }) {
    const { usuario } = useAuth();
    if (!usuario) return <Navigate to="/login" replace />;
    if (usuario.rol !== 'admin') return <Navigate to="/" replace />;
    return children;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<RutaPrivada><Layout /></RutaPrivada>}>
                        <Route index element={<Dashboard />} />
                        <Route path="remitos" element={<Remitos />} />
                        <Route path="recepciones" element={<Recepciones />} />
                        <Route path="productos" element={<Productos />} />
                        <Route path="clientes" element={<Clientes />} />
                        <Route path="proveedores" element={<Proveedores />} />
                        <Route path="gastos" element={<Gastos />} />
                        <Route path="usuarios" element={<RutaAdmin><Usuarios /></RutaAdmin>} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};
// batman