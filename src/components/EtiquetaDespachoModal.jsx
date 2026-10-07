import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import client from '../api/client';
import Modal from './Modal';
import { formatearFecha } from '../utils/fechas';
import { IconClose } from './Icons';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

// Generador de código de barras SVG simulado de alta fidelidad estética (estilo CODE 128)
function BarcodeSVG({ value }) {
    // Generar un patrón determinista de barras a partir del string
    const bars = [];
    const hash = (value || 'MP-0000').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pattern = [2, 1, 3, 1, 1, 2, 3, 2, 1, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2];
    
    let x = 10;
    pattern.forEach((w, idx) => {
        const isBar = idx % 2 === 0;
        const width = ((w + (hash % 3)) % 3) + 1.2;
        if (isBar) {
            bars.push(<rect key={idx} x={x} y={0} width={width * 1.5} height={38} fill="#000000" />);
        }
        x += (width * 1.5) + (isBar ? 1.5 : 2);
    });

    return (
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
            <svg viewBox={`0 0 ${Math.max(x + 10, 180)} 42`} style={{ width: '85%', maxHeight: 42, display: 'inline-block' }}>
                {bars}
            </svg>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, color: '#000000', marginTop: -2 }}>
                *{value}*
            </div>
        </div>
    );
}

export default function EtiquetaDespachoModal({ remito, onClose, onUpdated }) {
    if (!remito) return null;

    // Calcular peso estimado a partir de los ítems si no viene en el remito
    const pesoSugerido = (remito.items || []).reduce((acc, it) => {
        const cant = Number(it.cantidad) || 0;
        const unidad = (it.unidad_medida || '').toLowerCase();
        if (unidad.includes('kg')) return acc + cant;
        if (unidad.includes('gr') || unidad.includes('g')) return acc + (cant / 1000);
        return acc + (cant * 0.5); // 500g estimado por unidad
    }, 0);

    const [transportista, setTransportista] = useState(remito.transportista || 'Flete Propio');
    const [bultos, setBultos] = useState(remito.bultos || 1);
    const [pesoKg, setPesoKg] = useState(remito.peso_kg > 0 ? remito.peso_kg : Math.round(pesoSugerido * 10) / 10);
    const [valorDeclarado, setValorDeclarado] = useState(remito.valor_declarado > 0 ? remito.valor_declarado : (remito.total || 0));
    const [notasDespacho, setNotasDespacho] = useState(remito.datos_despacho?.notas || '');
    const [formato, setFormato] = useState('termica'); // 'termica' (100x150 mm) | 'a4'

    const [guardando, setGuardando] = useState(false);
    const [guardadoExito, setGuardadoExito] = useState(false);
    const [qrCodes, setQrCodes] = useState({});
    const printableRef = useRef(null);

    const cantBultosNum = Math.max(1, parseInt(bultos, 10) || 1);
    const listaBultos = Array.from({ length: cantBultosNum }, (_, i) => i + 1);

    // Generar códigos QR para cada bulto
    useEffect(() => {
        const qrs = {};
        const promesas = listaBultos.map(async (b) => {
            const qrText = [
                `MIX POINT DESPACHO`,
                `Remito: ${remito.numero}`,
                `Bulto: ${b}/${cantBultosNum}`,
                `Cliente: ${remito.cliente_nombre}`,
                `Destino: ${remito.direccion_entrega || remito.cliente_direccion || 'Depósito'}`,
                `Transporte: ${transportista}`,
                `Valor: $${valorDeclarado}`,
                `Peso: ${pesoKg} kg`,
                `Contacto: 1167873243`
            ].join('\n');

            try {
                const url = await QRCode.toDataURL(qrText, {
                    margin: 1,
                    width: 130,
                    color: { dark: '#000000', light: '#FFFFFF' }
                });
                qrs[b] = url;
            } catch (err) {
                console.error(err);
            }
        });

        Promise.all(promesas).then(() => setQrCodes(qrs));
    }, [remito, transportista, bultos, pesoKg, valorDeclarado]);

    async function guardarDatosDespacho() {
        setGuardando(true);
        try {
            const { data } = await client.put(`/remitos/${remito.id}/despacho`, {
                transportista,
                bultos: cantBultosNum,
                peso_kg: parseFloat(pesoKg) || 0,
                valor_declarado: parseFloat(valorDeclarado) || 0,
                datos_despacho: {
                    notas: notasDespacho,
                    actualizado_en: new Date().toISOString()
                }
            });
            setGuardadoExito(true);
            setTimeout(() => setGuardadoExito(false), 2500);
            if (onUpdated) onUpdated(data);
        } catch (e) {
            alert('Error al guardar datos de despacho: ' + (e.response?.data?.error || e.message));
        } finally {
            setGuardando(false);
        }
    }

    const getPrintCss = () => `
        @page {
            size: ${formato === 'termica' ? '100mm 150mm' : 'A4 portrait'};
            margin: ${formato === 'termica' ? '0' : '8mm'};
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #000000;
        }
        .etiqueta-container {
            width: ${formato === 'termica' ? '100mm' : '96mm'};
            height: ${formato === 'termica' ? '148mm' : '140mm'};
            max-height: ${formato === 'termica' ? '148mm' : '140mm'};
            margin: ${formato === 'termica' ? '0 auto' : '0 0 10mm 0'};
            padding: 5mm 6mm;
            border: 2px solid #000000;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
            background: #ffffff;
            box-sizing: border-box;
            overflow: hidden;
        }
        .etiqueta-container:last-child {
            page-break-after: avoid;
            break-after: avoid;
        }
        .etiqueta-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000000;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }
        .etiqueta-brand-title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.05em;
            margin: 0;
        }
        .etiqueta-brand-sub {
            font-size: 8.5px;
            margin: 1px 0 0 0;
            font-weight: 600;
        }
        .etiqueta-bulto-badge {
            background: #000000;
            color: #ffffff;
            padding: 4px 8px;
            font-size: 14px;
            font-weight: 900;
            border-radius: 4px;
            text-align: center;
            letter-spacing: 0.05em;
        }
        .etiqueta-box {
            border: 1.5px solid #000000;
            border-radius: 4px;
            padding: 6px 8px;
            margin-bottom: 6px;
        }
        .etiqueta-box-title {
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #444444;
            margin-bottom: 2px;
        }
        .etiqueta-client-name {
            font-size: 14px;
            font-weight: 800;
            line-height: 1.2;
            margin: 0 0 2px 0;
        }
        .etiqueta-client-address {
            font-size: 11px;
            font-weight: 700;
            line-height: 1.3;
            margin: 0 0 2px 0;
        }
        .etiqueta-client-phone {
            font-size: 10px;
            font-weight: 600;
            margin: 0;
        }
        .etiqueta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 6px;
        }
        .etiqueta-field-label {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            color: #444444;
        }
        .etiqueta-field-value {
            font-size: 12px;
            font-weight: 800;
            line-height: 1.2;
        }
        .etiqueta-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1.5px solid #000000;
            padding-top: 4px;
            font-size: 8px;
            font-weight: 700;
        }
        .etiqueta-security-icons {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 8px;
            font-weight: 700;
        }
    `;

    function handlePrint() {
        const content = printableRef.current;
        if (!content) return;

        let frame = document.getElementById('etiqueta-hidden-iframe');
        if (frame) frame.remove();

        frame = document.createElement('iframe');
        frame.id = 'etiqueta-hidden-iframe';
        frame.style.position = 'fixed';
        frame.style.top = '-9999px';
        frame.style.left = '-9999px';
        frame.style.width = formato === 'termica' ? '100mm' : '210mm';
        frame.style.height = formato === 'termica' ? '150mm' : '297mm';
        frame.style.border = 'none';
        document.body.appendChild(frame);

        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="utf-8">
                <title>Etiquetas_${remito.numero}</title>
                <style>${getPrintCss()}</style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            try {
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } catch (e) {
                window.print();
            }
        }, 300);
    }

    return (
        <Modal title={`🏷️ Etiquetas de Despacho — Remito ${remito.numero}`} onClose={onClose} width={920}>
            <div className="stack gap-md">
                
                {/* PANEL DE CONFIGURACIÓN DE TRANSPORTE Y BULTOS */}
                <div style={{
                    background: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '14px 18px'
                }}>
                    <div className="spread" style={{ marginBottom: 10, alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                                Parámetros de Despacho y Logística
                            </span>
                            <p className="text-xs muted" style={{ marginTop: 2 }}>
                                Ajustá el transporte, peso verificado y cantidad de bultos para rotular los paquetes.
                            </p>
                        </div>
                        <div className="row gap-xs">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={guardarDatosDespacho}
                                disabled={guardando}
                                style={{ fontWeight: 600 }}
                            >
                                {guardando ? 'Guardando...' : guardadoExito ? '✓ Guardado' : '💾 Guardar en Remito'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={handlePrint}
                                style={{ fontWeight: 700, padding: '7px 16px' }}
                            >
                                🖨️ Imprimir {cantBultosNum} {cantBultosNum === 1 ? 'Etiqueta' : 'Etiquetas'}
                            </button>
                        </div>
                    </div>

                    <div className="etiqueta-form-grid">
                        <div>
                            <label className="text-xs muted" style={{ fontWeight: 700 }}>Transporte / Chofer / Expreso</label>
                            <input
                                value={transportista}
                                onChange={e => setTransportista(e.target.value)}
                                placeholder="Ej: Vía Cargo, Flete Propio, Expreso Brio"
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13 }}
                            />
                        </div>

                        <div>
                            <label className="text-xs muted" style={{ fontWeight: 700 }}>Cantidad de Bultos</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={bultos}
                                onChange={e => setBultos(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13, fontWeight: 700 }}
                            />
                        </div>

                        <div>
                            <label className="text-xs muted" style={{ fontWeight: 700 }}>Peso Total (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={pesoKg}
                                onChange={e => setPesoKg(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13, fontWeight: 700 }}
                            />
                        </div>

                        <div>
                            <label className="text-xs muted" style={{ fontWeight: 700 }}>Valor Declarado ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={valorDeclarado}
                                onChange={e => setValorDeclarado(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border-strong)', fontSize: 13, fontWeight: 700 }}
                            />
                        </div>
                    </div>

                    <div className="spread" style={{ marginTop: 10, alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                            <input
                                value={notasDespacho}
                                onChange={e => setNotasDespacho(e.target.value)}
                                placeholder="Instrucciones especiales de entrega (ej: Horario de 9 a 14hs, tocar timbre dietética)..."
                                style={{ width: '100%', padding: '5px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}
                            />
                        </div>
                        <div className="row gap-xs" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="text-xs muted">Formato:</span>
                            <button
                                type="button"
                                onClick={() => setFormato('termica')}
                                className={`btn btn-xs ${formato === 'termica' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                🏷️ Térmica 100x150 mm
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormato('a4')}
                                className={`btn btn-xs ${formato === 'a4' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                📄 Hoja A4
                            </button>
                        </div>
                    </div>
                </div>

                {/* VISTA PREVIA DE LAS ETIQUETAS GENERADAS */}
                <div style={{
                    maxHeight: '56vh',
                    overflowY: 'auto',
                    background: '#525659',
                    padding: '16px',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20
                }}>
                    <div ref={printableRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: '100%' }}>
                        {listaBultos.map(b => (
                            <div
                                key={b}
                                className="etiqueta-container"
                                style={{
                                    width: formato === 'termica' ? '380px' : '400px',
                                    maxWidth: '100%',
                                    height: formato === 'termica' ? '540px' : '530px',
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                                    background: '#FFFFFF',
                                    color: '#000000',
                                    padding: '16px 20px',
                                    borderRadius: 6,
                                    border: '2px solid #000000',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {/* ENCABEZADO REMITENTE Y NÚMERO DE BULTO */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #000', paddingBottom: 8, marginBottom: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                                DISTRIBUIDORA MIX POINT
                                            </div>
                                            <div style={{ fontSize: 9.5, fontWeight: 600, color: '#333' }}>
                                                San Isidro 2135 Ituzaingo, Bs. As. · WApp: 1167873243
                                            </div>
                                        </div>
                                        <div style={{
                                            background: '#000000',
                                            color: '#FFFFFF',
                                            padding: '4px 10px',
                                            borderRadius: 4,
                                            fontWeight: 900,
                                            fontSize: 14,
                                            textAlign: 'center',
                                            letterSpacing: '0.04em'
                                        }}>
                                            BULTO {b}/{cantBultosNum}
                                        </div>
                                    </div>

                                    {/* IDENTIFICACIÓN DE REMITO Y BARCODE */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F4F4', padding: '6px 10px', borderRadius: 4, marginBottom: 8, border: '1px solid #DDD' }}>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>REMITO ASOCIADO</div>
                                            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace' }}>{remito.numero}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>FECHA DESPACHO</div>
                                            <div style={{ fontSize: 13, fontWeight: 800 }}>{formatearFecha(remito.fecha)}</div>
                                        </div>
                                    </div>

                                    {/* DESTINATARIO */}
                                    <div style={{ border: '2px solid #000000', borderRadius: 5, padding: '10px 12px', marginBottom: 10, background: '#FFFFFF' }}>
                                        <div style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', marginBottom: 2 }}>
                                            DESTINATARIO (ENTREGA)
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2, marginBottom: 4 }}>
                                            {remito.cliente_nombre}
                                        </div>
                                        <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.3, color: '#111' }}>
                                            📍 {remito.direccion_entrega || remito.cliente_direccion || 'Retiro en depósito central'}
                                        </div>
                                        {remito.cliente_localidad && (
                                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#333' }}>
                                                {remito.cliente_localidad}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>📞 Tel: {remito.cliente_telefono || '—'}</span>
                                            <span>CUIT: {remito.cliente_cuit || 'Consumidor Final'}</span>
                                        </div>
                                    </div>

                                    {/* DATOS LOGÍSTICOS CLAVE: TRANSPORTE, VALOR, PESO, BULTOS */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8, marginBottom: 10 }}>
                                        <div style={{ border: '1.5px solid #000', borderRadius: 4, padding: '6px 8px', background: '#FAFAFA' }}>
                                            <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>TRANSPORTE / ENCOMIENDA</div>
                                            <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', marginTop: 1 }}>{transportista || 'Flete propio'}</div>
                                        </div>

                                        <div style={{ border: '1.5px solid #000', borderRadius: 4, padding: '6px 8px', background: '#FAFAFA' }}>
                                            <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>VALOR DE CARGA</div>
                                            <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: '#000', marginTop: 1 }}>
                                                {fmtMoney(valorDeclarado)}
                                            </div>
                                        </div>

                                        <div style={{ border: '1.5px solid #000', borderRadius: 4, padding: '6px 8px', background: '#FAFAFA' }}>
                                            <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>PESO TOTAL CARGA</div>
                                            <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', marginTop: 1 }}>
                                                {pesoKg} kg
                                            </div>
                                        </div>

                                        <div style={{ border: '1.5px solid #000', borderRadius: 4, padding: '6px 8px', background: '#000', color: '#FFF' }}>
                                            <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#AAA' }}>TOTAL BULTOS</div>
                                            <div style={{ fontSize: 13, fontWeight: 900, marginTop: 1 }}>
                                                {cantBultosNum} {cantBultosNum === 1 ? 'PAQUETE' : 'PAQUETES'}
                                            </div>
                                        </div>
                                    </div>

                                    {notasDespacho && (
                                        <div style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', background: '#FFFBEB', border: '1px dashed #B45309', borderRadius: 4, marginBottom: 8 }}>
                                            ⚠️ Nota: {notasDespacho}
                                        </div>
                                    )}
                                </div>

                                {/* PARTE INFERIOR: CÓDIGO DE BARRAS, QR Y ADVERTENCIAS DE MANEJO */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: 6, gap: 10 }}>
                                        <div style={{ flex: 1 }}>
                                            <BarcodeSVG value={`${remito.numero}-B${b}`} />
                                        </div>
                                        {qrCodes[b] && (
                                            <img
                                                src={qrCodes[b]}
                                                alt={`QR Bulto ${b}`}
                                                style={{ width: 68, height: 68, border: '1px solid #CCC', borderRadius: 4 }}
                                            />
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #000', paddingTop: 4, marginTop: 4, fontSize: 8, fontWeight: 800 }}>
                                        <span>🥜 ALIMENTOS SECOS</span>
                                        <span>📦 MANIPULAR CON CUIDADO</span>
                                        <span>☀️ MANTENER SECO</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTONES DE CIERRE */}
                <div className="spread" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        Mostrando {cantBultosNum} {cantBultosNum === 1 ? 'etiqueta lista' : 'etiquetas listas'} para despacho
                    </div>
                    <div className="row gap-xs">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cerrar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ padding: '8px 20px', fontWeight: 700 }}>
                            🖨️ Imprimir Etiquetas Ahora
                        </button>
                    </div>
                </div>

            </div>
        </Modal>
    );
}
