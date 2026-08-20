import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Context Toast
const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider');
    return ctx;
};

// Icons par type
const ICONS = {
    success: '✅',
    error:   '❌',
    warning: '⚠️',
    info:    'ℹ️',
    loading: '⏳',
};

const COLORS = {
    success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
    error:   { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
    info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
    loading: { bg: '#F5F3FF', border: '#8B5CF6', text: '#4C1D95' },
};

// Composant Toast individuel
const ToastItem = ({ toast, onRemove }) => {
    const [visible, setVisible] = useState(false);
    const colors = COLORS[toast.type] || COLORS.info;

    useEffect(() => {
        // Animation entrée
        setTimeout(() => setVisible(true), 10);

        // Auto-suppression
        if (toast.duration !== Infinity) {
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(() => onRemove(toast.id), 300);
            }, toast.duration || 4000);
            return () => clearTimeout(timer);
        }
    }, [toast, onRemove]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '14px 16px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderLeft: `4px solid ${colors.border}`,
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            minWidth: 300,
            maxWidth: 420,
            transform: visible ? 'translateX(0)' : 'translateX(110%)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
        }}
        onClick={() => {
            setVisible(false);
            setTimeout(() => onRemove(toast.id), 300);
        }}>
            {/* Icon */}
            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                {toast.type === 'loading'
                    ? <div style={{
                        width: 18, height: 18,
                        border: '2px solid rgba(139,92,246,0.3)',
                        borderTop: '2px solid #8B5CF6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    : ICONS[toast.type]
                }
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                    <div style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: colors.text,
                        marginBottom: toast.message ? 3 : 0,
                    }}>
                        {toast.title}
                    </div>
                )}
                {toast.message && (
                    <div style={{
                        fontSize: 13,
                        color: colors.text,
                        opacity: 0.85,
                        lineHeight: 1.4,
                    }}>
                        {toast.message}
                    </div>
                )}
            </div>

            {/* Bouton fermer */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setVisible(false);
                    setTimeout(() => onRemove(toast.id), 300);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.text,
                    opacity: 0.5,
                    fontSize: 16,
                    padding: '0 4px',
                    flexShrink: 0,
                    lineHeight: 1,
                }}
            >
                ✕
            </button>
        </div>
    );
};

// Provider Toast
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((options) => {
        const id = Date.now() + Math.random();
        const toast = {
            id,
            type:     options.type || 'info',
            title:    options.title || null,
            message:  options.message || (typeof options === 'string' ? options : ''),
            duration: options.duration ?? 4000,
        };

        setToasts(prev => [...prev, toast]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Raccourcis
    const success = useCallback((title, message, duration) =>
        addToast({ type: 'success', title, message, duration }), [addToast]);

    const error = useCallback((title, message, duration) =>
        addToast({ type: 'error', title, message, duration }), [addToast]);

    const warning = useCallback((title, message, duration) =>
        addToast({ type: 'warning', title, message, duration }), [addToast]);

    const info = useCallback((title, message, duration) =>
        addToast({ type: 'info', title, message, duration }), [addToast]);

    const loading = useCallback((title, message) =>
        addToast({ type: 'loading', title, message, duration: Infinity }), [addToast]);

    const dismiss = useCallback((id) => removeToast(id), [removeToast]);

    const dismissAll = useCallback(() => setToasts([]), []);

    return (
        <ToastContext.Provider value={{
            success, error, warning, info, loading, dismiss, dismissAll, addToast
        }}>
            {children}
            {createPortal(
                <div style={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    pointerEvents: 'none',
                }}>
                    {toasts.map(toast => (
                        <div key={toast.id} style={{ pointerEvents: 'all' }}>
                            <ToastItem toast={toast} onRemove={removeToast} />
                        </div>
                    ))}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};

export default ToastProvider;