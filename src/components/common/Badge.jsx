import React from 'react';

const VARIANTS = {
    primary:   { bg: 'rgba(15,45,107,0.1)',   color: '#0F2D6B',  dot: '#0F2D6B'  },
    secondary: { bg: 'rgba(255,107,0,0.1)',   color: '#CC5500',  dot: '#FF6B00'  },
    success:   { bg: 'rgba(16,185,129,0.1)',  color: '#065F46',  dot: '#10B981'  },
    warning:   { bg: 'rgba(245,158,11,0.1)',  color: '#92400E',  dot: '#F59E0B'  },
    danger:    { bg: 'rgba(239,68,68,0.1)',   color: '#991B1B',  dot: '#EF4444'  },
    info:      { bg: 'rgba(59,130,246,0.1)',  color: '#1E40AF',  dot: '#3B82F6'  },
    purple:    { bg: 'rgba(139,92,246,0.1)',  color: '#4C1D95',  dot: '#8B5CF6'  },
    pink:      { bg: 'rgba(236,72,153,0.1)',  color: '#831843',  dot: '#EC4899'  },
    gray:      { bg: 'rgba(107,114,128,0.1)', color: '#374151',  dot: '#6B7280'  },
    teal:      { bg: 'rgba(20,184,166,0.1)',  color: '#134E4A',  dot: '#14B8A6'  },
};

const Badge = ({
    children,
    variant = 'gray',
    size = 'md',
    dot = false,
    icon = null,
    rounded = false,
    className = '',
    style = {},
}) => {
    const v = VARIANTS[variant] || VARIANTS.gray;
    const sizes = {
        xs: { fontSize: 10, padding: '2px 7px', dotSize: 6 },
        sm: { fontSize: 11, padding: '3px 9px', dotSize: 7 },
        md: { fontSize: 12, padding: '4px 11px', dotSize: 8 },
        lg: { fontSize: 13, padding: '5px 13px', dotSize: 9 },
    };
    const s = sizes[size] || sizes.md;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: v.bg,
            color: v.color,
            fontSize: s.fontSize,
            padding: s.padding,
            borderRadius: rounded ? 9999 : 6,
            fontWeight: 600,
            letterSpacing: 0.3,
            fontFamily: 'Inter, sans-serif',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
            ...style,
        }} className={className}>
            {dot && (
                <span style={{
                    width: s.dotSize,
                    height: s.dotSize,
                    borderRadius: '50%',
                    background: v.dot,
                    flexShrink: 0,
                    animation: variant === 'warning' || variant === 'danger'
                        ? 'pulse 2s infinite' : 'none',
                }} />
            )}
            {icon && <span style={{ fontSize: s.fontSize + 1 }}>{icon}</span>}
            {children}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </span>
    );
};

export default Badge;