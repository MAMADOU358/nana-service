import React from 'react';

const Loader = ({ 
    fullscreen = false, 
    message = 'Chargement...', 
    size = 'md',
    overlay = false 
}) => {
    const sizes = {
        sm: { spinner: 24, border: 3 },
        md: { spinner: 40, border: 4 },
        lg: { spinner: 60, border: 5 },
    };

    const s = sizes[size] || sizes.md;

    const spinner = (
        <div style={{ textAlign: 'center' }}>
            {/* Logo animé */}
            <div style={{
                width: s.spinner,
                height: s.spinner,
                border: `${s.border}px solid rgba(15,45,107,0.15)`,
                borderTop: `${s.border}px solid #0F2D6B`,
                borderRight: `${s.border}px solid #FF6B00`,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto',
            }} />
            {message && (
                <p style={{
                    marginTop: 12,
                    fontSize: size === 'sm' ? 12 : 14,
                    color: '#6B7280',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                }}>
                    {message}
                </p>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (fullscreen) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0F2D6B 0%, #1E4DB7 50%, #0F2D6B 100%)',
                zIndex: 9999,
                gap: 20,
            }}>
                {/* Logo NANA SERVICE */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 20,
                }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 36,
                        border: '2px solid rgba(255,107,0,0.5)',
                        animation: 'pulse 2s infinite',
                    }}>
                        🏪
                    </div>
                    <div style={{
                        color: '#FF6B00',
                        fontSize: 22,
                        fontWeight: 900,
                        fontFamily: 'Inter, sans-serif',
                        letterSpacing: 1,
                    }}>
                        NANA SERVICE
                    </div>
                    <div style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 12,
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        PRO
                    </div>
                </div>

                {/* Spinner */}
                <div style={{
                    width: 48,
                    height: 48,
                    border: '4px solid rgba(255,255,255,0.15)',
                    borderTop: '4px solid #FF6B00',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />

                <p style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                    marginTop: 8,
                }}>
                    {message}
                </p>

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:0.8} }
                `}</style>
            </div>
        );
    }

    if (overlay) {
        return (
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(4px)',
                borderRadius: 'inherit',
                zIndex: 10,
            }}>
                {spinner}
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
        }}>
            {spinner}
        </div>
    );
};

// Skeleton loader
export const Skeleton = ({ width, height = 16, borderRadius = 8, style = {} }) => (
    <div style={{
        width: width || '100%',
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
    }}>
        <style>{`@keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }`}</style>
    </div>
);

// Skeleton card
export const SkeletonCard = () => (
    <div style={{
        background: 'white',
        borderRadius: 14,
        padding: 20,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
        <Skeleton height={20} width="60%" style={{ marginBottom: 12 }} />
        <Skeleton height={14} style={{ marginBottom: 8 }} />
        <Skeleton height={14} width="80%" style={{ marginBottom: 8 }} />
        <Skeleton height={14} width="40%" />
    </div>
);

export default Loader;