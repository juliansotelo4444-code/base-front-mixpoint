/**
 * Utilidades para manejo seguro de fechas en horario local de Argentina (evita desfases UTC)
 */

/**
 * Retorna la fecha local de hoy en formato YYYY-MM-DD
 */
export function getFechaHoyLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Formatea cualquier fecha (YYYY-MM-DD, string ISO o Date) a formato argentino DD/MM/AAAA
 * sin sufrir desfases por conversión a medianoche UTC.
 */
export function formatearFecha(f) {
    if (!f) return '';
    const str = String(f).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, y, m, d] = match;
        return `${d}/${m}/${y}`;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString('es-AR');
}
