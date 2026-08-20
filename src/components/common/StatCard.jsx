import React from 'react';

const COLORS = {
    primary:   { bg: 'rgba(15,45,107,0.1)',   icon: '#0F2D6B',  border: '#0F2D6B'  },
    secondary: { bg: 'rgba(255,107,0,0.1)',   icon: '#FF6B00',  border: '#FF6B00'  },
    success:   { bg: 'rgba(16,185,129,0.1)',  icon: '#10B981',  border: '#10B981'  },
    warning:   { bg: 'rgba(245,158,11,0.1)',  icon: '#F59E0B',  border: '#F59E0B'  },
    danger:    { bg: 'rgba(239,68,68,0.1)',   icon: '#EF4444',  border: '#EF4444'  },
    info:      { bg: 'rgba(59,130,246,0.1)',  icon: '#3B82F6',  border: '#3B82F6'  },
    purple:    { bg: 'rgba(139,92,246,0.1)',  icon: '#8B5CF6',  border: '#8B5CF6'  },
    teal:      { bg: 'rgba(20,184,166,0.1)',  icon: '#14B8A6',  border: '#14B8A6'  },
};

const StatCard = ({
    icon,
    label,
    value,
    sous = null,
    couleur = 'primary',
    tendance = null,
    tendanceValeur = null,
    onClick = null,
    loading = false,
}) => {
    const c = COLORS[couleur] || COLORS.primary;

    if (loading) {
        return (
            <div style={{
                background: 'var(--card)',
                borderRadius: 14,
                padding: 20,
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${c.border}`,
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
            }}>
                <div style={{
                    background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    height: 52, width: 52, borderRadius: 14, marginBottom: 16,
                }} />
                <div style={{
                    background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    height: 28, width: '60%', borderRadius: 8, marginBottom: 8,
                }} />
                <div style={{
                    background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    height: 14, width: '40%', borderRadius: 6,
                }} />
                <style>{`@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}`}</style>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            style={{
                background: 'var(--card)',
                borderRadius: 14,
                padding: 20,
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${c.border}`,
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
            }}
            onMouseOver={e => {
                if (onClick) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
                }
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
            }}
        >
            {/* Icône */}
            <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: c.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
                color: c.icon,
            }}>
                {icon}
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text)',
                    lineHeight: 1.2,
                    marginBottom: 3,
                }}>
                    {value}
                </div>
                <div style={{
                    fontSize: 12,
                    color: 'var(--text2)',
                    fontWeight: 500,
                }}>
                    {label}
                </div>
                {sous && (
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                        {sous}
                    </div>
                )}
                {tendance && tendanceValeur && (
                    <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        color: tendance === 'up' ? '#10B981' : '#EF4444',
                    }}>
                        {tendance === 'up' ? '↑' : '↓'} {tendanceValeur}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;