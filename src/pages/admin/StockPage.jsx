import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import { ajusterStock } from '../../services/produitService';
import { COLLECTIONS, PERMISSIONS } from '../../config/constants';

const StockPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [produits, setProduits]       = useState([]);
    const [mouvements, setMouvements]   = useState([]);
    const [loading, setLoading]         = useState(true);
    const [onglet, setOnglet]           = useState('stocks');
    const [recherche, setRecherche]     = useState('');
    const [filtreAlerte, setFiltreAlerte] = useState(false);

    const [modalAjust, setModalAjust]   = useState(false);
    const [produitAjust, setProduitAjust] = useState(null);
    const [ajustForm, setAjustForm]     = useState({ type: 'entree', quantite: '', motif: '' });
    const [loadingAjust, setLoadingAjust] = useState(false);

    const devise = entreprise?.devise || 'GNF';

    // Charger produits
    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.PRODUITS),
            where('actif', '==', true),
            where('gererStock', '==', true),
            orderBy('nom', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setProduits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Charger mouvements récents
    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.MOUVEMENTS),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setMouvements(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 100));
        });
        return () => unsub();
    }, []);

    // Stats stock
    const stockFaible     = produits.filter(p => (p.stockActuel || 0) <= (p.seuilAlerte || 5));
    const enRupture       = produits.filter(p => (p.stockActuel || 0) === 0);
    const valeurTotale    = produits.reduce((s, p) => s + (p.stockActuel || 0) * (p.prixAchat || 0), 0);
    const valeurVente     = produits.reduce((s, p) => s + (p.stockActuel || 0) * (p.prixVente || 0), 0);

    // Filtrer produits
    const produitsFiltres = produits.filter(p => {
        if (filtreAlerte && (p.stockActuel || 0) > (p.seuilAlerte || 5)) return false;
        if (recherche) {
            const t = recherche.toLowerCase();
            if (!(p.nom?.toLowerCase().includes(t) || p.reference?.toLowerCase().includes(t))) return false;
        }
        return true;
    });

    // Ajuster stock
    const handleAjuster = async () => {
        if (!ajustForm.quantite || parseFloat(ajustForm.quantite) <= 0) {
            toast.warning('Quantité requise');
            return;
        }
        setLoadingAjust(true);
        try {
            const res = await ajusterStock(
                produitAjust.id,
                parseFloat(ajustForm.quantite),
                ajustForm.type,
                { motif: ajustForm.motif, userId: profil?.uid }
            );
            toast.success(
                ajustForm.type === 'entree' ? '📦 Stock ajouté' : '📤 Stock retiré',
                `${produitAjust.nom} : ${res.avant} → ${res.apres} ${produitAjust.unite || ''}`
            );
            setModalAjust(false);
            setAjustForm({ type: 'entree', quantite: '', motif: '' });
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingAjust(false);
        }
    };

    const peutModifier = aPermission(PERMISSIONS.STOCK_MODIFIER);

    // Couleur niveau stock
    const couleurStock = (p) => {
        if ((p.stockActuel || 0) === 0) return '#EF4444';
        if ((p.stockActuel || 0) <= (p.seuilAlerte || 5)) return '#F59E0B';
        return '#10B981';
    };

    const pctStock = (p) => {
        const max = p.stockMax || 100;
        return Math.min(100, Math.round(((p.stockActuel || 0) / max) * 100));
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                    📦 Gestion du stock
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                    Suivi en temps réel des stocks et mouvements
                </p>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14, marginBottom: 24,
            }}>
                <StatCard icon="📦" label="Produits gérés" value={produits.length} couleur="primary" />
                <StatCard icon="⚠️" label="Stock faible"   value={stockFaible.length} couleur="warning" />
                <StatCard icon="❌" label="En rupture"      value={enRupture.length}   couleur="danger"  />
                <StatCard
                    icon="💰"
                    label="Valeur stock (achat)"
                    value={`${valeurTotale.toLocaleString('fr-FR')} ${devise}`}
                    couleur="success"
                />
                <StatCard
                    icon="📈"
                    label="Valeur stock (vente)"
                    value={`${valeurVente.toLocaleString('fr-FR')} ${devise}`}
                    couleur="info"
                />
            </div>

            {/* Onglets */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 20,
                background: 'var(--gray-100)', padding: 4,
                borderRadius: 12, border: '1px solid var(--border)',
                width: 'fit-content',
            }}>
                {[
                    { id: 'stocks',     label: '📦 Stocks'       },
                    { id: 'mouvements', label: '📋 Mouvements'   },
                    { id: 'alertes',    label: `⚠️ Alertes (${stockFaible.length})` },
                ].map(o => (
                    <button
                        key={o.id}
                        onClick={() => setOnglet(o.id)}
                        style={{
                            padding: '9px 18px', border: 'none', borderRadius: 10,
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: onglet === o.id ? 'var(--card)' : 'transparent',
                            color:      onglet === o.id ? '#0F2D6B' : 'var(--text2)',
                            boxShadow:  onglet === o.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        {o.label}
                    </button>
                ))}
            </div>

            {/* ─── ONGLET STOCKS ─── */}
            {onglet === 'stocks' && (
                <div>
                    {/* Filtres */}
                    <div style={{
                        display: 'flex', gap: 12, marginBottom: 16,
                        flexWrap: 'wrap', alignItems: 'center',
                    }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                            <input
                                type="search"
                                placeholder="Rechercher un produit..."
                                value={recherche}
                                onChange={e => setRecherche(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px 10px 40px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            padding: '10px 16px', background: filtreAlerte ? '#FEF3C7' : 'var(--card)',
                            border: `2px solid ${filtreAlerte ? '#F59E0B' : 'var(--border)'}`,
                            borderRadius: 10, color: filtreAlerte ? '#92400E' : 'var(--text2)',
                        }}>
                            <input
                                type="checkbox"
                                checked={filtreAlerte}
                                onChange={e => setFiltreAlerte(e.target.checked)}
                            />
                            ⚠️ Stock faible seulement
                        </label>
                    </div>

                    {/* Tableau */}
                    <div style={{
                        background: 'var(--card)', borderRadius: 14,
                        border: '1px solid var(--border)', overflow: 'hidden',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                    }}>
                        {loading ? (
                            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[1,2,3,4,5].map(i => <Skeleton key={i} height={60} borderRadius={8} />)}
                            </div>
                        ) : produitsFiltres.length === 0 ? (
                            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                                <div style={{ fontSize: 52, marginBottom: 12 }}>📦</div>
                                <p style={{ fontWeight: 600 }}>Aucun produit trouvé</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                            {['Produit', 'Référence', 'Stock actuel', 'Seuil alerte', 'Niveau', 'Valeur', 'Actions'].map(h => (
                                                <th key={h} style={{
                                                    padding: '12px 14px', fontSize: 11,
                                                    textAlign: 'left', fontWeight: 700,
                                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                                }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {produitsFiltres.map((p, i) => {
                                            const alert = (p.stockActuel || 0) <= (p.seuilAlerte || 5);
                                            const rupture = (p.stockActuel || 0) === 0;
                                            const pct = pctStock(p);
                                            const coul = couleurStock(p);

                                            return (
                                                <tr key={p.id} style={{
                                                    borderBottom: i < produitsFiltres.length - 1 ? '1px solid var(--border)' : 'none',
                                                    background: rupture ? 'rgba(239,68,68,0.04)' : alert ? 'rgba(245,158,11,0.04)' : 'transparent',
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                                onMouseOut={e => e.currentTarget.style.background = rupture ? 'rgba(239,68,68,0.04)' : alert ? 'rgba(245,158,11,0.04)' : 'transparent'}
                                                >
                                                    {/* Nom */}
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 38, height: 38, borderRadius: 8,
                                                                background: p.imageUrl ? 'transparent' : `${coul}20`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 18, overflow: 'hidden', flexShrink: 0,
                                                            }}>
                                                                {p.imageUrl
                                                                    ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    : p.emoji || '📦'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nom}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{p.categorie}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Ref */}
                                                    <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text2)' }}>
                                                        {p.reference || '—'}
                                                    </td>

                                                    {/* Stock */}
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{
                                                            fontWeight: 800, fontSize: 18,
                                                            color: coul,
                                                            display: 'flex', alignItems: 'center', gap: 6,
                                                        }}>
                                                            {rupture ? '🚫' : alert ? '⚠️' : ''}
                                                            {p.stockActuel || 0}
                                                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>
                                                                {p.unite || 'u'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Seuil */}
                                                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)' }}>
                                                        {p.seuilAlerte || 5} {p.unite || 'u'}
                                                    </td>

                                                    {/* Barre niveau */}
                                                    <td style={{ padding: '12px 14px', minWidth: 120 }}>
                                                        <div style={{ marginBottom: 4 }}>
                                                            <div style={{
                                                                background: 'var(--border)',
                                                                borderRadius: 10, height: 8, overflow: 'hidden',
                                                            }}>
                                                                <div style={{
                                                                    background: coul,
                                                                    height: '100%',
                                                                    width: `${pct}%`,
                                                                    borderRadius: 10,
                                                                    transition: 'width 0.5s',
                                                                }} />
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'right' }}>
                                                            {pct}%
                                                        </div>
                                                    </td>

                                                    {/* Valeur */}
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                                                            {((p.stockActuel || 0) * (p.prixVente || 0)).toLocaleString('fr-FR')} {devise}
                                                        </div>
                                                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                                                            achat: {((p.stockActuel || 0) * (p.prixAchat || 0)).toLocaleString('fr-FR')}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td style={{ padding: '12px 14px' }}>
                                                        {peutModifier && (
                                                            <button
                                                                onClick={() => {
                                                                    setProduitAjust(p);
                                                                    setAjustForm({ type: 'entree', quantite: '', motif: '' });
                                                                    setModalAjust(true);
                                                                }}
                                                                style={{
                                                                    padding: '7px 14px',
                                                                    background: 'rgba(15,45,107,0.08)',
                                                                    color: '#0F2D6B', border: 'none',
                                                                    borderRadius: 8, fontSize: 12,
                                                                    fontWeight: 700, cursor: 'pointer',
                                                                    fontFamily: 'Inter, sans-serif',
                                                                }}
                                                            >
                                                                ±  Ajuster
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── ONGLET MOUVEMENTS ─── */}
            {onglet === 'mouvements' && (
                <div style={{
                    background: 'var(--card)', borderRadius: 14,
                    border: '1px solid var(--border)', overflow: 'hidden',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['Date', 'Produit', 'Type', 'Quantité', 'Avant', 'Après', 'Motif'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 14px', fontSize: 11,
                                            textAlign: 'left', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {mouvements.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
                                            Aucun mouvement enregistré
                                        </td>
                                    </tr>
                                ) : mouvements.map((m, i) => {
                                    const typeConfig = {
                                        entree:           { label: '📦 Entrée',         couleur: '#10B981' },
                                        sortie:           { label: '📤 Sortie',          couleur: '#EF4444' },
                                        correction:       { label: '🔧 Correction',      couleur: '#F59E0B' },
                                        entree_initiale:  { label: '🆕 Initial',         couleur: '#3B82F6' },
                                        retour:           { label: '↩️ Retour',           couleur: '#8B5CF6' },
                                        transfert:        { label: '🔄 Transfert',        couleur: '#06B6D4' },
                                    };
                                    const tc = typeConfig[m.type] || { label: m.type, couleur: '#6B7280' };

                                    return (
                                        <tr key={m.id} style={{
                                            borderBottom: i < mouvements.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                                                {m.createdAt?.toDate
                                                    ? m.createdAt.toDate().toLocaleString('fr-FR', {
                                                        day: '2-digit', month: '2-digit',
                                                        hour: '2-digit', minute: '2-digit',
                                                      })
                                                    : '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>
                                                {m.produitNom || '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 20,
                                                    background: `${tc.couleur}18`,
                                                    color: tc.couleur,
                                                    fontSize: 12, fontWeight: 600,
                                                }}>
                                                    {tc.label}
                                                </span>
                                            </td>
                                            <td style={{
                                                padding: '10px 14px',
                                                fontWeight: 800, fontSize: 15,
                                                color: m.type === 'sortie' ? '#EF4444' : '#10B981',
                                            }}>
                                                {m.type === 'sortie' ? '-' : '+'}{m.quantite || 0}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 13 }}>
                                                {m.stockAvant ?? '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700 }}>
                                                {m.stockApres ?? '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                                                {m.motif || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── ONGLET ALERTES ─── */}
            {onglet === 'alertes' && (
                <div>
                    {stockFaible.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '80px 20px',
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)',
                        }}>
                            <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>
                                Tous les stocks sont au-dessus des seuils !
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {stockFaible.map(p => {
                                const rupture = (p.stockActuel || 0) === 0;
                                return (
                                    <div key={p.id} style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', gap: 16,
                                        padding: '16px 20px',
                                        background: rupture ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                                        border: `2px solid ${rupture ? '#EF4444' : '#F59E0B'}40`,
                                        borderRadius: 12, flexWrap: 'wrap',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ fontSize: 28 }}>{rupture ? '🚫' : '⚠️'}</div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nom}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                                    Ref: {p.reference} | {p.categorie}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 24, fontWeight: 900, color: rupture ? '#EF4444' : '#F59E0B' }}>
                                                    {p.stockActuel || 0}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text2)' }}>Stock actuel</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text2)' }}>
                                                    {p.seuilAlerte || 5}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text2)' }}>Seuil alerte</div>
                                            </div>
                                            {peutModifier && (
                                                <button
                                                    onClick={() => {
                                                        setProduitAjust(p);
                                                        setAjustForm({ type: 'entree', quantite: '', motif: 'Réapprovisionnement' });
                                                        setModalAjust(true);
                                                    }}
                                                    style={{
                                                        padding: '9px 18px',
                                                        background: '#0F2D6B', color: 'white',
                                                        border: 'none', borderRadius: 10,
                                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                                        fontFamily: 'Inter, sans-serif',
                                                    }}
                                                >
                                                    📦 Réapprovisionner
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL AJUSTEMENT */}
            <Modal
                isOpen={modalAjust}
                onClose={() => setModalAjust(false)}
                title={`📦 Ajuster stock — ${produitAjust?.nom || ''}`}
                size="sm"
                icon="📦"
                footer={
                    <>
                        <button
                            onClick={() => setModalAjust(false)}
                            style={{
                                padding: '10px 20px', border: '2px solid var(--border)',
                                borderRadius: 10, background: 'var(--card)', color: 'var(--text)',
                                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleAjuster}
                            disabled={loadingAjust}
                            style={{
                                padding: '10px 24px',
                                background: loadingAjust ? '#9CA3AF' : ajustForm.type === 'entree' ? '#10B981' : '#EF4444',
                                color: 'white', border: 'none', borderRadius: 10,
                                fontSize: 14, fontWeight: 700,
                                cursor: loadingAjust ? 'not-allowed' : 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {loadingAjust ? '⏳...' : ajustForm.type === 'entree' ? '📦 Ajouter' : '📤 Retirer'}
                        </button>
                    </>
                }
            >
                {produitAjust && (
                    <div>
                        {/* Stock actuel */}
                        <div style={{
                            textAlign: 'center', padding: 16,
                            background: 'var(--gray-50)', borderRadius: 12,
                            marginBottom: 20,
                        }}>
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Stock actuel</div>
                            <div style={{
                                fontSize: 36, fontWeight: 900,
                                color: couleurStock(produitAjust),
                            }}>
                                {produitAjust.stockActuel || 0}
                                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)', marginLeft: 6 }}>
                                    {produitAjust.unite || 'unité'}
                                </span>
                            </div>
                        </div>

                        {/* Type ajustement */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            {[
                                { val: 'entree',     label: '📦 Entrée',    bg: '#10B981' },
                                { val: 'sortie',     label: '📤 Sortie',    bg: '#EF4444' },
                                { val: 'correction', label: '🔧 Correction', bg: '#F59E0B' },
                            ].map(t => (
                                <button
                                    key={t.val}
                                    type="button"
                                    onClick={() => setAjustForm(p => ({ ...p, type: t.val }))}
                                    style={{
                                        flex: 1, padding: '10px',
                                        border: `2px solid ${ajustForm.type === t.val ? t.bg : 'var(--border)'}`,
                                        borderRadius: 10,
                                        background: ajustForm.type === t.val ? `${t.bg}15` : 'var(--card)',
                                        color: ajustForm.type === t.val ? t.bg : 'var(--text2)',
                                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                        fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Quantité */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Quantité *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={ajustForm.quantite}
                                onChange={e => setAjustForm(p => ({ ...p, quantite: e.target.value }))}
                                placeholder="0"
                                autoFocus
                                style={{
                                    width: '100%', padding: '14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 20, fontWeight: 700, textAlign: 'center',
                                    background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />

                            {/* Aperçu résultat */}
                            {ajustForm.quantite && (
                                <div style={{
                                    textAlign: 'center', marginTop: 8, fontSize: 13,
                                    color: 'var(--text2)', fontWeight: 500,
                                }}>
                                    Résultat : {produitAjust.stockActuel || 0}
                                    {ajustForm.type === 'sortie' ? ' - ' : ' + '}
                                    {ajustForm.quantite} ={' '}
                                    <strong style={{
                                        color: ajustForm.type === 'sortie'
                                            ? Math.max(0, (produitAjust.stockActuel || 0) - parseFloat(ajustForm.quantite)) <= (produitAjust.seuilAlerte || 5)
                                                ? '#EF4444' : '#10B981'
                                            : '#10B981'
                                    }}>
                                        {ajustForm.type === 'sortie'
                                            ? Math.max(0, (produitAjust.stockActuel || 0) - parseFloat(ajustForm.quantite))
                                            : (produitAjust.stockActuel || 0) + parseFloat(ajustForm.quantite || 0)
                                        } {produitAjust.unite || ''}
                                    </strong>
                                </div>
                            )}
                        </div>

                        {/* Motif */}
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Motif
                            </label>
                            <input
                                type="text"
                                value={ajustForm.motif}
                                onChange={e => setAjustForm(p => ({ ...p, motif: e.target.value }))}
                                placeholder="Ex: Réception fournisseur, Inventaire..."
                                list="motifs-list"
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                            <datalist id="motifs-list">
                                {['Réception fournisseur','Inventaire','Correction erreur','Vente directe','Retour client','Casse','Transfert boutique'].map(m => (
                                    <option key={m} value={m} />
                                ))}
                            </datalist>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StockPage;