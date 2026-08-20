import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { COLLECTIONS } from '../../config/constants';

const HomePage = () => {
    const navigate  = useNavigate();
    const { profil } = useAuth();
    const { entreprise, domainesVisibles } = useApp();

    const [dernCommandes, setDernCommandes] = useState([]);
    const [loading, setLoading]             = useState(true);

    useEffect(() => {
        const charger = async () => {
            try {
                const q = query(
                    collection(db, COLLECTIONS.COMMANDES),
                    where('clientId', '==', profil?.uid),
                    orderBy('createdAt', 'desc'),
                    limit(3)
                );
                const snap = await getDocs(q);
                setDernCommandes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch(e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (profil?.uid) charger();
    }, [profil]);

    const STATUTS_COLOR = {
        nouvelle:    '#3B82F6', confirmee: '#0F2D6B',
        preparation: '#F59E0B', prete:     '#10B981',
        livree:      '#06B6D4', terminee:  '#10B981',
        annulee:     '#EF4444',
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Hero accueil */}
            <div style={{
                background: 'linear-gradient(135deg, #0F2D6B 0%, #1E4DB7 50%, #FF6B00 100%)',
                borderRadius: 20, padding: '36px 32px',
                color: 'white', marginBottom: 32, position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', right: -30, top: -30,
                    width: 200, height: 200, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                }} />
                <div style={{
                    position: 'absolute', right: 40, bottom: -50,
                    width: 150, height: 150, borderRadius: '50%',
                    background: 'rgba(255,107,0,0.15)',
                }} />

                <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6, position: 'relative' }}>
                    👋 Bonjour, {profil?.prenom || profil?.nom || 'cher client'} !
                </h1>
                <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 24, position: 'relative' }}>
                    Bienvenue sur votre espace {entreprise?.nom || 'NANA SERVICE'}
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
                    <button
                        onClick={() => navigate('/mon-espace/catalogue')}
                        style={{
                            padding: '12px 24px',
                            background: '#FF6B00', color: 'white',
                            border: 'none', borderRadius: 12,
                            fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 4px 14px rgba(255,107,0,0.4)',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        🛍️ Parcourir le catalogue
                    </button>
                    <button
                        onClick={() => navigate('/mon-espace/commandes')}
                        style={{
                            padding: '12px 24px',
                            background: 'rgba(255,255,255,0.15)', color: 'white',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        📋 Mes commandes
                    </button>
                </div>
            </div>

            {/* Domaines visibles */}
            {domainesVisibles.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: 'var(--text)' }}>
                        🏢 Nos domaines de service
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 14,
                    }}>
                        {domainesVisibles.map(d => (
                            <div
                                key={d.id}
                                onClick={() => navigate(`/mon-espace/catalogue?domaine=${d.id}`)}
                                style={{
                                    background: 'var(--card)', borderRadius: 14,
                                    overflow: 'hidden', cursor: 'pointer',
                                    border: '2px solid transparent',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.06)',
                                    transition: 'all 0.25s',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.borderColor = d.couleur || '#0F2D6B';
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.06)';
                                }}
                            >
                                <div style={{
                                    background: `linear-gradient(135deg, ${d.couleur || '#0F2D6B'}, ${d.couleur || '#0F2D6B'}aa)`,
                                    padding: '20px', textAlign: 'center', color: 'white',
                                }}>
                                    <div style={{ fontSize: 40, marginBottom: 6 }}>
                                        {d.logo
                                            ? <img src={d.logo} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 10 }} />
                                            : d.emoji || '🏪'}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 15 }}>{d.nom}</div>
                                    {d.slogan && (
                                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{d.slogan}</div>
                                    )}
                                </div>
                                {d.description && (
                                    <div style={{
                                        padding: '12px 14px', fontSize: 12,
                                        color: 'var(--text2)', lineHeight: 1.5,
                                        borderTop: '1px solid var(--border)',
                                    }}>
                                        {d.description.substring(0, 80)}{d.description.length > 80 ? '...' : ''}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dernières commandes */}
            {!loading && dernCommandes.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                            📋 Dernières commandes
                        </h2>
                        <button
                            onClick={() => navigate('/mon-espace/commandes')}
                            style={{
                                fontSize: 13, color: '#FF6B00', background: 'none',
                                border: 'none', cursor: 'pointer', fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            Voir tout →
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dernCommandes.map(cmd => (
                            <div
                                key={cmd.id}
                                onClick={() => navigate('/mon-espace/commandes')}
                                style={{
                                    background: 'var(--card)', borderRadius: 14,
                                    padding: '16px 20px', cursor: 'pointer',
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', flexWrap: 'wrap', gap: 12,
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'}
                            >
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0F2D6B', marginBottom: 3 }}>
                                        {cmd.numero}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                        {(cmd.lignes?.length || 0)} article{(cmd.lignes?.length || 0) > 1 ? 's' : ''} —
                                        {cmd.createdAt?.toDate?.().toLocaleDateString('fr-FR') || '—'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ fontWeight: 800, fontSize: 15 }}>
                                        {(cmd.montantTotal || 0).toLocaleString('fr-FR')} {entreprise?.devise || 'GNF'}
                                    </div>
                                    <span style={{
                                        padding: '5px 12px', borderRadius: 20,
                                        fontSize: 12, fontWeight: 600,
                                        background: `${STATUTS_COLOR[cmd.statut] || '#6B7280'}18`,
                                        color: STATUTS_COLOR[cmd.statut] || '#6B7280',
                                    }}>
                                        {cmd.statut}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contact rapide */}
            <div style={{
                marginTop: 32, padding: '24px 28px',
                background: 'linear-gradient(135deg, rgba(15,45,107,0.05), rgba(255,107,0,0.05))',
                borderRadius: 16, border: '1px solid rgba(15,45,107,0.1)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}>
                <div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                        📞 Besoin d'aide ?
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                        Notre équipe est disponible pour vous accompagner
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {entreprise?.telephone && (
                        <a
                            href={`tel:${entreprise.telephone.replace(/\s/g,'')}`}
                            style={{
                                padding: '10px 18px',
                                background: '#10B981', color: 'white',
                                borderRadius: 10, textDecoration: 'none',
                                fontSize: 13, fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            📞 Appeler
                        </a>
                    )}
                    {entreprise?.whatsapp && (
                        <a
                            href={`https://wa.me/${entreprise.whatsapp.replace(/[^0-9]/g,'')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                padding: '10px 18px',
                                background: '#25D366', color: 'white',
                                borderRadius: 10, textDecoration: 'none',
                                fontSize: 13, fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            💬 WhatsApp
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;