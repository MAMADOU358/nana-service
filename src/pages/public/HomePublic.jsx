import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useApp } from '../../contexts/AppContext';
import { COLLECTIONS } from '../../config/constants';

const HomePublic = () => {
    const navigate = useNavigate();
    const { entreprise, domainesVisibles } = useApp();
    const [produitsPop, setProduitsPop] = useState([]);

    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.PRODUITS),
            where('actif',        '==', true),
            where('visibleClient','==', true),
            where('populaire',    '==', true),
            limit(6)
        );
        const unsub = onSnapshot(q, snap => {
            setProduitsPop(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const devise = entreprise?.devise || 'GNF';
    const nbPanier = (() => {
        try { return JSON.parse(localStorage.getItem('nsPanier')||'[]').reduce((s,i)=>s+i.quantite,0); }
        catch { return 0; }
    })();

    return (
        <div style={{ minHeight:'100vh', fontFamily:'Inter, sans-serif', background:'#F8FAFC' }}>

            {/* HEADER */}
            <header style={{
                background:'#FFFFFF', borderBottom:'1px solid #E5E7EB',
                position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
            }}>
                <div style={{
                    maxWidth:1200, margin:'0 auto', padding:'14px 20px',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                    {/* Logo */}
                    <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => navigate('/')}>
                        <div style={{
                            width:44, height:44, borderRadius:12,
                            background:'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'white',
                        }}>
                            {entreprise?.logo
                                ? <img src={entreprise.logo} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:10}}/>
                                : '🏪'}
                        </div>
                        <div>
                            <div style={{ fontWeight:900, fontSize:18, color:'#0F2D6B' }}>
                                {entreprise?.nom || 'NANA SERVICE'}
                            </div>
                            <div style={{ fontSize:10, color:'#FF6B00', fontWeight:700, letterSpacing:1 }}>
                                {entreprise?.slogan || 'Votre partenaire de confiance'}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                        <button
                            onClick={() => navigate('/catalogue')}
                            style={btnHeaderStyle('#0F2D6B', true)}
                        >
                            🛍️ Catalogue
                        </button>
                        <button
                            onClick={() => navigate('/panier-public')}
                            style={{ ...btnHeaderStyle('#FF6B00', true), position:'relative' }}
                        >
                            🛒 Panier
                            {nbPanier > 0 && (
                                <span style={{
                                    position:'absolute', top:-6, right:-6,
                                    width:22, height:22, background:'#EF4444',
                                    color:'white', borderRadius:'50%',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:11, fontWeight:800,
                                }}>
                                    {nbPanier}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => navigate('/inscription')}
                            style={btnHeaderStyle('#10B981', false)}
                        >
                            📝 Inscription
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            style={btnHeaderStyle('#0F2D6B', false)}
                        >
                            🔐 Connexion
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section style={{
                background:'linear-gradient(135deg, #0F2D6B 0%, #1E4DB7 50%, #FF6B00 100%)',
                color:'white', padding:'80px 20px', textAlign:'center',
                position:'relative', overflow:'hidden',
            }}>
                <div style={{
                    position:'absolute', top:-50, right:-50,
                    width:300, height:300, borderRadius:'50%',
                    background:'rgba(255,255,255,0.05)',
                }}/>
                <div style={{
                    position:'absolute', bottom:-100, left:-100,
                    width:400, height:400, borderRadius:'50%',
                    background:'rgba(255,107,0,0.1)',
                }}/>

                <div style={{ maxWidth:800, margin:'0 auto', position:'relative' }}>
                    <div style={{
                        display:'inline-block', padding:'8px 18px',
                        background:'rgba(255,255,255,0.15)', borderRadius:30,
                        fontSize:12, fontWeight:700, marginBottom:20,
                        backdropFilter:'blur(10px)',
                    }}>
                        ⭐ VOTRE PARTENAIRE DE CONFIANCE
                    </div>
                    <h1 style={{ fontSize:'clamp(28px, 5vw, 52px)', fontWeight:900, marginBottom:16, lineHeight:1.1 }}>
                        Bienvenue chez<br/>
                        <span style={{ color:'#FF6B00' }}>{entreprise?.nom || 'NANA SERVICE'}</span>
                    </h1>
                    <p style={{ fontSize:'clamp(14px, 2vw, 18px)', opacity:0.9, marginBottom:32, lineHeight:1.6, maxWidth:600, margin:'0 auto 32px' }}>
                        {entreprise?.description || 'Découvrez notre gamme complète de produits et services professionnels'}
                    </p>
                    <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
                        <button
                            onClick={() => navigate('/catalogue')}
                            style={{
                                padding:'16px 32px', background:'#FF6B00',
                                color:'white', border:'none', borderRadius:12,
                                fontSize:16, fontWeight:800, cursor:'pointer',
                                boxShadow:'0 8px 24px rgba(255,107,0,0.4)',
                                display:'flex', alignItems:'center', gap:8,
                                fontFamily:'Inter, sans-serif',
                            }}
                        >
                            🛍️ Découvrir nos produits
                        </button>
                        {entreprise?.whatsapp && (
                            <a
                                href={`https://wa.me/${entreprise.whatsapp.replace(/[^0-9]/g,'')}`}
                                target="_blank" rel="noreferrer"
                                style={{
                                    padding:'16px 32px', background:'#25D366',
                                    color:'white', textDecoration:'none', borderRadius:12,
                                    fontSize:16, fontWeight:800,
                                    boxShadow:'0 8px 24px rgba(37,211,102,0.4)',
                                    display:'flex', alignItems:'center', gap:8,
                                }}
                            >
                                💬 WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* NOS SERVICES / DOMAINES */}
            {domainesVisibles.length > 0 && (
                <section style={{ padding:'80px 20px', maxWidth:1200, margin:'0 auto' }}>
                    <div style={{ textAlign:'center', marginBottom:48 }}>
                        <div style={{
                            display:'inline-block', padding:'6px 14px',
                            background:'rgba(255,107,0,0.1)', color:'#FF6B00',
                            borderRadius:20, fontSize:12, fontWeight:700, marginBottom:12,
                        }}>
                            NOS SERVICES
                        </div>
                        <h2 style={{ fontSize:32, fontWeight:900, color:'#0F2D6B', marginBottom:10 }}>
                            Nos domaines d'expertise
                        </h2>
                        <p style={{ color:'#6B7280', fontSize:15 }}>
                            Découvrez nos différents services professionnels
                        </p>
                    </div>

                    <div style={{
                        display:'grid',
                        gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
                        gap:20,
                    }}>
                        {domainesVisibles.map(d => (
                            <div
                                key={d.id}
                                onClick={() => navigate(`/catalogue?domaine=${d.id}`)}
                                style={{
                                    background:'white', borderRadius:16,
                                    overflow:'hidden', cursor:'pointer',
                                    border:'2px solid transparent',
                                    boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
                                    transition:'all 0.3s',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.borderColor = d.couleur || '#0F2D6B';
                                    e.currentTarget.style.boxShadow = '0 16px 32px rgba(0,0,0,0.15)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                }}
                            >
                                <div style={{
                                    background:`linear-gradient(135deg, ${d.couleur || '#0F2D6B'}, ${d.couleur || '#0F2D6B'}cc)`,
                                    padding:'32px 20px', textAlign:'center', color:'white',
                                }}>
                                    <div style={{ fontSize:52, marginBottom:12 }}>
                                        {d.logo
                                            ? <img src={d.logo} alt="" style={{width:56,height:56,objectFit:'cover',borderRadius:12}}/>
                                            : d.emoji || '🏪'}
                                    </div>
                                    <div style={{ fontWeight:800, fontSize:18, marginBottom:6 }}>{d.nom}</div>
                                    {d.slogan && (
                                        <div style={{ fontSize:12, opacity:0.85 }}>{d.slogan}</div>
                                    )}
                                </div>
                                {d.description && (
                                    <div style={{ padding:'16px 20px', fontSize:13, color:'#6B7280', lineHeight:1.6 }}>
                                        {d.description.substring(0, 100)}{d.description.length > 100 ? '...' : ''}
                                    </div>
                                )}
                                <div style={{
                                    padding:'12px 20px', borderTop:'1px solid #E5E7EB',
                                    color:d.couleur || '#0F2D6B', fontWeight:700, fontSize:13,
                                    display:'flex', alignItems:'center', justifyContent:'space-between',
                                }}>
                                    <span>Explorer</span>
                                    <span>→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* PRODUITS POPULAIRES */}
            {produitsPop.length > 0 && (
                <section style={{ padding:'0 20px 80px', maxWidth:1200, margin:'0 auto' }}>
                    <div style={{ textAlign:'center', marginBottom:48 }}>
                        <div style={{
                            display:'inline-block', padding:'6px 14px',
                            background:'rgba(255,107,0,0.1)', color:'#FF6B00',
                            borderRadius:20, fontSize:12, fontWeight:700, marginBottom:12,
                        }}>
                            🔥 TENDANCES
                        </div>
                        <h2 style={{ fontSize:32, fontWeight:900, color:'#0F2D6B', marginBottom:10 }}>
                            Produits populaires
                        </h2>
                        <p style={{ color:'#6B7280', fontSize:15 }}>
                            Les produits les plus appréciés par nos clients
                        </p>
                    </div>

                    <div style={{
                        display:'grid',
                        gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))',
                        gap:20,
                    }}>
                        {produitsPop.map(p => (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/produit/${p.id}`)}
                                style={{
                                    background:'white', borderRadius:14,
                                    overflow:'hidden', cursor:'pointer',
                                    border:'1px solid #E5E7EB',
                                    transition:'all 0.3s',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    height:180, overflow:'hidden',
                                    background: p.imageUrl ? 'transparent' : 'linear-gradient(135deg,#0F2D6B,#1E4DB7)',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:60, color:'white',
                                }}>
                                    {p.imageUrl
                                        ? <img src={p.imageUrl} alt={p.nom} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                        : p.emoji || '📦'}
                                </div>
                                <div style={{ padding:16 }}>
                                    <div style={{
                                        fontSize:11, color:'#FF6B00', fontWeight:700,
                                        textTransform:'uppercase', marginBottom:4,
                                    }}>
                                        {p.categorie}
                                    </div>
                                    <div style={{ fontWeight:800, fontSize:15, marginBottom:6 }}>
                                        {p.nom}
                                    </div>
                                    <div style={{ fontWeight:900, fontSize:20, color:'#0F2D6B' }}>
                                        {(p.prixVente || 0).toLocaleString('fr-FR')} {devise}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign:'center', marginTop:40 }}>
                        <button
                            onClick={() => navigate('/catalogue')}
                            style={{
                                padding:'14px 32px', background:'#0F2D6B',
                                color:'white', border:'none', borderRadius:12,
                                fontSize:15, fontWeight:800, cursor:'pointer',
                                display:'inline-flex', alignItems:'center', gap:8,
                                fontFamily:'Inter, sans-serif',
                            }}
                        >
                            🛍️ Voir tout le catalogue
                        </button>
                    </div>
                </section>
            )}

            {/* CONTACT */}
            <section style={{
                background:'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                padding:'60px 20px', color:'white', textAlign:'center',
            }}>
                <div style={{ maxWidth:800, margin:'0 auto' }}>
                    <h2 style={{ fontSize:28, fontWeight:900, marginBottom:14 }}>
                        📞 Besoin d'aide ?
                    </h2>
                    <p style={{ opacity:0.85, marginBottom:24, fontSize:15 }}>
                        Notre équipe est à votre disposition pour vous conseiller
                    </p>
                    <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                        {entreprise?.telephone && (
                            <a
                                href={`tel:${entreprise.telephone.replace(/\s/g,'')}`}
                                style={{
                                    padding:'14px 24px', background:'#10B981',
                                    color:'white', textDecoration:'none', borderRadius:12,
                                    fontSize:15, fontWeight:700,
                                    display:'flex', alignItems:'center', gap:8,
                                }}
                            >
                                📞 Appeler {entreprise.telephone}
                            </a>
                        )}
                        {entreprise?.whatsapp && (
                            <a
                                href={`https://wa.me/${entreprise.whatsapp.replace(/[^0-9]/g,'')}`}
                                target="_blank" rel="noreferrer"
                                style={{
                                    padding:'14px 24px', background:'#25D366',
                                    color:'white', textDecoration:'none', borderRadius:12,
                                    fontSize:15, fontWeight:700,
                                    display:'flex', alignItems:'center', gap:8,
                                }}
                            >
                                💬 WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ background:'#0A1F4E', color:'rgba(255,255,255,0.6)', padding:'30px 20px', textAlign:'center', fontSize:12 }}>
                <div style={{ marginBottom:6, color:'#FF6B00', fontWeight:800, fontSize:15 }}>
                    {entreprise?.nom || 'NANA SERVICE'}
                </div>
                <div>{entreprise?.adresse}</div>
                <div style={{ marginTop:8 }}>
                    © {new Date().getFullYear()} — Tous droits réservés
                </div>
            </footer>
        </div>
    );
};

const btnHeaderStyle = (color, filled) => ({
    padding: '9px 16px',
    background: filled ? color : 'transparent',
    color: filled ? 'white' : color,
    border: `2px solid ${color}`,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s',
    fontFamily: 'Inter, sans-serif',
});

export default HomePublic;