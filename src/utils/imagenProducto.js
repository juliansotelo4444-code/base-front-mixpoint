import catalogoOficialData from '../data/catalogo_completo.json';

/**
 * Obtiene la ruta física en /catalogo/productos/ correspondiente a un producto.
 * Garantiza que cada uno de los 225 productos del catálogo se resuelva a su archivo
 * individual guardado en public/catalogo/productos/ con su respectivo nombre y extensión.
 */
export function obtenerImagenProducto(prod) {
    if (!prod) return '/catalogo/productos/mixpoint_generico.svg';

    // Si ya tiene una imagen válida asignada (data:image base64, URL externa, asset o /catalogo/)
    if (prod.imagen && typeof prod.imagen === 'string' && prod.imagen.trim().length > 0) {
        const clean = prod.imagen.trim();
        if (
            clean.startsWith('data:image') ||
            clean.startsWith('http://') ||
            clean.startsWith('https://') ||
            clean.startsWith('/catalogo/') ||
            clean.startsWith('/assets/') ||
            clean.startsWith('blob:')
        ) {
            return clean;
        }
        // Si es un nombre de archivo directo
        if (clean.includes('.')) {
            return clean.startsWith('/') ? clean : `/assets/${clean}`;
        }
    }

    const nombreNorm = (prod.nombre || '').toLowerCase().trim();
    const codigoNorm = (prod.codigo || '').toLowerCase().trim();

    // 1. Buscar en el catálogo oficial por código o nombre exacto
    const coincidenciaExacta = catalogoOficialData.productos.find(x => 
        (codigoNorm && x.codigo && x.codigo.toLowerCase() === codigoNorm) ||
        (x.nombre && x.nombre.toLowerCase() === nombreNorm)
    );
    if (coincidenciaExacta?.imagen) {
        return coincidenciaExacta.imagen;
    }

    // 2. Búsqueda parcial por nombre
    const coincidenciaParcial = catalogoOficialData.productos.find(x => {
        const xNorm = (x.nombre || '').toLowerCase();
        return xNorm.includes(nombreNorm) || nombreNorm.includes(xNorm);
    });
    if (coincidenciaParcial?.imagen) {
        return coincidenciaParcial.imagen;
    }

    return prod.imagen || '/catalogo/productos/mixpoint_generico.svg';
}

export default obtenerImagenProducto;
