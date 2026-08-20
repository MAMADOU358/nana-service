import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PanierFlottant = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [nbItems, setNbItems] = useState(0);
    const [total, setTotal]     = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const updateCart = () => {
            try {
                const panier = JSON.parse(localStorage.getItem('nsPanier') || '[]');
                const nb  = panier.reduce((s, i) => s + (i.quantite || 0), 0);
                const tot = panier.reduce((s, i) => s + ((i.prix || 0) * (i.quantite || 0)), 0);
                setNbItems(nb);
                setTotal(tot);
                setVisible(nb > 0);
            } catch (e) {
                setNbItems(0);
                setVisible(false);
            }
        };

        updateCart();
        window.addEventListener('storage', updateCart);
        const interval = setInterval(updateCart, 1000);

        return () => {
            window.removeEventListener('storage', updateCart);
            clearInterval(interval);
        };
    }, [location]);

    // Ne pas afficher sur ces pages
    const pagesCachees = ['/login', '/inscription', '/reset-password', '/panier-public'];
    const surAdmin = location.pathname.startsWith('/admin');

    if (!visible || pagesCachees.includes(location.pathname) || surAdmin) {
        return null;
    }

    return (
        <button
            onClick={() => navigate('/panier-public')}
            style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 9999,
                padding: '14px 22px',
                background: 'linear-gradient(135deg, #FF6B00, #F59E0B)',
                color: 'white',
                border: 'none',
                borderRadius: 30,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 8px 30px rgba(255,107,0,0.5)',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.3s',
                animation: 'bouncePanier 2s infinite',
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,107,0,0.6)';
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,107,0,0.5)';
            }}
        >
            <span style={{
                background: 'white',
                color: '#FF6B00',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 900,
            }}>
                {nbItems}
            </span>
            <span>🛒 Panier</span>
            <span style={{
                background: 'rgba(255,255,255,0.25)',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
            }}>
                {total.toLocaleString('fr-FR')} GNF
            </span>

            <style>{`
                @keyframes bouncePanier {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </button>
    );
};

export default PanierFlottant;