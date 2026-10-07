import catalogoOficialData from '../data/catalogo_completo.json';

const ILUSTRACIONES_DEFECTO = {
    'Frutos Secos': '/catalogo/ilustraciones/castanas_de_para.svg',
    'Condimentos': '/catalogo/ilustraciones/pimienta_negra_granos.svg',
    'Repostería': '/catalogo/ilustraciones/goma_xantica.svg',
    'Herboristería': '/catalogo/ilustraciones/herboristeria_hojas.svg',
    'General': '/catalogo/ilustraciones/mixpoint_generico.svg'
};

/**
 * Obtiene la mejor imagen ilustrativa disponible para un producto.
 * Si el producto no tiene imagen cargada o si su nombre coincide con el catálogo oficial,
 * devuelve la ruta correspondiente garantizando 100% de cobertura.
 */
export function obtenerImagenProducto(prod) {
    if (!prod) return '/catalogo/ilustraciones/mixpoint_generico.svg';

    if (prod.imagen && prod.imagen.trim()) {
        return prod.imagen;
    }

    const nombreNorm = (prod.nombre || '').toLowerCase().trim();
    const codigoNorm = (prod.codigo || '').toLowerCase().trim();
    const catNorm = prod.categoria || prod.categoria_nombre || '';

    // 1. Búsqueda exacta en catálogo oficial por código o nombre
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

    // 3. Reglas semánticas por palabras clave
    if (nombreNorm.includes('pará') || nombreNorm.includes('para')) {
        return '/catalogo/ilustraciones/castanas_de_para.svg';
    }
    if (nombreNorm.includes('pimienta')) {
        return '/catalogo/ilustraciones/pimienta_negra_granos.svg';
    }
    if (nombreNorm.includes('goma') || nombreNorm.includes('xantica')) {
        return '/catalogo/ilustraciones/goma_xantica.svg';
    }

    // 4. Reglas semánticas de Herboristería
    if (catNorm.toLowerCase().includes('herborister') || nombreNorm.includes('té ') || nombreNorm.includes('hierba')) {
        if (nombreNorm.includes('tinta') || nombreNorm.includes('tintura') || nombreNorm.includes('cc')) {
            return '/catalogo/ilustraciones/herboristeria_tinturas.svg';
        }
        if (nombreNorm.includes('flor') || nombreNorm.includes('petalo') || nombreNorm.includes('manzanilla') || nombreNorm.includes('calendula') || nombreNorm.includes('tilo') || nombreNorm.includes('rosa')) {
            return '/catalogo/ilustraciones/herboristeria_flores.svg';
        }
        if (nombreNorm.includes('te ') || nombreNorm.includes('té ') || nombreNorm.includes('te_')) {
            return '/catalogo/ilustraciones/herboristeria_tes.svg';
        }
        if (nombreNorm.includes('raiz') || nombreNorm.includes('raíz') || nombreNorm.includes('valeriana') || nombreNorm.includes('sandalo') || nombreNorm.includes('uña') || nombreNorm.includes('cascara') || nombreNorm.includes('palo')) {
            return '/catalogo/ilustraciones/herboristeria_raices.svg';
        }
        return '/catalogo/ilustraciones/herboristeria_hojas.svg';
    }

    // 5. Fallback por categoría o genérico Mix Point
    return ILUSTRACIONES_DEFECTO[catNorm] || '/catalogo/ilustraciones/mixpoint_generico.svg';
}

export default obtenerImagenProducto;
