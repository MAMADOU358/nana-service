import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { PERMISSIONS } from '../config/constants';
import { ToastProvider } from '../components/common/Toast';

// Menu de navigation
const MENU_ITEMS = [
    {
        section: 'Principal',
        items: [
            { path: '/admin/dashboard',   label: 'Dashboard',     icon: '📊', permission: null },
            { path: '/admin/commandes',   label: 'Commandes',     icon: '📋', permission: PERMISSIONS.COMMANDES_VOIR, badge: 'commandes' },
        ]
    },
    {
        section: 'Catalogue',
        items: [
            { path: '/admin/produits',    label: 'Produits',      icon: '📦', permission: PERMISSIONS.PRODUITS_VOIR },
            { path: '/admin/services',    label: 'Services',      icon: '⚙️', permission: PERMISSIONS.SERVICES_VOIR },
            { path: '/admin/domaines',    label: 'Domaines',      icon: '🏢', permission: PERMISSIONS.DOMAINES_VOIR },
            { path: '/admin/boutiques',   label: 'Boutiques',     icon: '🏪', permission: PERMISSIONS.BOUTIQUES_VOIR },
        ]
    },
    {
        section: 'Gestion',
        items: [
            { path: '/admin/clients',     label: 'Clients',       icon: '👥', permission: PERMISSIONS.CLIENTS_VOIR },
            { path: '/admin/partenaires', label: 'Partenaires',   icon: '🤝', permission: PERMISSIONS.PARTENAIRES_VOIR },
            { path: '/admin/stock',       label: 'Stock',         icon: '📦', permission: PERMISSIONS.STOCK_VOIR },
        ]
    },
    {
        section: 'Finances',
        items: [
            { path: '/admin/ventes',      label: 'Ventes',        icon: '💰', permission: PERMISSIONS.VENTES_VOIR },
            { path: '/admin/factures',    label: 'Factures',      icon: '🧾', permission: PERMISSIONS.FACTURES_VOIR },
            { path: '/admin/devis',       label: 'Devis',         icon: '📝', permission: PERMISSIONS.DEVIS_VOIR },
            { path: '/admin/achats',      label: 'Achats',        icon: '🛒', permission: PERMISSIONS.ACHATS_VOIR },
            { path: '/admin/depenses',    label: 'Dépenses',      icon: '💸', permission: PERMISSIONS.DEPENSES_VOIR },
        ]
    },
    {
        section: 'Analyse',
        items: [
            { path: '/admin/rapports',    label: 'Rapports',      icon: '📈', permission: PERMISSIONS.RAPPORTS_VOIR },
            { path: '/admin/audit',       label: 'Audit',         icon: '🔍', permission: PERMISSIONS.AUDIT_VOIR },
        ]
    },
    {
        section: 'Administration',
        items: [
            { path: '/admin/utilisateurs',label: 'Utilisateurs',  icon: '👤', permission: PERMISSIONS.USERS_VOIR },
            { path: '/admin/parametres',  label: 'Paramètres',    icon: '⚙️', permission: PERMISSIONS.PARAMS_VOIR },
{ path: '/admin/sauvegardes', label: 'Sauvegardes', icon: '💾', permission: null },
{ path: '/admin/reset', label: 'Zone Dangereuse', icon: '⚠️', permission: null },
        ]
    },
];

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profil, deconnexion, aPermission } = useAuth();
    const { entreprise, sidebarOuverte, setSidebarOuverte, notifications } = useApp();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed]   = useState(false);

    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    const handleDeconnexion = async () => {
        if (window.confirm('Voulez-vous vous déconnecter ?')) {
            await deconnexion();
            navigate('/login');
        }
    };

    const isActive = (path) => location.pathname === path;
    const sidebarWidth = collapsed ? 72 : 260;

    return (
        <ToastProvider>
            <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

                {/* Overlay mobile */}
                {mobileOpen && (
                    <div
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 99,
                        }}
                        onClick={() => setMobileOpen(false)}
                    />
                )}

                {/* SIDEBAR */}
                <aside style={{
                    width: sidebarWidth,
                    background: 'linear-gradient(180deg, #0A1F4E 0%, #0F2D6B 30%, #0A1F4E 100%)',
                    color: 'white',
                    position: 'fixed',
                    top: 0, left: 0, bottom: 0,
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.3s, transform 0.3s',
                    overflowX: 'hidden',
                    boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
                    transform: mobileOpen || window.innerWidth > 768 ? 'translateX(0)' : 'translateX(-100%)',
                }}>
                    {/* Logo */}
                    <div style={{
                        padding: collapsed ? '20px 12px' : '22px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexShrink: 0,
                    }}>
                        <div style={{
                            width: 40, height: 40,
                            background: 'rgba(255,107,0,0.2)',
                            border: '2px solid rgba(255,107,0,0.5)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            flexShrink: 0,
                            overflow: 'hidden',
                        }}>
                            {entreprise?.logo ? (
                                <img src={entreprise.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                            ) : '🏪'}
                        </div>
                        {!collapsed && (
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    color: '#FF6B00',
                                    fontWeight: 900,
                                    fontSize: 15,
                                    letterSpacing: 0.5,
                                    fontFamily: 'Inter, sans-serif',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {entreprise?.nom || 'NANA SERVICE'}
                                </div>
                                <div style={{
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: 10,
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                }}>
                                    PRO v1.0
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nav items */}
                    <nav style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '12px 8px',
                    }}>
                        {MENU_ITEMS.map((groupe, gi) => {
                            const itemsVis = groupe.items.filter(item =>
                                !item.permission || aPermission(item.permission)
                            );
                            if (itemsVis.length === 0) return null;

                            return (
                                <div key={gi} style={{ marginBottom: 8 }}>
                                    {!collapsed && (
                                        <div style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: 1.2,
                                            color: 'rgba(255,255,255,0.35)',
                                            textTransform: 'uppercase',
                                            padding: '10px 10px 4px',
                                            fontFamily: 'Inter, sans-serif',
                                        }}>
                                            {groupe.section}
                                        </div>
                                    )}

                                    {itemsVis.map((item, ii) => {
                                        const actif = isActive(item.path);
                                        const nbNotifs = item.badge === 'commandes' ? notifications.length : 0;

                                        return (
                                            <button
                                                key={ii}
                                                onClick={() => navigate(item.path)}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: collapsed ? '11px' : '10px 12px',
                                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                                    borderRadius: 10,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    background: actif ? 'rgba(255,107,0,0.25)' : 'transparent',
                                                    color: actif ? '#FF6B00' : 'rgba(255,255,255,0.75)',
                                                    fontSize: 13,
                                                    fontWeight: actif ? 700 : 500,
                                                    fontFamily: 'Inter, sans-serif',
                                                    transition: 'all 0.2s',
                                                    marginBottom: 2,
                                                    position: 'relative',
                                                    borderLeft: actif ? '3px solid #FF6B00' : '3px solid transparent',
                                                    textAlign: 'left',
                                                    whiteSpace: 'nowrap',
                                                }}
                                                onMouseOver={e => {
                                                    if (!actif) {
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                        e.currentTarget.style.color = 'white';
                                                    }
                                                }}
                                                onMouseOut={e => {
                                                    if (!actif) {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                                                    }
                                                }}
                                                title={collapsed ? item.label : ''}
                                            >
                                                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                                                {!collapsed && (
                                                    <>
                                                        <span style={{ flex: 1 }}>{item.label}</span>
                                                        {nbNotifs > 0 && (
                                                            <span style={{
                                                                background: '#EF4444',
                                                                color: 'white',
                                                                fontSize: 10,
                                                                fontWeight: 700,
                                                                padding: '2px 7px',
                                                                borderRadius: 9999,
                                                                flexShrink: 0,
                                                            }}>
                                                                {nbNotifs > 99 ? '99+' : nbNotifs}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Pied sidebar */}
                    <div style={{
                        padding: collapsed ? '12px 8px' : '14px 12px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        flexShrink: 0,
                    }}>
                        {/* Profil utilisateur */}
                        {!collapsed && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 10,
                                marginBottom: 10,
                                cursor: 'pointer',
                            }}
                            onClick={() => navigate('/admin/parametres')}
                            >
                                <div style={{
                                    width: 36, height: 36,
                                    background: 'rgba(255,107,0,0.3)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    flexShrink: 0,
                                }}>
                                    {profil?.avatar ? (
                                        <img src={profil.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : '👤'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: 'white',
                                        fontFamily: 'Inter, sans-serif',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {profil?.nom || 'Utilisateur'}
                                    </div>
                                    <div style={{
                                        fontSize: 11,
                                        color: '#FF6B00',
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: 500,
                                    }}>
                                        {profil?.role?.replace('_', ' ').toUpperCase() || 'STAFF'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bouton collapse */}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                width: '100%',
                                padding: '9px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.6)',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 16,
                                marginBottom: 6,
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            title={collapsed ? 'Agrandir' : 'Réduire'}
                        >
                            {collapsed ? '→' : '← Réduire'}
                        </button>

                        {/* ⭐ NOUVEAU : Bouton Site Public */}
                        <button
                            onClick={() => window.open('/', '_blank')}
                            style={{
                                width: '100%',
                                padding: '9px',
                                background: 'rgba(255,107,0,0.15)',
                                border: '1px solid rgba(255,107,0,0.3)',
                                color: '#FF6B00',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                                marginBottom: 6,
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,107,0,0.25)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,107,0,0.15)'}
                            title={collapsed ? 'Voir le site public' : ''}
                        >
                            🌐 {!collapsed && 'Site public'}
                        </button>

                        {/* Déconnexion */}
                        <button
                            onClick={handleDeconnexion}
                            style={{
                                width: '100%',
                                padding: '9px',
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                color: '#FCA5A5',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: collapsed ? 'center' : 'center',
                                gap: 6,
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            🚪 {!collapsed && 'Déconnexion'}
                        </button>
                    </div>
                </aside>

                {/* MAIN */}
                <div style={{
                    marginLeft: window.innerWidth > 768 ? sidebarWidth : 0,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    transition: 'margin-left 0.3s',
                }}>
                    {/* TOPBAR */}
                    <header style={{
                        height: 64,
                        background: 'var(--card, #fff)',
                        borderBottom: '1px solid var(--border, #E5E7EB)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 24px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 50,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <button
                                onClick={() => setMobileOpen(!mobileOpen)}
                                style={{
                                    display: window.innerWidth > 768 ? 'none' : 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40, height: 40,
                                    background: 'var(--gray-100)',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 20,
                                    cursor: 'pointer',
                                    color: 'var(--text)',
                                }}
                            >
                                ☰
                            </button>

                            <div>
                                <div style={{
                                    fontSize: 10,
                                    color: 'var(--text2)',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.8,
                                }}>
                                    {entreprise?.nom || 'NANA SERVICE'} PRO
                                </div>
                                <div style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: 'var(--text)',
                                }}>
                                    {MENU_ITEMS.flatMap(g => g.items).find(i => i.path === location.pathname)?.label || 'Dashboard'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* NOUVEAU : Bouton Site Public dans topbar */}
                            <button
                                onClick={() => window.open('/', '_blank')}
                                style={{
                                    padding: '9px 16px',
                                    border: '2px solid #FF6B00',
                                    borderRadius: 10,
                                    background: 'transparent',
                                    color: '#FF6B00',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = '#FF6B00';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#FF6B00';
                                }}
                                title="Voir le site comme un client"
                            >
                                🌐 Site public
                            </button>

                            {/* Statut connexion */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: 'var(--text2)',
                                padding: '6px 12px',
                                background: 'var(--gray-50)',
                                borderRadius: 20,
                                border: '1px solid var(--border)',
                            }}>
                                <div style={{
                                    width: 7, height: 7,
                                    borderRadius: '50%',
                                    background: '#10B981',
                                    boxShadow: '0 0 6px #10B981',
                                }} />
                                En ligne
                            </div>

                            {/* Notifications */}
                            <button style={{
                                width: 40, height: 40,
                                border: 'none',
                                borderRadius: 10,
                                background: 'var(--gray-100)',
                                cursor: 'pointer',
                                fontSize: 18,
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text)',
                                transition: 'background 0.2s',
                            }}>
                                🔔
                                {notifications.length > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: 4, right: 4,
                                        width: 16, height: 16,
                                        background: '#EF4444',
                                        borderRadius: '50%',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {notifications.length}
                                    </span>
                                )}
                            </button>

                            {/* Thème */}
                            <button
                                onClick={() => {
                                    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                                    document.documentElement.setAttribute('data-theme', t);
                                    localStorage.setItem('nsTheme', t);
                                }}
                                style={{
                                    width: 40, height: 40,
                                    border: 'none',
                                    borderRadius: 10,
                                    background: 'var(--gray-100)',
                                    cursor: 'pointer',
                                    fontSize: 18,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text)',
                                }}
                                title="Changer le thème"
                            >
                                🌙
                            </button>

                            {/* Avatar */}
                            <div
                                style={{
                                    width: 38, height: 38,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    cursor: 'pointer',
                                    border: '2px solid #FF6B00',
                                    color: 'white',
                                    fontWeight: 700,
                                }}
                                title={profil?.nom || 'Profil'}
                                onClick={() => navigate('/admin/parametres')}
                            >
                                {profil?.nom?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        </div>
                    </header>

                    {/* CONTENU */}
                    <main style={{
                        flex: 1,
                        padding: 24,
                        overflow: 'auto',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        <Outlet />
                    </main>

                    {/* Footer */}
                    <footer style={{
                        padding: '12px 24px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11,
                        color: 'var(--text2)',
                        background: 'var(--card)',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        <span>© 2026 {entreprise?.nom || 'NANA SERVICE'} — Tous droits réservés</span>
                        <span>NANA SERVICE PRO v1.0</span>
                    </footer>
                </div>
            </div>
        </ToastProvider>
    );
};

export default AdminLayout;