import { useState, useRef, useEffect } from 'react';
import { IconBuscar } from './Icons';

export default function ProductPicker({ productos, value, onChange, placeholder = 'Buscar y seleccionar producto…' }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const selectedProduct = productos.find(p => p.id === Number(value));

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = productos.filter(p => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            p.nombre.toLowerCase().includes(s) ||
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <span className="mono" style={{ fontSize: 11, background: 'var(--color-surface-sunken)', padding: '2px 5px', borderRadius: 4 }}>
                            {selectedProduct.codigo || `MP-${selectedProduct.id}`}
                        </span>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {selectedProduct.nombre}
                        </span>
                        <span className="muted text-xs">
                            ({selectedProduct.stock_actual} {selectedProduct.unidad_medida} disp.)
                        </span>
                    </div>
                ) : (
                    <span className="muted">{placeholder}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>▼</span>
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
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5 }}>
                                No se encontraron productos.
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
                                        <div>
                                            <div style={{ fontWeight: isSelected ? 700 : 500 }}>
                                                {p.nombre}
                                            </div>
                                            <div className="row gap-xs" style={{ marginTop: 2, fontSize: 11 }}>
                                                <span className="mono muted">{p.codigo || `MP-${p.id}`}</span>
                                                {p.categoria_nombre && (
                                                    <span style={{ color: 'var(--color-primary-dark)', fontWeight: 500 }}>
                                                        · {p.categoria_nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div className="mono" style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                                                ${new Intl.NumberFormat('es-AR').format(p.precio_venta)}
                                            </div>
                                            <span className={`badge ${p.stock_actual <= 0 ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
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
