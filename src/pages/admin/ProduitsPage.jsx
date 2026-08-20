import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Loader';
import {
    ecouterProduits, creerProduit,
    mettreAJourProduit, archiverProduit
} from '../../services/produitService';
import { uploaderImageProduit } from '../../services/uploadService';
import { PERMISSIONS } from '../../config/constants';

const ProduitsPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise, domaines } = useApp();
    const toast = useToast();

    const [produits, setProduits]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [recherche, setRecherche]   = useState('');
    const [filtreCateg, setFiltreCateg] = useState('');
    const [filtreActive, setFiltreActive] = useState('actif');

    // Modals
    const [modalForm, setModalForm]         = useState(false);
    const [modalConfirm, setModalConfirm]   = useState(false);
    const [produitEdite, setProduitEdite]   = useState(null);
    const [produitSuppr, setProduitSuppr]   = useState(null);
    const [loadingForm, setLoadingForm]     = useState(false);
    const [loadingImg, setLoadingImg]       = useState(false);

    // Form
    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            nom: '', reference: '', description: '', descriptionCourte: '',
            categorie: '', domaineId: '', boutiqueId: '',
            prixAchat: '', prixVente: '', prixPromo: '',
            stockActuel: '', seuilAlerte: '5', unite: 'unité',
            images: [], imageUrl: '',
            actif: true, visibleClient: true, gererStock: true,
            aVariantes: false, notes: '',
        };
    }

    // Charger produits
    useEffect(() => {
        const filtres = {};
        if (filtreActive === 'actif')   filtres.actif   = true;
        if (filtreActive === 'archive') filtres.archive = true;

        const unsub = ecouterProduits((data) => {
            setProduits(data);
            setLoading(false);
        }, filtres);

        return () => unsub();
    }, [filtreActive]);

    // Produits filtrés
    const produitsFiltres = produits.filter(p => {
        if (recherche) {
            const t = recherche.toLowerCase();
            if (!(p.nom?.toLowerCase().includes(t) ||
                  p.reference?.toLowerCase().includes(t) ||
                  p.categorie?.toLowerCase().includes(t))) return false;
        }
        if (filtreCateg && p.categorie !== filtreCateg) return false;
        return true;
    });

    // Catégories uniques
    const categories = [...new Set(produits.map(p => p.categorie).filter(Boolean))];

    // Ouvrir formulaire
    const ouvrirForm = (produit = null) => {
        if (produit) {
            setProduitEdite(produit);
            setForm({
                nom:             produit.nom || '',
                reference:       produit.reference || '',
                description:     produit.description || '',
                descriptionCourte: produit.descriptionCourte || '',
                categorie:       produit.categorie || '',
                domaineId:       produit.domaineId || '',
                boutiqueId:      produit.boutiqueId || '',
                prixAchat:       produit.prixAchat || '',
                prixVente:       produit.prixVente || '',
                prixPromo:       produit.prixPromo || '',
                stockActuel:     produit.stockActuel || '',
                seuilAlerte:     produit.seuilAlerte || 5,
                unite:           produit.unite || 'unité',
                images:          produit.images || [],
                imageUrl:        produit.imageUrl || '',
                actif:           produit.actif !== false,
                visibleClient:   produit.visibleClient !== false,
                gererStock:      produit.gererStock !== false,
                aVariantes:      produit.aVariantes || false,
                notes:           produit.notes || '',
            });
        } else {
            setProduitEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    // Upload image
    const handleImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const result = await uploaderImageProduit(file, form.nom || 'produit');
            setForm(prev => ({
                ...prev,
                imageUrl: result.url,
                images: [...prev.images, result],
            }));
            toast.success('Image uploadée', 'Image ajoutée avec succès');
        } catch (err) {
            toast.error('Erreur upload', err.message);
        } finally {
            setLoadingImg(false);
        }
    };

    // Soumettre formulaire
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nom.trim()) { toast.warning('Nom requis', 'Veuillez entrer un nom'); return; }
        if (!form.prixVente)  { toast.warning('Prix requis', 'Veuillez entrer un prix'); return; }

        setLoadingForm(true);
        try {
            if (produitEdite) {
                await mettreAJourProduit(produitEdite.id, form, profil?.uid);
                toast.success('Produit modifié', `"${form.nom}" a été mis à jour`);
            } else {
                await creerProduit(form, profil?.uid);
                toast.success('Produit créé', `"${form.nom}" a été ajouté`);
            }
            setModalForm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    // Archiver produit
    const handleArchiver = async () => {
        if (!produitSuppr) return;
        try {
            await archiverProduit(produitSuppr.id, profil?.uid);
            toast.success('Archivé', `"${produitSuppr.nom}" archivé`);
            setModalConfirm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const peutModifier = aPermission(PERMISSIONS.PRODUITS_MODIFIER);
    const peutCreer    = aPermission(PERMISSIONS.PRODUITS_CREER);
    const devise       = entreprise?.devise || 'GNF';

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        📦 Produits
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {produits.filter(p => !p.archive).length} produits actifs
                    </p>
                </div>
                {peutCreer && (
                    <button
                        onClick={() => ouvrirForm()}
                        style={{
                            padding: '11px 22px',
                            background: 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                            color: 'white', border: 'none', borderRadius: 12,
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 4px 14px rgba(15,45,107,0.3)',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        ➕ Nouveau produit
                    </button>
                )}
            </div>

            {/* Filtres */}
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: 16,
                border: '1px solid var(--border)', marginBottom: 20,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                {/* Recherche */}
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)', fontSize: 16,
                    }}>🔍</span>
                    <input
                        type="search"
                        placeholder="Rechercher produit, référence..."
                        value={recherche}
                        onChange={e => setRecherche(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px 10px 40px',
                            border: '2px solid var(--border)', borderRadius: 10,
                            fontSize: 14, background: 'var(--bg)', color: 'var(--text)',
                            outline: 'none', fontFamily: 'Inter, sans-serif',
                        }}
                        onFocus={e => e.target.style.borderColor = '#0F2D6B'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>

                {/* Filtre catégorie */}
                <select
                    value={filtreCateg}
                    onChange={e => setFiltreCateg(e.target.value)}
                    style={{
                        padding: '10px 14px', border: '2px solid var(--border)',
                        borderRadius: 10, fontSize: 14, background: 'var(--card)',
                        color: 'var(--text)', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                >
                    <option value="">Toutes catégories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Filtre actif/archivé */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {[
                        { val: 'actif',   label: 'Actifs'   },
                        { val: 'archive', label: 'Archivés' },
                        { val: 'tous',    label: 'Tous'     },
                    ].map(opt => (
                        <button
                            key={opt.val}
                            onClick={() => setFiltreActive(opt.val)}
                            style={{
                                padding: '8px 16px', border: 'none', borderRadius: 8,
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                background: filtreActive === opt.val ? '#0F2D6B' : 'var(--bg)',
                                color:      filtreActive === opt.val ? 'white' : 'var(--text2)',
                                fontFamily: 'Inter, sans-serif',
                                transition: 'all 0.2s',
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tableau produits */}
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
                        <div style={{ fontSize: 52, marginBottom: 14 }}>📦</div>
                        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                            {recherche ? 'Aucun produit trouvé' : 'Aucun produit'}
                        </p>
                        <p style={{ fontSize: 13 }}>
                            {recherche
                                ? `Aucun résultat pour "${recherche}"`
                                : 'Commencez par créer votre premier produit'}
                        </p>
                        {peutCreer && !recherche && (
                            <button
                                onClick={() => ouvrirForm()}
                                style={{
                                    marginTop: 16, padding: '10px 22px',
                                    background: '#0F2D6B', color: 'white',
                                    border: 'none', borderRadius: 10, cursor: 'pointer',
                                    fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                ➕ Créer un produit
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['Image', 'Produit', 'Catégorie', 'Prix achat', 'Prix vente', 'Marge', 'Stock', 'Statut', 'Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 16px', fontSize: 11,
                                            textAlign: 'left', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {produitsFiltres.map((p, i) => {
                                    const stockFaible = p.gererStock && (p.stockActuel || 0) <= (p.seuilAlerte || 5);
                                    return (
                                        <tr key={p.id} style={{
                                            borderBottom: i < produitsFiltres.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Image */}
                                            <td style={{ padding: '10px 16px' }}>
                                                <div style={{
                                                    width: 48, height: 48, borderRadius: 10,
                                                    overflow: 'hidden', flexShrink: 0,
                                                    background: p.imageUrl ? 'transparent' : 'rgba(15,45,107,0.08)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 22,
                                                }}>
                                                    {p.imageUrl
                                                        ? <img src={p.imageUrl} alt={p.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : '📦'}
                                                </div>
                                            </td>

                                            {/* Nom */}
                                            <td style={{ padding: '10px 16px' }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                                                    {p.nom}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'monospace' }}>
                                                    {p.reference}
                                                </div>
                                            </td>

                                            {/* Catégorie */}
                                            <td style={{ padding: '10px 16px' }}>
                                                <Badge variant="primary">{p.categorie || '—'}</Badge>
                                            </td>

                                            {/* Prix achat */}
                                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text2)' }}>
                                                {p.prixAchat ? p.prixAchat.toLocaleString('fr-FR') + ' ' + devise : '—'}
                                            </td>

                                            {/* Prix vente */}
                                            <td style={{ padding: '10px 16px' }}>
                                                <span style={{ fontWeight: 700, color: '#10B981', fontSize: 14 }}>
                                                    {(p.prixVente || 0).toLocaleString('fr-FR')} {devise}
                                                </span>
                                                {p.promoActive && p.prixPromo && (
                                                    <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>
                                                        Promo: {p.prixPromo.toLocaleString('fr-FR')} {devise}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Marge */}
                                            <td style={{ padding: '10px 16px' }}>
                                                <span style={{
                                                    fontSize: 13, fontWeight: 700,
                                                    color: (p.marge || 0) >= 20 ? '#10B981' : (p.marge || 0) >= 10 ? '#F59E0B' : '#EF4444',
                                                }}>
                                                    {p.marge || 0}%
                                                </span>
                                            </td>

                                            {/* Stock */}
                                            <td style={{ padding: '10px 16px' }}>
                                                {p.gererStock ? (
                                                    <span style={{
                                                        fontWeight: 700,
                                                        color: stockFaible ? '#EF4444' : 'var(--text)',
                                                        fontSize: 14,
                                                    }}>
                                                        {stockFaible && '⚠️ '}
                                                        {p.stockActuel || 0} {p.unite || ''}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text2)', fontSize: 12 }}>Non géré</span>
                                                )}
                                            </td>

                                            {/* Statut */}
                                            <td style={{ padding: '10px 16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <Badge variant={p.actif ? 'success' : 'danger'} dot>
                                                        {p.actif ? 'Actif' : 'Inactif'}
                                                    </Badge>
                                                    {!p.visibleClient && (
                                                        <Badge variant="gray">🔒 Caché</Badge>
                                                    )}
                                                    {p.archive && (
                                                        <Badge variant="warning">Archivé</Badge>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '10px 16px' }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {peutModifier && (
                                                        <button
                                                            onClick={() => ouvrirForm(p)}
                                                            style={{
                                                                padding: '6px 12px', background: 'rgba(15,45,107,0.08)',
                                                                color: '#0F2D6B', border: 'none', borderRadius: 8,
                                                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                                fontFamily: 'Inter, sans-serif',
                                                            }}
                                                            title="Modifier"
                                                        >
                                                            ✏️
                                                        </button>
                                                    )}
                                                    {peutModifier && !p.archive && (
                                                        <button
                                                            onClick={() => { setProduitSuppr(p); setModalConfirm(true); }}
                                                            style={{
                                                                padding: '6px 12px', background: 'rgba(239,68,68,0.08)',
                                                                color: '#EF4444', border: 'none', borderRadius: 8,
                                                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                                fontFamily: 'Inter, sans-serif',
                                                            }}
                                                            title="Archiver"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL FORMULAIRE */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={produitEdite ? `✏️ Modifier — ${produitEdite.nom}` : '➕ Nouveau produit'}
                icon="📦"
                size="lg"
                footer={
                    <>
                        <button
                            onClick={() => setModalForm(false)}
                            style={{
                                padding: '10px 20px', border: '2px solid var(--border)',
                                borderRadius: 10, background: 'var(--card)', color: 'var(--text)',
                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loadingForm}
                            style={{
                                padding: '10px 24px',
                                background: loadingForm ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                color: 'white', border: 'none', borderRadius: 10,
                                fontSize: 14, fontWeight: 700, cursor: loadingForm ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8,
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {loadingForm ? (
                                <>
                                    <div style={{
                                        width: 14, height: 14,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
                                    Sauvegarde...
                                </>
                            ) : (
                                produitEdite ? '💾 Sauvegarder' : '➕ Créer'
                            )}
                        </button>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </>
                }
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Section image */}
                    <div style={{
                        display: 'flex', gap: 16, alignItems: 'center',
                        padding: 16, background: 'var(--gray-50)', borderRadius: 12,
                        border: '1px dashed var(--border)',
                    }}>
                        {/* Préview image */}
                        <div style={{
                            width: 80, height: 80, borderRadius: 12, overflow: 'hidden',
                            background: form.imageUrl ? 'transparent' : 'var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32, flexShrink: 0,
                        }}>
                            {form.imageUrl
                                ? <img src={form.imageUrl} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : '📦'}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Image principale</div>
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '8px 16px',
                                background: loadingImg ? '#9CA3AF' : '#0F2D6B',
                                color: 'white', borderRadius: 8, cursor: loadingImg ? 'wait' : 'pointer',
                                fontSize: 13, fontWeight: 600,
                            }}>
                                {loadingImg ? '⏳ Upload...' : '📷 Choisir une image'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImage}
                                    disabled={loadingImg}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                                JPG, PNG, WEBP — Max 5MB — Hébergé sur IMGBB
                            </p>
                        </div>
                    </div>

                    {/* Infos de base */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                Nom du produit *
                            </label>
                            <input
                                type="text"
                                value={form.nom}
                                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                                placeholder="Ex: Cahier 200 pages"
                                required
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                                onFocus={e => e.target.style.borderColor = '#0F2D6B'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                Référence / SKU
                            </label>
                            <input
                                type="text"
                                value={form.reference}
                                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                                placeholder="Ex: NS-LIB-001"
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                                onFocus={e => e.target.style.borderColor = '#0F2D6B'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                Catégorie *
                            </label>
                            <input
                                type="text"
                                value={form.categorie}
                                onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                                placeholder="Ex: Fournitures scolaires"
                                list="cats-list"
                                required
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                                onFocus={e => e.target.style.borderColor = '#0F2D6B'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                            <datalist id="cats-list">
                                {categories.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                Domaine
                            </label>
                            <select
                                value={form.domaineId}
                                onChange={e => {
                                    const d = domaines.find(x => x.id === e.target.value);
                                    setForm(p => ({ ...p, domaineId: e.target.value, domaineLabel: d?.nom || '' }));
                                }}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                <option value="">Sélectionner un domaine</option>
                                {domaines.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Description détaillée du produit..."
                            rows={3}
                            style={{
                                width: '100%', padding: '10px 14px',
                                border: '2px solid var(--border)', borderRadius: 10,
                                fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                outline: 'none', fontFamily: 'Inter, sans-serif',
                                resize: 'vertical',
                            }}
                            onFocus={e => e.target.style.borderColor = '#0F2D6B'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>

                    {/* Prix */}
                    <div style={{
                        padding: 16, background: 'rgba(16,185,129,0.05)',
                        borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 12 }}>
                            💰 Tarification
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    Prix d'achat
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.prixAchat}
                                    onChange={e => setForm(p => ({ ...p, prixAchat: e.target.value }))}
                                    placeholder="0"
                                    style={{
                                        width: '100%', padding: '9px 12px',
                                        border: '2px solid var(--border)', borderRadius: 10,
                                        fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                        outline: 'none', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    Prix de vente *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.prixVente}
                                    onChange={e => setForm(p => ({ ...p, prixVente: e.target.value }))}
                                    placeholder="0"
                                    required
                                    style={{
                                        width: '100%', padding: '9px 12px',
                                        border: '2px solid var(--border)', borderRadius: 10,
                                        fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                        outline: 'none', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                    Marge estimée
                                </label>
                                <div style={{
                                    padding: '9px 12px', background: 'var(--gray-100)',
                                    borderRadius: 10, fontSize: 14, fontWeight: 700,
                                    color: form.prixVente && form.prixAchat
                                        ? ((form.prixVente - form.prixAchat) / form.prixAchat * 100) >= 20
                                            ? '#10B981' : '#F59E0B'
                                        : 'var(--text2)',
                                }}>
                                    {form.prixVente && form.prixAchat
                                        ? `${((form.prixVente - form.prixAchat) / form.prixAchat * 100).toFixed(1)}%`
                                        : '—'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stock */}
                    <div style={{
                        padding: 16, background: 'rgba(15,45,107,0.04)',
                        borderRadius: 12, border: '1px solid rgba(15,45,107,0.1)',
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: 12,
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2D6B' }}>
                                📦 Gestion du stock
                            </div>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                            }}>
                                <input
                                    type="checkbox"
                                    checked={form.gererStock}
                                    onChange={e => setForm(p => ({ ...p, gererStock: e.target.checked }))}
                                />
                                Gérer le stock
                            </label>
                        </div>

                        {form.gererStock && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                        Stock actuel
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.stockActuel}
                                        onChange={e => setForm(p => ({ ...p, stockActuel: e.target.value }))}
                                        placeholder="0"
                                        style={{
                                            width: '100%', padding: '9px 12px',
                                            border: '2px solid var(--border)', borderRadius: 10,
                                            fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                            outline: 'none', fontFamily: 'Inter, sans-serif',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                        Seuil d'alerte
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.seuilAlerte}
                                        onChange={e => setForm(p => ({ ...p, seuilAlerte: e.target.value }))}
                                        placeholder="5"
                                        style={{
                                            width: '100%', padding: '9px 12px',
                                            border: '2px solid var(--border)', borderRadius: 10,
                                            fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                            outline: 'none', fontFamily: 'Inter, sans-serif',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                        Unité
                                    </label>
                                    <input
                                        type="text"
                                        value={form.unite}
                                        onChange={e => setForm(p => ({ ...p, unite: e.target.value }))}
                                        placeholder="unité, kg, litre..."
                                        list="unites-list"
                                        style={{
                                            width: '100%', padding: '9px 12px',
                                            border: '2px solid var(--border)', borderRadius: 10,
                                            fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                            outline: 'none', fontFamily: 'Inter, sans-serif',
                                        }}
                                    />
                                    <datalist id="unites-list">
                                        {['unité', 'pièce', 'kg', 'g', 'litre', 'ml', 'mètre', 'cm', 'boîte', 'paquet'].map(u => (
                                            <option key={u} value={u} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    <div style={{
                        display: 'flex', gap: 20, flexWrap: 'wrap',
                        padding: 14, background: 'var(--gray-50)',
                        borderRadius: 10, border: '1px solid var(--border)',
                    }}>
                        {[
                            { key: 'actif',         label: '✅ Actif' },
                            { key: 'visibleClient',  label: '👁️ Visible client' },
                        ].map(opt => (
                            <label key={opt.key} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            }}>
                                <input
                                    type="checkbox"
                                    checked={form[opt.key]}
                                    onChange={e => setForm(p => ({ ...p, [opt.key]: e.target.checked }))}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </form>
            </Modal>

            {/* MODAL CONFIRMATION */}
            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleArchiver}
                title="Archiver ce produit ?"
                message={`Le produit "${produitSuppr?.nom}" sera archivé et masqué. Vous pourrez le restaurer à tout moment.`}
                confirmText="Archiver"
                cancelText="Annuler"
                type="warning"
            />
        </div>
    );
};

export default ProduitsPage;