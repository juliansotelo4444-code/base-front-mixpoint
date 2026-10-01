import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import { IconPlus, IconBuscar } from '../components/Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export default function Produccion() {
    const [tab, setTab] = useState('elaborar'); // 'elaborar', 'recetas', 'historial'
    const [recetas, setRecetas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    // Estado para "Elaborar Lote de Mix"
    const [recetaSeleccionadaId, setRecetaSeleccionadaId] = useState('');
    const [cantidadKg, setCantidadKg] = useState('50');
    const [fechaVencimiento, setFechaVencimiento] = useState(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    );
    const [observaciones, setObservaciones] = useState('');
    const [simulacion, setSimulacion] = useState(null);
    const [simulando, setSimulando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Estado para Modal de "Nueva Receta"
    const [modalRecetaOpen, setModalRecetaOpen] = useState(false);
    const [recetaForm, setRecetaForm] = useState({
        producto_id: '',
        nombre: '',
        descripcion: '',
        rendimiento_kg: 100,
        ingredientes: [{ producto_ingrediente_id: '', porcentaje: 25 }]
    });

    async function cargarDatos() {
        setLoading(true);
        try {
            const [resRecetas, resProd, resHist] = await Promise.all([
                client.get('/produccion/recetas'),
                client.get('/productos', { params: { activo: 1 } }),
                client.get('/produccion/historial')
            ]);
            setRecetas(resRecetas.data);
            setProductos(resProd.data);
            setHistorial(resHist.data);
            if (resRecetas.data.length > 0 && !recetaSeleccionadaId) {
                setRecetaSeleccionadaId(String(resRecetas.data[0].id));
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error al cargar datos de producción.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    // Cada vez que cambia la receta seleccionada o la cantidad, simular disponibilidad
    useEffect(() => {
        if (!recetaSeleccionadaId || !Number(cantidadKg) || Number(cantidadKg) <= 0) {
            setSimulacion(null);
            return;
        }

        let cancelado = false;
        async function simular() {
            setSimulando(true);
            try {
                const res = await client.post('/produccion/simular', {
                    receta_id: Number(recetaSeleccionadaId),
                    cantidad_kg: Number(cantidadKg)
                });
                if (!cancelado) setSimulacion(res.data);
            } catch (err) {
                if (!cancelado) setSimulacion(null);
            } finally {
                if (!cancelado) setSimulando(false);
            }
        }

        const t = setTimeout(simular, 300);
        return () => {
            cancelado = true;
            clearTimeout(t);
        };
    }, [recetaSeleccionadaId, cantidadKg]);

    async function handleElaborar(e) {
        e.preventDefault();
        setError('');
        setMensajeExito('');

        if (!simulacion || !simulacion.factible) {
            setError('No hay stock suficiente de uno o más insumos para completar la elaboración.');
            return;
        }

        setGuardando(true);
        try {
            const res = await client.post('/produccion/elaborar', {
                receta_id: Number(recetaSeleccionadaId),
                cantidad_kg: Number(cantidadKg),
                fecha_vencimiento: fechaVencimiento,
                observaciones: observaciones || null
            });

            setMensajeExito(`🎉 ¡Lote elaborado exitosamente! Se dieron de alta ${res.data.cantidad_producida} kg con el lote "${res.data.numero_lote}" (Costo unitario: ${fmtMoney(res.data.costo_unitario)}/kg).`);
            setObservaciones('');
            await cargarDatos();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al ejecutar la orden de producción.');
        } finally {
            setGuardando(false);
        }
    }

    function abrirNuevaReceta() {
        setRecetaForm({
            producto_id: '',
            nombre: '',
            descripcion: '',
            rendimiento_kg: 100,
            ingredientes: [
                { producto_ingrediente_id: '', porcentaje: 25 },
                { producto_ingrediente_id: '', porcentaje: 25 },
                { producto_ingrediente_id: '', porcentaje: 25 },
                { producto_ingrediente_id: '', porcentaje: 25 }
            ]
        });
        setError('');
        setModalRecetaOpen(true);
    }

    function handleAgregarIngrediente() {
        setRecetaForm({
            ...recetaForm,
            ingredientes: [...recetaForm.ingredientes, { producto_ingrediente_id: '', porcentaje: 10 }]
        });
    }

    function handleQuitarIngrediente(idx) {
        const nuevos = recetaForm.ingredientes.filter((_, i) => i !== idx);
        setRecetaForm({ ...recetaForm, ingredientes: nuevos });
    }

    async function handleGuardarReceta(e) {
        e.preventDefault();
        setError('');

        const sumaPorcentajes = recetaForm.ingredientes.reduce((acc, ing) => acc + (Number(ing.porcentaje) || 0), 0);
        if (Math.abs(sumaPorcentajes - 100) > 0.5) {
            setError(`La suma de los ingredientes debe ser exactamente 100%. Actualmente suma ${sumaPorcentajes}%.`);
            return;
        }

        try {
            await client.post('/produccion/recetas', recetaForm);
            setModalRecetaOpen(false);
            setMensajeExito('Receta guardada exitosamente.');
            await cargarDatos();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar la fórmula de receta.');
        }
    }

    // Filtrar productos que son candidatos a ser resultado de recetas (Mixes o todos)
    const productosMix = productos.filter(p =>
        (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes('mix')) ||
        p.nombre.toLowerCase().includes('mix')
    );

    return (
        <div className="stack gap-lg">
            <div className="spread page-header">
                <div>
                    <h1 style={{ fontSize: 26 }}>Armado de Mixes y Fraccionamiento</h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Trazabilidad FEFO, recetas de mezclas y órdenes de elaboración · Mix Point
                    </p>
                </div>
                <div className="row gap-xs">
                    <button
                        className={`btn ${tab === 'elaborar' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab('elaborar')}
                    >
                        🥣 Elaborar Mix
                    </button>
                    <button
                        className={`btn ${tab === 'recetas' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab('recetas')}
                    >
                        📋 Fórmulas / Recetas ({recetas.length})
                    </button>
                    <button
                        className={`btn ${tab === 'historial' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab('historial')}
                    >
                        📜 Historial ({historial.length})
                    </button>
                </div>
            </div>

            {mensajeExito && (
                <div className="alert-banner success" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                    {mensajeExito}
                </div>
            )}
            {error && <div className="alert-banner error">{error}</div>}

            {/* PESTAÑA 1: ELABORAR MIX */}
            {tab === 'elaborar' && (
                <div className="dashboard-main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
                    <form onSubmit={handleElaborar} className="card card-pad stack gap-md">
                        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                            <h3 style={{ fontSize: 16, color: 'var(--color-primary)' }}>🥣 Nueva Orden de Elaboración</h3>
                            <p className="muted text-xs" style={{ marginTop: 2 }}>
                                Descuenta automáticamente los insumos de sus lotes por FEFO y da de alta el lote del Mix terminado.
                            </p>
                        </div>

                        <div className="field">
                            <label>Seleccionar Mix / Receta *</label>
                            <select
                                required
                                value={recetaSeleccionadaId}
                                onChange={e => setRecetaSeleccionadaId(e.target.value)}
                                style={{ fontSize: 15, padding: '10px 12px' }}
                            >
                                {recetas.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.nombre} (Mix: {r.producto_nombre})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-grid">
                            <div className="field">
                                <label>Cantidad a Producir (kg) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.5"
                                    required
                                    value={cantidadKg}
                                    onChange={e => setCantidadKg(e.target.value)}
                                    style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary-dark)' }}
                                />
                            </div>
                            <div className="field">
                                <label>Fecha de Vencimiento Asignada</label>
                                <input
                                    type="date"
                                    required
                                    value={fechaVencimiento}
                                    onChange={e => setFechaVencimiento(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label>Observaciones de Elaboración</label>
                            <textarea
                                rows={2}
                                placeholder="Ej: Lote para despacho de la semana..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={guardando || simulando || !simulacion?.factible}
                            style={{ padding: '12px 18px', fontSize: 15, fontWeight: 700 }}
                        >
                            {guardando ? 'Procesando mezcla...' : `Confirmar y Producir ${cantidadKg || 0} kg`}
                        </button>
                    </form>

                    {/* Panel lateral: Verificación de Insumos y Costos */}
                    <div className="card card-pad stack gap-md" style={{ background: '#fafaf9' }}>
                        <div className="spread" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                            <div>
                                <h3 style={{ fontSize: 15, margin: 0 }}>🔍 Verificación de Materias Primas</h3>
                                <span className="muted text-xs">Cálculo de stock por FEFO</span>
                            </div>
                            {simulacion && (
                                <span className={`badge ${simulacion.factible ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 12 }}>
                                    {simulacion.factible ? '✅ Stock Disponible' : '❌ Insumos Faltantes'}
                                </span>
                            )}
                        </div>

                        {simulando ? (
                            <p className="muted text-sm" style={{ padding: 20, textAlign: 'center' }}>Calculando disponibilidad...</p>
                        ) : simulacion ? (
                            <div className="stack gap-sm">
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            <th>Ingrediente</th>
                                            <th className="text-right">Requerido</th>
                                            <th className="text-right">En Depósito</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {simulacion.insumos.map(ing => (
                                            <tr key={ing.producto_id}>
                                                <td style={{ fontWeight: 600 }}>{ing.nombre}</td>
                                                <td className="text-right mono" style={{ fontWeight: 700 }}>{ing.kg_necesarios} kg</td>
                                                <td className="text-right mono muted">{ing.stock_actual} kg</td>
                                                <td>
                                                    {ing.suficiente ? (
                                                        <span className="badge badge-success" style={{ fontSize: 10 }}>OK</span>
                                                    ) : (
                                                        <span className="badge badge-danger" style={{ fontSize: 10 }}>Falta stock</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="card" style={{ padding: 12, background: '#fff', marginTop: 10 }}>
                                    <div className="spread text-sm">
                                        <span className="muted">Costo estimado total insumos:</span>
                                        <span className="mono" style={{ fontWeight: 700 }}>{fmtMoney(simulacion.costo_estimado_total)}</span>
                                    </div>
                                    <div className="spread text-sm" style={{ marginTop: 4 }}>
                                        <span className="muted">Costo unitario por kg resultante:</span>
                                        <span className="mono" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                            {fmtMoney(simulacion.costo_estimado_kg)} / kg
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="muted text-sm">Seleccioná una receta para simular el consumo de materias primas.</p>
                        )}
                    </div>
                </div>
            )}

            {/* PESTAÑA 2: FÓRMULAS Y RECETAS */}
            {tab === 'recetas' && (
                <div className="stack gap-md">
                    <div className="spread">
                        <span className="muted text-sm">Fórmulas registradas para armado de productos combinados.</span>
                        <button className="btn btn-primary" onClick={abrirNuevaReceta}>
                            <IconPlus /> Nueva Fórmula de Mix
                        </button>
                    </div>

                    <div className="dashboard-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                        {recetas.map(r => (
                            <div key={r.id} className="card card-pad stack gap-sm" style={{ background: '#fff' }}>
                                <div className="spread" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-primary-dark)' }}>{r.nombre}</h3>
                                        <span className="muted text-xs">Producto destino: {r.producto_nombre}</span>
                                    </div>
                                    <span className="badge badge-primary">{r.rendimiento_kg} kg base</span>
                                </div>
                                {r.descripcion && <p className="muted text-xs">{r.descripcion}</p>}

                                <div style={{ marginTop: 4 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Composición:</div>
                                    <div className="stack gap-xs">
                                        {r.ingredientes?.map((ing, idx) => (
                                            <div key={idx} className="spread text-xs" style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 4 }}>
                                                <span>{ing.ingrediente_nombre}</span>
                                                <span className="mono" style={{ fontWeight: 700 }}>{ing.porcentaje}% ({ing.ingrediente_stock} kg disp.)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="row gap-xs" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            setRecetaSeleccionadaId(String(r.id));
                                            setTab('elaborar');
                                        }}
                                    >
                                        🥣 Elaborar este Mix
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PESTAÑA 3: HISTORIAL DE ELABORACIONES */}
            {tab === 'historial' && (
                <div className="card">
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Orden #</th>
                                    <th>Producto Elaborado</th>
                                    <th className="text-right">Cantidad</th>
                                    <th>Lote Generado</th>
                                    <th className="text-right">Costo Total</th>
                                    <th>Operador</th>
                                    <th>Insumos Consumidos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.map(h => (
                                    <tr key={h.id}>
                                        <td className="mono muted">{h.fecha}</td>
                                        <td className="mono" style={{ fontWeight: 700 }}>{h.numero}</td>
                                        <td style={{ fontWeight: 600 }}>{h.producto_nombre}</td>
                                        <td className="text-right mono" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                            {h.cantidad_producida} {h.unidad_medida}
                                        </td>
                                        <td className="mono"><span className="badge badge-neutral">{h.numero_lote}</span></td>
                                        <td className="text-right mono">{fmtMoney(h.costo_total)}</td>
                                        <td className="text-xs">{h.usuario_nombre || 'Admin'}</td>
                                        <td>
                                            <div style={{ fontSize: 11, maxWidth: 220, lineHeight: 1.2 }}>
                                                {h.insumos?.map(ins => `${ins.insumo_nombre} (${ins.cantidad_usada}kg)`).join(', ')}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {historial.length === 0 && (
                            <div className="empty-state">
                                <p>Aún no se registraron elaboraciones de mixes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL NUEVA FÓRMULA DE RECETA */}
            {modalRecetaOpen && (
                <Modal title="Configurar Fórmula de Mix" onClose={() => setModalRecetaOpen(false)} width={680}>
                    <form onSubmit={handleGuardarReceta} className="stack gap-md">
                        {error && <div className="alert-banner error">{error}</div>}

                        <div className="form-grid">
                            <div className="field">
                                <label>Nombre de la Fórmula *</label>
                                <input
                                    required
                                    placeholder="Ej: Mix Patagonia Granel"
                                    value={recetaForm.nombre}
                                    onChange={e => setRecetaForm({ ...recetaForm, nombre: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label>Producto Resultante (Catálogo) *</label>
                                <select
                                    required
                                    value={recetaForm.producto_id}
                                    onChange={e => setRecetaForm({ ...recetaForm, producto_id: Number(e.target.value) })}
                                >
                                    <option value="">Seleccionar producto Mix...</option>
                                    {(productosMix.length ? productosMix : productos).map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} ({p.codigo || 'S/C'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label>Descripción / Observaciones</label>
                            <input
                                placeholder="Ej: Fórmula para ventas mayoristas en caja de 10kg"
                                value={recetaForm.descripcion}
                                onChange={e => setRecetaForm({ ...recetaForm, descripcion: e.target.value })}
                            />
                        </div>

                        {/* Ingredientes de la receta */}
                        <div>
                            <div className="spread" style={{ marginBottom: 8 }}>
                                <label style={{ fontWeight: 700 }}>Ingredientes y Proporciones (Total: 100%)</label>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAgregarIngrediente}>
                                    <IconPlus /> Agregar Ingrediente
                                </button>
                            </div>

                            <div className="stack gap-xs">
                                {recetaForm.ingredientes.map((ing, idx) => (
                                    <div key={idx} className="row gap-sm" style={{ alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <select
                                                required
                                                value={ing.producto_ingrediente_id}
                                                onChange={e => {
                                                    const nuevos = [...recetaForm.ingredientes];
                                                    nuevos[idx].producto_ingrediente_id = Number(e.target.value);
                                                    setRecetaForm({ ...recetaForm, ingredientes: nuevos });
                                                }}
                                            >
                                                <option value="">Seleccionar materia prima...</option>
                                                {productos.map(p => (
                                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ width: 110 }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                required
                                                placeholder="%"
                                                value={ing.porcentaje}
                                                onChange={e => {
                                                    const nuevos = [...recetaForm.ingredientes];
                                                    nuevos[idx].porcentaje = Number(e.target.value);
                                                    setRecetaForm({ ...recetaForm, ingredientes: nuevos });
                                                }}
                                            />
                                        </div>
                                        <span className="mono">%</span>
                                        {recetaForm.ingredientes.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm text-danger"
                                                onClick={() => handleQuitarIngrediente(idx)}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="spread" style={{ marginTop: 10, padding: '6px 10px', background: '#f8fafc', borderRadius: 6 }}>
                                <span className="muted text-xs">Total porcentajes acumulados:</span>
                                <span className={`mono font-bold ${
                                    recetaForm.ingredientes.reduce((a, b) => a + (Number(b.porcentaje) || 0), 0) === 100
                                        ? 'text-success' : 'text-danger'
                                }`}>
                                    {recetaForm.ingredientes.reduce((a, b) => a + (Number(b.porcentaje) || 0), 0)}%
                                </span>
                            </div>
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setModalRecetaOpen(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Guardar Fórmula
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
