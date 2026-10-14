import { formatearFecha } from './fechas';

const fmtMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Genera y descarga un archivo de Microsoft Word (.doc) con el remito comercial 100% editable.
 * Compatible con Microsoft Word 2010+, Office 365, LibreOffice Writer y Google Docs.
 */
export function exportarRemitoAWord(remito) {
    if (!remito) return;

    const fechaFormateada = formatearFecha(remito.fecha || new Date());
    const items = remito.items || [];
    const numeroRemito = escapeHtml(remito.numero || 'REM-0001-00000000');
    const clienteNombre = escapeHtml(remito.cliente_nombre || 'Consumidor Final');
    const clienteCuit = escapeHtml(remito.cliente_cuit || '—');
    const clienteCondIva = escapeHtml(remito.cliente_condicion_iva || 'Consumidor Final');
    const clienteTel = escapeHtml(remito.cliente_telefono || '—');
    const direccion = escapeHtml(remito.direccion_entrega || remito.cliente_direccion || 'Retira en depósito');
    const transportista = escapeHtml(remito.transportista || 'Distribución propia');
    const observaciones = escapeHtml(remito.observaciones || '');

    // Filas de productos
    let filasProductos = '';
    items.forEach((it, idx) => {
        const codigo = escapeHtml(it.producto_codigo || `MP-${String(it.producto_id || idx + 1).padStart(3, '0')}`);
        const nombre = escapeHtml(it.producto_nombre || '');
        const desc = it.descripcion ? ` <span style="color:#555; font-size:8pt;">(${escapeHtml(it.descripcion)})</span>` : '';
        const lote = escapeHtml(it.numero_lote || 'L-GENERAL');
        const vto = it.fecha_vencimiento ? `<br><span style="font-size:7.5pt; color:#666;">Vto: ${escapeHtml(it.fecha_vencimiento.slice(0, 10))}</span>` : '';
        const cant = it.cantidad || 0;
        const unid = escapeHtml(it.unidad_medida || 'kg');
        const pu = fmtMoney(it.precio_unitario);
        const sub = fmtMoney(it.subtotal || (it.cantidad * it.precio_unitario));

        filasProductos += `
        <tr>
            <td style="font-family:'Courier New', monospace; font-size:8.5pt; text-align:center;">${codigo}</td>
            <td style="font-size:9pt;"><strong>${nombre}</strong>${desc}</td>
            <td style="font-size:8pt; text-align:center;">${lote}${vto}</td>
            <td style="font-family:'Courier New', monospace; font-size:9pt; text-align:right; font-weight:bold;">${cant}</td>
            <td style="font-size:8.5pt; text-align:center;">${unid}</td>
            <td style="font-family:'Courier New', monospace; font-size:8.5pt; text-align:right;">${pu}</td>
            <td style="font-family:'Courier New', monospace; font-size:9pt; text-align:right; font-weight:bold;">${sub}</td>
        </tr>`;
    });

    // Añadir 2 filas en blanco editables por si el usuario desea agregar productos a mano en Word
    for (let i = 0; i < 2; i++) {
        filasProductos += `
        <tr style="height:20pt;">
            <td style="font-family:'Courier New', monospace; font-size:8.5pt; text-align:center;">&nbsp;</td>
            <td style="font-size:9pt;">&nbsp;</td>
            <td style="font-size:8pt; text-align:center;">&nbsp;</td>
            <td style="font-family:'Courier New', monospace; font-size:9pt; text-align:right;">&nbsp;</td>
            <td style="font-size:8.5pt; text-align:center;">&nbsp;</td>
            <td style="font-family:'Courier New', monospace; font-size:8.5pt; text-align:right;">&nbsp;</td>
            <td style="font-family:'Courier New', monospace; font-size:9pt; text-align:right;">&nbsp;</td>
        </tr>`;
    }

    // Descuento si aplica
    let descuentoHtml = '';
    if (Number(remito.descuento_porcentaje) > 0) {
        const subtotalLista = Number(remito.total) / (1 - Number(remito.descuento_porcentaje) / 100);
        descuentoHtml = `
        <p style="margin:2pt 0; text-align:right; font-size:8.5pt; color:#555;">
            Subtotal lista: <span style="font-family:'Courier New', monospace;">${fmtMoney(subtotalLista)}</span>
        </p>
        <p style="margin:2pt 0; text-align:right; font-size:8.5pt; color:#B23A3A; font-weight:bold;">
            Descuento aplicado: -${remito.descuento_porcentaje}%
        </p>`;
    }

    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>Remito_${numeroRemito}</title>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
    size: 21.0cm 29.7cm;
    margin: 1.2cm 1.2cm 1.2cm 1.2cm;
    mso-page-orientation: portrait;
}
@page Section1 {
    size: 21.0cm 29.7cm;
    margin: 1.2cm 1.2cm 1.2cm 1.2cm;
    mso-header-margin: 36pt;
    mso-footer-margin: 36pt;
    mso-paper-source: 0;
}
div.Section1 {
    page: Section1;
}
body {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 9.5pt;
    line-height: 1.2;
    color: #111111;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
}
table {
    border-collapse: collapse;
    mso-table-layout-alt: fixed;
    width: 100%;
}
table.header-box {
    border: 1.5pt solid #1a382b;
    margin-bottom: 6pt;
}
table.header-box td {
    padding: 5pt;
    vertical-align: top;
}
table.client-box {
    border: 1pt solid #333333;
    margin-bottom: 8pt;
    background-color: #fafafa;
}
table.client-box td {
    padding: 4pt 6pt;
    font-size: 9pt;
    vertical-align: top;
}
table.items-table {
    border: 1pt solid #222222;
    margin-bottom: 8pt;
}
table.items-table th {
    background-color: #eaf1ed;
    border: 1pt solid #222222;
    padding: 4pt;
    font-size: 8.5pt;
    font-weight: bold;
    color: #1a382b;
    text-align: left;
}
table.items-table td {
    border: 1pt solid #777777;
    padding: 3.5pt 4pt;
    vertical-align: middle;
}
table.footer-table td {
    vertical-align: top;
    padding: 4pt;
}
.letter-box {
    border: 1.5pt solid #1a382b;
    text-align: center;
    padding: 3pt;
    background-color: #ffffff;
}
.total-card {
    border: 1.5pt solid #1a382b;
    background-color: #f4f8f5;
    padding: 6pt 8pt;
    text-align: right;
}
.sig-line {
    border-top: 1pt solid #333333;
    margin: 35pt 15pt 4pt 15pt;
    text-align: center;
}
</style>
</head>
<body>
<div class="Section1">

    <!-- ENCABEZADO COMERCIAL -->
    <table class="header-box" cellpadding="0" cellspacing="0">
        <tr>
            <!-- EMISOR -->
            <td style="width: 50%;">
                <p style="margin:0 0 2pt 0; font-size:14pt; font-weight:bold; color:#1a382b; letter-spacing:0.5pt;">
                    DISTRIBUIDORA MIX POINT
                </p>
                <p style="margin:0 0 4pt 0; font-size:7.5pt; font-weight:bold; color:#b45309;">
                    FRUTOS SECOS · CEREALES · SEMILLAS · ALIMENTOS NATURALES
                </p>
                <p style="margin:1pt 0; font-size:8pt; color:#333;"><strong>Depósito Central:</strong> San Isidro 2135 Ituzaingo, Bs. As.</p>
                <p style="margin:1pt 0; font-size:8pt; color:#333;"><strong>Tel / WhatsApp:</strong> (011) 57077061 · 1167873243</p>
                <p style="margin:1pt 0; font-size:8pt; color:#333;"><strong>Email:</strong> ventas@distribuidora-mix-point.com.ar</p>
                <p style="margin:1pt 0; font-size:8pt; color:#333;"><strong>Condición IVA:</strong> Responsable Inscripto</p>
            </td>

            <!-- LETRA R AFIP -->
            <td style="width: 14%; text-align: center; vertical-align: top;">
                <div class="letter-box">
                    <div style="font-size:22pt; font-weight:bold; color:#1a382b; line-height:1;">R</div>
                    <div style="font-size:7pt; font-weight:bold;">COD. 091</div>
                </div>
                <div style="font-size:5.5pt; font-weight:bold; color:#555; margin-top:3pt;">
                    DOCUMENTO NO VÁLIDO COMO FACTURA
                </div>
            </td>

            <!-- DATOS COMPROBANTE -->
            <td style="width: 36%; text-align: right;">
                <div style="background-color:#1a382b; color:#ffffff; padding:4pt 6pt; text-align:center; font-weight:bold;">
                    <span style="font-size:11pt; letter-spacing:1pt;">REMITO</span><br>
                    <span style="font-family:'Courier New', monospace; font-size:12pt;">${numeroRemito}</span>
                </div>
                <p style="margin:4pt 0 1pt 0; font-size:8.5pt;"><strong>Fecha de emisión:</strong> <span style="font-family:'Courier New', monospace;">${fechaFormateada}</span></p>
                <p style="margin:1pt 0; font-size:8pt;"><strong>CUIT:</strong> 30-71842901-7</p>
                <p style="margin:1pt 0; font-size:8pt;"><strong>Ingresos Brutos:</strong> 901-284910-3</p>
                <p style="margin:1pt 0; font-size:8pt;"><strong>Inicio de Actividades:</strong> 01/03/2024</p>
            </td>
        </tr>
    </table>

    <!-- DATOS DEL CLIENTE Y ENTREGA -->
    <table class="client-box" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 52%;">
                <p style="margin:1pt 0;"><strong>Señor(es) / Razón Social:</strong> ${clienteNombre}</p>
                <p style="margin:1pt 0;"><strong>CUIT / DNI:</strong> ${clienteCuit}</p>
                <p style="margin:1pt 0;"><strong>Condición IVA:</strong> ${clienteCondIva}</p>
                <p style="margin:1pt 0;"><strong>Teléfono / WhatsApp:</strong> ${clienteTel}</p>
            </td>
            <td style="width: 48%;">
                <p style="margin:1pt 0;"><strong>Dirección de Entrega:</strong> ${direccion}</p>
                <p style="margin:1pt 0;"><strong>Transporte / Chofer:</strong> ${transportista}</p>
                <p style="margin:1pt 0;"><strong>Condición de Venta:</strong> Cuenta Corriente / Mayorista</p>
                ${observaciones ? `<p style="margin:1pt 0; color:#444;"><strong>Observaciones:</strong> ${observaciones}</p>` : ''}
            </td>
        </tr>
    </table>

    <!-- TABLA DE DETALLE DE MERCADERÍA (EDITABLE EN WORD) -->
    <table class="items-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th style="width: 13%; text-align: center;">CÓDIGO</th>
                <th style="width: 41%;">DESCRIPCIÓN DE LA MERCADERÍA</th>
                <th style="width: 14%; text-align: center;">LOTE / VTO.</th>
                <th style="width: 9%; text-align: right;">CANT.</th>
                <th style="width: 6%; text-align: center;">UNID.</th>
                <th style="width: 8%; text-align: right;">P. UNIT</th>
                <th style="width: 9%; text-align: right;">SUBTOTAL</th>
            </tr>
        </thead>
        <tbody>
            ${filasProductos}
        </tbody>
    </table>

    <!-- DATOS DE TRANSFERENCIA Y TOTALES -->
    <table class="footer-table" cellpadding="0" cellspacing="0" style="margin-bottom:8pt;">
        <tr>
            <!-- DATOS BANCARIOS -->
            <td style="width: 55%;">
                <div style="border: 1pt solid #cbd5e1; background-color: #f8fafc; padding: 6pt; font-size: 8.5pt;">
                    <p style="margin:0 0 2pt 0; font-weight:bold; color:#1a382b;">💳 DATOS PARA PAGO POR TRANSFERENCIA</p>
                    <p style="margin:1pt 0;"><strong>Alias CBU:</strong> <span style="font-family:'Courier New', monospace; font-size:10pt; font-weight:bold; color:#92400e; background-color:#fef3c7;">mixpoint2026</span></p>
                    <p style="margin:1pt 0;"><strong>Titular:</strong> Mix Point Mayorista</p>
                    <p style="margin:1pt 0;"><strong>WhatsApp de comprobantes:</strong> 1167873243</p>
                    <p style="margin:2pt 0 0 0; font-size:7.5pt; color:#64748b; font-style:italic;">🔍 Trazabilidad de lotes bajo norma de seguridad FEFO</p>
                </div>
            </td>

            <!-- TOTALES -->
            <td style="width: 45%;">
                <div class="total-card">
                    ${descuentoHtml}
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:10pt; font-weight:bold; color:#1a382b;">TOTAL MERCADERÍA:</span>
                        <span style="font-family:'Courier New', monospace; font-size:13pt; font-weight:bold; color:#1a382b; margin-left:8pt;">
                            ${fmtMoney(remito.total)}
                        </span>
                    </div>
                    <div style="font-size:7.5pt; color:#666; margin-top:2pt;">
                        Precios netos expresados en Pesos Argentinos (ARS)
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- OBSERVACIONES / NOTAS MANUALES -->
    <table cellpadding="0" cellspacing="0" style="border: 1pt dashed #94a3b8; background-color: #f8fafc; margin-bottom: 12pt;">
        <tr>
            <td style="padding: 4pt 6pt; font-size: 8.5pt;">
                <strong>Notas / Modificaciones manuales:</strong>
                <p style="margin: 2pt 0; color: #475569; font-style: italic;">
                    (Espacio disponible para tachas, correcciones de bultos o aclaraciones de entrega a mano)
                </p>
            </td>
        </tr>
    </table>

    <!-- FIRMAS DE CONFORMIDAD -->
    <table cellpadding="0" cellspacing="0" style="margin-top: 10pt;">
        <tr>
            <td style="width: 50%; text-align: center;">
                <div class="sig-line">
                    <p style="margin:0; font-size:8.5pt; font-weight:bold; color:#1a382b;">DESPACHADO POR (MIX POINT)</p>
                    <p style="margin:1pt 0 0 0; font-size:7.5pt; color:#666;">Firma y Sello de Salida</p>
                </div>
            </td>
            <td style="width: 50%; text-align: center;">
                <div class="sig-line">
                    <p style="margin:0; font-size:8.5pt; font-weight:bold; color:#1a382b;">RECIBÍ CONFORME (CLIENTE / RECEPTOR)</p>
                    <p style="margin:1pt 0 0 0; font-size:7.5pt; color:#666;">Firma · Aclaración · D.N.I. · Fecha</p>
                </div>
            </td>
        </tr>
    </table>

    <!-- PIE LEGAL -->
    <div style="border-top:1pt solid #cbd5e1; margin-top:14pt; padding-top:4pt; font-size:7.5pt; color:#64748b; text-align:center;">
        Distribuidora Mix Point · www.distribuidora-mix-point.com.ar · Ituzaingó, Buenos Aires · Remito comercial editable
    </div>

</div>
</body>
</html>`;

    // \ufeff es el Byte Order Mark (BOM) UTF-8 que hace que Word en Windows reconozca tildes y caracteres especiales
    const blob = new Blob(['\ufeff' + wordHtml], {
        type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Remito_${remito.numero || 'MixPoint'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
