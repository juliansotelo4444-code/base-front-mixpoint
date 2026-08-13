import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('admin@frutossecos.com');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo iniciar sesión. Revisá tu conexión.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-sidebar)', padding: 20
        }}>
            
            <div style={{ width: '100%', maxWidth: 380 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
    <h1 style={{ color: 'var(--color-primary)', fontSize: 30, fontWeight: 700, letterSpacing: '0.02em' }}>MIX POINT</h1>
    <p className="text-sm" style={{ color: 'var(--color-text-on-dark-muted)', marginTop: 4 }}>Sistema de gestión interna</p>
</div>

                <form onSubmit={handleSubmit} className="card card-pad stack gap-md">
                    {error && <div className="alert-banner error">{error}</div>}
                    <div className="field">
                        <label>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                    </div>
                    <div className="field">
                        <label>Contraseña</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>
                        {loading ? 'Ingresando…' : 'Ingresar'}
                    </button>
                    <p className="text-sm muted" style={{ textAlign: 'center' }}>
                        Usuario inicial: admin@frutossecos.com / admin123
                    </p>
                </form>
            </div>
        </div>
    );
}
