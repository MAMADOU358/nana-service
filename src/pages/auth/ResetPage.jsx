import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ResetPage = () => {
    const navigate = useNavigate();
    const { reinitialiserMotDePasse } = useAuth();

    const [email, setEmail]     = useState('');
    const [loading, setLoading] = useState(false);
    const [envoye, setEnvoye]   = useState(false);
    const [error, setError]     = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Entrez votre email'); return; }
        setLoading(true);
        setError('');
        try {
            await reinitialiserMotDePasse(email.trim());
            setEnvoye(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 20,
            background: 'linear-gradient(135deg, #0A1F4E 0%, #0F2D6B 40%, #1E4DB7 100%)',
            fontFamily: 'Inter, sans-serif',
        }}>
            <div style={{
                background: 'var(--card)', borderRadius: 24,
                padding: 40, width: '100%', maxWidth: 420,
                boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                        Mot de passe oublié
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
                        Entrez votre email pour recevoir un lien de réinitialisation
                    </p>
                </div>

                {envoye ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 60, marginBottom: 16 }}>📧</div>
                        <div style={{
                            padding: '16px 20px',
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: 12, marginBottom: 20,
                            fontSize: 14, color: '#065F46', fontWeight: 500,
                            lineHeight: 1.6,
                        }}>
                            ✅ Email envoyé à <strong>{email}</strong>.
                            Vérifiez votre boîte mail et suivez les instructions.
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                width: '100%', padding: 14,
                                background: 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                color: 'white', border: 'none', borderRadius: 12,
                                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            ← Retour à la connexion
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text)' }}>
                                Adresse email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                placeholder="votre@email.com"
                                autoFocus
                                style={{
                                    width: '100%', padding: '12px 16px',
                                    border: `2px solid ${error ? '#EF4444' : 'var(--border)'}`,
                                    borderRadius: 12, fontSize: 15,
                                    background: 'var(--bg)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 10, marginBottom: 16,
                                fontSize: 13, color: '#991B1B',
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: 14,
                                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                color: 'white', border: 'none', borderRadius: 12,
                                fontSize: 16, fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                marginBottom: 14, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', gap: 8,
                                fontFamily: 'Inter, sans-serif',
                                boxShadow: loading ? 'none' : '0 4px 14px rgba(15,45,107,0.35)',
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: 16, height: 16,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
                                    Envoi...
                                </>
                            ) : (
                                '📧 Envoyer le lien'
                            )}
                        </button>

                        <Link to="/login" style={{
                            display: 'block', textAlign: 'center',
                            color: '#FF6B00', fontSize: 13, fontWeight: 600,
                            textDecoration: 'none',
                        }}>
                            ← Retour à la connexion
                        </Link>
                    </form>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
};

export default ResetPage;