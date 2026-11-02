import { useState, useRef, useEffect, useMemo } from 'react';
import { IconBuscar } from './Icons';

export default function ProductPicker({ productos = [], value, onChange, placeholder = 'Buscar y seleccionar producto…' }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Filtrar inactivos y asegurar no repetidos por ID
    const uniqueProducts = useMemo(() => {
        const seen = new Set();
        return (productos || []).filter(p => {
            if (p.activo === false) return false;
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [productos]);

    const selectedProduct = uniqueProducts.find(p => p.id === Number(value)) || (productos || []).find(p => p.id === Number(value));

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = uniqueProducts.filter(p => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            (p.nombre && p.nombre.toLowerCase().includes(s)) ||
            (p.codigo && p.codigo.toLowerCase().includes(s)) ||
            (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(s))
        );
    });

    function select(p) {
        onChange(p.id, p);
        setOpen(false);
        setSearch('');
    }

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => setOpen(!open)}
                style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border-strong)',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 38,
                    fontSize: 13.5
                }}
            >
                {selectedProduct ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontSize: 11, background: 'var(--color-surface-sunken)', padding: '2px 5px', borderRadius: 4 }}>
                            {selectedProduct.codigo || `MP-${selectedProduct.id}`}
                        </span>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {selectedProduct.nombre}
                        </span>
                        <span className="muted text-xs">
                            ({selectedProduct.stock_actual} {selectedProduct.unidad_medida} disp.)
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                            Venta: ${new Intl.NumberFormat('es-AR').format(selectedProduct.precio_venta || 0)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            | Costo: ${new Intl.NumberFormat('es-AR').format(selectedProduct.precio_compra || 0)}
                        </span>
                    </div>
                ) : (
                    <span className="muted">{placeholder}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>▾</span>
            </div>

            {open && (
                <div className="product-picker-dropdown">
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconBuscar style={{ color: 'var(--color-text-muted)', flexShrink: 0, width: 14, height: 14 }} />
                        <input
                            autoFocus
                            placeholder="Escribí para buscar por nombre o código…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                fontSize: 13,
                                background: 'transparent'
                            }}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
                                No se encontraron productos activos.
                            </div>
                        ) : (
                            filtered.map(p => {
                                const isSelected = selectedProduct && selectedProduct.id === p.id;
                                return (
                                    <div
                                        key={p.id}
                                        className={`product-picker-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => select(p)}
                                    >
                                        <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                                            <div style={{ fontWeight: isSelected ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.nombre}
                                            </div>
                                            <div className="row gap-xs" style={{ marginTop: 2, fontSize: 11 }}>
                                                <span className="mono muted">{p.codigo || `MP-${p.id}`}</span>
                                                {p.categoria_nombre && (
                                                    <span style={{ color: 'var(--color-primary-dark)', fontWeight: 500 }}>
                                                        • {p.categoria_nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div className="mono" style={{ fontWeight: 600, color: 'var(--color-primary-dark)', fontSize: 12 }}>
                                                Venta: ${new Intl.NumberFormat('es-AR').format(p.precio_venta || 0)}
                                            </div>
                                            <div className="mono text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10.5 }}>
                                                Costo: ${new Intl.NumberFormat('es-AR').format(p.precio_compra || 0)}
                                            </div>
                                            <span className={`badge ${p.stock_actual <= 0 ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: 10, padding: '1px 6px', marginTop: 2 }}>
                                                {p.stock_actual} {p.unidad_medida}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
