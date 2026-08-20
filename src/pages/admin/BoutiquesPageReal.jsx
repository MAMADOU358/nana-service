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
    ecouterBoutiques, creerBoutique,
    mettreAJourBoutique, supprimerBoutique, toggleBoutique
} from '../../services/boutiqueService';
import { PERMISSIONS } from '../../config/constants';

const EMOJIS = ['🏪','🏬','🏢','🏭','🛍️','🏛️','🎪','🎨','💼','🖥️'];
const COULEURS = ['#0F2D6B','#FF6B00','#10B981','#EF4444','#8B5CF6','#F59E0B','#EC4899','#06B6D4','#374151'];

const BoutiquesPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [boutiques, setBoutiques] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [modalForm, setModalForm] = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [bqEdite, setBqEdite]     = useState(null);
    const [bqSuppr, setBqSuppr]     = useState(null);
    const [loadingForm, setLoadingForm] = useState(false);
    const [loadingImg, setLoadingImg] = useState(false);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            nom: '', adresse: '', ville: '', telephone: '', email: '',
            responsable: '', emoji: '🏪', couleur: '#0F2D6B',
            image: null, horaires: '08:00 - 18:00',
            actif: true, principale: false,
        };
    }

    useEffect(() => {
        const unsub = ecouterBoutiques(data => {
            setBoutiques(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const ouvrirForm = (bq = null) => {
        if (bq) {
            setBqEdite(bq);
            setForm({ ...bq });
        } else {
            setBqEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    const handleImg = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const res = await uploaderImageProduit(file, `boutique_${form.nom||'test'}`);
            setForm(p => ({ ...p, image: res.url }));
            toast.success('Image uploadée !');
        } catch (err) { toast.error('Erreur', err.message); }
        finally { setLoadingImg(false); }
    };

    const handleSubmit = async () => {
        if (!form.nom.trim()) { toast.warning('Nom requis'); return; }
        setLoadingForm(true);
        try {
            if (bqEdite) {
                await mettreAJourBoutique(bqEdite.id, form, profil?.uid);
                toast.success('Boutique modifiée !');
            } else {
                await creerBoutique(form, profil?.uid);
                toast.success('Boutique créée !');
            }
            setModalForm(false);
        } catch (err) { toast.error('Erreur', err.message); }
        finally { setLoadingForm(false); }
    };

    const handleToggle = async (bq) => {
        try {
            await toggleBoutique(bq.id, !bq.actif);
            toast.info(!bq.actif ? '✅ Activée' : '❌ Désactivée', bq.nom);
        } catch (err) { toast.error('Erreur', err.message); }
    };

    const handleSupprimer = async () => {
        try {
            await supprimerBoutique(bqSuppr.id, profil?.uid);
            toast.success('Boutique supprimée');
            setModalConfirm(false);
        } catch (err) { toast.error('Erreur', err.message); }
    };

    const peutCreer = aPermission(PERMISSIONS.BOUTIQUES_CREER);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>🏪 Boutiques</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>{boutiques.length} boutique{boutiques.length > 1 ? 's' : ''}</p>
                </div>
                {peutCreer && (
                    <button onClick={() => ouvrirForm()} style={{
                        padding: '11px 22px', background: 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                        color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(15,45,107,0.3)', fontFamily: 'Inter, sans-serif',
                    }}>
                        ➕ Nouvelle boutique
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard icon="🏪" label="Total"     value={boutiques.length}                                couleur="primary" />
                <StatCard icon="✅" label="Actives"   value={boutiques.filter(b => b.actif).length}          couleur="success" />
                <StatCard icon="👤" label="Avec responsable" value={boutiques.filter(b => b.responsable).length} couleur="info" />
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                    {[1,2,3].map(i => <Skeleton key={i} height={280} borderRadius={14} />)}
                </div>
            ) : boutiques.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--card)', borderRadius: 14, border: '2px dashed var(--border)' }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>🏪</div>
                    <p style={{ fontSize: 16, fontWeight: 700 }}>Aucune boutique</p>
                    {peutCreer && (
                        <button onClick={() => ouvrirForm()} style={{ marginTop: 16, padding: '11px 22px', background: '#0F2D6B', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                            ➕ Créer votre première boutique
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {boutiques.map(bq => (
                        <div key={bq.id} style={{
                            background: 'var(--card)', borderRadius: 16, overflow: 'hidden',
                            border: `2px solid ${bq.actif ? bq.couleur || '#0F2D6B' : 'var(--border)'}`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)', opacity: bq.actif ? 1 : 0.6,
                        }}>
                            <div style={{
                                background: `linear-gradient(135deg, ${bq.couleur || '#0F2D6B'}, ${bq.couleur || '#0F2D6B'}cc)`,
                                padding: '20px', color: 'white', textAlign: 'center', position: 'relative',
                            }}>
                                {bq.principale && (
                                    <span style={{ position: 'absolute', top: 10, right: 10, background: '#FF6B00', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                                        ⭐ Principale
                                    </span>
                                )}
                                <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(255,255,255,0.2)', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, overflow: 'hidden' }}>
                                    {bq.image
                                        ? <img src={bq.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                                        : bq.emoji}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 18 }}>{bq.nom}</div>
                                {bq.ville && <div style={{ fontSize: 12, opacity: 0.85 }}>📍 {bq.ville}</div>}
                            </div>

                            <div style={{ padding: 14 }}>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.6 }}>
                                    {bq.adresse && <div>📍 {bq.adresse}</div>}
                                    {bq.telephone && <div>📞 {bq.telephone}</div>}
                                    {bq.email && <div>✉️ {bq.email}</div>}
                                    {bq.responsable && <div>👤 {bq.responsable}</div>}
                                    {bq.horaires && <div>🕐 {bq.horaires}</div>}
                                </div>

                                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                    <Badge variant={bq.actif ? 'success' : 'danger'} dot rounded>
                                        {bq.actif ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>

                                {peutCreer && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => handleToggle(bq)} style={{
                                            flex: 1, padding: '8px',
                                            background: bq.actif ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                            color: bq.actif ? '#EF4444' : '#10B981', border: 'none', borderRadius: 8,
                                            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        }}>
                                            {bq.actif ? '❌ Désactiver' : '✅ Activer'}
                                        </button>
                                        <button onClick={() => ouvrirForm(bq)} style={{
                                            padding: '8px 14px', background: 'rgba(15,45,107,0.1)',
                                            color: '#0F2D6B', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        }}>✏️</button>
                                        <button onClick={() => { setBqSuppr(bq); setModalConfirm(true); }} style={{
                                            padding: '8px 14px', background: 'rgba(239,68,68,0.1)',
                                            color: '#EF4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        }}>🗑️</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={bqEdite ? '✏️ Modifier boutique' : '➕ Nouvelle boutique'}
                icon="🏪"
                size="md"
                footer={
                    <>
                        <button onClick={() => setModalForm(false)} style={btnCancel}>Annuler</button>
                        <button onClick={handleSubmit} disabled={loadingForm} style={btnSave(loadingForm)}>
                            {loadingForm ? '⏳...' : (bqEdite ? '💾 Modifier' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', gap: 14, padding: 14, background: `${form.couleur}10`, borderRadius: 12 }}>
                        <div style={{ width: 60, height: 60, borderRadius: 12, background: form.image ? 'transparent' : form.couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: 'white', overflow: 'hidden' }}>
                            {form.image ? <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : form.emoji}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: form.couleur, color: 'white', borderRadius: 8, cursor: loadingImg ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                                {loadingImg ? '⏳...' : '📷 Image'}
                                <input type="file" accept="image/*" onChange={handleImg} disabled={loadingImg} style={{ display: 'none' }}/>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={lab}>Nom *</label>
                        <input type="text" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Boutique principale" style={input}/>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Adresse</label><input type="text" value={form.adresse} onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))} placeholder="Quartier, rue..." style={input}/></div>
                        <div><label style={lab}>Ville</label><input type="text" value={form.ville} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} placeholder="Conakry" style={input}/></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Téléphone</label><input type="tel" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+224..." style={input}/></div>
                        <div><label style={lab}>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={input}/></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>Responsable</label><input type="text" value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))} placeholder="Nom du responsable" style={input}/></div>
                        <div><label style={lab}>Horaires</label><input type="text" value={form.horaires} onChange={e => setForm(p => ({ ...p, horaires: e.target.value }))} placeholder="08:00 - 18:00" style={input}/></div>
                    </div>

                    <div>
                        <label style={lab}>Emoji</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {EMOJIS.map(e => (
                                <button key={e} type="button" onClick={() => setForm(p => ({ ...p, emoji: e }))} style={{ width: 40, height: 40, fontSize: 20, border: `2px solid ${form.emoji === e ? '#0F2D6B' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', background: 'white' }}>{e}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={lab}>Couleur</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {COULEURS.map(c => (
                                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, couleur: c }))} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${form.couleur === c ? '#111' : 'transparent'}`, cursor: 'pointer' }}/>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, padding: 12, background: 'var(--gray-50)', borderRadius: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <input type="checkbox" checked={form.actif} onChange={e => setForm(p => ({ ...p, actif: e.target.checked }))}/> ✅ Active
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <input type="checkbox" checked={form.principale} onChange={e => setForm(p => ({ ...p, principale: e.target.checked }))}/> ⭐ Boutique principale
                        </label>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleSupprimer}
                title="Supprimer cette boutique ?"
                message={`"${bqSuppr?.nom}" sera supprimée définitivement.`}
                confirmText="Supprimer"
                type="danger"
                motConfirmation="SUPPRIMER"
            />
        </div>
    );
};

const lab = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' };
const input = { width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif' };
const btnCancel = { padding: '10px 20px', border: '2px solid var(--border)', borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' };
const btnSave = (l) => ({ padding: '10px 24px', background: l ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: l ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' });

export default BoutiquesPage;