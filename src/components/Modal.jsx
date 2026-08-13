export default function Modal({ title, onClose, children, width }) {
    return (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal" style={width ? { maxWidth: width } : undefined}>
                <div className="spread" style={{ marginBottom: 18 }}>
                    <h2 style={{ fontSize: 19 }}>{title}</h2>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}
