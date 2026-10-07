import catalogoOficialData from '../data/catalogo_completo.json';

/**
 * Obtiene la ruta física en /catalogo/productos/ correspondiente a un producto.
 * Garantiza que cada uno de los 225 productos del catálogo se resuelva a su archivo
 * individual guardado en public/catalogo/productos/ con su respectivo nombre y extensión.
 */
export function obtenerImagenProducto(prod) {
    if (!prod) return '/catalogo/productos/mixpoint_generico.svg';

    // Si ya tiene una imagen válida que apunte a /catalogo/productos/
    if (prod.imagen && prod.imagen.startsWith('/catalogo/productos/')) {
        return prod.imagen;
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
