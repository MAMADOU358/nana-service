import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import { uploaderImageProduit } from '../../services/uploadService';
import {
    ecouterPartenaires, creerPartenaire, mettreAJourPartenaire,
    supprimerPartenaire, togglePartenaire, toggleFavoriPartenaire
} from '../../services/partenaireService';
import { PERMISSIONS } from '../../config/constants';

const TYPES = [
    { id: 'fournisseur',  label: '🏭 Fournisseur',      couleur: '#0F2D6B' },
    { id: 'transporteur', label: '🚚 Transporteur',     couleur: '#F59E0B' },
    { id: 'prestataire',  label: '🔧 Prestataire',      couleur: '#10B981' },
    { id: 'client_pro',   label: '💼 Client pro',       couleur: '#8B5CF6' },
    { id: 'autre',        label: '📌 Autre',            couleur: '#6B7280' },
];

const PartenairesPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [partenaires, setPartenaires] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [recherche, setRecherche]     = useState('');
    const [filtreType, setFiltreType]   = useState('');

    const [modalForm, setModalForm]       = useState(false);
    const [modalDetail, setModalDetail]   = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [partEdite, setPartEdite]       = useState(null);
    const [partDetail, setPartDetail]     = useState(null);
    const [partSuppr, setPartSuppr]       = useState(null);
    const [loadingForm, setLoadingForm]   = useState(false);
    const [loadingImg, setLoadingImg]     = useState(false);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            nom: '', type: 'fournisseur', entreprise: '', contact: '',
            telephone: '', whatsapp: '', email: '',
            adresse: '', ville: '', pays: 'Guinée',
            siteWeb: '', siret: '', specialite: '',
            conditions: '', notes: '', logo: null,
            actif: true, favori: false, note: 0,
        };
    }

    useEffect(() => {
        const filtres = {};
        if (filtreType) filtres.type = filtreType;

        const unsub = ecouterPartenaires(data => {
            setPartenaires(data);
            setLoading(false);
        }, filtres);
        return () => unsub();
    }, [filtreType]);

    const partenairesFiltres = partenaires.filter(p => {
        if (!recherche) return true;
        const t = recherche.toLowerCase();
        return (
            (p.nom || '').toLowerCase().includes(t) ||
            (p.entreprise || '').toLowerCase().includes(t) ||
            (p.telephone || '').includes(t) ||
            (p.email || '').toLowerCase().includes(t) ||
            (p.specialite || '').toLowerCase().includes(t)
        );
    });

    const devise = entreprise?.devise || 'GNF';
    const totalAchats = partenaires.reduce((s, p) => s + (p.totalAchats || 0), 0);
    const favoris = partenaires.filter(p => p.favori).length;

    const ouvrirForm = (p = null) => {
        if (p) {
            setPartEdite(p);
            setForm({ ...p });
        } else {
            setPartEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    const handleImg = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const res = await uploaderImageProduit(file, `partenaire_${form.nom || 'test'}`);
            setForm(p => ({ ...p, logo: res.url }));
            toast.success('Logo uploadé !');
        } catch (err) { toast.error('Erreur', err.message); }
        finally { setLoadingImg(false); }
    };

    const handleSubmit = async () => {
        if (!form.nom.trim()) { toast.warning('Nom requis'); return; }
        setLoadingForm(true);
        try {
            if (partEdite) {
                await mettreAJourPartenaire(partEdite.id, form, profil?.uid);
                toast.success('Partenaire modifié !');
            } else {
                await creerPartenaire(form, profil?.uid);
                toast.success('Partenaire créé !');
            }
            setModalForm(false);
        } catch (err) { toast.error('Erreur', err.message); }
        finally { setLoadingForm(false); }
    };

    const handleToggle = async (p) => {
        try {
            await togglePartenaire(p.id, !p.actif);
            toast.info(!p.actif ? '✅ Activé' : '❌ Désactivé', p.nom);
        } catch (err) { toast.error('Erreur', err.message); }
    };

    const handleFavori = async (p) => {
        try {
            await toggleFavoriPartenaire(p.id, !p.favori);
            toast.success(!p.favori ? '⭐ Ajouté aux favoris' : 'Retiré des favoris');
        } catch (err) { toast.error('Erreur', err.message); }
    };

    const handleSupprimer = async () => {
        try {
            await supprimerPartenaire(partSuppr.id, profil?.uid);
            toast.success('Partenaire supprimé');
            setModalConfirm(false);
        } catch (err) { toast.error('Erreur', err.message); }
    };

    const peutCreer = aPermission(PERMISSIONS.PARTENAIRES_CREER);
    const getType = (t) => TYPES.find(x => x.id === t) || TYPES[TYPES.length - 1];

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🤝 Partenaires</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>{partenaires.length} partenaire{partenaires.length > 1 ? 's' : ''}</p>
                </div>
                {peutCreer && (
                    <button onClick={() => ouvrirForm()} style={{
                        padding: '11px 22px', background: 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                        color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', boxShadow: '0 4px 14px rgba(15,45,107,0.3)', fontFamily: 'Inter, sans-serif',
                    }}>
                        ➕ Nouveau partenaire
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard icon="🤝" label="Total"            value={partenaires.length}                              couleur="primary" />
                <StatCard icon="✅" label="Actifs"           value={partenaires.filter(p => p.actif).length}         couleur="success" />
                <StatCard icon="⭐" label="Favoris"          value={favoris}                                          couleur="warning" />
                <StatCard icon="💰" label="Total achats"     value={`${totalAchats.toLocaleString('fr-FR')} ${devise}`} couleur="info" />
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 12, padding: 14, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                    <input type="search" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 40px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--bg)', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
                </div>
                <select value={filtreType} onChange={e => setFiltreType(e.target.value)} style={selectStyle}>
                    <option value="">Tous les types</option>
                    {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                    {[1,2,3,4].map(i => <Skeleton key={i} height={220} borderRadius={14} />)}
                </div>
            ) : partenairesFiltres.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--card)', borderRadius: 14, border: '2px dashed var(--border)' }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>🤝</div>
                    <p style={{ fontWeight: 700 }}>Aucun partenaire</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {partenairesFiltres.map(p => {
                        const type = getType(p.type);
                        return (
                            <div key={p.id} style={{
                                background: 'var(--card)', borderRadius: 14, overflow: 'hidden',
                                border: `2px solid ${p.actif ? 'transparent' : 'var(--border)'}`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                opacity: p.actif ? 1 : 0.6,
                            }}>
                                <div style={{ padding: 16, background: `linear-gradient(135deg, ${type.couleur}20, ${type.couleur}05)`, position: 'relative' }}>
                                    {p.favori && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 20 }}>⭐</span>}
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{
                                            width: 56, height: 56, borderRadius: 12,
                                            background: p.logo ? 'white' : type.couleur,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 26, color: 'white', overflow: 'hidden', flexShrink: 0,
                                        }}>
                                            {p.logo ? <img src={p.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : type.label.split(' ')[0]}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: 15 }}>{p.nom}</div>
                                            {p.entreprise && <div style={{ fontSize: 12, color: 'var(--text2)' }}>🏢 {p.entreprise}</div>}
                                            <Badge variant="primary" style={{ marginTop: 4, fontSize: 10, background: `${type.couleur}20`, color: type.couleur }}>
                                                {type.label}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: 14, fontSize: 12, color: 'var(--text2)' }}>
                                    {p.contact && <div style={{ marginBottom: 4 }}>👤 {p.contact}</div>}
                                    {p.telephone && <div style={{ marginBottom: 4 }}>📞 {p.telephone}</div>}
                                    {p.email && <div style={{ marginBottom: 4 }}>✉️ {p.email}</div>}
                                    {p.ville && <div style={{ marginBottom: 4 }}>📍 {p.ville}</div>}
                                    {p.specialite && <div style={{ marginBottom: 4 }}>🎯 {p.specialite}</div>}
                                </div>

                                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                                    <button onClick={() => { setPartDetail(p); setModalDetail(true); }} style={btnMini('#0F2D6B')}>👁️ Voir</button>
                                    {peutCreer && (
                                        <>
                                            <button onClick={() => handleFavori(p)} style={btnMini(p.favori ? '#F59E0B' : '#6B7280')}>{p.favori ? '⭐' : '☆'}</button>
                                            <button onClick={() => ouvrirForm(p)} style={btnMini('#3B82F6')}>✏️</button>
                                            <button onClick={() => { setPartSuppr(p); setModalConfirm(true); }} style={btnMini('#EF4444')}>🗑️</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL FORM */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={partEdite ? '✏️ Modifier partenaire' : '➕ Nouveau partenaire'}
                icon="🤝"
                size="lg"
                footer={
                    <>
                        <button onClick={() => setModalForm(false)} style={btnCancel}>Annuler</button>
                        <button onClick={handleSubmit} disabled={loadingForm} style={btnSave(loadingForm)}>
                            {loadingForm ? '⏳...' : (partEdite ? '💾 Modifier' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: 14, background: 'var(--gray-50)', borderRadius: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 14, background: form.logo ? 'white' : 'linear-gradient(135deg,#0F2D6B,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: 'white', overflow: 'hidden' }}>
                            {form.logo ? <img src={form.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '🤝'}
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0F2D6B', color: 'white', borderRadius: 8, cursor: loadingImg ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                            {loadingImg ? '⏳...' : '📷 Logo'}
                            <input type="file" accept="image/*" onChange={handleImg} disabled={loadingImg} style={{ display: 'none' }}/>
                        </label>
                    </div>

                    <div>
                        <label style={lab}>Type de partenaire *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                            {TYPES.map(t => (
                                <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, type: t.id }))}
                                    style={{
                                        padding: '8px 12px',
                                        border: `2px solid ${form.type === t.id ? t.couleur : 'var(--border)'}`,
                                        borderRadius: 10, cursor: 'pointer',
                                        background: form.type === t.id ? `${t.couleur}15` : 'var(--card)',
                                        color: form.type === t.id ? t.couleur : 'var(--text2)',
                                        fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                                    }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Nom *</label><input type="text" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom du partenaire" style={input}/></div>
                        <div><label style={lab}>Entreprise</label><input type="text" value={form.entreprise} onChange={e => setForm(p => ({ ...p, entreprise: e.target.value }))} placeholder="Raison sociale" style={input}/></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Contact</label><input type="text" value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="Nom du contact" style={input}/></div>
                        <div><label style={lab}>Spécialité</label><input type="text" value={form.specialite} onChange={e => setForm(p => ({ ...p, specialite: e.target.value }))} placeholder="Ex: Papeterie, Encre..." style={input}/></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Téléphone</label><input type="tel" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+224..." style={input}/></div>
                        <div><label style={lab}>WhatsApp</label><input type="tel" value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+224..." style={input}/></div>
                        <div><label style={lab}>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={input}/></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Adresse</label><input type="text" value={form.adresse} onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))} style={input}/></div>
                        <div><label style={lab}>Ville</label><input type="text" value={form.ville} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} style={input}/></div>
                        <div><label style={lab}>Pays</label><input type="text" value={form.pays} onChange={e => setForm(p => ({ ...p, pays: e.target.value }))} style={input}/></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Site web</label><input type="url" value={form.siteWeb} onChange={e => setForm(p => ({ ...p, siteWeb: e.target.value }))} placeholder="https://..." style={input}/></div>
                        <div><label style={lab}>N° SIRET / RCCM</label><input type="text" value={form.siret} onChange={e => setForm(p => ({ ...p, siret: e.target.value }))} style={input}/></div>
                    </div>

                    <div>
                        <label style={lab}>Conditions commerciales</label>
                        <input type="text" value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} placeholder="Ex: Paiement 30j fin de mois, remise 5%..." style={input}/>
                    </div>

                    <div>
                        <label style={lab}>Notes internes</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...input, resize: 'vertical' }}/>
                    </div>

                    <div style={{ display: 'flex', gap: 20, padding: 12, background: 'var(--gray-50)', borderRadius: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <input type="checkbox" checked={form.actif} onChange={e => setForm(p => ({ ...p, actif: e.target.checked }))}/> ✅ Actif
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <input type="checkbox" checked={form.favori} onChange={e => setForm(p => ({ ...p, favori: e.target.checked }))}/> ⭐ Favori
                        </label>
                    </div>
                </div>
            </Modal>

            {/* MODAL DETAIL */}
            <Modal
                isOpen={modalDetail}
                onClose={() => setModalDetail(false)}
                title={`🤝 ${partDetail?.nom || ''}`}
                size="md"
                icon="🤝"
            >
                {partDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { icon: '🏢', label: 'Entreprise',    val: partDetail.entreprise },
                            { icon: '👤', label: 'Contact',       val: partDetail.contact },
                            { icon: '📞', label: 'Téléphone',     val: partDetail.telephone },
                            { icon: '💬', label: 'WhatsApp',      val: partDetail.whatsapp },
                            { icon: '✉️', label: 'Email',         val: partDetail.email },
                            { icon: '📍', label: 'Adresse',       val: [partDetail.adresse, partDetail.ville, partDetail.pays].filter(Boolean).join(', ') },
                            { icon: '🌐', label: 'Site web',      val: partDetail.siteWeb },
                            { icon: '📋', label: 'SIRET / RCCM',  val: partDetail.siret },
                            { icon: '🎯', label: 'Spécialité',    val: partDetail.specialite },
                            { icon: '💼', label: 'Conditions',    val: partDetail.conditions },
                        ].filter(i => i.val).map(item => (
                            <div key={item.label} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 10 }}>
                                <span style={{ fontSize: 18 }}>{item.icon}</span>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{item.label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.val}</div>
                                </div>
                            </div>
                        ))}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ padding: 14, background: 'rgba(15,45,107,0.05)', borderRadius: 10, textAlign: 'center' }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#0F2D6B' }}>{partDetail.nbAchats || 0}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Achats effectués</div>
                            </div>
                            <div style={{ padding: 14, background: 'rgba(16,185,129,0.05)', borderRadius: 10, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>{(partDetail.totalAchats || 0).toLocaleString('fr-FR')}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Total {devise}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            {partDetail.telephone && <a href={`tel:${partDetail.telephone}`} style={{ flex: 1, padding: 10, background: '#10B981', color: 'white', borderRadius: 10, textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>📞 Appeler</a>}
                            {partDetail.whatsapp && <a href={`https://wa.me/${partDetail.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" style={{ flex: 1, padding: 10, background: '#25D366', color: 'white', borderRadius: 10, textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>💬 WhatsApp</a>}
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleSupprimer}
                title="Supprimer ce partenaire ?"
                message={`"${partSuppr?.nom}" sera supprimé définitivement.`}
                confirmText="Supprimer"
                type="danger"
            />
        </div>
    );
};

const lab = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' };
const input = { width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif' };
const selectStyle = { padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' };
const btnMini = (color) => ({ flex: 1, padding: '7px 10px', background: `${color}15`, color, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' });
const btnCancel = { padding: '10px 20px', border: '2px solid var(--border)', borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' };
const btnSave = (l) => ({ padding: '10px 24px', background: l ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: l ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' });

export default PartenairesPage;