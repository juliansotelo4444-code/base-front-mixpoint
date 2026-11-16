import { useState, useEffect } from 'react';
import Modal from './Modal';
import client from '../api/client';
import catalogoOficialData from '../data/catalogo_completo.json';

export default function ImageFinderModal({ isOpen, initialQuery, onSelectImage, onClose }) {
    const [query, setQuery] = useState(initialQuery || '');
    const [loading, setLoading] = useState(false);
    const [resultados, setResultados] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && initialQuery) {
            setQuery(initialQuery);
            buscarImagenes(initialQuery);
        }
    }, [isOpen, initialQuery]);

    async function buscarImagenes(termino) {
        const cleanTerm = (termino || '').trim();
        if (!cleanTerm) return;

        setLoading(true);
        setError(null);
        const encontrados = [];
        const seenUrls = new Set();

        const agregar = (item) => {
            if (!item.url || seenUrls.has(item.url)) return;
            seenUrls.add(item.url);
            encontrados.push(item);
        };

        // 1. Búsqueda instantánea en catálogo oficial local
        try {
            const palabras = cleanTerm.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            for (const prod of (catalogoOficialData.productos || [])) {
                if (!prod.imagen || prod.imagen.includes('generico')) continue;
                const prodNombre = (prod.nombre || '').toLowerCase();
                const coincide = palabras.some(p => prodNombre.includes(p));
                if (coincide) {
                    agregar({
                        titulo: prod.nombre,
                        url: prod.imagen,
                        fuente: 'Catálogo Oficial'
                    });
                }
                if (encontrados.length >= 8) break;
            }
        } catch (e) {
            console.warn('[ImageFinder] Error al buscar en catálogo local:', e);
        }

        // 2. Consulta al backend local
        try {
            const { data } = await client.get('/productos/buscar-imagenes', {
                params: { q: cleanTerm }
            });
            if (data?.resultados) {
                data.resultados.forEach(agregar);
            }
        } catch (e) {
            // Silencioso si falla endpoint
        }

        // 3. Consulta a Wikipedia en Español (CORS habilitado con origin=*)
        try {
            const wikiUrl = `https://es.wikipedia.org/w/api.php?action=query&origin=*&generator=search&gsrsearch=${encodeURIComponent(cleanTerm)}&gsrlimit=6&prop=pageimages&pithumbsize=600&format=json`;
            const wikiRes = await fetch(wikiUrl);
            if (wikiRes.ok) {
                const wikiData = await wikiRes.json();
                const pages = wikiData.query?.pages ? Object.values(wikiData.query.pages) : [];
                pages.forEach(p => {
                    if (p.thumbnail?.source) {
                        agregar({
                            titulo: p.title,
                            url: p.thumbnail.source,
                            fuente: 'Wikipedia'
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('[ImageFinder] Error Wikipedia:', e);
        }

        // 4. Consulta a Wikimedia Commons (Imágenes libres de alimentos)
        try {
            const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&origin=*&generator=search&gsrsearch=${encodeURIComponent(cleanTerm + ' food')}&gsrlimit=6&prop=pageimages&pithumbsize=600&format=json`;
            const commonsRes = await fetch(commonsUrl);
            if (commonsRes.ok) {
                const commonsData = await commonsRes.json();
                const pages = commonsData.query?.pages ? Object.values(commonsData.query.pages) : [];
                pages.forEach(p => {
                    if (p.thumbnail?.source) {
                        agregar({
                            titulo: p.title.replace(/^File:/i, '').replace(/\.[^/.]+$/, ''),
                            url: p.thumbnail.source,
                            fuente: 'Wikimedia Commons'
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('[ImageFinder] Error Wikimedia Commons:', e);
        }

        // 5. Consulta a Open Food Facts (Base de datos libre de productos alimenticios)
        try {
            const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanTerm)}&search_simple=1&action=process&json=1&page_size=6`;
            const offRes = await fetch(offUrl);
            if (offRes.ok) {
                const offData = await offRes.json();
                (offData.products || []).forEach(p => {
                    const img = p.image_front_url || p.image_url;
                    if (img) {
                        agregar({
                            titulo: p.product_name || cleanTerm,
                            url: img,
                            fuente: 'Open Food Facts'
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('[ImageFinder] Error Open Food Facts:', e);
        }

        setResultados(encontrados);
        setLoading(false);
    }

    if (!isOpen) return null;

    return (
        <Modal title="🪄 Buscador de fotos para el producto" onClose={onClose} width={740}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* BARRA DE BÚSQUEDA INTERACTIVA */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        buscarImagenes(query);
                    }}
                    style={{ display: 'flex', gap: 8 }}
                >
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ej: Almendras, Nuez mariposa, Castañas de cajú, Aceite..."
                        style={{ flex: 1, padding: '8px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #cbd5e1' }}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={loading || !query.trim()}
                        style={{ padding: '0 16px', fontWeight: 600 }}
                    >
                        {loading ? 'Buscando...' : '🔍 Buscar'}
                    </button>
                </form>

                {/* ESTADO DE CARGA */}
                {loading && (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>🪄</div>
                        <p style={{ margin: 0, fontSize: 13 }}>Buscando fotos nítidas en catálogos y bancos de imágenes...</p>
                    </div>
                )}

                {/* GRILLA DE RESULTADOS */}
                {!loading && resultados.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Se encontraron <strong>{resultados.length}</strong> fotos sugeridas. Haz clic en la que prefieras:</span>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: 12,
                            maxHeight: '52vh',
                            overflowY: 'auto',
                            padding: '4px'
                        }}>
                            {resultados.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => onSelectImage(item.url)}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#10b981';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.18)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                    }}
                                >
                                    <div style={{
                                        width: '100%',
                                        height: 120,
                                        background: '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        <img
                                            src={item.url}
                                            alt={item.titulo}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            onError={(e) => {
                                                e.target.parentElement.parentElement.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
                                        <div style={{
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            color: '#1e293b',
                                            lineHeight: 1.3,
                                            maxHeight: 32,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {item.titulo}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                            <span style={{
                                                fontSize: 9.5,
                                                padding: '2px 5px',
                                                borderRadius: 4,
                                                background: '#f1f5f9',
                                                color: '#475569',
                                                fontWeight: 500
                                            }}>
                                                {item.fuente}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                                                Elegir ✓
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SIN RESULTADOS */}
                {!loading && resultados.length === 0 && (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: 26, marginBottom: 8 }}>🔍</div>
                        <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#1e293b' }}>
                            No encontramos imágenes para "{query}"
                        </p>
                        <p style={{ margin: 0, fontSize: 12 }}>
                            Prueba buscando un término más general (ej: en lugar de <em>"Mix especial 5kg"</em> busca <em>"Frutos secos mix"</em> o <em>"Nueces"</em>).
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
