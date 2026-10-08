import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'catalogo_completo.json');
const targetDir = path.join(__dirname, '..', 'public', 'catalogo', 'productos');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const cat = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Función para normalizar nombres a slugs seguros para archivos
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Generador de SVG premium individualizado
function createProductSvg({ nombre, categoria, codigo, icono, subtitulo, bg1, bg2, accent }) {
  const safeId = slugify(nombre);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <linearGradient id="bg_${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}" />
      <stop offset="100%" stop-color="${bg2}" />
    </linearGradient>
    <radialGradient id="glow_${safeId}" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow_${safeId}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000000" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Fondo Premium con bordes suaves -->
  <rect width="400" height="300" fill="url(#bg_${safeId})" rx="12" />
  <circle cx="200" cy="130" r="110" fill="url(#glow_${safeId})" />

  <!-- Marco decorativo orgánico -->
  <rect x="12" y="12" width="376" height="276" rx="8" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="1.2" />
  <rect x="18" y="18" width="364" height="264" rx="6" fill="none" stroke="${accent}" stroke-opacity="0.15" stroke-width="1" stroke-dasharray="3 3" />

  <!-- Badge Superior de Categoría y Código -->
  <rect x="100" y="24" width="200" height="24" rx="12" fill="#FFFFFF" fill-opacity="0.95" filter="url(#shadow_${safeId})" />
  <text x="200" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1.5">
    ${categoria.toUpperCase()} · ${codigo || 'MP'}
  </text>

  <!-- Círculo Central Ilustrativo -->
  <circle cx="200" cy="126" r="56" fill="#FFFFFF" filter="url(#shadow_${safeId})" stroke="${accent}" stroke-width="2.5" stroke-opacity="0.4" />
  <text x="200" y="146" font-family="'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif" font-size="52" text-anchor="middle">
    ${icono}
  </text>

  <!-- Título del Producto (con tamaño adaptable si es largo) -->
  <text x="200" y="214" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${nombre.length > 24 ? 14 : 16.5}" font-weight="800" fill="#1A382B" text-anchor="middle" letter-spacing="0.2">
    ${nombre}
  </text>
  <text x="200" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#555555" text-anchor="middle">
    ${subtitulo}
  </text>

  <!-- Sello de Calidad Mix Point -->
  <line x1="130" y1="248" x2="270" y2="248" stroke="${accent}" stroke-width="1.2" stroke-opacity="0.35" />
  <text x="200" y="263" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1.8">
    DISTRIBUIDORA MIX POINT · CALIDAD SELECCIÓN
  </text>
</svg>`;
}

// Analizar y generar para cada producto sin archivo en public/catalogo/productos
let generados = 0;

cat.productos.forEach(p => {
  // Comprobar si ya apunta a un archivo que existe físicamente en public/catalogo/productos
  let existeArchivo = false;
  if (p.imagen && p.imagen.startsWith('/catalogo/productos/')) {
    const fn = p.imagen.replace('/catalogo/productos/', '');
    if (fs.existsSync(path.join(targetDir, fn))) {
      existeArchivo = true;
    }
  }

  if (existeArchivo) return;

  // Si no existe, crear el archivo individual en public/catalogo/productos con su nombre respectivo
  const fileName = `${slugify(p.nombre)}_${p.id}.svg`;
  const filePath = path.join(targetDir, fileName);

  const n = p.nombre.toLowerCase();
  let icono = '🌿';
  let subtitulo = 'Hierba medicinal e infusión pura';
  let bg1 = '#F0FDF4';
  let bg2 = '#DCFCE7';
  let accent = '#15803D';

  if (p.id === 20 || n.includes('pará') || n.includes('para')) {
    icono = '🌰';
    subtitulo = 'Fruto seco amazónico seleccionado';
    bg1 = '#FAF6EC';
    bg2 = '#EDE5D0';
    accent = '#92400E';
  } else if (p.id === 96 || n.includes('pimienta')) {
    icono = '🧂';
    subtitulo = 'Granos enteros aromáticos puros';
    bg1 = '#F4F4F5';
    bg2 = '#E4E4E7';
    accent = '#3F3F46';
  } else if (p.id === 97 || n.includes('goma')) {
    icono = '🥣';
    subtitulo = 'Espesante natural para repostería';
    bg1 = '#F0F9FF';
    bg2 = '#E0F2FE';
    accent = '#0369A1';
  } else if (n.includes('tinta') || n.includes('tintura') || n.includes('cc')) {
    icono = '🧪';
    subtitulo = 'Extracto botánico concentrado en gotero';
    bg1 = '#F5F3FF';
    bg2 = '#EDE9FE';
    accent = '#6D28D9';
  } else if (n.includes('flor') || n.includes('petalo') || n.includes('manzanilla') || n.includes('calendula') || n.includes('tilo') || n.includes('rosa')) {
    icono = '🌼';
    subtitulo = 'Pétalos y flores medicinales aromáticas';
    bg1 = '#FEFCE8';
    bg2 = '#FEF08A';
    accent = '#B45309';
  } else if (n.includes('te ') || n.includes('té ') || n.includes('te_')) {
    icono = '🍵';
    subtitulo = 'Hebras puras aromáticas seleccionadas';
    bg1 = '#FEF3C7';
    bg2 = '#FDE68A';
    accent = '#B45309';
  } else if (n.includes('raiz') || n.includes('raíz') || n.includes('valeriana') || n.includes('sandalo') || n.includes('uña') || n.includes('cascara') || n.includes('palo')) {
    icono = '🪵';
    subtitulo = 'Corteza y raíces botánicas seleccionadas';
    bg1 = '#FDF8F6';
    bg2 = '#F5EBE6';
    accent = '#9A3412';
  }

  const svgContent = createProductSvg({
    nombre: p.nombre,
    categoria: p.categoria || 'Herboristería',
    codigo: p.codigo,
    icono,
    subtitulo,
    bg1,
    bg2,
    accent
  });

  fs.writeFileSync(filePath, svgContent, 'utf8');
  p.imagen = `/catalogo/productos/${fileName}`;
  generados++;
});

// Guardar catalogo_completo.json actualizado con las rutas en /catalogo/productos/
fs.writeFileSync(jsonPath, JSON.stringify(cat, null, 2), 'utf8');

// Guardar también en el backend si la carpeta existe
const backendJsonPath = path.join(__dirname, '..', '..', 'backend', 'data', 'catalogo_completo.json');
if (fs.existsSync(path.dirname(backendJsonPath))) {
  fs.writeFileSync(backendJsonPath, JSON.stringify(cat, null, 2), 'utf8');
}

console.log(`✅ ${generados} archivos descargados/creados en public/catalogo/productos/ con sus nombres respectivos.`);
console.log(`Total productos en catálogo: ${cat.productos.length}`);
console.log(`Total productos apuntando a /catalogo/productos/: ${cat.productos.filter(p => p.imagen && p.imagen.startsWith('/catalogo/productos/')).length}`);
