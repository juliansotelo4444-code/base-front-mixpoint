import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import Layout from './components/Layout';
import { SkeletonTable } from './components/SkeletonLoader';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Proveedores = lazy(() => import('./pages/Proveedores'));
const Productos = lazy(() => import('./pages/Productos'));
const Remitos = lazy(() => import('./pages/Remitos'));
const Recepciones = lazy(() => import('./pages/Recepciones'));
const Gastos = lazy(() => import('./pages/Gastos'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const PedidosWeb = lazy(() => import('./pages/PedidosWeb'));
const Produccion = lazy(() => import('./pages/Produccion'));
const SincronizacionSheets = lazy(() => import('./pages/SincronizacionSheets'));
const ConciliacionBancaria = lazy(() => import('./pages/ConciliacionBancaria'));
const ReportesDiarios = lazy(() => import('./pages/ReportesDiarios'));
const CatalogoFlyers = lazy(() => import('./pages/CatalogoFlyers'));
const DepositoKanban = lazy(() => import('./pages/DepositoKanban'));
const AuditLogTimeline = lazy(() => import('./pages/AuditLogTimeline'));
const ManualUsuario = lazy(() => import('./pages/ManualUsuario'));

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

function RutaProtegidaPermiso({ ruta, children }) {
    const { usuario, tienePermiso } = useAuth();
    if (!usuario) return <Navigate to="/login" replace />;
    if (!tienePermiso(ruta)) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                padding: 24
            }}>
                <div style={{ fontSize: 54, marginBottom: 16 }}>🔒</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
                    Acceso Restringido
                </h2>
                <p style={{ maxWidth: 460, color: '#64748B', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                    Tu usuario no tiene permisos habilitados por el administrador para acceder a este módulo. Si considerás que es un error, solicitale al administrador que habilite esta sección para tu cuenta.
                </p>
                <a href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    Volver al Inicio
                </a>
            </div>
        );
    }
    return children;
}

function PageSuspense({ children }) {
    return (
        <Suspense fallback={<div className="p-8"><SkeletonTable rows={8} /></div>}>
            {children}
        </Suspense>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <PreferencesProvider>
                <BrowserRouter>
                    <PageSuspense>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<RutaPrivada><Layout /></RutaPrivada>}>
                                <Route index element={<RutaProtegidaPermiso ruta="/"><Dashboard /></RutaProtegidaPermiso>} />
                                <Route path="remitos" element={<RutaProtegidaPermiso ruta="/remitos"><Remitos /></RutaProtegidaPermiso>} />
                                <Route path="deposito-kanban" element={<RutaProtegidaPermiso ruta="/deposito-kanban"><DepositoKanban /></RutaProtegidaPermiso>} />
                                <Route path="auditoria" element={<RutaProtegidaPermiso ruta="/auditoria"><AuditLogTimeline /></RutaProtegidaPermiso>} />
                                <Route path="pedidos-web" element={<RutaProtegidaPermiso ruta="/pedidos-web"><PedidosWeb /></RutaProtegidaPermiso>} />
                                <Route path="catalogo-flyers" element={<RutaProtegidaPermiso ruta="/catalogo-flyers"><CatalogoFlyers /></RutaProtegidaPermiso>} />
                                <Route path="recepciones" element={<RutaProtegidaPermiso ruta="/recepciones"><Recepciones /></RutaProtegidaPermiso>} />
                                <Route path="produccion" element={<RutaProtegidaPermiso ruta="/produccion"><Produccion /></RutaProtegidaPermiso>} />
                                <Route path="productos" element={<RutaProtegidaPermiso ruta="/productos"><Productos /></RutaProtegidaPermiso>} />
                                <Route path="clientes" element={<RutaProtegidaPermiso ruta="/clientes"><Clientes /></RutaProtegidaPermiso>} />
                                <Route path="proveedores" element={<RutaProtegidaPermiso ruta="/proveedores"><Proveedores /></RutaProtegidaPermiso>} />
                                <Route path="gastos" element={<RutaProtegidaPermiso ruta="/gastos"><Gastos /></RutaProtegidaPermiso>} />
                                <Route path="sincronizacion-sheets" element={<RutaProtegidaPermiso ruta="/sincronizacion-sheets"><SincronizacionSheets /></RutaProtegidaPermiso>} />
                                <Route path="conciliacion" element={<RutaProtegidaPermiso ruta="/conciliacion"><ConciliacionBancaria /></RutaProtegidaPermiso>} />
                                <Route path="reportes-diarios" element={<RutaProtegidaPermiso ruta="/reportes-diarios"><ReportesDiarios /></RutaProtegidaPermiso>} />
                                <Route path="manual" element={<RutaProtegidaPermiso ruta="/manual"><ManualUsuario /></RutaProtegidaPermiso>} />
                                <Route path="usuarios" element={<RutaAdmin><Usuarios /></RutaAdmin>} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </PageSuspense>
                </BrowserRouter>
            </PreferencesProvider>
        </AuthProvider>
    );
}