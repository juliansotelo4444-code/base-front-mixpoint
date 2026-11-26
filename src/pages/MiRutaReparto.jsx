import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import useKanbanSocket from '../hooks/useKanbanSocket';
import Modal from '../components/Modal';
import MercadoPagoLiveModal from '../components/MercadoPagoLiveModal';
import { esFechaDeHoy, esFechaDeEsteMes, formatearFecha } from '../utils/fechas';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);

const ESTADOS_BADGE = {
    pendiente: { label: '🟡 Pendiente', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
    en_preparacion: { label: '🔵 En Prep.', bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' },
    esperando_pago: { label: '🟣 Esp. Pago', bg: '#EDE9FE', color: '#5B21B6', border: '#DDD6FE' },
    en_camino: { label: '🟠 En Camino', bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' },
    entregado: { label: '🟢 Entregado', bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
    facturado: { label: '🔷 Facturado', bg: '#CFFAFE', color: '#0E7490', border: '#A5F3FC' },
    cancelado: { label: '🔴 Cancelado', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
    anulado: { label: '🔴 Anulado', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' }
};

function formatearTelefonoWa(raw) {
    let tel = String(raw || '').replace(/\D/g, '');
    if (tel.startsWith('0')) tel = tel.slice(1);
    if (tel.startsWith('15')) tel = '11' + tel.slice(2);
    if (!tel.startsWith('549') && tel.length >= 10) tel = '549' + tel;
    return tel;
}

function buildMapsUrl(remito) {
    const dir = remito.direccion_entrega || remito.cliente_direccion || '';
    const loc = remito.cliente_localidad || '';
    const query = [dir, loc, 'Argentina'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Buenos Aires, Argentina')}`;
}

function buildWaEtaUrl(remito, tipo) {
    const tel = formatearTelefonoWa(remito.cliente_telefono);
    const nombre = remito.cliente_nombre || 'Cliente';
    const msg = tipo === 'llegando'
        ? `¡Hola ${nombre}! Somos del reparto de *Distribuidora Mix Point* 🚚. Ya estamos llegando en los próximos minutos con tu pedido *#${remito.numero}*. ¡Gracias!`
        : `¡Hola ${nombre}! Somos del reparto de *Distribuidora Mix Point* 🚚. Ya salimos en ruta con tu pedido *#${remito.numero}* (Total: ${fmtMoney(remito.total)}). ¡Cualquier consulta respondé por acá!`;
    return tel.length >= 10
        ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

async function comprimirImagenFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Archivo de imagen inválido.'));
            img.onload = () => {
                const maxDim = 900;
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width >= height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
                resolve(dataUrl);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

export default function MiRutaReparto() {
    const [remitos, setRemitos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('ruta'); // 'ruta' | 'entregados_hoy' | 'mes'
    const [busqueda, setBusqueda] = useState('');
    const [mpTarget, setMpTarget] = useState(null);

    // Modal confirmar entrega + foto
    const [entregaTarget, setEntregaTarget] = useState(null);
    const [recibidoPor, setRecibidoPor] = useState('');
    const [notasEntrega, setNotasEntrega] = useState('');
    const [fotoPreview, setFotoPreview] = useState(null);
    const [comprimiendoFoto, setComprimiendoFoto] = useState(false);
    const [guardandoEntrega, setGuardandoEntrega] = useState(false);
    const [errorEntrega, setErrorEntrega] = useState('');

    // Modal ver foto guardada
    const [fotoVerRemito, setFotoVerRemito] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await client.get('/remitos', { params: { _t: Date.now() } });
            setRemitos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error cargando ruta:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const handleSocketEvento = useCallback((evento) => {
        if (['remito:creado', 'remito:editado', 'remito:estado_cambiado'].includes(evento)) {
            cargar();
        }
    }, [cargar]);

    useKanbanSocket(handleSocketEvento);

    const enRutaLista = remitos.filter(r => ['en_camino', 'en_preparacion', 'pendiente', 'esperando_pago'].includes(r.estado));
    const entregadosHoyLista = remitos.filter(r => ['entregado', 'facturado'].includes(r.estado) && esFechaDeHoy(r.fecha));
    const delMesLista = remitos.filter(r => esFechaDeEsteMes(r.fecha) && !['cancelado', 'anulado'].includes(r.estado));

    let listaBase = enRutaLista;
    if (tab === 'entregados_hoy') listaBase = entregadosHoyLista;
    else if (tab === 'mes') listaBase = delMesLista;

    const filtrados = listaBase.filter((r) => {
        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase();
        return (
            String(r.numero || '').toLowerCase().includes(q) ||
            String(r.cliente_nombre || '').toLowerCase().includes(q) ||
            String(r.direccion_entrega || r.cliente_direccion || '').toLowerCase().includes(q)
        );
    });

    function abrirModalEntrega(r) {
        setEntregaTarget(r);
        setRecibidoPor(r.datos_despacho?.entrega?.recibido_por || '');
        setNotasEntrega(r.datos_despacho?.entrega?.notas_entrega || '');
        setFotoPreview(r.datos_despacho?.entrega?.foto_entrega || null);
        setErrorEntrega('');
    }

    async function handleSeleccionarFoto(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setComprimiendoFoto(true);
        setErrorEntrega('');
        try {
            const compressed = await comprimirImagenFile(file);
            setFotoPreview(compressed);
        } catch (err) {
            setErrorEntrega(err.message || 'No se pudo procesar la foto.');
        } finally {
            setComprimiendoFoto(false);
        }
    }

    async function confirmarEntrega(e) {
        e.preventDefault();
        if (!entregaTarget) return;
        setGuardandoEntrega(true);
        setErrorEntrega('');
        try {
            if (recibidoPor.trim() || notasEntrega.trim() || fotoPreview) {
                await client.post(`/remitos/${entregaTarget.id}/comprobante-entrega`, {
                    recibido_por: recibidoPor,
                    notas_entrega: notasEntrega,
                    foto_entrega_base64: fotoPreview
                });
            }
            if (entregaTarget.estado !== 'entregado') {
                await client.put(`/remitos/${entregaTarget.id}/estado`, { estado: 'entregado' });
            }
            setEntregaTarget(null);
            await cargar();
        } catch (err) {
            setErrorEntrega(err.response?.data?.error || err.message || 'No se pudo registrar la entrega.');
        } finally {
            setGuardandoEntrega(false);
        }
    }

    return (
        <div className="stack gap-lg">
            {/* CABECERA */}
            <div className="spread page-header" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--color-primary-dark)' }}>
                        🚚 Mi Ruta de Hoy
                    </h1>
                    <p className="muted text-sm" style={{ marginTop: 4 }}>
                        Entregas activas, Google Maps, avisos por WhatsApp, pagos MP y foto de entrega
                    </p>
                </div>
                <button type="button" className="btn btn-secondary" onClick={cargar}>
                    🔄 Actualizar ruta
                </button>
            </div>

            {/* PESTAÑAS + BUSCADOR */}
            <div className="card card-pad" style={{ background: 'var(--color-surface)' }}>
                <div className="stack gap-sm">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className={`btn btn-sm ${tab === 'ruta' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('ruta')}
                            style={{ fontWeight: 700 }}
                        >
                            🚚 En Ruta / Listos ({enRutaLista.length})
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${tab === 'entregados_hoy' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('entregados_hoy')}
                            style={{ fontWeight: 700 }}
                        >
                            ✅ Entregados Hoy ({entregadosHoyLista.length})
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${tab === 'mes' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setTab('mes')}
                            style={{ fontWeight: 700 }}
                        >
                            📋 Todos del Mes ({delMesLista.length})
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="🔍 Buscar por cliente, dirección o N° remito..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: 14,
                            borderRadius: 8,
                            border: '1.5px solid var(--color-border-strong)',
                            background: '#FFFFFF'
                        }}
                    />
                </div>
            </div>

            {/* LISTADO DE ENTREGAS */}
            {loading ? (
                <div className="card card-pad muted" style={{ textAlign: 'center', padding: 36 }}>
                    Cargando hoja de entregas...
                </div>
            ) : filtrados.length === 0 ? (
                <div className="card card-pad" style={{ textAlign: 'center', padding: '42px 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🚚</div>
                    <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No hay pedidos en esta vista</p>
                    <p className="muted text-sm" style={{ margin: 0 }}>
                        Cambiá de pestaña arriba o limpiá el buscador para ver más entregas.
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
                    gap: 14
                }}>
                    {filtrados.map((r) => {
                        const estInfo = ESTADOS_BADGE[r.estado] || ESTADOS_BADGE.pendiente;
                        const estaPagado = Boolean(r.pago_validado || r.estado_pago === 'pagado');
                        const direccionMostrar = r.direccion_entrega || r.cliente_direccion || 'Sin dirección cargada';
                        const tieneFoto = Boolean(r.datos_despacho?.entrega?.foto_entrega);

                        return (
                            <div
                                key={r.id}
                                className="card"
                                style={{
                                    padding: '16px',
                                    borderRadius: 12,
                                    borderLeft: `6px solid ${estaPagado ? '#10B981' : '#F59E0B'}`,
                                    background: '#FFFFFF',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: 12
                                }}
                            >
                                {/* CABECERA TARJETA */}
                                <div className="stack gap-xs">
                                    <div className="spread" style={{ alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className="mono" style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-primary-dark)' }}>
                                                {r.numero}
                                            </span>
                                            <span className="mono text-xs muted">{formatearFecha(r.fecha)}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '3px 8px',
                                                borderRadius: 6,
                                                background: estInfo.bg,
                                                color: estInfo.color,
                                                border: `1px solid ${estInfo.border}`
                                            }}>
                                                {estInfo.label}
                                            </span>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '3px 8px',
                                                borderRadius: 6,
                                                background: estaPagado ? '#ECFDF5' : '#FFFBEB',
                                                color: estaPagado ? '#047857' : '#B45309',
                                                border: `1px solid ${estaPagado ? '#A7F3D0' : '#FDE68A'}`
                                            }}>
                                                {estaPagado ? '✓ Pagado' : '⏳ Pago Pend.'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>
                                        {r.cliente_nombre}
                                    </div>

                                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <div>
                                            📍 <strong>{direccionMostrar}</strong>{r.cliente_localidad ? ` · ${r.cliente_localidad}` : ''}
                                        </div>
                                        {r.cliente_telefono && (
                                            <div>📞 {r.cliente_telefono}</div>
                                        )}
                                        {r.bultos && (
                                            <div>📦 {r.bultos} bulto{Number(r.bultos) === 1 ? '' : 's'} {r.peso_kg ? `· ${r.peso_kg} kg` : ''}</div>
                                        )}
                                    </div>

                                    <div className="spread" style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                                        <span className="text-xs muted" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Pedido</span>
                                        <span className="mono" style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-primary-dark)' }}>
                                            {fmtMoney(r.total)}
                                        </span>
                                    </div>

                                    {r.datos_despacho?.entrega?.recibido_por && (
                                        <div style={{ fontSize: 11.5, background: '#ECFDF5', color: '#065F46', padding: '5px 8px', borderRadius: 6 }}>
                                            ✓ Recibió: <strong>{r.datos_despacho.entrega.recibido_por}</strong>
                                        </div>
                                    )}
                                </div>

                                {/* BOTONERA TÁCTIL GRANDE */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                    <a
                                        href={buildMapsUrl(r)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        style={{ justifyContent: 'center', fontWeight: 700, padding: '9px 10px', textDecoration: 'none' }}
                                    >
                                        📍 Maps
                                    </a>

                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        onClick={() => setMpTarget(r)}
                                        style={{ justifyContent: 'center', background: '#009EE3', color: '#FFFFFF', fontWeight: 700, border: 'none', padding: '9px 10px' }}
                                    >
                                        💳 Ver Pago MP
                                    </button>

                                    <a
                                        href={buildWaEtaUrl(r, 'saliendo')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-sm"
                                        style={{ justifyContent: 'center', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 700, padding: '9px 10px', textDecoration: 'none' }}
                                    >
                                        💬 Saliendo
                                    </a>

                                    <a
                                        href={buildWaEtaUrl(r, 'llegando')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-sm"
                                        style={{ justifyContent: 'center', background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', fontWeight: 700, padding: '9px 10px', textDecoration: 'none' }}
                                    >
                                        💬 Llegando
                                    </a>
                                </div>

                                {!['entregado', 'facturado', 'cancelado', 'anulado'].includes(r.estado) ? (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => abrirModalEntrega(r)}
                                        style={{ width: '100%', padding: '11px', fontWeight: 800, fontSize: 14, background: '#059669', borderColor: '#059669' }}
                                    >
                                        📸 Confirmar Entrega (con foto opcional)
                                    </button>
                                ) : tieneFoto && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setFotoVerRemito(r)}
                                        style={{ width: '100%', fontWeight: 700 }}
                                    >
                                        🖼️ Ver foto / comprobante de entrega
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL VERIFICACIÓN SOLO LECTURA DE PAGO MP */}
            {mpTarget && (
                <MercadoPagoLiveModal
                    remitoTarget={mpTarget}
                    onClose={() => setMpTarget(null)}
                    onPagoConfirmado={() => cargar()}
                />
            )}

            {/* MODAL CONFIRMAR ENTREGA + FOTO */}
            {entregaTarget && (
                <Modal title={`📸 Confirmar Entrega · ${entregaTarget.numero}`} onClose={() => setEntregaTarget(null)} width={480}>
                    <form onSubmit={confirmarEntrega} className="stack gap-md">
                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                            <div style={{ fontWeight: 800, fontSize: 15 }}>{entregaTarget.cliente_nombre}</div>
                            <div className="text-xs muted">{entregaTarget.direccion_entrega || entregaTarget.cliente_direccion || ''}</div>
                        </div>

                        {errorEntrega && <div className="alert-banner error">{errorEntrega}</div>}

                        <div className="field">
                            <label>Recibido por (nombre / puesto)</label>
                            <input
                                type="text"
                                placeholder="Ej: Carlos (Recepción)"
                                value={recibidoPor}
                                onChange={(e) => setRecibidoPor(e.target.value)}
                            />
                        </div>

                        <div className="field">
                            <label>Notas de entrega (opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: Quedaron 3 bultos completos, pagó por MP"
                                value={notasEntrega}
                                onChange={(e) => setNotasEntrega(e.target.value)}
                            />
                        </div>

                        <div className="field">
                            <label>Foto del remito firmado o mercadería entregada (opcional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleSeleccionarFoto}
                                style={{ padding: '8px', border: '1px dashed var(--color-border-strong)', borderRadius: 8 }}
                            />
                            {comprimiendoFoto && <span className="text-xs muted">Comprimiendo imagen...</span>}
                            {fotoPreview && (
                                <div style={{ marginTop: 8, textAlign: 'center' }}>
                                    <img
                                        src={fotoPreview}
                                        alt="Comprobante entrega"
                                        style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid var(--color-border)' }}
                                    />
                                    <div>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => setFotoPreview(null)}
                                            style={{ color: '#EF4444', marginTop: 4 }}
                                        >
                                            ✕ Quitar foto
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setEntregaTarget(null)}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={guardandoEntrega || comprimiendoFoto}
                                style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}
                            >
                                {guardandoEntrega ? 'Registrando...' : '✅ Marcar Entregado'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL VER FOTO DE ENTREGA GUARDADA */}
            {fotoVerRemito && (
                <Modal title={`🖼️ Comprobante de Entrega · ${fotoVerRemito.numero}`} onClose={() => setFotoVerRemito(null)} width={500}>
                    <div className="stack gap-md">
                        {fotoVerRemito.datos_despacho?.entrega?.recibido_por && (
                            <div className="text-sm">
                                Recibido por: <strong>{fotoVerRemito.datos_despacho.entrega.recibido_por}</strong>
                            </div>
                        )}
                        {fotoVerRemito.datos_despacho?.entrega?.notas_entrega && (
                            <div className="text-sm muted">
                                Notas: {fotoVerRemito.datos_despacho.entrega.notas_entrega}
                            </div>
                        )}
                        {fotoVerRemito.datos_despacho?.entrega?.foto_entrega && (
                            <img
                                src={fotoVerRemito.datos_despacho.entrega.foto_entrega}
                                alt={`Entrega ${fotoVerRemito.numero}`}
                                style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--color-border)' }}
                            />
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
