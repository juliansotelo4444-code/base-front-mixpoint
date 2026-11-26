import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from './Modal';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n) || 0);

export default function AjusteMasivoPreciosModal({ categorias = [], onClose, onAplicado }) {
    const [proveedores, setProveedores] = useState([]);
    const [porcentaje, setPorcentaje] = useState('10');
    const [categoriaId, setCategoriaId] = useState('');
    const [proveedorId, setProveedorId] = useState('');
    const [redondeo, setRedondeo] = useState(100);
    const [incluirEscalas, setIncluirEscalas] = useState(true);
    const [incluirCosto, setIncluirCosto] = useState(false);

    const [previewData, setPreviewData] = useState(null);
    const [cargandoPreview, setCargandoPreview] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    useEffect(() => {
        client.get('/proveedores', { params: { activo: 1 } })
            .then(r => setProveedores(Array.isArray(r.data) ? r.data : []))
            .catch(() => {});
    }, []);

    // Limpiar vista previa si cambian parámetros para no aplicar un preview viejo por error
    useEffect(() => {
        setPreviewData(null);
        setError('');
    }, [porcentaje, categoriaId, proveedorId, redondeo, incluirEscalas, incluirCosto]);

    function buildPayload(isPreview) {
        return {
            porcentaje: Number(porcentaje),
            categoria_id: categoriaId ? Number(categoriaId) : null,
            proveedor_id: proveedorId ? Number(proveedorId) : null,
            redondeo: Number(redondeo),
            incluir_escalas: incluirEscalas,
            incluir_costo: incluirCosto,
            preview: isPreview
        };
    }

    async function handleVistaPrevia(e) {
        e.preventDefault();
        setError('');
        setExito('');
        const pct = Number(porcentaje);
        if (!Number.isFinite(pct) || pct === 0 || pct < -80 || pct > 500) {
            setError('Ingresá un porcentaje válido distinto de 0 (entre -80% y +500%).');
            return;
        }
        setCargandoPreview(true);
        try {
            const { data } = await client.post('/productos/ajuste-masivo-precios', buildPayload(true));
            setPreviewData(data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudo calcular la vista previa.');
        } finally {
            setCargandoPreview(false);
        }
    }

    async function handleAplicar() {
        if (!previewData || previewData.total_afectados === 0) return;
        const pctNum = Number(porcentaje);
        const signo = pctNum > 0 ? `+${pctNum}%` : `${pctNum}%`;
        if (!window.confirm(`¿Confirmás aplicar el ajuste de ${signo} a ${previewData.total_afectados} producto(s)? Se actualizará de inmediato el Catálogo PDF y la Tienda Online.`)) {
            return;
        }

        setAplicando(true);
        setError('');
        try {
            const { data } = await client.post('/productos/ajuste-masivo-precios', buildPayload(false));
            setExito(`✅ Se actualizaron ${data.actualizados} producto(s). El Catálogo PDF y la Tienda Online ya reflejan los nuevos precios.`);
            setPreviewData(null);
            if (onAplicado) onAplicado(data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudo aplicar el ajuste masivo.');
        } finally {
            setAplicando(false);
        }
    }

    return (
        <Modal title="📈 Ajuste Masivo de Precios (%)" onClose={onClose} width={780}>
            <div className="stack gap-md">
                <p className="muted text-sm" style={{ margin: 0 }}>
                    Aplicá aumentos o descuentos porcentuales por categoría o proveedor. Los cambios actualizan al instante el catálogo de gestión, el Catálogo PDF y la tienda online.
                </p>

                <form onSubmit={handleVistaPrevia} className="stack gap-md">
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                        <div className="field">
                            <label>Porcentaje (%) *</label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                value={porcentaje}
                                onChange={(e) => setPorcentaje(e.target.value)}
                                placeholder="Ej: 10 o -5"
                            />
                            <span className="text-xs muted">Positivo sube, negativo baja</span>
                        </div>

                        <div className="field">
                            <label>Categoría</label>
                            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label>Proveedor (opcional)</label>
                            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                                <option value="">Todos los proveedores</option>
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.id}>{p.razon_social}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label>Redondeo prolijo</label>
                            <select value={redondeo} onChange={(e) => setRedondeo(Number(e.target.value))}>
                                <option value={0}>Sin redondeo</option>
                                <option value={10}>Múltiplos de $10</option>
                                <option value={50}>Múltiplos de $50</option>
                                <option value={100}>Múltiplos de $100</option>
                                <option value={500}>Múltiplos de $500</option>
                            </select>
                        </div>
                    </div>

                    <div className="row gap-md" style={{ flexWrap: 'wrap' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={incluirEscalas}
                                onChange={(e) => setIncluirEscalas(e.target.checked)}
                            />
                            Ajustar escalas mayoristas (5 / 10 / 25 / 30 kg)
                        </label>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={incluirCosto}
                                onChange={(e) => setIncluirCosto(e.target.checked)}
                            />
                            También ajustar Costo de compra
                        </label>
                    </div>

                    {error && <div className="alert-banner error">{error}</div>}
                    {exito && (
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: 8,
                            background: '#ECFDF5',
                            border: '1.5px solid #10B981',
                            color: '#065F46',
                            fontWeight: 700,
                            fontSize: 13.5
                        }}>
                            {exito}
                        </div>
                    )}

                    <div className="row gap-sm" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <button
                            type="submit"
                            className="btn btn-secondary"
                            disabled={cargandoPreview}
                            style={{ fontWeight: 700 }}
                        >
                            {cargandoPreview ? 'Calculando...' : '👁️ Ver Vista Previa'}
                        </button>

                        {previewData && previewData.total_afectados > 0 && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleAplicar}
                                disabled={aplicando}
                                style={{ fontWeight: 800, background: '#059669', borderColor: '#059669' }}
                            >
                                {aplicando
                                    ? 'Aplicando precios...'
                                    : `✅ Aplicar a ${previewData.total_afectados} producto(s)`}
                            </button>
                        )}
                    </div>
                </form>

                {/* TABLA DE VISTA PREVIA */}
                {previewData && (
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                        {previewData.total_afectados === 0 ? (
                            <div className="muted text-sm" style={{ textAlign: 'center', padding: 16 }}>
                                No se encontraron productos activos que coincidan con esos filtros.
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                                    Vista previa de cambios ({previewData.total_afectados} productos):
                                </div>
                                <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                                    <table className="data-table" style={{ fontSize: 12.5 }}>
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th className="text-right">1 kg Actual</th>
                                                <th className="text-right">1 kg Nuevo</th>
                                                {incluirEscalas && <th className="text-right">5 kg Nuevo</th>}
                                                {incluirEscalas && <th className="text-right">10 kg Nuevo</th>}
                                                {incluirCosto && <th className="text-right">Costo Nuevo</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.productos.map((p) => (
                                                <tr key={p.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                                                        <div className="text-xs muted">{p.codigo || ''}</div>
                                                    </td>
                                                    <td className="text-right mono muted">{fmtMoney(p.precio_venta_antes)}</td>
                                                    <td className="text-right mono" style={{ fontWeight: 800, color: Number(porcentaje) >= 0 ? '#047857' : '#B45309' }}>
                                                        {fmtMoney(p.precio_venta_despues)}
                                                    </td>
                                                    {incluirEscalas && (
                                                        <td className="text-right mono">
                                                            {p.precio_5kg_despues > 0 ? fmtMoney(p.precio_5kg_despues) : '—'}
                                                        </td>
                                                    )}
                                                    {incluirEscalas && (
                                                        <td className="text-right mono">
                                                            {p.precio_10kg_despues > 0 ? fmtMoney(p.precio_10kg_despues) : '—'}
                                                        </td>
                                                    )}
                                                    {incluirCosto && (
                                                        <td className="text-right mono muted">
                                                            {p.precio_compra_despues > 0 ? fmtMoney(p.precio_compra_despues) : '—'}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
