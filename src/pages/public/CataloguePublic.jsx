import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useApp } from '../../contexts/AppContext';
import { COLLECTIONS } from '../../config/constants';

const CataloguePublic = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { entreprise, domainesVisibles } = useApp();

    const [produits, setProduits]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [recherche, setRecherche] = useState('');
    const [filtreDomaine, setFiltreDomaine] = useState(searchParams.get('domaine') || '');
    const [filtreCateg, setFiltreCateg]     = useState('');
    const [panier, setPanier] = useState(() => {
        try { return JSON.parse(localStorage.getItem('nsPanier') || '[]'); } catch { return []; }
    });

    const devise = entreprise?.devise || 'GNF';

    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.PRODUITS),
            where('actif', '==', true),
            where('visibleClient', '==', true),
            orderBy('nom', 'asc')
        );
        const unsub = onSnapshot(q, snap => {
            setProduits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const produitsFiltres = produits.filter(p => {
        if (filtreDomaine && p.domaineId !== filtreDomaine) return false;
        if (filtreCateg && p.categorie !== filtreCateg) return false;
        if (recherche) {
            const t = recherche.toLowerCase();
            if (!((p.nom||'').toLowerCase().includes(t) || (p.description||'').toLowerCase().includes(t))) return false;
        }
        return true;
    });

    const categories = [...new Set(produits
        .filter(p => !filtreDomaine || p.domaineId === filtreDomaine)
        .map(p => p.categorie).filter(Boolean))];

    const ajouterAuPanier = (p) => {
        const ex = panier.find(i => i.id === p.id);
        const nv = ex
            ? panier.map(i => i.id === p.id ? { ...i, quantite: i.quantite + 1 } : i)
            : [...panier, {
                id: p.id, nom: p.nom, prix: p.prixVente, quantite: 1,
                imageUrl: p.imageUrl, emoji: p.emoji,
                domaineId: p.domaineId, domaineLabel: p.domaineLabel,
              }];
        setPanier(nv);
        localStorage.setItem('nsPanier', JSON.stringify(nv));
    };

    const nbPanier = panier.reduce((s, i) => s + i.quantite, 0);

    return (
        <div style={{ minHeight:'100vh', fontFamily:'Inter, sans-serif', background:'#F8FAFC' }}>
            {/* Header */}
            <header style={{
                background:'#FFFFFF', borderBottom:'1px solid #E5E7EB',
                position:'sticky', top:0, zIndex:100,
            }}>
                <div style={{ maxWidth:1200, margin:'0 auto', padding:'14px 20px',
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => navigate('/')}>
                        <div style={{
                            width:40, height:40, borderRadius:10,
                            background:'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'white',
                        }}>🏪</div>
                        <div style={{ fontWeight:900, fontSize:16, color:'#0F2D6B' }}>
                            {entreprise?.nom || 'NANA SERVICE'}
                        </div>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                        <button onClick={() => navigate('/')} style={btnStyle('#6B7280')}>← Accueil</button>
                        <button onClick={() => navigate('/panier-public')} style={{ ...btnStyle('#FF6B00'), position:'relative' }}>
                            🛒 Panier
                            {nbPanier > 0 && (
                                <span style={{
                                    position:'absolute', top:-6, right:-6,
                                    width:22, height:22, background:'#EF4444', color:'white',
                                    borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:11, fontWeight:800,
                                }}>
                                    {nbPanier}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth:1200, margin:'0 auto', padding:'30px 20px' }}>
                {/* Titre */}
                <div style={{ marginBottom:24 }}>
                    <h1 style={{ fontSize:32, fontWeight:900, color:'#0F2D6B', marginBottom:6 }}>
                        🛍️ Notre catalogue
                    </h1>
                    <p style={{ color:'#6B7280', fontSize:14 }}>
                        {produitsFiltres.length} produit{produitsFiltres.length > 1 ? 's' : ''} disponible{produitsFiltres.length > 1 ? 's' : ''}
                    </p>
                </div>

                {/* Filtres */}
                <div style={{
                    background:'white', borderRadius:14, padding:16,
                    border:'1px solid #E5E7EB', marginBottom:24,
                }}>
                    <div style={{ position:'relative', marginBottom:14 }}>
                        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔍</span>
                        <input
                            type="search"
                            placeholder="Rechercher un produit..."
                            value={recherche}
                            onChange={e => setRecherche(e.target.value)}
                            style={{
                                width:'100%', padding:'12px 14px 12px 42px',
                                border:'2px solid #E5E7EB', borderRadius:10, fontSize:14,
                                outline:'none', fontFamily:'Inter, sans-serif',
                            }}
                        />
                    </div>

                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:categories.length > 0 ? 12 : 0 }}>
                        <button
                            onClick={() => { setFiltreDomaine(''); setFiltreCateg(''); }}
                            style={filterBtnStyle(filtreDomaine === '')}
                        >
                            Tous les domaines
                        </button>
                        {domainesVisibles.map(d => (
                            <button
                                key={d.id}
                                onClick={() => { setFiltreDomaine(d.id); setFiltreCateg(''); }}
                                style={{
                                    ...filterBtnStyle(filtreDomaine === d.id),
                                    borderColor: d.couleur || '#0F2D6B',
                                    background: filtreDomaine === d.id ? d.couleur || '#0F2D6B' : 'white',
                                    color: filtreDomaine === d.id ? 'white' : d.couleur || '#0F2D6B',
                                }}
                            >
                                {d.emoji} {d.nom}
                            </button>
                        ))}
                    </div>

                    {categories.length > 0 && (
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            <button onClick={() => setFiltreCateg('')} style={filterBtnStyle(filtreCateg === '')}>
                                Toutes catégories
                            </button>
                            {categories.map(c => (
                                <button key={c} onClick={() => setFiltreCateg(c)} style={filterBtnStyle(filtreCateg === c)}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Grille produits */}
                {loading ? (
                    <div style={{ textAlign:'center', padding:80, color:'#6B7280' }}>Chargement...</div>
                ) : produitsFiltres.length === 0 ? (
                    <div style={{ textAlign:'center', padding:80 }}>
                        <div style={{ fontSize:60, marginBottom:16 }}>🔍</div>
                        <p style={{ fontSize:16, fontWeight:600, color:'#6B7280' }}>
                            Aucun produit trouvé
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display:'grid',
                        gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))',
                        gap:20,
                    }}>
                        {produitsFiltres.map(p => {
                            const qte = panier.find(i => i.id === p.id)?.quantite || 0;
                            return (
                                <div key={p.id} style={{
                                    background:'white', borderRadius:14, overflow:'hidden',
                                    border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
                                    display:'flex', flexDirection:'column',
                                }}>
                                    <div
    style={{
        height: 180,
        background: p.imageUrl ? 'transparent' : 'linear-gradient(135deg,#0F2D6B,#1E4DB7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 60, color: 'white',
    }}
>
    {p.imageUrl
        ? <img src={p.imageUrl} alt={p.nom} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        : p.emoji || '📦'}
</div>
                                    <div style={{ padding:'14px 16px', flex:1, display:'flex', flexDirection:'column' }}>
                                        <div style={{ fontSize:11, color:'#FF6B00', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>
                                            {p.categorie || p.domaineLabel}
                                        </div>
                                       <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
    {p.nom}
</div>
                                        <div style={{ flex:1 }}/>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                                            <div style={{ fontWeight:900, fontSize:18, color:'#0F2D6B' }}>
                                                {(p.prixVente || 0).toLocaleString('fr-FR')} {devise}
                                            </div>
                                            <button
                                                onClick={() => ajouterAuPanier(p)}
                                                style={{
                                                    padding:'8px 14px',
                                                    background: qte > 0
                                                        ? 'linear-gradient(135deg,#10B981,#059669)'
                                                        : 'linear-gradient(135deg,#0F2D6B,#1E4DB7)',
                                                    color:'white', border:'none', borderRadius:10,
                                                    fontSize:12, fontWeight:700, cursor:'pointer',
                                                    fontFamily:'Inter, sans-serif',
                                                }}
                                            >
                                                {qte > 0 ? `✓ ${qte}` : '🛒 Ajouter'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const btnStyle = (color) => ({
    padding: '9px 16px', background: color, color: 'white',
    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    display: 'flex', alignItems: 'center', gap: 6,
});

const filterBtnStyle = (active) => ({
    padding: '7px 14px',
    border: `2px solid ${active ? '#0F2D6B' : '#E5E7EB'}`,
    borderRadius: 20, cursor: 'pointer',
    background: active ? '#0F2D6B' : 'white',
    color: active ? 'white' : '#6B7280',
    fontSize: 12, fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
});

export default CataloguePublic;