import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import { creerCommande } from '../../services/commandeService';

const PanierPage = () => {
    const navigate = useNavigate();
    const { profil } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [panier, setPanier] = useState(() => {
        try { return JSON.parse(localStorage.getItem('nsPanier') || '[]'); } catch { return []; }
    });

    const [form, setForm] = useState({
        clientNom:     profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : '',
        clientTel:     profil?.telephone || '',
        clientEmail:   profil?.email || '',
        typeLivraison: 'retrait',
        adresseLivraison: '',
        noteClient:    '',
    });

    const [loading, setLoading] = useState(false);
    const [commande, setCommande] = useState(null);
    const devise = entreprise?.devise || 'GNF';

    const sauverPanier = (nvPanier) => {
        setPanier(nvPanier);
        localStorage.setItem('nsPanier', JSON.stringify(nvPanier));
    };

    const changerQte = (id, delta) => {
        const nv = panier
            .map(i => i.id === id ? { ...i, quantite: i.quantite + delta } : i)
            .filter(i => i.quantite > 0);
        sauverPanier(nv);
    };

    const supprimer = (id) => sauverPanier(panier.filter(i => i.id !== id));
    const vider    = () => sauverPanier([]);

    const total = panier.reduce((s, i) => s + i.prix * i.quantite, 0);
    const fraisLivraison = form.typeLivraison === 'livraison' ? 0 : 0; // À configurer

    const commander = async () => {
        if (!form.clientNom.trim()) { toast.warning('Nom requis'); return; }
        if (panier.length === 0)   { toast.warning('Panier vide'); return; }
        if (form.typeLivraison === 'livraison' && !form.adresseLivraison.trim()) {
            toast.warning('Adresse de livraison requise');
            return;
        }

        setLoading(true);
        try {
            const lignes = panier.map(i => ({
                produitId:    i.id,
                type:         'produit',
                nom:          i.nom,
                quantite:     i.quantite,
                prixUnitaire: i.prix,
                remise:       0,
                sousTotal:    i.prix * i.quantite,
            }));

            const { id, numero } = await creerCommande({
                clientId:         profil?.uid || null,
                clientNom:        form.clientNom,
                clientTel:        form.clientTel,
                clientEmail:      form.clientEmail,
                lignes,
                sousTotal:        total,
                remiseGlobale:    0,
                fraisLivraison,
                montantTotal:     total + fraisLivraison,
                typeLivraison:    form.typeLivraison,
                adresseLivraison: form.adresseLivraison,
                noteClient:       form.noteClient,
                source:           'client',
                devise,
            }, profil?.uid);

            vider();
            setCommande({ id, numero, total, form });
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Succès commande
    if (commande) {
        return (
            <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                <div style={{
                    background: 'var(--card)', borderRadius: 20, padding: '40px 32px',
                    border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                }}>
                    <div style={{ fontSize: 72, marginBottom: 16, animation: 'bounce 0.6s' }}>🎉</div>
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#10B981', marginBottom: 8 }}>
                        Commande confirmée !
                    </h2>
                    <p style={{ color: 'var(--text2)', marginBottom: 20, fontSize: 14 }}>
                        Votre commande a été transmise à notre équipe
                    </p>
                    <div style={{
                        background: 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                        color: 'white', borderRadius: 12, padding: '12px 24px',
                        display: 'inline-block', fontWeight: 900, fontSize: 20,
                        marginBottom: 20, letterSpacing: 1,
                    }}>
                        # {commande.numero}
                    </div>
                    <div style={{
                        background: 'rgba(16,185,129,0.08)', borderRadius: 12,
                        padding: '16px', marginBottom: 24, textAlign: 'left',
                        border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>
                            👤 <strong>{commande.form.clientNom}</strong>
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>
                            📦 <strong>{commande.form.typeLivraison === 'livraison' ? 'Livraison à domicile' : 'Retrait en boutique'}</strong>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>
                            💰 Total : {commande.total.toLocaleString('fr-FR')} {devise}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button
                            onClick={() => navigate('/mon-espace/commandes')}
                            style={{
                                padding: '12px 24px', background: '#0F2D6B',
                                color: 'white', border: 'none', borderRadius: 12,
                                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            📋 Mes commandes
                        </button>
                        <button
                            onClick={() => navigate('/mon-espace/catalogue')}
                            style={{
                                padding: '12px 24px', background: 'transparent',
                                color: '#0F2D6B', border: '2px solid #0F2D6B',
                                borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            🛍️ Continuer
                        </button>
                    </div>
                </div>
                <style>{`@keyframes bounce{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>
                🛒 Mon panier
            </h1>

            {panier.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text2)' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
                    <p style={{ fontSize: 16, fontWeight: 600 }}>Votre panier est vide</p>
                    <button
                        onClick={() => navigate('/mon-espace/catalogue')}
                        style={{
                            marginTop: 16, padding: '12px 24px',
                            background: '#0F2D6B', color: 'white',
                            border: 'none', borderRadius: 12, cursor: 'pointer',
                            fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        🛍️ Parcourir le catalogue
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
                    {/* Articles */}
                    <div>
                        <div style={{
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.05)', overflow: 'hidden',
                        }}>
                            {panier.map((item, i) => (
                                <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '16px 20px',
                                    borderBottom: i < panier.length - 1 ? '1px solid var(--border)' : 'none',
                                }}>
                                    {/* Image */}
                                    <div style={{
                                        width: 64, height: 64, borderRadius: 12, overflow: 'hidden',
                                        background: 'rgba(15,45,107,0.08)', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                                    }}>
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt={item.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : item.emoji || '📦'}
                                    </div>

                                    {/* Infos */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{item.nom}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                            {(item.prix || 0).toLocaleString('fr-FR')} {devise} / unité
                                        </div>
                                    </div>

                                    {/* Quantité */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <button
                                            onClick={() => changerQte(item.id, -1)}
                                            style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: 'rgba(239,68,68,0.1)', border: 'none',
                                                color: '#EF4444', fontSize: 20, fontWeight: 700,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            −
                                        </button>
                                        <span style={{ fontWeight: 800, fontSize: 18, minWidth: 28, textAlign: 'center' }}>
                                            {item.quantite}
                                        </span>
                                        <button
                                            onClick={() => changerQte(item.id, 1)}
                                            style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: 'rgba(16,185,129,0.1)', border: 'none',
                                                color: '#10B981', fontSize: 20, fontWeight: 700,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Sous-total */}
                                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#0F2D6B' }}>
                                            {(item.prix * item.quantite).toLocaleString('fr-FR')} {devise}
                                        </div>
                                    </div>

                                    {/* Supprimer */}
                                    <button
                                        onClick={() => supprimer(item.id)}
                                        style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: 'rgba(239,68,68,0.08)', border: 'none',
                                            color: '#EF4444', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Résumé + formulaire */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Totaux */}
                        <div style={{
                            background: 'var(--card)', borderRadius: 14, padding: 20,
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>💰 Résumé</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6, color: 'var(--text2)' }}>
                                <span>Sous-total</span>
                                <span>{total.toLocaleString('fr-FR')} {devise}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12, color: 'var(--text2)' }}>
                                <span>Livraison</span>
                                <span>{fraisLivraison > 0 ? `${fraisLivraison.toLocaleString('fr-FR')} ${devise}` : 'Gratuit'}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontWeight: 900, fontSize: 20, color: '#0F2D6B',
                                paddingTop: 12, borderTop: '2px solid var(--border)',
                            }}>
                                <span>Total</span>
                                <span>{(total + fraisLivraison).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                        </div>

                        {/* Formulaire */}
                        <div style={{
                            background: 'var(--card)', borderRadius: 14, padding: 20,
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                        }}>
                            <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>📋 Vos informations</h3>

                            {[
                                { key: 'clientNom',   label: 'Nom complet *',    ph: 'Jean Dupont',         required: true },
                                { key: 'clientTel',   label: 'Téléphone *',      ph: '+224 6XX XXX XXX',    required: true, type: 'tel' },
                                { key: 'clientEmail', label: 'Email',            ph: 'email@exemple.com',   type: 'email' },
                            ].map(f => (
                                <div key={f.key} style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' }}>
                                        {f.label}
                                    </label>
                                    <input
                                        type={f.type || 'text'}
                                        value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.ph}
                                        style={{
                                            width: '100%', padding: '10px 12px',
                                            border: '2px solid var(--border)', borderRadius: 10,
                                            fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                            outline: 'none', fontFamily: 'Inter, sans-serif',
                                        }}
                                    />
                                </div>
                            ))}

                            {/* Type livraison */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                    📦 Mode de réception
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[
                                        { val: 'retrait',  label: '🏪 Retrait en boutique' },
                                        { val: 'livraison', label: '🚚 Livraison à domicile' },
                                    ].map(t => (
                                        <button
                                            key={t.val}
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, typeLivraison: t.val }))}
                                            style={{
                                                flex: 1, padding: '10px 8px',
                                                border: `2px solid ${form.typeLivraison === t.val ? '#0F2D6B' : 'var(--border)'}`,
                                                borderRadius: 10,
                                                background: form.typeLivraison === t.val ? 'rgba(15,45,107,0.08)' : 'var(--card)',
                                                color: form.typeLivraison === t.val ? '#0F2D6B' : 'var(--text2)',
                                                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                fontFamily: 'Inter, sans-serif', textAlign: 'center',
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.typeLivraison === 'livraison' && (
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                        Adresse de livraison *
                                    </label>
                                    <textarea
                                        value={form.adresseLivraison}
                                        onChange={e => setForm(p => ({ ...p, adresseLivraison: e.target.value }))}
                                        placeholder="Quartier, rue, repère..."
                                        rows={2}
                                        style={{
                                            width: '100%', padding: '10px 12px',
                                            border: '2px solid var(--border)', borderRadius: 10,
                                            fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                            outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical',
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                    📝 Note (optionnel)
                                </label>
                                <textarea
                                    value={form.noteClient}
                                    onChange={e => setForm(p => ({ ...p, noteClient: e.target.value }))}
                                    placeholder="Instructions particulières..."
                                    rows={2}
                                    style={{
                                        width: '100%', padding: '10px 12px',
                                        border: '2px solid var(--border)', borderRadius: 10,
                                        fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                        outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical',
                                    }}
                                />
                            </div>

                            <button
                                onClick={commander}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '14px',
                                    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                                    color: 'white', border: 'none', borderRadius: 12,
                                    fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    fontFamily: 'Inter, sans-serif',
                                    boxShadow: loading ? 'none' : '0 6px 20px rgba(15,45,107,0.3)',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div style={{
                                            width: 18, height: 18,
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTop: '2px solid white',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                        }} />
                                        Traitement...
                                    </>
                                ) : (
                                    `✅ Commander — ${(total + fraisLivraison).toLocaleString('fr-FR')} ${devise}`
                                )}
                            </button>

                            <button
                                onClick={vider}
                                style={{
                                    width: '100%', marginTop: 8, padding: '10px',
                                    background: 'transparent', border: '1px solid var(--border)',
                                    borderRadius: 10, color: 'var(--text2)',
                                    fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                🗑️ Vider le panier
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};

export default PanierPage;