import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '..', 'public', 'catalogo', 'ilustraciones');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function createSvg(title, subtitle, icon, bgGradient1, bgGradient2, accentColor, tag) {
  const safeTag = tag.replace(/\s+/g, '_');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <linearGradient id="grad_${safeTag}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradient1}" />
      <stop offset="100%" stop-color="${bgGradient2}" />
    </linearGradient>
    <radialGradient id="glow_${safeTag}" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow_${safeTag}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000000" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Fondo Premium con bordes suaves -->
  <rect width="400" height="300" fill="url(#grad_${safeTag})" rx="12" />
  <circle cx="200" cy="130" r="110" fill="url(#glow_${safeTag})" />

  <!-- Marco decorativo exterior e interior -->
  <rect x="12" y="12" width="376" height="276" rx="8" fill="none" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="1.2" />
  <rect x="18" y="18" width="364" height="264" rx="6" fill="none" stroke="${accentColor}" stroke-opacity="0.15" stroke-width="1" stroke-dasharray="3 3" />

  <!-- Badge Superior de Categoría -->
  <rect x="110" y="24" width="180" height="24" rx="12" fill="#FFFFFF" fill-opacity="0.95" filter="url(#shadow_${safeTag})" />
  <text x="200" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="800" fill="${accentColor}" text-anchor="middle" letter-spacing="1.5">
    ${tag.toUpperCase()}
  </text>

  <!-- Círculo Central Ilustrativo -->
  <circle cx="200" cy="126" r="56" fill="#FFFFFF" filter="url(#shadow_${safeTag})" stroke="${accentColor}" stroke-width="2.5" stroke-opacity="0.4" />
  <text x="200" y="146" font-family="'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif" font-size="52" text-anchor="middle">
    ${icon}
  </text>

  <!-- Título y Subtítulo del Producto -->
  <text x="200" y="214" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16.5" font-weight="800" fill="#1A382B" text-anchor="middle" letter-spacing="0.2">
    ${title}
  </text>
  <text x="200" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#555555" text-anchor="middle">
    ${subtitle}
  </text>

  <!-- Sello de Calidad Mix Point -->
  <line x1="140" y1="248" x2="260" y2="248" stroke="${accentColor}" stroke-width="1.2" stroke-opacity="0.35" />
  <text x="200" y="263" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" fill="${accentColor}" text-anchor="middle" letter-spacing="1.8">
    DISTRIBUIDORA MIX POINT · CALIDAD SELECCIÓN
  </text>
</svg>`;
}

const ilustraciones = [
  { file: 'castanas_de_para.svg', title: 'Castañas de Pará', sub: 'Fruto seco amazónico seleccionado', icon: '🌰', bg1: '#FAF6EC', bg2: '#EDE5D0', acc: '#92400E', tag: 'Frutos Secos' },
  { file: 'pimienta_negra_granos.svg', title: 'Pimienta Negra', sub: 'Granos enteros aromáticos puros', icon: '🧂', bg1: '#F4F4F5', bg2: '#E4E4E7', acc: '#3F3F46', tag: 'Condimentos' },
  { file: 'goma_xantica.svg', title: 'Goma Xántica', sub: 'Espesante natural para repostería', icon: '🥣', bg1: '#F0F9FF', bg2: '#E0F2FE', acc: '#0369A1', tag: 'Repostería' },
  { file: 'herboristeria_hojas.svg', title: 'Hierbas Medicinales', sub: 'Hojas seleccionadas para infusión y tisanas', icon: '🌿', bg1: '#F0FDF4', bg2: '#DCFCE7', acc: '#15803D', tag: 'Herboristería' },
  { file: 'herboristeria_flores.svg', title: 'Flores Aromáticas', sub: 'Pétalos y flores medicinales secas', icon: '🌼', bg1: '#FEFCE8', bg2: '#FEF08A', acc: '#B45309', tag: 'Herboristería' },
  { file: 'herboristeria_raices.svg', title: 'Raíces & Maderas', sub: 'Corteza y raíces botánicas puras', icon: '🪵', bg1: '#FDF8F6', bg2: '#F5EBE6', acc: '#9A3412', tag: 'Herboristería' },
  { file: 'herboristeria_tinturas.svg', title: 'Tintura Madre', sub: 'Extracto botánico concentrado en gotero', icon: '🧪', bg1: '#F5F3FF', bg2: '#EDE9FE', acc: '#6D28D9', tag: 'Herboristería' },
  { file: 'herboristeria_tes.svg', title: 'Tés del Mundo', sub: 'Hebras puras aromáticas seleccionadas', icon: '🍵', bg1: '#FEF3C7', bg2: '#FDE68A', acc: '#B45309', tag: 'Herboristería' },
  { file: 'mixpoint_generico.svg', title: 'Alimentos Naturales', sub: 'Garantía y pureza mayorista directa', icon: '🥜', bg1: '#FAF8F2', bg2: '#ECE8DA', acc: '#C9A227', tag: 'Mix Point' }
];

ilustraciones.forEach(item => {
  const svg = createSvg(item.title, item.sub, item.icon, item.bg1, item.bg2, item.acc, item.tag);
  fs.writeFileSync(path.join(dir, item.file), svg, 'utf8');
  console.log('Creado:', item.file);
});

console.log('Todos los SVGs ilustrativos fueron generados exitosamente.');
