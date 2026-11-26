import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import Modal from './Modal';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);

export default function LinkPagoMPModal({ remito, onClose, onLinkGenerado }) {
    const [linkData, setLinkData] = useState(() => {
        const existing = remito?.datos_despacho?.mp_link_pago;
        return existing ? { init_point: existing, preference_id: remito?.datos_despacho?.mp_preference_id || '' } : null;
    });
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState('');
    const [copiado, setCopiado] = useState(false);

    const generarLink = useCallback(async () => {
        if (!remito?.id) return;
        setGenerando(true);
        setError('');
        try {
            const { data } = await client.post('/mercadopago/link-pago-remito', { remito_id: remito.id });
            setLinkData({
                init_point: data.init_point,
                preference_id: data.preference_id
            });
            if (onLinkGenerado) onLinkGenerado(data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudo generar el link de pago.');
        } finally {
            setGenerando(false);
        }
    }, [remito?.id, onLinkGenerado]);

    useEffect(() => {
        if (!linkData?.init_point && remito?.id) {
            generarLink();
        }
    }, [linkData?.init_point, remito?.id, generarLink]);

    function construirWaLink() {
        if (!linkData?.init_point) return '#';
        const tel = String(remito?.cliente_telefono || '').replace(/\D/g, '');
        const msg =
            `¡Hola ${remito?.cliente_nombre || 'Cliente'}! Te compartimos el link oficial de Mercado Pago para abonar tu pedido *#${remito?.numero}* de *Distribuidora Mix Point*:\n\n` +
            `💰 *Total:* ${fmtMoney(remito?.total)}\n` +
            `🔗 *Pagar acá:* ${linkData.init_point}\n\n` +
            `¡Apenas pagues se acredita automáticamente! Ante cualquier consulta escribinos al +54 9 11 5707-7061.`;
        return tel.length >= 8
            ? `https://wa.me/${tel.startsWith('54') ? tel : `549${tel}`}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    }

    const qrUrl = linkData?.init_point
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(linkData.init_point)}`
        : null;

    return (
        <Modal title={`🔗 Link de Pago MP · Remito ${remito?.numero || ''}`} onClose={onClose} width={520}>
            <div className="stack gap-md">
                <div style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#F0F9FF',
                    border: '1.5px solid #009EE3',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10
                }}>
                    <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                            Cobro automático por Webhook
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                            {remito?.cliente_nombre}
                        </div>
                    </div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 900, color: '#0284C7' }}>
                        {fmtMoney(remito?.total)}
                    </div>
                </div>

                {error && <div className="alert-banner error">{error}</div>}

                {generando && !linkData?.init_point ? (
                    <div style={{ padding: 36, textAlign: 'center' }} className="muted">
                        Generando Link de Pago y QR en Mercado Pago...
                    </div>
                ) : linkData?.init_point ? (
                    <>
                        {qrUrl && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                                <img
                                    src={qrUrl}
                                    alt={`QR Pago Remito ${remito?.numero}`}
                                    style={{ width: 210, height: 210, borderRadius: 8 }}
                                />
                                <span className="text-xs muted" style={{ marginTop: 8 }}>
                                    El cliente puede escanear este QR con la app de Mercado Pago
                                </span>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                                Link directo de Checkout Mercado Pago
                            </label>
                            <div className="row gap-xs">
                                <input
                                    type="text"
                                    readOnly
                                    value={linkData.init_point}
                                    style={{ flex: 1, padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border-strong)', background: '#F8FAFC', fontFamily: 'monospace' }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(linkData.init_point);
                                        setCopiado(true);
                                        setTimeout(() => setCopiado(false), 2500);
                                    }}
                                >
                                    {copiado ? '✓ Copiado' : '📋 Copiar'}
                                </button>
                            </div>
                        </div>

                        <div className="row gap-sm" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={generarLink}
                                disabled={generando}
                            >
                                {generando ? 'Regenerando...' : '🔄 Regenerar Link'}
                            </button>

                            <a
                                href={construirWaLink()}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm"
                                style={{ background: '#25D366', color: '#FFFFFF', fontWeight: 800, textDecoration: 'none', padding: '8px 14px', borderRadius: 8 }}
                            >
                                📲 Enviar por WhatsApp al cliente
                            </a>
                        </div>
                    </>
                ) : null}
            </div>
        </Modal>
    );
}
