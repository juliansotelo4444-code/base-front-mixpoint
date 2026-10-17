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

/**
 * Retorna true si la fecha corresponde al día de hoy en hora local argentina.
 */
export function esFechaDeHoy(f) {
    if (!f) return false;
    const str = String(f).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, y, m, d] = match;
        return `${y}-${m}-${d}` === getFechaHoyLocal();
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return false;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}` === getFechaHoyLocal();
}

/**
 * Retorna true si la fecha corresponde al mes actual en hora local argentina.
 */
export function esFechaDeEsteMes(f) {
    if (!f) return false;
    const str = String(f).trim();
    const match = str.match(/^(\d{4})-(\d{2})/);
    const d = new Date();
    const currentYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (match) {
        return `${match[1]}-${match[2]}` === currentYM;
    }
    const dateObj = new Date(str);
    if (isNaN(dateObj.getTime())) return false;
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}` === currentYM;
}

/**
 * Retorna el nombre en español del mes actual con su año (ej: "Octubre 2026")
 */
export function getNombreMesActual() {
    const d = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

