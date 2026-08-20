import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    footer = null,
    closeOnOverlay = true,
    showClose = true,
    icon = null,
}) => {
    const modalRef = useRef(null);

    // Fermer avec Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // Bloquer scroll
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm:  { maxWidth: 400  },
        md:  { maxWidth: 580  },
        lg:  { maxWidth: 800  },
        xl:  { maxWidth: 1000 },
        full:{ maxWidth: '95vw' },
    };

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                animation: 'fadeIn 0.2s ease',
            }}
            onClick={closeOnOverlay ? onClose : undefined}
        >
            <div
                ref={modalRef}
                style={{
                    background: 'var(--card, #fff)',
                    borderRadius: 20,
                    width: '100%',
                    ...(sizes[size] || sizes.md),
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                    animation: 'scaleIn 0.25s cubic-bezier(0.4,0,0.2,1)',
                    fontFamily: 'Inter, sans-serif',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showClose) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--border, #E5E7EB)',
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {icon && (
                                <div style={{
                                    width: 42,
                                    height: 42,
                                    background: 'rgba(15,45,107,0.1)',
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 20,
                                }}>
                                    {icon}
                                </div>
                            )}
                            {title && (
                                <h2 style={{
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color: 'var(--text, #111827)',
                                    margin: 0,
                                }}>
                                    {title}
                                </h2>
                            )}
                        </div>
                        {showClose && (
                            <button
                                onClick={onClose}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'var(--gray-100, #F3F4F6)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    color: 'var(--text2, #6B7280)',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#EF4444'}
                                onMouseOut={e => e.currentTarget.style.background = 'var(--gray-100, #F3F4F6)'}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--border, #E5E7EB)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 10,
                        flexShrink: 0,
                        background: 'var(--gray-50, #F9FAFB)',
                        borderRadius: '0 0 20px 20px',
                    }}>
                        {footer}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
                @keyframes scaleIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
            `}</style>
        </div>,
        document.body
    );
};

// Modal de confirmation
export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirmer l\'action',
    message = 'Êtes-vous sûr de vouloir effectuer cette action ?',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    type = 'danger',
    loading = false,
    motConfirmation = null,
}) => {
    const [motSaisi, setMotSaisi] = React.useState('');
    const colors = {
        danger:  { bg: '#EF4444', emoji: '⚠️' },
        warning: { bg: '#F59E0B', emoji: '⚠️' },
        info:    { bg: '#3B82F6', emoji: 'ℹ️' },
        success: { bg: '#10B981', emoji: '✅' },
    };
    const c = colors[type] || colors.danger;
    const peutConfirmer = !motConfirmation || motSaisi === motConfirmation;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            showClose={false}
            closeOnOverlay={false}
        >
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{
                    width: 64,
                    height: 64,
                    background: `${c.bg}20`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                    margin: '0 auto 16px',
                    border: `2px solid ${c.bg}40`,
                }}>
                    {c.emoji}
                </div>

                <h3 style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--text)',
                    marginBottom: 10,
                    fontFamily: 'Inter, sans-serif',
                }}>
                    {title}
                </h3>

                <p style={{
                    fontSize: 14,
                    color: 'var(--text2)',
                    lineHeight: 1.6,
                    marginBottom: 20,
                    fontFamily: 'Inter, sans-serif',
                }}>
                    {message}
                </p>

                {/* Mot de confirmation */}
                {motConfirmation && (
                    <div style={{ marginBottom: 20, textAlign: 'left' }}>
                        <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text)',
                            marginBottom: 6,
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            Tapez <strong style={{ color: c.bg }}>"{motConfirmation}"</strong> pour confirmer :
                        </label>
                        <input
                            type="text"
                            value={motSaisi}
                            onChange={e => setMotSaisi(e.target.value)}
                            placeholder={`Tapez ${motConfirmation}`}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                border: `2px solid ${motSaisi === motConfirmation ? '#10B981' : '#E5E7EB'}`,
                                borderRadius: 10,
                                fontSize: 14,
                                fontFamily: 'Inter, sans-serif',
                                outline: 'none',
                                background: 'var(--card)',
                                color: 'var(--text)',
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '11px 20px',
                            border: '2px solid var(--border)',
                            borderRadius: 10,
                            background: 'var(--card)',
                            color: 'var(--text)',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading || !peutConfirmer}
                        style={{
                            flex: 1,
                            padding: '11px 20px',
                            border: 'none',
                            borderRadius: 10,
                            background: peutConfirmer ? c.bg : '#9CA3AF',
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: peutConfirmer && !loading ? 'pointer' : 'not-allowed',
                            fontFamily: 'Inter, sans-serif',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: 14, height: 14,
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTop: '2px solid white',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                                Traitement...
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Modal>
    );
};

export default Modal;