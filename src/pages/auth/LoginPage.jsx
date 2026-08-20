import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
    const navigate = useNavigate();
    const { connexion, estBloque, bloqueJusqu } = useAuth();

    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [showPw, setShowPw]   = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            setError('Veuillez remplir tous les champs.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await connexion(form.email, form.password);
            navigate('/admin', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const restantBlocage = bloqueJusqu
        ? Math.ceil((bloqueJusqu - Date.now()) / 60000) : 0;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            fontFamily: 'Inter, sans-serif',
        }}>
            {/* GAUCHE — Branding */}
            <div style={{
                flex: 1,
                background: 'linear-gradient(135deg, #0A1F4E 0%, #0F2D6B 40%, #1E4DB7 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Cercles décoratifs */}
                <div style={{
                    position: 'absolute',
                    width: 300, height: 300,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,107,0,0.2)',
                    top: -100, right: -100,
                }} />
                <div style={{
                    position: 'absolute',
                    width: 200, height: 200,
                    borderRadius: '50%',
                    background: 'rgba(255,107,0,0.05)',
                    bottom: 100, left: -80,
                }} />
                <div style={{
                    position: 'absolute',
                    width: 400, height: 400,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.05)',
                    bottom: -200, right: -200,
                }} />

                {/* Logo */}
                <div style={{
                    width: 100, height: 100,
                    background: 'rgba(255,107,0,0.15)',
                    border: '3px solid rgba(255,107,0,0.5)',
                    borderRadius: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                    marginBottom: 24,
                    position: 'relative',
                    zIndex: 1,
                }}>
                    🏪
                </div>

                <h1 style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: '#FF6B00',
                    marginBottom: 8,
                    letterSpacing: 1,
                    position: 'relative',
                    zIndex: 1,
                }}>
                    NANA SERVICE
                </h1>

                <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: 4,
                    marginBottom: 40,
                    position: 'relative',
                    zIndex: 1,
                }}>
                    PRO
                </div>

                <p style={{
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.7)',
                    textAlign: 'center',
                    maxWidth: 320,
                    lineHeight: 1.7,
                    position: 'relative',
                    zIndex: 1,
                }}>
                    Système de gestion professionnel multi-domaines
                </p>

                {/* Features */}
                <div style={{
                    marginTop: 48,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    position: 'relative',
                    zIndex: 1,
                }}>
                    {[
                        { icon: '📦', text: 'Gestion des produits & services' },
                        { icon: '🧾', text: 'Facturation professionnelle' },
                        { icon: '📊', text: 'Statistiques en temps réel' },
                        { icon: '🔒', text: 'Sécurité enterprise-grade' },
                    ].map((f, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.75)',
                        }}>
                            <span style={{ fontSize: 18 }}>{f.icon}</span>
                            {f.text}
                        </div>
                    ))}
                </div>
            </div>

            {/* DROITE — Formulaire */}
            <div style={{
                width: 480,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 48,
                background: 'var(--bg, #F0F4FF)',
                flexShrink: 0,
            }}>
                <div style={{ width: '100%', maxWidth: 380 }}>
                    <h2 style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: 'var(--text, #111827)',
                        marginBottom: 8,
                    }}>
                        Connexion
                    </h2>
                    <p style={{
                        fontSize: 14,
                        color: 'var(--text2, #6B7280)',
                        marginBottom: 36,
                    }}>
                        Accédez à votre espace d'administration
                    </p>

                    {/* Blocage */}
                    {estBloque && (
                        <div style={{
                            padding: '14px 16px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 12,
                            marginBottom: 20,
                            fontSize: 13,
                            color: '#991B1B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            🔒 Compte bloqué {restantBlocage > 0 ? `encore ${restantBlocage} min` : ''}.
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={{
                                display: 'block',
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--text)',
                                marginBottom: 6,
                            }}>
                                Email ou identifiant
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="admin@nanaservice.com"
                                disabled={loading || estBloque}
                                autoComplete="email"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: `2px solid ${error ? '#EF4444' : 'var(--border, #E5E7EB)'}`,
                                    borderRadius: 12,
                                    fontSize: 14,
                                    background: 'var(--card, #fff)',
                                    color: 'var(--text)',
                                    outline: 'none',
                                    fontFamily: 'Inter, sans-serif',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#0F2D6B'}
                                onBlur={e => e.target.style.borderColor = error ? '#EF4444' : 'var(--border, #E5E7EB)'}
                            />
                        </div>

                        {/* Mot de passe */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 6,
                            }}>
                                <label style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                }}>
                                    Mot de passe
                                </label>
                                <Link to="/reset-password" style={{
                                    fontSize: 12,
                                    color: '#FF6B00',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                }}>
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    disabled={loading || estBloque}
                                    autoComplete="current-password"
                                    style={{
                                        width: '100%',
                                        padding: '12px 48px 12px 16px',
                                        border: `2px solid ${error ? '#EF4444' : 'var(--border, #E5E7EB)'}`,
                                        borderRadius: 12,
                                        fontSize: 14,
                                        background: 'var(--card, #fff)',
                                        color: 'var(--text)',
                                        outline: 'none',
                                        fontFamily: 'Inter, sans-serif',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#0F2D6B'}
                                    onBlur={e => e.target.style.borderColor = error ? '#EF4444' : 'var(--border, #E5E7EB)'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    style={{
                                        position: 'absolute',
                                        right: 14,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 18,
                                        color: 'var(--text2)',
                                        padding: 0,
                                    }}
                                >
                                    {showPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Erreur */}
                        {error && (
                            <div style={{
                                padding: '12px 14px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 10,
                                marginBottom: 18,
                                fontSize: 13,
                                color: '#991B1B',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        {/* Bouton connexion */}
                        <button
                            type="submit"
                            disabled={loading || estBloque}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: loading || estBloque
                                    ? '#9CA3AF'
                                    : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 16,
                                fontWeight: 700,
                                cursor: loading || estBloque ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                fontFamily: 'Inter, sans-serif',
                                boxShadow: loading || estBloque ? 'none' : '0 4px 14px rgba(15,45,107,0.35)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: 18, height: 18,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
                                    Connexion...
                                </>
                            ) : (
                                <>🚀 Se connecter</>
                            )}
                        </button>
                    </form>

                    {/* Info sécurité */}
                    <div style={{
                        marginTop: 32,
                        padding: '14px 16px',
                        background: 'rgba(15,45,107,0.05)',
                        border: '1px solid rgba(15,45,107,0.1)',
                        borderRadius: 12,
                        fontSize: 12,
                        color: 'var(--text2)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        lineHeight: 1.5,
                    }}>
                        <span style={{ fontSize: 16 }}>🔒</span>
                        <span>
                            Accès réservé au personnel autorisé.
                            Toutes les connexions sont journalisées et surveillées.
                        </span>
                    </div>

                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;