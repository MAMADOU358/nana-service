import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { ToastProvider } from '../components/common/Toast';

const ClientLayout = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { profil, deconnexion } = useAuth();
    const { entreprise } = useApp();

    const [menuOpen, setMenuOpen] = useState(false);

    const NAV = [
        { path: '/mon-espace',          label: 'Accueil',     icon: '🏠' },
        { path: '/mon-espace/catalogue', label: 'Catalogue',  icon: '🛍️' },
        { path: '/mon-espace/panier',    label: 'Panier',     icon: '🛒' },
        { path: '/mon-espace/commandes', label: 'Commandes',  icon: '📋' },
        { path: '/mon-espace/profil',    label: 'Mon profil', icon: '👤' },
    ];

    const isActive = (path) => location.pathname === path;

    const handleDeconnexion = async () => {
        await deconnexion();
        navigate('/login');
    };

    return (
        <ToastProvider>
            <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif' }}>
                {/* HEADER */}
                <header style={{
                    background: 'linear-gradient(135deg, #0A1F4E 0%, #0F2D6B 100%)',
                    color: 'white', position: 'sticky', top: 0, zIndex: 100,
                    boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
                }}>
                    <div style={{
                        maxWidth: 1200, margin: '0 auto',
                        padding: '0 20px',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', height: 64,
                    }}>
                        {/* Logo */}
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                            onClick={() => navigate('/mon-espace')}
                        >
                            <div style={{
                                width: 38, height: 38, borderRadius: 10,
                                background: 'rgba(255,107,0,0.2)',
                                border: '2px solid rgba(255,107,0,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                            }}>
                                {entreprise?.logo
                                    ? <img src={entreprise.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                    : '🏪'}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 15, color: '#FF6B00' }}>
                                    {entreprise?.nom || 'NANA SERVICE'}
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                                    {entreprise?.slogan || 'Votre partenaire de confiance'}
                                </div>
                            </div>
                        </div>

                        {/* Nav desktop */}
                        <nav style={{ display: 'flex', gap: 4 }}>
                            {NAV.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    style={{
                                        padding: '8px 14px',
                                        background: isActive(item.path) ? 'rgba(255,107,0,0.25)' : 'transparent',
                                        color:      isActive(item.path) ? '#FF6B00' : 'rgba(255,255,255,0.75)',
                                        border: 'none', borderRadius: 10,
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                                    }}
                                    onMouseOver={e => {
                                        if (!isActive(item.path)) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                            e.currentTarget.style.color = 'white';
                                        }
                                    }}
                                    onMouseOut={e => {
                                        if (!isActive(item.path)) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                                        }
                                    }}
                                >
                                    <span>{item.icon}</span>
                                    <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </nav>

                        {/* User */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 12px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: 20, cursor: 'pointer',
                            }}
                            onClick={() => navigate('/mon-espace/profil')}
                            >
                                <div style={{
                                    width: 30, height: 30, borderRadius: '50%',
                                    background: 'rgba(255,107,0,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0,
                                    overflow: 'hidden',
                                }}>
                                    {profil?.avatar
                                        ? <img src={profil.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : (profil?.prenom?.charAt(0) || profil?.nom?.charAt(0) || '?').toUpperCase()}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                                    {profil?.prenom || profil?.nom || 'Mon compte'}
                                </span>
                            </div>
                            <button
                                onClick={handleDeconnexion}
                                style={{
                                    width: 36, height: 36,
                                    background: 'rgba(239,68,68,0.2)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '50%', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 15, color: '#FCA5A5', transition: 'all 0.2s',
                                }}
                                title="Déconnexion"
                            >
                                🚪
                            </button>
                        </div>
                    </div>
                </header>

                {/* CONTENU */}
                <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
                    <Outlet />
                </main>

                {/* FOOTER */}
                <footer style={{
                    background: '#0A1F4E', color: 'rgba(255,255,255,0.5)',
                    padding: '20px', textAlign: 'center', fontSize: 12,
                    marginTop: 40,
                }}>
                    <div style={{ marginBottom: 6, color: '#FF6B00', fontWeight: 700, fontSize: 14 }}>
                        {entreprise?.nom || 'NANA SERVICE'}
                    </div>
                    <div>{entreprise?.adresse}</div>
                    <div style={{ marginTop: 4 }}>
                        {entreprise?.telephone && <span>📞 {entreprise.telephone}  </span>}
                        {entreprise?.whatsapp  && <span>💬 {entreprise.whatsapp}  </span>}
                        {entreprise?.email     && <span>✉️ {entreprise.email}</span>}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
                        © {new Date().getFullYear()} {entreprise?.nom || 'NANA SERVICE'} — Tous droits réservés
                    </div>
                </footer>
            </div>
        </ToastProvider>
    );
};

export default ClientLayout;