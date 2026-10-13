/**
 * Utilidad de paginación editorial para el Catálogo Oficial Mayorista de Mix Point.
 * 
 * Reglas de diseño y balanceo de páginas:
 * 1. Hoja 1: Portada oficial de alta resolución (/catalogo/portada.jpg).
 * 2. Hoja 2: Índice editorial con líneas punteadas y numeración dinámica exacta.
 * 3. Hojas 3 a N: Grillas fotográficas de 3 columnas balanceadas.
 *    - Si una categoría tiene <= 11 productos, entra COMPLETA en 1 sola hoja (cero páginas huérfanas).
 *    - Si tiene > 11 productos (ej: Frutos Secos con 20), se balancea equitativamente (10 y 10, NUNCA 9 + 9 + 2).
 *    - Cero páginas en blanco o páginas con 1 solo producto.
 * 4. Herboristería (60 productos): Lista botánica tabular de alta densidad (2 hojas de 30 productos en 2 columnas),
 *    eliminando las 6 páginas de tarjetas vacías con "Sin imagen".
 */

export const ORDEN_CATEGORIAS_OFICIAL = [
    'Frutos Secos',
    'Mixes',
    'Cereales',
    'Repostería',
    'Snacks',
    'Legumbres',
    'Condimentos',
    'Azúcares',
    'Harinas',
    'Semillas',
    'Suplementos',
    'Aceites',
    'Otros',
    'Chocolates sin TACC',
    'Herboristería'
];

export function normalizarNombreCat(cat = '') {
    return cat.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generarHojasCatalogo(productos = []) {
    const hojas = [];

    // HOJA 1: PORTADA OFICIAL
    hojas.push({
        tipo: 'portada',
        numero: 1,
        titulo: 'Portada Oficial Mix Point'
    });

    // HOJA 2: ÍNDICE EDITORIAL
    hojas.push({
        tipo: 'indice',
        numero: 2,
        titulo: 'Índice General de Categorías'
    });

    // Agrupar productos según orden oficial
    const catMap = new Map();
    ORDEN_CATEGORIAS_OFICIAL.forEach(cat => catMap.set(cat, []));

    productos.forEach(p => {
        const catOriginal = p.categoria_nombre || p.categoria || 'Otros';
        const catNorm = normalizarNombreCat(catOriginal);

        let encontrada = ORDEN_CATEGORIAS_OFICIAL.find(c => normalizarNombreCat(c) === catNorm);
        if (!encontrada) {
            encontrada = catOriginal;
        }

        if (!catMap.has(encontrada)) {
            catMap.set(encontrada, []);
        }
        catMap.get(encontrada).push(p);
    });

    let currentPagNum = 3;
    const indice = [];

    catMap.forEach((prods, catNombre) => {
        if (!prods || prods.length === 0) return;

        const primeraPaginaCat = currentPagNum;
        indice.push({
            categoria: catNombre,
            total: prods.length,
            pagina: primeraPaginaCat
        });

        const esHerboristeria = normalizarNombreCat(catNombre).includes('herborister') || normalizarNombreCat(catNombre).includes('hierba');

        if (esHerboristeria) {
            // Formato tabla botánica elegante (hasta 30 productos por hoja en 2 columnas de 15)
            const maxPorHoja = 30;
            const totalHojas = Math.max(1, Math.ceil(prods.length / maxPorHoja));

            let restante = prods.slice();
            for (let i = 0; i < totalHojas; i++) {
                const tam = Math.ceil(restante.length / (totalHojas - i));
                const chunk = restante.slice(0, tam);
                restante = restante.slice(tam);

                hojas.push({
                    tipo: 'herboristeria',
                    numero: currentPagNum++,
                    categoria: catNombre,
                    subtitulo: totalHojas > 1 ? `(Parte ${i + 1} de ${totalHojas})` : '',
                    totalHojas,
                    numeroHojaCat: i + 1,
                    productos: chunk
                });
            }
        } else {
            // Cuadrícula con fotos: distribución balanceada
            let totalHojas = 1;
            if (prods.length > 11) {
                totalHojas = Math.ceil(prods.length / 10);
            }

            let restante = prods.slice();
            for (let i = 0; i < totalHojas; i++) {
                const tam = Math.ceil(restante.length / (totalHojas - i));
                const chunk = restante.slice(0, tam);
                restante = restante.slice(tam);

                hojas.push({
                    tipo: 'productos',
                    numero: currentPagNum++,
                    categoria: catNombre,
                    subtitulo: totalHojas > 1 ? `(Parte ${i + 1} de ${totalHojas})` : '',
                    totalHojas,
                    numeroHojaCat: i + 1,
                    productos: chunk
                });
            }
        }
    });

    return { hojas, indice };
}
