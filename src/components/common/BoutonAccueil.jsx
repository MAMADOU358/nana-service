import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BoutonAccueil = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Ne pas afficher sur ces pages
    const pagesCachees = ['/', '/login', '/inscription', '/reset-password'];
    const surAdmin = location.pathname.startsWith('/admin');

    if (pagesCachees.includes(location.pathname) || surAdmin) {
        return null;
    }

    return (
        <button
            onClick={() => navigate('/')}
            style={{
                position: 'fixed',
                bottom: 24,
                left: 24,
                zIndex: 9999,
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                color: 'white',
                border: 'none',
                borderRadius: 30,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 6px 20px rgba(15,45,107,0.4)',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.3s',
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(15,45,107,0.5)';
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,45,107,0.4)';
            }}
        >
            🏠 Accueil
        </button>
    );
};

export default BoutonAccueil;