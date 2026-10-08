import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'catalogo_completo.json');
const cat = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let actualizados = 0;

cat.productos.forEach(p => {
  if (p.imagen) return; // ya tiene imagen del PDF

  const n = p.nombre.toLowerCase();

  if (p.id === 20 || n.includes('pará') || n.includes('para')) {
    p.imagen = '/catalogo/ilustraciones/castanas_de_para.svg';
    actualizados++;
  } else if (p.id === 96 || n.includes('pimienta negra')) {
    p.imagen = '/catalogo/ilustraciones/pimienta_negra_granos.svg';
    actualizados++;
  } else if (p.id === 97 || n.includes('goma xantica')) {
    p.imagen = '/catalogo/ilustraciones/goma_xantica.svg';
    actualizados++;
  } else if (p.categoria === 'Herboristería') {
    if (n.includes('tinta') || n.includes('tintura') || n.includes('cc')) {
      p.imagen = '/catalogo/ilustraciones/herboristeria_tinturas.svg';
    } else if (n.includes('flor') || n.includes('petalo') || n.includes('manzanilla') || n.includes('calendula') || n.includes('tilo') || n.includes('rosa')) {
      p.imagen = '/catalogo/ilustraciones/herboristeria_flores.svg';
    } else if (n.includes('te ') || n.includes('té ') || n.includes('te_')) {
      p.imagen = '/catalogo/ilustraciones/herboristeria_tes.svg';
    } else if (n.includes('raiz') || n.includes('raíz') || n.includes('valeriana') || n.includes('sandalo') || n.includes('uña') || n.includes('cascara') || n.includes('palo')) {
      p.imagen = '/catalogo/ilustraciones/herboristeria_raices.svg';
    } else {
      p.imagen = '/catalogo/ilustraciones/herboristeria_hojas.svg';
    }
    actualizados++;
  } else {
    p.imagen = '/catalogo/ilustraciones/mixpoint_generico.svg';
    actualizados++;
  }
});

fs.writeFileSync(jsonPath, JSON.stringify(cat, null, 2), 'utf8');

// Copiar también al backend si existe la carpeta
const backendJsonPath = path.join(__dirname, '..', '..', 'backend', 'data', 'catalogo_completo.json');
if (fs.existsSync(path.dirname(backendJsonPath))) {
  fs.writeFileSync(backendJsonPath, JSON.stringify(cat, null, 2), 'utf8');
}

console.log(`✅ ${actualizados} productos actualizados con imágenes ilustrativas.`);
console.log(`Total productos: ${cat.productos.length}, con imagen: ${cat.productos.filter(p => p.imagen).length}`);
