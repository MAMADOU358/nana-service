import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useApp } from '../../contexts/AppContext';
import { COLLECTIONS } from '../../config/constants';

const CataloguePage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { entreprise, domainesVisibles } = useApp();

    const [produits, setProduits]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [recherche, setRecherche]       = useState('');
    const [filtreDomaineId, setFiltreDomaineId] = useState(searchParams.get('domaine') || '');
    const [filtreCategorie, setFiltreCategorie] = useState('');
    const [panier, setPanier]             = useState(() => {
        try { return JSON.parse(localStorage.getItem('nsPanier') || '[]'); } catch { return []; }
    });

    const devise = entreprise?.devise || 'GNF';

    // Charger produits visibles
    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.PRODUITS),
            where('actif', '==', true),
            where('visibleClient', '==', true),
            where('disponible', '!=', false),
            orderBy('disponible', 'desc'),
            orderBy('ordre', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setProduits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Filtrer produits
    const produitsFiltres = produits.filter(p => {
        if (filtreDomaineId && p.domaineId !== filtreDomaineId) return false;
        if (filtreCategorie && p.categorie !== filtreCategorie) return false;
        if (recherche) {
            const t = recherche.toLowerCase();
            if (!((p.nom || '').toLowerCase().includes(t) || (p.description || '').toLowerCase().includes(t))) return false;
        }
        return true;
    });

    // Catégories disponibles
    const categories = [...new Set(
        produits
            .filter(p => !filtreDomaineId || p.domaineId === filtreDomaineId)
            .map(p => p.categorie)
            .filter(Boolean)
    )];

    // Panier
    const ajouterAuPanier = (produit) => {
        const existant = panier.find(i => i.id === produit.id);
        let nvPanier;
        if (existant) {
            nvPanier = panier.map(i => i.id === produit.id ? { ...i, quantite: i.quantite + 1 } : i);
        } else {
            nvPanier = [...panier, {
                id: produit.id, nom: produit.nom,
                prix: produit.prixVente, quantite: 1,
                imageUrl: produit.imageUrl, emoji: produit.emoji,
                domaineId: produit.domaineId, domaineLabel: produit.domaineLabel,
            }];
        }
        setPanier(nvPanier);
        localStorage.setItem('nsPanier', JSON.stringify(nvPanier));
    };

    const nbPanier = panier.reduce((s, i) => s + i.quantite, 0);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        🛍️ Catalogue
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {produitsFiltres.length} produit{produitsFiltres.length > 1 ? 's' : ''} disponible{produitsFiltres.length > 1 ? 's' : ''}
                    </p>
                </div>
                {nbPanier > 0 && (
                    <button
                        onClick={() => navigate('/mon-espace/panier')}
                        style={{
                            padding: '12px 20px',
                            background: 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                            color: 'white', border: 'none', borderRadius: 12,
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 4px 14px rgba(255,107,0,0.3)',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        🛒 Panier ({nbPanier})
                    </button>
                )}
            </div>

            {/* Filtres */}
            <div style={{
                background: 'var(--card)', borderRadius: 14, padding: '16px 18px',
                border: '1px solid var(--border)', marginBottom: 24,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start',
            }}>
                {/* Recherche */}
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input
                        type="search"
                        placeholder="Rechercher un produit..."
                        value={recherche}
                        onChange={e => setRecherche(e.target.value)}
                        style={{
                            width: '100%', padding: '11px 14px 11px 40px',
                            border: '2px solid var(--border)', borderRadius: 10,
                            fontSize: 14, background: 'var(--bg)', color: 'var(--text)',
                            outline: 'none', fontFamily: 'Inter, sans-serif',
                        }}
                    />
                </div>

                {/* Filtres domaine */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase' }}>
                        Domaine
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                            onClick={() => { setFiltreDomaineId(''); setFiltreCategorie(''); }}
                            style={catBtnStyle(filtreDomaineId === '')}
                        >
                            Tous
                        </button>
                        {domainesVisibles.map(d => (
                            <button
                                key={d.id}
                                onClick={() => { setFiltreDomaineId(d.id); setFiltreCategorie(''); }}
                                style={{
                                    ...catBtnStyle(filtreDomaineId === d.id),
                                    background: filtreDomaineId === d.id ? d.couleur || '#0F2D6B' : 'var(--card)',
                                    borderColor: d.couleur || '#0F2D6B',
                                    color:       filtreDomaineId === d.id ? 'white' : 'var(--text2)',
                                }}
                            >
                                {d.emoji} {d.nom}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Catégories */}
                {categories.length > 0 && (
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase' }}>
                            Catégorie
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setFiltreCategorie('')}
                                style={catBtnStyle(filtreCategorie === '')}
                            >
                                Toutes
                            </button>
                            {categories.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setFiltreCategorie(c)}
                                    style={catBtnStyle(filtreCategorie === c)}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Grille produits */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} style={{ background: 'var(--card)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <div style={{ height: 180, background: 'var(--gray-100)', animation: 'shimmer 1.5s infinite' }} />
                            <div style={{ padding: 14 }}>
                                <div style={{ height: 16, background: 'var(--gray-100)', borderRadius: 6, marginBottom: 8 }} />
                                <div style={{ height: 12, background: 'var(--gray-100)', borderRadius: 6, width: '60%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : produitsFiltres.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text2)' }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
                    <p style={{ fontSize: 16, fontWeight: 600 }}>
                        {recherche ? `Aucun résultat pour "${recherche}"` : 'Aucun produit disponible'}
                    </p>
                    {(recherche || filtreDomaineId || filtreCategorie) && (
                        <button
                            onClick={() => { setRecherche(''); setFiltreDomaineId(''); setFiltreCategorie(''); }}
                            style={{
                                marginTop: 14, padding: '10px 20px',
                                background: '#0F2D6B', color: 'white',
                                border: 'none', borderRadius: 10, cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            ✕ Effacer les filtres
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 16 }}>
                    {produitsFiltres.map(p => {
                        const qteInPanier = panier.find(i => i.id === p.id)?.quantite || 0;
                        return (
                            <div
                                key={p.id}
                                style={{
                                    background: 'var(--card)', borderRadius: 14,
                                    overflow: 'hidden', border: '1px solid var(--border)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    transition: 'all 0.25s', display: 'flex', flexDirection: 'column',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
                                    e.currentTarget.style.borderColor = '#0F2D6B';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                            >
                                {/* Image */}
                                <div style={{
                                    height: 180, overflow: 'hidden',
                                    background: p.imageUrl ? 'transparent' : `linear-gradient(135deg, #0F2D6B, #1E4DB7)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 60, color: 'white', position: 'relative',
                                }}>
                                    {p.imageUrl
                                        ? <img src={p.imageUrl} alt={p.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : p.emoji || '📦'}

                                    {/* Badges */}
                                    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 5, flexDirection: 'column' }}>
                                        {p.populaire && (
                                            <span style={{
                                                background: '#FF6B00', color: 'white',
                                                padding: '3px 10px', borderRadius: 20,
                                                fontSize: 11, fontWeight: 700,
                                            }}>
                                                🔥 Populaire
                                            </span>
                                        )}
                                        {p.nouveau && (
                                            <span style={{
                                                background: '#3B82F6', color: 'white',
                                                padding: '3px 10px', borderRadius: 20,
                                                fontSize: 11, fontWeight: 700,
                                            }}>
                                                ✨ Nouveau
                                            </span>
                                        )}
                                    </div>

                                    {qteInPanier > 0 && (
                                        <div style={{
                                            position: 'absolute', top: 10, right: 10,
                                            background: '#10B981', color: 'white',
                                            width: 28, height: 28, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, fontWeight: 800,
                                        }}>
                                            {qteInPanier}
                                        </div>
                                    )}
                                </div>

                                {/* Contenu */}
                                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{
                                        fontSize: 11, color: '#FF6B00', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                                    }}>
                                        {p.categorie || p.domaineLabel}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, lineHeight: 1.3 }}>
                                        {p.nom}
                                    </div>
                                    {p.description && (
                                        <div style={{
                                            fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
                                            marginBottom: 12, flex: 1,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}>
                                            {p.description}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                        <div>
                                            <div style={{ fontWeight: 900, fontSize: 20, color: '#0F2D6B' }}>
                                                {p.prixVisibles !== false
                                                    ? `${(p.prixVente || 0).toLocaleString('fr-FR')} ${devise}`
                                                    : 'Sur devis'}
                                            </div>
                                            {p.temps && (
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>⏱️ {p.temps} min</div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => ajouterAuPanier(p)}
                                            style={{
                                                padding: '10px 16px',
                                                background: qteInPanier > 0
                                                    ? 'linear-gradient(135deg, #10B981, #059669)'
                                                    : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                                color: 'white', border: 'none', borderRadius: 10,
                                                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                fontFamily: 'Inter, sans-serif',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 3px 10px rgba(15,45,107,0.25)',
                                            }}
                                        >
                                            {qteInPanier > 0 ? `✓ ${qteInPanier} ajouté${qteInPanier > 1 ? 's' : ''}` : '🛒 Ajouter'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}`}</style>
        </div>
    );
};

const catBtnStyle = (active) => ({
    padding: '7px 14px',
    border: `2px solid ${active ? '#0F2D6B' : 'var(--border)'}`,
    borderRadius: 20, cursor: 'pointer',
    background: active ? '#0F2D6B' : 'var(--card)',
    color: active ? 'white' : 'var(--text2)',
    fontSize: 12, fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s', whiteSpace: 'nowrap',
});

export default CataloguePage;