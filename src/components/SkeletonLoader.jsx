import React from 'react';

export function SkeletonLine({ width = '100%', height = '16px', style = {} }) {
    return (
        <span
            className="skeleton-box"
            style={{
                width,
                height,
                display: 'inline-block',
                borderRadius: '4px',
                ...style
            }}
        />
    );
}

export function SkeletonCard({ height = '120px', style = {} }) {
    return (
        <div
            className="card"
            style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height,
                ...style
            }}
        >
            <SkeletonLine width="45%" height="14px" />
            <SkeletonLine width="75%" height="28px" />
            <SkeletonLine width="60%" height="12px" />
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--color-surface-sunken)', borderBottom: '1px solid var(--color-border)' }}>
                        {Array.from({ length: cols }).map((_, c) => (
                            <th key={c} style={{ padding: '12px 16px' }}>
                                <SkeletonLine width="60%" height="14px" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c} style={{ padding: '12px 16px' }}>
                                    <SkeletonLine width={c === 0 ? '70%' : '50%'} height="14px" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default {
    SkeletonLine,
    SkeletonCard,
    SkeletonTable
};
