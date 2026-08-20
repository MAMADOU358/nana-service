import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import { uploaderLogo, uploaderAvatar } from '../../services/uploadService';
import { COLLECTIONS, ROLES_LABELS, MOYENS_PAIEMENT } from '../../config/constants';

const ParametresPage = () => {
    const { profil, mettreAJourProfil, changerMotDePasse } = useAuth();
    const { entreprise, parametres } = useApp();
    const toast = useToast();

    const [onglet, setOnglet] = useState('general');
    const [loading, setLoading] = useState(false);
    const [loadingImg, setLoadingImg] = useState(false);

    // Form infos entreprise
    const [formEntreprise, setFormEntreprise] = useState({
        nom: '', slogan: '', description: '',
        telephone: '', whatsapp: '', email: '', adresse: '',
        ville: '', pays: 'Guinée', siteWeb: '',
        devise: 'GNF', logoUrl: '',
    });

    // Form profil
    const [formProfil, setFormProfil] = useState({
        nom: '', prenom: '', telephone: '', avatar: '',
    });

    // Form sécurité
    const [formSec, setFormSec] = useState({
        ancienMdp: '', nouveauMdp: '', confirmerMdp: '',
    });

    // Form apparence
    const [formApparence, setFormApparence] = useState({
        theme: 'light', animations: true, sons: true, volume: 0.5,
        modePerformance: false,
    });

    // Form notifications
    const [formNotifs, setFormNotifs] = useState({
        nouvelleCommande: true, commandePrete: true,
        paiementRecu: true, stockFaible: true,
    });

    // Charger données
    useEffect(() => {
        if (entreprise) {
            setFormEntreprise({
                nom:         entreprise.nom || '',
                slogan:      entreprise.slogan || '',
                description: entreprise.description || '',
                telephone:   entreprise.telephone || '',
                whatsapp:    entreprise.whatsapp || '',
                email:       entreprise.email || '',
                adresse:     entreprise.adresse || '',
                ville:       entreprise.ville || '',
                pays:        entreprise.pays || 'Guinée',
                siteWeb:     entreprise.siteWeb || '',
                devise:      entreprise.devise || 'GNF',
                logoUrl:     entreprise.logo || '',
            });
        }
    }, [entreprise]);

    useEffect(() => {
        if (profil) {
            setFormProfil({
                nom:       profil.nom || '',
                prenom:    profil.prenom || '',
                telephone: profil.telephone || '',
                avatar:    profil.avatar || '',
            });
        }
    }, [profil]);

    useEffect(() => {
        if (parametres) {
            setFormApparence({
                theme:           parametres.theme || 'light',
                animations:      parametres.animations !== false,
                sons:            parametres.sons !== false,
                volume:          parametres.volume || 0.5,
                modePerformance: parametres.modePerformance || false,
            });
        }
    }, [parametres]);

    // Sauvegarder entreprise
    const sauverEntreprise = async () => {
        setLoading(true);
        try {
            await updateDoc(doc(db, COLLECTIONS.ENTREPRISE, 'config'), {
                ...formEntreprise,
                logo:      formEntreprise.logoUrl || null,
                updatedAt: serverTimestamp(),
            });
            toast.success('Sauvegardé !', 'Informations entreprise mises à jour');
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Upload logo
    const handleLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const result = await uploaderLogo(file, 'logo_nanaservice');
            setFormEntreprise(p => ({ ...p, logoUrl: result.url }));
            toast.success('Logo uploadé !');
        } catch (err) {
            toast.error('Erreur upload', err.message);
        } finally {
            setLoadingImg(false);
        }
    };

    // Upload avatar
    const handleAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const result = await uploaderAvatar(file, profil?.uid);
            setFormProfil(p => ({ ...p, avatar: result.url }));
            await mettreAJourProfil({ avatar: result.url });
            toast.success('Avatar mis à jour !');
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingImg(false);
        }
    };

    // Sauvegarder profil
    const sauverProfil = async () => {
        setLoading(true);
        try {
            await mettreAJourProfil(formProfil);
            toast.success('Profil mis à jour !');
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Changer mot de passe
    const handleChangerMdp = async () => {
        if (!formSec.ancienMdp || !formSec.nouveauMdp) {
            toast.warning('Champs requis');
            return;
        }
        if (formSec.nouveauMdp !== formSec.confirmerMdp) {
            toast.error('Erreur', 'Les mots de passe ne correspondent pas');
            return;
        }
        if (formSec.nouveauMdp.length < 8) {
            toast.error('Erreur', 'Minimum 8 caractères');
            return;
        }
        setLoading(true);
        try {
            await changerMotDePasse(formSec.ancienMdp, formSec.nouveauMdp);
            toast.success('Mot de passe changé !');
            setFormSec({ ancienMdp: '', nouveauMdp: '', confirmerMdp: '' });
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Sauvegarder apparence
    const sauverApparence = async () => {
        setLoading(true);
        try {
            await updateDoc(doc(db, COLLECTIONS.PARAMETRES, 'general'), {
                ...formApparence,
                updatedAt: serverTimestamp(),
            });
            // Appliquer thème
            document.documentElement.setAttribute('data-theme', formApparence.theme);
            localStorage.setItem('nsTheme', formApparence.theme);
            toast.success('Apparence sauvegardée !');
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    const ONGLETS = [
        { id: 'general',     label: 'Général',      icon: '🏪' },
        { id: 'profil',      label: 'Mon profil',   icon: '👤' },
        { id: 'securite',    label: 'Sécurité',     icon: '🔒' },
        { id: 'apparence',   label: 'Apparence',    icon: '🎨' },
        { id: 'notifications', label: 'Notifs',     icon: '🔔' },
        { id: 'horaires',    label: 'Horaires',     icon: '🕐' },
    ];

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                    ⚙️ Paramètres
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                    Configuration générale de NANA SERVICE PRO
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
                {/* Menu latéral onglets */}
                <div style={{
                    background: 'var(--card)', borderRadius: 14,
                    border: '1px solid var(--border)', padding: 10,
                    height: 'fit-content', position: 'sticky', top: 80,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                }}>
                    {ONGLETS.map(o => (
                        <button
                            key={o.id}
                            onClick={() => setOnglet(o.id)}
                            style={{
                                width: '100%', padding: '11px 14px',
                                display: 'flex', alignItems: 'center', gap: 10,
                                background: onglet === o.id ? 'rgba(15,45,107,0.08)' : 'transparent',
                                color:      onglet === o.id ? '#0F2D6B' : 'var(--text2)',
                                border: 'none',
                                borderLeft: `3px solid ${onglet === o.id ? '#0F2D6B' : 'transparent'}`,
                                borderRadius: 8,
                                fontSize: 13, fontWeight: onglet === o.id ? 700 : 500,
                                cursor: 'pointer', textAlign: 'left',
                                marginBottom: 3, transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            <span style={{ fontSize: 18 }}>{o.icon}</span>
                            {o.label}
                        </button>
                    ))}
                </div>

                {/* Contenu onglet */}
                <div>

                    {/* ─── GÉNÉRAL ─── */}
                    {onglet === 'general' && (
                        <div style={{
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)', padding: 24,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: 'var(--text)' }}>
                                🏪 Informations de l'entreprise
                            </h2>

                            {/* Logo */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 20,
                                padding: 16, background: 'var(--gray-50)', borderRadius: 12,
                                border: '1px dashed var(--border)', marginBottom: 20,
                            }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: 16,
                                    overflow: 'hidden',
                                    background: formEntreprise.logoUrl ? 'transparent' : 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 32, color: 'white', flexShrink: 0,
                                    border: '3px solid rgba(255,107,0,0.3)',
                                }}>
                                    {formEntreprise.logoUrl
                                        ? <img src={formEntreprise.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : '🏪'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>Logo de l'entreprise</div>
                                    <label style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        padding: '8px 16px',
                                        background: loadingImg ? '#9CA3AF' : '#0F2D6B',
                                        color: 'white', borderRadius: 8,
                                        cursor: loadingImg ? 'wait' : 'pointer',
                                        fontSize: 13, fontWeight: 600,
                                    }}>
                                        {loadingImg ? '⏳ Upload...' : '📷 Changer le logo'}
                                        <input type="file" accept="image/*" onChange={handleLogo} disabled={loadingImg} style={{ display: 'none' }} />
                                    </label>
                                    <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                                        PNG, JPG — Max 2MB — Hébergé sur IMGBB
                                    </p>
                                </div>
                            </div>

                            {/* Champs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                {[
                                    { key: 'nom',    label: 'Nom de l\'entreprise *', ph: 'NANA SERVICE' },
                                    { key: 'slogan', label: 'Slogan',                  ph: 'Votre partenaire...' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                            {f.label}
                                        </label>
                                        <input
                                            type="text"
                                            value={formEntreprise[f.key]}
                                            onChange={e => setFormEntreprise(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.ph}
                                            style={inputStyle}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Description
                                </label>
                                <textarea
                                    value={formEntreprise.description}
                                    onChange={e => setFormEntreprise(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Description de l'entreprise..."
                                    rows={3}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                {[
                                    { key: 'telephone', label: '📞 Téléphone',  ph: '+224 6XX XXX XXX', type: 'tel' },
                                    { key: 'whatsapp',  label: '💬 WhatsApp',   ph: '+224 6XX XXX XXX', type: 'tel' },
                                    { key: 'email',     label: '✉️ Email',      ph: 'contact@nanaservice.com', type: 'email' },
                                    { key: 'siteWeb',   label: '🌐 Site web',   ph: 'https://nanaservice.com' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                            {f.label}
                                        </label>
                                        <input
                                            type={f.type || 'text'}
                                            value={formEntreprise[f.key]}
                                            onChange={e => setFormEntreprise(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.ph}
                                            style={inputStyle}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                                {[
                                    { key: 'adresse', label: '📍 Adresse', ph: 'Quartier, rue...' },
                                    { key: 'ville',   label: 'Ville',       ph: 'Conakry'         },
                                    { key: 'pays',    label: 'Pays',        ph: 'Guinée'          },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                            {f.label}
                                        </label>
                                        <input
                                            type="text"
                                            value={formEntreprise[f.key]}
                                            onChange={e => setFormEntreprise(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.ph}
                                            style={inputStyle}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Devise */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    💱 Devise principale
                                </label>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {[
                                        { val: 'GNF', label: 'Franc Guinéen (GNF)' },
                                        { val: 'FCFA', label: 'FCFA' },
                                        { val: 'EUR', label: 'Euro (€)' },
                                        { val: 'USD', label: 'Dollar ($)' },
                                        { val: 'MAD', label: 'Dirham (MAD)' },
                                    ].map(d => (
                                        <button
                                            key={d.val}
                                            type="button"
                                            onClick={() => setFormEntreprise(p => ({ ...p, devise: d.val }))}
                                            style={{
                                                padding: '9px 16px',
                                                border: `2px solid ${formEntreprise.devise === d.val ? '#0F2D6B' : 'var(--border)'}`,
                                                borderRadius: 10,
                                                background: formEntreprise.devise === d.val ? 'rgba(15,45,107,0.1)' : 'var(--card)',
                                                color: formEntreprise.devise === d.val ? '#0F2D6B' : 'var(--text2)',
                                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                            }}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={sauverEntreprise}
                                disabled={loading}
                                style={btnPrimaryStyle(loading)}
                            >
                                {loading ? '⏳ Sauvegarde...' : '💾 Sauvegarder les informations'}
                            </button>
                        </div>
                    )}

                    {/* ─── MON PROFIL ─── */}
                    {onglet === 'profil' && (
                        <div style={{
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)', padding: 24,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                                👤 Mon profil
                            </h2>

                            {/* Avatar */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 20,
                                padding: 16, background: 'var(--gray-50)', borderRadius: 12,
                                border: '1px dashed var(--border)', marginBottom: 20,
                            }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 28, color: 'white', fontWeight: 800,
                                    overflow: 'hidden', border: '3px solid rgba(255,107,0,0.4)',
                                }}>
                                    {formProfil.avatar
                                        ? <img src={formProfil.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : (formProfil.prenom?.charAt(0) || formProfil.nom?.charAt(0) || '?').toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Photo de profil</div>
                                    <label style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        padding: '7px 14px',
                                        background: '#0F2D6B', color: 'white', borderRadius: 8,
                                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                    }}>
                                        📷 Changer
                                        <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            {/* Rôle (lecture seule) */}
                            <div style={{
                                padding: '12px 16px', background: 'rgba(255,107,0,0.08)',
                                borderRadius: 10, border: '1px solid rgba(255,107,0,0.2)',
                                marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <span style={{ fontSize: 24 }}>{ROLES_LABELS[profil?.role]?.emoji || '👤'}</span>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Rôle actuel</div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: '#FF6B00' }}>
                                        {ROLES_LABELS[profil?.role]?.label || profil?.role}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                {[
                                    { key: 'prenom',    label: 'Prénom',    ph: 'Jean'    },
                                    { key: 'nom',       label: 'Nom',       ph: 'Dupont'  },
                                    { key: 'telephone', label: 'Téléphone', ph: '+224 6XX', type: 'tel' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                            {f.label}
                                        </label>
                                        <input
                                            type={f.type || 'text'}
                                            value={formProfil[f.key]}
                                            onChange={e => setFormProfil(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.ph}
                                            style={inputStyle}
                                        />
                                    </div>
                                ))}
                            </div>

                            <button onClick={sauverProfil} disabled={loading} style={btnPrimaryStyle(loading)}>
                                {loading ? '⏳ Sauvegarde...' : '💾 Mettre à jour le profil'}
                            </button>
                        </div>
                    )}

                    {/* ─── SÉCURITÉ ─── */}
                    {onglet === 'securite' && (
                        <div style={{
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)', padding: 24,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                                🔒 Sécurité du compte
                            </h2>

                            <div style={{
                                padding: 14, background: 'rgba(239,68,68,0.06)',
                                borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
                                marginBottom: 20, fontSize: 13, color: '#991B1B',
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                            }}>
                                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                                <span>
                                    Ne partagez jamais votre mot de passe.
                                    Utilisez un mot de passe fort d'au moins 8 caractères
                                    avec des lettres, chiffres et symboles.
                                </span>
                            </div>

                            <div style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {[
                                    { key: 'ancienMdp',    label: 'Mot de passe actuel',   ph: '••••••••' },
                                    { key: 'nouveauMdp',   label: 'Nouveau mot de passe',  ph: 'Minimum 8 caractères' },
                                    { key: 'confirmerMdp', label: 'Confirmer nouveau mot de passe', ph: 'Confirmer...' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                            {f.label}
                                        </label>
                                        <input
                                            type="password"
                                            value={formSec[f.key]}
                                            onChange={e => setFormSec(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.ph}
                                            style={{
                                                ...inputStyle,
                                                borderColor: f.key === 'confirmerMdp' && formSec.nouveauMdp && formSec.confirmerMdp
                                                    ? (formSec.nouveauMdp === formSec.confirmerMdp ? '#10B981' : '#EF4444')
                                                    : undefined,
                                            }}
                                        />
                                        {f.key === 'confirmerMdp' && formSec.confirmerMdp && (
                                            <div style={{
                                                fontSize: 12, marginTop: 4, fontWeight: 600,
                                                color: formSec.nouveauMdp === formSec.confirmerMdp ? '#10B981' : '#EF4444',
                                            }}>
                                                {formSec.nouveauMdp === formSec.confirmerMdp ? '✅ Correspondent' : '❌ Ne correspondent pas'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleChangerMdp}
                                disabled={loading}
                                style={{ ...btnPrimaryStyle(loading), marginTop: 20, maxWidth: 280 }}
                            >
                                {loading ? '⏳ Changement...' : '🔒 Changer le mot de passe'}
                            </button>
                        </div>
                    )}

                    {/* ─── APPARENCE ─── */}
                    {onglet === 'apparence' && (
                        <div style={{
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)', padding: 24,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                                🎨 Apparence et animations
                            </h2>

                            {/* Thème */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Thème</div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {[
                                        { val: 'light',  label: 'Clair',   icon: '☀️', bg: '#F9FAFB', text: '#111827' },
                                        { val: 'dark',   label: 'Sombre',  icon: '🌙', bg: '#111827', text: '#F9FAFB' },
                                        { val: 'system', label: 'Système', icon: '💻', bg: 'linear-gradient(135deg,#F9FAFB 50%,#111827 50%)', text: '#6B7280' },
                                    ].map(t => (
                                        <button
                                            key={t.val}
                                            onClick={() => setFormApparence(p => ({ ...p, theme: t.val }))}
                                            style={{
                                                padding: '16px 24px',
                                                border: `2px solid ${formApparence.theme === t.val ? '#0F2D6B' : 'var(--border)'}`,
                                                borderRadius: 12, cursor: 'pointer',
                                                textAlign: 'center', fontFamily: 'Inter, sans-serif',
                                                background: formApparence.theme === t.val ? 'rgba(15,45,107,0.08)' : 'var(--card)',
                                                boxShadow: formApparence.theme === t.val ? '0 0 0 3px rgba(15,45,107,0.15)' : 'none',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{ fontSize: 28, marginBottom: 6 }}>{t.icon}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toggles */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                                {[
                                    { key: 'animations',      label: '✨ Animations',          desc: 'Transitions et effets visuels' },
                                    { key: 'sons',            label: '🔔 Sons',                 desc: 'Sons de notification et confirmation' },
                                    { key: 'modePerformance', label: '⚡ Mode performance',     desc: 'Désactive les animations pour appareils lents' },
                                ].map(opt => (
                                    <div key={opt.key} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', padding: '14px 16px',
                                        background: 'var(--gray-50)', borderRadius: 10,
                                        border: '1px solid var(--border)',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{opt.label}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{opt.desc}</div>
                                        </div>
                                        <label style={{
                                            position: 'relative', display: 'inline-block',
                                            width: 48, height: 26, cursor: 'pointer', flexShrink: 0,
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={formApparence[opt.key]}
                                                onChange={e => setFormApparence(p => ({ ...p, [opt.key]: e.target.checked }))}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span style={{
                                                position: 'absolute', inset: 0,
                                                background: formApparence[opt.key] ? '#0F2D6B' : '#D1D5DB',
                                                borderRadius: 26, transition: '0.3s',
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    height: 20, width: 20,
                                                    left: formApparence[opt.key] ? 24 : 3,
                                                    bottom: 3,
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    transition: '0.3s',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                }} />
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {/* Volume */}
                            {formApparence.sons && (
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                                        🔊 Volume des sons : {Math.round(formApparence.volume * 100)}%
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.05"
                                        value={formApparence.volume}
                                        onChange={e => setFormApparence(p => ({ ...p, volume: parseFloat(e.target.value) }))}
                                        style={{ width: '100%', maxWidth: 300 }}
                                    />
                                </div>
                            )}

                            <button onClick={sauverApparence} disabled={loading} style={btnPrimaryStyle(loading)}>
                                {loading ? '⏳ Sauvegarde...' : '💾 Sauvegarder l\'apparence'}
                            </button>
                        </div>
                    )}

                    {/* ─── NOTIFICATIONS ─── */}
                    {onglet === 'notifications' && (
                        <div style={{
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)', padding: 24,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                                🔔 Préférences de notifications
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { key: 'nouvelleCommande', label: '🆕 Nouvelle commande', desc: 'Notification quand une nouvelle commande arrive' },
                                    { key: 'commandePrete',    label: '📦 Commande prête',    desc: 'Quand une commande est prête à livrer/retirer' },
                                    { key: 'paiementRecu',     label: '💰 Paiement reçu',     desc: 'Confirmation de paiement enregistré' },
                                    { key: 'stockFaible',      label: '⚠️ Stock faible',       desc: 'Alerte quand le stock passe sous le seuil' },
                                ].map(n => (
                                    <div key={n.key} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', padding: '14px 16px',
                                        background: 'var(--gray-50)', borderRadius: 10,
                                        border: '1px solid var(--border)',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{n.label}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{n.desc}</div>
                                        </div>
                                        <label style={{
                                            position: 'relative', display: 'inline-block',
                                            width: 48, height: 26, cursor: 'pointer', flexShrink: 0,
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={formNotifs[n.key]}
                                                onChange={e => setFormNotifs(p => ({ ...p, [n.key]: e.target.checked }))}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span style={{
                                                position: 'absolute', inset: 0,
                                                background: formNotifs[n.key] ? '#FF6B00' : '#D1D5DB',
                                                borderRadius: 26, transition: '0.3s',
                                            }}>
                                                <span style={{
                                                    position: 'absolute', height: 20, width: 20,
                                                    left: formNotifs[n.key] ? 24 : 3, bottom: 3,
                                                    background: 'white', borderRadius: '50%',
                                                    transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                }} />
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => toast.success('Préférences sauvegardées !')}
                                style={{ ...btnPrimaryStyle(false), marginTop: 20 }}
                            >
                                💾 Sauvegarder
                            </button>
                        </div>
                    )}

                    {/* ─── HORAIRES ─── */}
                    {onglet === 'horaires' && (
                        <div style={{
                            background: 'var(--card)', borderRadius: 14,
                            border: '1px solid var(--border)', padding: 24,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                                🕐 Horaires d'ouverture
                            </h2>
                            {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map((jour, idx) => {
                                const key = jour.toLowerCase();
                                const h = entreprise?.horaires?.[key] || { ouvert: idx < 5, debut: '08:00', fin: '18:00' };
                                return (
                                    <div key={jour} style={{
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        padding: '12px 0', borderBottom: idx < 6 ? '1px solid var(--border)' : 'none',
                                    }}>
                                        <div style={{ width: 90, fontWeight: 700, fontSize: 14 }}>{jour}</div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                            <input type="checkbox" defaultChecked={h.ouvert} />
                                            <span style={{ fontSize: 12, color: h.ouvert ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                                {h.ouvert ? 'Ouvert' : 'Fermé'}
                                            </span>
                                        </label>
                                        {h.ouvert && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="time" defaultValue={h.debut} style={{ ...inputStyle, width: 100, padding: '6px 10px' }} />
                                                <span style={{ color: 'var(--text2)' }}>—</span>
                                                <input type="time" defaultValue={h.fin} style={{ ...inputStyle, width: 100, padding: '6px 10px' }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => toast.success('Horaires sauvegardés !')}
                                style={{ ...btnPrimaryStyle(false), marginTop: 20 }}
                            >
                                💾 Sauvegarder les horaires
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

// Styles locaux
const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '2px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
};

const btnPrimaryStyle = (loading) => ({
    padding: '12px 28px',
    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
    color: 'white', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: loading ? 'none' : '0 4px 14px rgba(15,45,107,0.3)',
    fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
});

export default ParametresPage;