import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { ToastProvider, useToast } from '../../components/common/Toast';
import { creerCommande } from '../../services/commandeService';

// ═══════════════════════════════════════════════
// COMPOSANT INTERNE (utilise useToast)
// ═══════════════════════════════════════════════
const PanierPublicContent = () => {
    const navigate = useNavigate();
    const { profil } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [panier, setPanier] = useState(() => {
        try { return JSON.parse(localStorage.getItem('nsPanier') || '[]'); } catch { return []; }
    });

    const [form, setForm] = useState({
        clientNom: profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : '',
        clientTel: profil?.telephone || '',
        clientEmail: profil?.email || '',
        typeLivraison: 'retrait',
        adresseLivraison: '',
        noteClient: '',
    });

    const [loading, setLoading] = useState(false);
    const [commande, setCommande] = useState(null);
    const devise = entreprise?.devise || 'GNF';

    // Sauvegarder panier
    const sauverPanier = (nv) => {
        setPanier(nv);
        localStorage.setItem('nsPanier', JSON.stringify(nv));
    };

    // Changer quantité
    const changerQte = (id, delta) => {
        const nv = panier
            .map(i => i.id === id ? { ...i, quantite: i.quantite + delta } : i)
            .filter(i => i.quantite > 0);
        sauverPanier(nv);
    };

    // Supprimer article
    const supprimer = (id) => sauverPanier(panier.filter(i => i.id !== id));

    // Vider panier
    const vider = () => sauverPanier([]);

    // Total
    const total = panier.reduce((s, i) => s + i.prix * i.quantite, 0);

    // ═══════════════════════════════════════════════
    // 📱 OPTION 1 : Commander VIA WhatsApp (RAPIDE)
    // Ouvre WhatsApp avec message pré-rempli
    // ═══════════════════════════════════════════════
 
    const commanderViaWhatsApp = async () => {
        if (!form.clientNom.trim()) { toast.warning('Nom requis'); return; }
        if (!form.clientTel.trim()) { toast.warning('Téléphone requis'); return; }
        if (panier.length === 0) { toast.warning('Panier vide'); return; }

        const whatsappNumero = entreprise?.whatsapp?.replace(/[^0-9]/g, '') || '';

        if (!whatsappNumero) {
            toast.error('Erreur', 'Numéro WhatsApp non configuré');
            return;
        }

        setLoading(true);

        try {
            // ✅ ÉTAPE 1 : Enregistrer la commande dans Firestore
            const lignes = panier.map(i => ({
                produitId: i.id,
                type: 'produit',
                nom: i.nom,
                quantite: i.quantite,
                prixUnitaire: i.prix,
                remise: 0,
                sousTotal: i.prix * i.quantite,
            }));

            const { id, numero } = await creerCommande({
                clientId: profil?.uid || null,
                clientNom: form.clientNom,
                clientTel: form.clientTel,
                clientEmail: form.clientEmail,
                lignes,
                sousTotal: total,
                montantTotal: total,
                typeLivraison: form.typeLivraison,
                adresseLivraison: form.adresseLivraison,
                noteClient: form.noteClient,
                source: 'whatsapp',
                devise,
            }, profil?.uid);

            // ✅ ÉTAPE 2 : Ouvrir WhatsApp avec le message
            let message = `🛒 *NOUVELLE COMMANDE*\n\n`;
            message += `📋 *N° :* ${numero}\n`;
            message += `📅 *Date :* ${new Date().toLocaleString('fr-FR')}\n\n`;

            message += `👤 *CLIENT*\n`;
            message += `▸ Nom : ${form.clientNom}\n`;
            message += `▸ Tél : ${form.clientTel}\n`;
            if (form.clientEmail) message += `▸ Email : ${form.clientEmail}\n`;
            message += `\n`;

            message += `📦 *MODE DE RÉCEPTION*\n`;
            message += form.typeLivraison === 'livraison'
                ? `🚚 Livraison à domicile\n▸ Adresse : ${form.adresseLivraison || 'À préciser'}\n\n`
                : `🏪 Retrait en boutique\n\n`;

            message += `🛍️ *ARTICLES COMMANDÉS*\n`;
            panier.forEach((item, i) => {
                message += `${i + 1}. ${item.nom}\n`;
                message += `   ▸ Quantité : ${item.quantite}\n`;
                message += `   ▸ Prix unitaire : ${item.prix.toLocaleString('fr-FR')} ${devise}\n`;
                message += `   ▸ Sous-total : ${(item.prix * item.quantite).toLocaleString('fr-FR')} ${devise}\n\n`;
            });

            message += `💰 *TOTAL : ${total.toLocaleString('fr-FR')} ${devise}*\n\n`;

            if (form.noteClient) {
                message += `📝 *Note :* ${form.noteClient}\n\n`;
            }

            message += `━━━━━━━━━━━━━━━━━━━\n`;
            message += `_Commande ${numero} - ${entreprise?.nom || 'NANA SERVICE'}_`;

            const messageEncode = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${whatsappNumero}?text=${messageEncode}`;

            window.open(whatsappUrl, '_blank');

            // ✅ ÉTAPE 3 : Vider le panier et afficher confirmation
            vider();
            setCommande({ id, numero, total });

        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };
    // ═══════════════════════════════════════════════
    // ✅ OPTION 2 : Commander SUR LE SITE (OFFICIEL)
    // Enregistre UNIQUEMENT dans Firestore
    // PAS d'ouverture WhatsApp automatique
    // ═══════════════════════════════════════════════
    const commanderSurSite = async () => {
        if (!form.clientNom.trim()) { toast.warning('Nom requis'); return; }
        if (!form.clientTel.trim()) { toast.warning('Téléphone requis'); return; }
        if (panier.length === 0) { toast.warning('Panier vide'); return; }

        setLoading(true);
        try {
            const lignes = panier.map(i => ({
                produitId: i.id,
                type: 'produit',
                nom: i.nom,
                quantite: i.quantite,
                prixUnitaire: i.prix,
                remise: 0,
                sousTotal: i.prix * i.quantite,
            }));

            const { id, numero } = await creerCommande({
                clientId: profil?.uid || null,
                clientNom: form.clientNom,
                clientTel: form.clientTel,
                clientEmail: form.clientEmail,
                lignes,
                sousTotal: total,
                montantTotal: total,
                typeLivraison: form.typeLivraison,
                adresseLivraison: form.adresseLivraison,
                noteClient: form.noteClient,
                source: 'client_public',
                devise,
            }, profil?.uid);

            // ✅ Commande enregistrée dans Firestore uniquement
            // ❌ AUCUNE ouverture WhatsApp

            vider();
            setCommande({ id, numero, total });
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    // ═══════════════════════════════════════════════
    // ÉCRAN CONFIRMATION APRÈS COMMANDE
    // ═══════════════════════════════════════════════
    if (commande) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 20,
                background: 'linear-gradient(135deg, #F8FAFC, #E0E7FF)',
                fontFamily: 'Inter, sans-serif',
            }}>
                <div style={{
                    background: 'white', borderRadius: 20, padding: 40,
                    maxWidth: 500, textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}>
                    <div style={{ fontSize: 80, marginBottom: 16, animation: 'bounce 0.6s' }}>🎉</div>
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#10B981', marginBottom: 8 }}>
                        Commande confirmée !
                    </h2>
                    <p style={{ color: '#6B7280', marginBottom: 20 }}>
                        Votre commande a été enregistrée avec succès
                    </p>
                    <div style={{
                        background: 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                        color: 'white', borderRadius: 12, padding: '14px 26px',
                        display: 'inline-block', fontWeight: 900, fontSize: 20, marginBottom: 20,
                    }}>
                        # {commande.numero}
                    </div>
                    <div style={{
                        background: 'rgba(16,185,129,0.1)', borderRadius: 12,
                        padding: 16, marginBottom: 24,
                    }}>
                        <div style={{ fontSize: 14, marginBottom: 6 }}>
                            👤 <strong>{form.clientNom}</strong>
                        </div>
                        <div style={{ fontSize: 14, marginBottom: 6 }}>
                            📞 {form.clientTel}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>
                            💰 Total : {commande.total.toLocaleString('fr-FR')} {devise}
                        </div>
                    </div>
                    <div style={{
                        padding: 12, background: 'rgba(15,45,107,0.05)',
                        borderRadius: 10, fontSize: 12, color: '#6B7280',
                        marginBottom: 20, lineHeight: 1.5,
                    }}>
                        💡 Notre équipe vous contactera bientôt pour finaliser votre commande.
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => navigate('/')} style={{
                            padding: '12px 24px', background: '#0F2D6B', color: 'white',
                            border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>
                            🏠 Accueil
                        </button>
                        <button onClick={() => navigate('/catalogue')} style={{
                            padding: '12px 24px', background: 'transparent', color: '#0F2D6B',
                            border: '2px solid #0F2D6B', borderRadius: 12, fontSize: 14, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>
                            🛍️ Continuer
                        </button>
                    </div>
                    <style>{`@keyframes bounce{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    // AFFICHAGE PRINCIPAL DU PANIER
    // ═══════════════════════════════════════════════
    return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{
                background: 'white', borderBottom: '1px solid #E5E7EB',
                position: 'sticky', top: 0, zIndex: 100,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
                <div style={{
                    maxWidth: 1200, margin: '0 auto', padding: '14px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                        onClick={() => navigate('/')}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: 'linear-gradient(135deg,#0F2D6B,#FF6B00)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 20, color: 'white', overflow: 'hidden',
                        }}>
                            {entreprise?.logo
                                ? <img src={entreprise.logo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                : '🏪'}
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: '#0F2D6B' }}>
                            {entreprise?.nom || 'NANA SERVICE'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => navigate('/')} style={{
                            padding: '9px 16px', background: '#6B7280', color: 'white',
                            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>🏠 Accueil</button>
                        <button onClick={() => navigate('/catalogue')} style={{
                            padding: '9px 16px', background: '#0F2D6B', color: 'white',
                            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>🛍️ Catalogue</button>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '30px 20px' }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0F2D6B', marginBottom: 24 }}>
                    🛒 Mon panier
                </h1>

                {panier.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '80px 20px',
                        background: 'white', borderRadius: 20,
                    }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#6B7280' }}>
                            Votre panier est vide
                        </p>
                        <button onClick={() => navigate('/catalogue')} style={{
                            marginTop: 16, padding: '12px 24px',
                            background: '#0F2D6B', color: 'white',
                            border: 'none', borderRadius: 12, cursor: 'pointer',
                            fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                        }}>
                            🛍️ Parcourir le catalogue
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
                        {/* Articles */}
                        <div style={{
                            background: 'white', borderRadius: 14,
                            border: '1px solid #E5E7EB', overflow: 'hidden',
                        }}>
                            {panier.map((item, i) => (
                                <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '16px 20px',
                                    borderBottom: i < panier.length - 1 ? '1px solid #E5E7EB' : 'none',
                                }}>
                                    <div style={{
                                        width: 64, height: 64, borderRadius: 12, overflow: 'hidden',
                                        background: 'rgba(15,45,107,0.08)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontSize: 28,
                                    }}>
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                            : item.emoji || '📦'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{item.nom}</div>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                                            {(item.prix || 0).toLocaleString('fr-FR')} {devise} / unité
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <button onClick={() => changerQte(item.id, -1)} style={{
                                            width: 34, height: 34, borderRadius: '50%',
                                            background: 'rgba(239,68,68,0.1)', border: 'none',
                                            color: '#EF4444', fontSize: 20, fontWeight: 700, cursor: 'pointer',
                                        }}>−</button>
                                        <span style={{ fontWeight: 800, fontSize: 18, minWidth: 28, textAlign: 'center' }}>
                                            {item.quantite}
                                        </span>
                                        <button onClick={() => changerQte(item.id, 1)} style={{
                                            width: 34, height: 34, borderRadius: '50%',
                                            background: 'rgba(16,185,129,0.1)', border: 'none',
                                            color: '#10B981', fontSize: 20, fontWeight: 700, cursor: 'pointer',
                                        }}>+</button>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#0F2D6B' }}>
                                            {(item.prix * item.quantite).toLocaleString('fr-FR')} {devise}
                                        </div>
                                    </div>
                                    <button onClick={() => supprimer(item.id)} style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: 'rgba(239,68,68,0.08)', border: 'none',
                                        color: '#EF4444', cursor: 'pointer', fontSize: 16,
                                    }}>✕</button>
                                </div>
                            ))}
                        </div>

                        {/* Récapitulatif */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Total */}
                            <div style={{
                                background: 'white', borderRadius: 14, padding: 20,
                                border: '1px solid #E5E7EB',
                            }}>
                                <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>💰 Résumé</h3>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontSize: 14, marginBottom: 12,
                                }}>
                                    <span>Sous-total</span>
                                    <span>{total.toLocaleString('fr-FR')} {devise}</span>
                                </div>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontWeight: 900, fontSize: 20, color: '#0F2D6B',
                                    paddingTop: 12, borderTop: '2px solid #E5E7EB',
                                }}>
                                    <span>Total</span>
                                    <span>{total.toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            </div>

                            {/* Formulaire client */}
                            <div style={{
                                background: 'white', borderRadius: 14, padding: 20,
                                border: '1px solid #E5E7EB',
                            }}>
                                <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
                                    📋 Vos informations
                                </h3>
                                {[
                                    { key: 'clientNom', label: 'Nom complet *', ph: 'Jean Dupont' },
                                    { key: 'clientTel', label: 'Téléphone *', ph: '+224 6XX XXX XXX', type: 'tel' },
                                    { key: 'clientEmail', label: 'Email', ph: 'email@example.com', type: 'email' },
                                ].map(f => (
                                    <div key={f.key} style={{ marginBottom: 12 }}>
                                        <label style={{
                                            fontSize: 12, fontWeight: 600,
                                            display: 'block', marginBottom: 5,
                                        }}>
                                            {f.label}
                                        </label>
                                        <input
                                            type={f.type || 'text'}
                                            value={form[f.key]}
                                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.ph}
                                            style={{
                                                width: '100%', padding: '10px 12px',
                                                border: '2px solid #E5E7EB', borderRadius: 10,
                                                fontSize: 14, outline: 'none',
                                                fontFamily: 'Inter, sans-serif',
                                            }}
                                        />
                                    </div>
                                ))}

                                <div style={{ marginBottom: 12 }}>
                                    <label style={{
                                        fontSize: 12, fontWeight: 600,
                                        display: 'block', marginBottom: 8,
                                    }}>
                                        📦 Mode de réception
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {[
                                            { val: 'retrait', label: '🏪 Retrait en boutique' },
                                            { val: 'livraison', label: '🚚 Livraison à domicile' },
                                        ].map(t => (
                                            <button key={t.val} type="button"
                                                onClick={() => setForm(p => ({ ...p, typeLivraison: t.val }))}
                                                style={{
                                                    flex: 1, padding: '10px',
                                                    border: `2px solid ${form.typeLivraison === t.val ? '#0F2D6B' : '#E5E7EB'}`,
                                                    borderRadius: 10,
                                                    background: form.typeLivraison === t.val ? 'rgba(15,45,107,0.08)' : 'white',
                                                    color: form.typeLivraison === t.val ? '#0F2D6B' : '#6B7280',
                                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                    fontFamily: 'Inter, sans-serif',
                                                }}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {form.typeLivraison === 'livraison' && (
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{
                                            fontSize: 12, fontWeight: 600,
                                            display: 'block', marginBottom: 5,
                                        }}>
                                            Adresse de livraison *
                                        </label>
                                        <textarea
                                            value={form.adresseLivraison}
                                            onChange={e => setForm(p => ({ ...p, adresseLivraison: e.target.value }))}
                                            placeholder="Quartier, rue, repère..."
                                            rows={2}
                                            style={{
                                                width: '100%', padding: '10px 12px',
                                                border: '2px solid #E5E7EB', borderRadius: 10,
                                                fontSize: 14, outline: 'none',
                                                fontFamily: 'Inter, sans-serif', resize: 'vertical',
                                            }}
                                        />
                                    </div>
                                )}

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{
                                        fontSize: 12, fontWeight: 600,
                                        display: 'block', marginBottom: 5,
                                    }}>
                                        📝 Note (optionnel)
                                    </label>
                                    <textarea
                                        value={form.noteClient}
                                        onChange={e => setForm(p => ({ ...p, noteClient: e.target.value }))}
                                        placeholder="Instructions particulières..."
                                        rows={2}
                                        style={{
                                            width: '100%', padding: '10px 12px',
                                            border: '2px solid #E5E7EB', borderRadius: 10,
                                            fontSize: 14, outline: 'none',
                                            fontFamily: 'Inter, sans-serif', resize: 'vertical',
                                        }}
                                    />
                                </div>

                                {/* ═══════════════════════════════════════════════ */}
                                {/* 📱 BOUTON 1 : WHATSAPP (RAPIDE) */}
                                {/* ═══════════════════════════════════════════════ */}
                                <button
                                    onClick={commanderViaWhatsApp}
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '14px',
                                        background: 'linear-gradient(135deg, #25D366, #128C7E)',
                                        color: 'white', border: 'none', borderRadius: 12,
                                        fontSize: 15, fontWeight: 800,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                        boxShadow: '0 6px 20px rgba(37,211,102,0.4)',
                                        marginBottom: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={e => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(37,211,102,0.5)';
                                        }
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.4)';
                                    }}
                                >
                                    📱 Commander via WhatsApp (Rapide)
                                </button>

                                {/* ═══════════════════════════════════════════════ */}
                                {/* ✅ BOUTON 2 : COMMANDE OFFICIELLE SUR LE SITE */}
                                {/* ═══════════════════════════════════════════════ */}
                                <button
                                    onClick={commanderSurSite}
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '14px',
                                        background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                        color: 'white', border: 'none', borderRadius: 12,
                                        fontSize: 15, fontWeight: 800,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                        boxShadow: '0 6px 20px rgba(15,45,107,0.3)',
                                        marginBottom: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={e => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(15,45,107,0.4)';
                                        }
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,45,107,0.3)';
                                    }}
                                >
                                    {loading
                                        ? '⏳ Traitement...'
                                        : `✅ Commander sur le site — ${total.toLocaleString('fr-FR')} ${devise}`
                                    }
                                </button>

                                {/* Info explicative */}
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'rgba(15,45,107,0.05)',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    color: '#6B7280',
                                    marginBottom: 12,
                                    lineHeight: 1.5,
                                    textAlign: 'center',
                                }}>
                                    💡 <strong>Astuce :</strong> WhatsApp est plus rapide pour discuter.
                                    Le site enregistre officiellement votre commande.
                                </div>

                                {/* Vider panier */}
                                <button onClick={vider} style={{
                                    width: '100%', padding: '10px',
                                    background: 'transparent', border: '1px solid #E5E7EB',
                                    borderRadius: 10, color: '#6B7280',
                                    fontSize: 12, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    🗑️ Vider le panier
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════
// WRAPPER AVEC ToastProvider
// ═══════════════════════════════════════════════
const PanierPublic = () => {
    return (
        <ToastProvider>
            <PanierPublicContent />
        </ToastProvider>
    );
};

export default PanierPublic;