import { createPortal } from 'react-dom';

export default function Modal({ title, onClose, children, width }) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal" style={width ? { maxWidth: `min(${width}px, calc(100vw - 32px))` } : undefined}>
                <div className="spread" style={{ marginBottom: 18 }}>
                    <h2 style={{ fontSize: 19 }}>{title}</h2>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">✕</button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
}
