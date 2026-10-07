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
                                <Route index element={<Dashboard />} />
                                <Route path="remitos" element={<Remitos />} />
                                <Route path="deposito-kanban" element={<DepositoKanban />} />
                                <Route path="auditoria" element={<AuditLogTimeline />} />
                                <Route path="pedidos-web" element={<PedidosWeb />} />
                                <Route path="catalogo-flyers" element={<CatalogoFlyers />} />
                                <Route path="recepciones" element={<Recepciones />} />
                                <Route path="produccion" element={<Produccion />} />
                                <Route path="productos" element={<Productos />} />
                                <Route path="clientes" element={<Clientes />} />
                                <Route path="proveedores" element={<Proveedores />} />
                                <Route path="gastos" element={<Gastos />} />
                                <Route path="sincronizacion-sheets" element={<SincronizacionSheets />} />
                                <Route path="conciliacion" element={<ConciliacionBancaria />} />
                                <Route path="reportes-diarios" element={<ReportesDiarios />} />
                                <Route path="manual" element={<ManualUsuario />} />
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