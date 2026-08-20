import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import {
    ecouterAchats, creerAchat, mettreAJourAchat,
    changerStatutAchat, supprimerAchat
} from '../../services/achatService';
import { ecouterPartenaires } from '../../services/partenaireService';
import { PERMISSIONS } from '../../config/constants';

const STATUTS = {
    commande: { label: 'Commandé',  couleur: 'info',    emoji: '📋' },
    reçu:     { label: 'Reçu',      couleur: 'success', emoji: '📦' },
    payé:     { label: 'Payé',      couleur: 'primary', emoji: '💰' },
    annulé:   { label: 'Annulé',    couleur: 'danger',  emoji: '❌' },
};

const AchatsPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [achats, setAchats] = useState([]);
    const [partenaires, setPartenaires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtreStatut, setFiltreStatut] = useState('all');
    const [recherche, setRecherche] = useState('');

    const [modalForm, setModalForm] = useState(false);
    const [modalDetail, setModalDetail] = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [achatEdite, setAchatEdite] = useState(null);
    const [achatDetail, setAchatDetail] = useState(null);
    const [achatSuppr, setAchatSuppr] = useState(null);
    const [loadingForm, setLoadingForm] = useState(false);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            partenaireId: '', partenaireNom: '', partenaireTel: '',
            lignes: [{ description: '', quantite: 1, prixUnitaire: 0, sousTotal: 0, unite: 'u' }],
            sousTotal: 0, remise: 0, fraisTransport: 0, montantTotal: 0,
            montantPaye: 0, resteAPayer: 0,
            statut: 'commande', statutPaiement: 'non_paye',
            dateCommande: new Date().toISOString().split('T')[0],
            dateReception: '', notes: '',
        };
    }

    useEffect(() => {
        const filtres = {};
        if (filtreStatut !== 'all') filtres.statut = filtreStatut;

        const unsub = ecouterAchats(data => {
            setAchats(data);
            setLoading(false);
        }, filtres);
        return () => unsub();
    }, [filtreStatut]);

    useEffect(() => {
        const unsub = ecouterPartenaires(data => setPartenaires(data.filter(p => p.actif)));
        return () => unsub();
    }, []);

    const achatsFiltres = achats.filter(a => {
        if (!recherche) return true;
        const t = recherche.toLowerCase();
        return (a.numero || '').toLowerCase().includes(t) || (a.partenaireNom || '').toLowerCase().includes(t);
    });

    const devise = entreprise?.devise || 'GNF';
    const totalGlobal = achats.reduce((s, a) => s + (a.montantTotal || 0), 0);
    const totalPaye   = achats.reduce((s, a) => s + (a.montantPaye || 0), 0);
    const totalImpaye = totalGlobal - totalPaye;

    const ouvrirForm = (a = null) => {
        if (a) { setAchatEdite(a); setForm({ ...a }); }
        else   { setAchatEdite(null); setForm(formVide()); }
        setModalForm(true);
    };

    const recalculerTotaux = (lignes, remise = 0, transport = 0) => {
        const sousTotal = lignes.reduce((s, l) => s + ((l.quantite||1) * (l.prixUnitaire||0)), 0);
        const total = sousTotal - remise + transport;
        return { sousTotal, montantTotal: total };
    };

    const modifierLigne = (idx, champ, val) => {
        const lignes = [...form.lignes];
        lignes[idx] = { ...lignes[idx], [champ]: val };
        const l = lignes[idx];
        l.sousTotal = (l.quantite||1) * (l.prixUnitaire||0);
        const t = recalculerTotaux(lignes, form.remise, form.fraisTransport);
        setForm(p => ({ ...p, lignes, ...t, resteAPayer: t.montantTotal - p.montantPaye }));
    };

    const ajouterLigne = () => setForm(p => ({ ...p, lignes: [...p.lignes, { description: '', quantite: 1, prixUnitaire: 0, sousTotal: 0, unite: 'u' }] }));
    const supprimerLigne = (idx) => {
        const lignes = form.lignes.filter((_, i) => i !== idx);
        const t = recalculerTotaux(lignes, form.remise, form.fraisTransport);
        setForm(p => ({ ...p, lignes, ...t }));
    };

    const handleSubmit = async () => {
        if (!form.partenaireNom.trim()) { toast.warning('Fournisseur requis'); return; }
        if (form.lignes.every(l => !l.description)) { toast.warning('Ajoutez au moins une ligne'); return; }

        setLoadingForm(true);
        try {
            if (achatEdite) {
                await mettreAJourAchat(achatEdite.id, form, profil?.uid);
                toast.success('Achat modifié !');
            } else {
                const { numero } = await creerAchat({ ...form, devise }, profil?.uid);
                toast.success('Achat créé !', numero);
            }
            setModalForm(false);
        } catch (err) { toast.error('Erreur', err.message); }
        finally { setLoadingForm(false); }
    };

    const handleChangerStatut = async (id, statut) => {
        try {
            await changerStatutAchat(id, statut);
            toast.success(`${STATUTS[statut].emoji} ${STATUTS[statut].label}`);
        } catch (err) { toast.error('Erreur', err.message); }
    };

    const handleSupprimer = async () => {
        try {
            await supprimerAchat(achatSuppr.id, profil?.uid);
            toast.success('Achat supprimé');
            setModalConfirm(false);
        } catch (err) { toast.error('Erreur', err.message); }
    };

    const peutCreer = aPermission(PERMISSIONS.ACHATS_CREER);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🛒 Achats</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>{achats.length} achat{achats.length > 1 ? 's' : ''}</p>
                </div>
                {peutCreer && (
                    <button onClick={() => ouvrirForm()} style={{
                        padding: '11px 22px', background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(245,158,11,0.3)', fontFamily: 'Inter, sans-serif',
                    }}>
                        ➕ Nouvel achat
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard icon="🛒" label="Total achats"       value={achats.length}                                      couleur="warning" />
                <StatCard icon="💰" label="Montant total"      value={`${totalGlobal.toLocaleString('fr-FR')} ${devise}`} couleur="primary" />
                <StatCard icon="✅" label="Payé"                value={`${totalPaye.toLocaleString('fr-FR')} ${devise}`}   couleur="success" />
                <StatCard icon="⚠️" label="Reste à payer"      value={`${totalImpaye.toLocaleString('fr-FR')} ${devise}`} couleur="danger" />
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 12, padding: 14, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                    <input type="search" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 40px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--bg)', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => setFiltreStatut('all')} style={filterBtn(filtreStatut === 'all')}>Tous</button>
                    {Object.entries(STATUTS).map(([k, v]) => (
                        <button key={k} onClick={() => setFiltreStatut(k)} style={filterBtn(filtreStatut === k)}>
                            {v.emoji} {v.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: 20 }}>{[1,2,3].map(i => <Skeleton key={i} height={50} borderRadius={8} style={{ marginBottom: 10 }} />)}</div>
                ) : achatsFiltres.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>🛒</div>
                        <p style={{ fontWeight: 600 }}>Aucun achat</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#F59E0B', color: 'white' }}>
                                    {['N°','Fournisseur','Date','Montant','Payé','Statut','Actions'].map(h => (
                                        <th key={h} style={{ padding: '12px 14px', fontSize: 11, textAlign: 'left', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {achatsFiltres.map((a, i) => {
                                    const s = STATUTS[a.statut] || STATUTS.commande;
                                    return (
                                        <tr key={a.id} style={{ borderBottom: i < achatsFiltres.length - 1 ? '1px solid var(--border)' : 'none' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px 14px', fontWeight: 700, color: '#F59E0B', fontFamily: 'monospace', fontSize: 12 }}>{a.numero}</td>
                                            <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13 }}>{a.partenaireNom}</td>
                                            <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>{a.dateCommande}</td>
                                            <td style={{ padding: '11px 14px', fontWeight: 800, fontSize: 14 }}>{(a.montantTotal || 0).toLocaleString('fr-FR')} {devise}</td>
                                            <td style={{ padding: '11px 14px', fontWeight: 700, color: '#10B981', fontSize: 13 }}>{(a.montantPaye || 0).toLocaleString('fr-FR')}</td>
                                            <td style={{ padding: '11px 14px' }}><Badge variant={s.couleur} dot rounded>{s.emoji} {s.label}</Badge></td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ display: 'flex', gap: 5 }}>
                                                    <button onClick={() => { setAchatDetail(a); setModalDetail(true); }} style={btnSm('#0F2D6B')}>👁️</button>
                                                    {peutCreer && (
                                                        <>
                                                            {a.statut === 'commande' && <button onClick={() => handleChangerStatut(a.id, 'reçu')} style={btnSm('#10B981')} title="Marquer reçu">📦</button>}
                                                            {a.statut === 'reçu' && <button onClick={() => handleChangerStatut(a.id, 'payé')} style={btnSm('#3B82F6')} title="Marquer payé">💰</button>}
                                                            <button onClick={() => ouvrirForm(a)} style={btnSm('#8B5CF6')}>✏️</button>
                                                            <button onClick={() => { setAchatSuppr(a); setModalConfirm(true); }} style={btnSm('#EF4444')}>🗑️</button>
                                                        </>
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

            {/* MODAL FORM */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={achatEdite ? `✏️ Modifier ${achatEdite.numero}` : '➕ Nouvel achat'}
                icon="🛒"
                size="xl"
                footer={
                    <>
                        <button onClick={() => setModalForm(false)} style={btnCancel}>Annuler</button>
                        <button onClick={handleSubmit} disabled={loadingForm} style={{
                            padding: '10px 24px', background: loadingForm ? '#9CA3AF' : 'linear-gradient(135deg,#F59E0B,#D97706)',
                            color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loadingForm ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>
                            {loadingForm ? '⏳...' : (achatEdite ? '💾 Modifier' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={lab}>🏭 Fournisseur *</label>
                        <select value={form.partenaireId} onChange={e => {
                            const p = partenaires.find(x => x.id === e.target.value);
                            setForm(prev => ({ ...prev, partenaireId: e.target.value, partenaireNom: p?.nom || '', partenaireTel: p?.telephone || '' }));
                        }} style={input}>
                            <option value="">Sélectionner un fournisseur</option>
                            {partenaires.map(p => <option key={p.id} value={p.id}>{p.nom} - {p.entreprise}</option>)}
                        </select>
                        {!form.partenaireId && (
                            <input type="text" value={form.partenaireNom} onChange={e => setForm(p => ({ ...p, partenaireNom: e.target.value }))}
                                placeholder="Ou tapez le nom du fournisseur" style={{ ...input, marginTop: 8 }}/>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label style={lab}>📅 Date commande</label><input type="date" value={form.dateCommande} onChange={e => setForm(p => ({ ...p, dateCommande: e.target.value }))} style={input}/></div>
                        <div><label style={lab}>📦 Date réception</label><input type="date" value={form.dateReception} onChange={e => setForm(p => ({ ...p, dateReception: e.target.value }))} style={input}/></div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>🧾 Articles achetés</div>
                            <button type="button" onClick={ajouterLigne} style={{
                                padding: '6px 14px', background: '#F59E0B', color: 'white',
                                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}>➕ Ajouter</button>
                        </div>
                        {form.lignes.map((l, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 2fr 1.5fr auto', gap: 8, marginBottom: 8, alignItems: 'center', padding: 10, background: 'var(--gray-50)', borderRadius: 10 }}>
                                <input type="text" value={l.description} onChange={e => modifierLigne(idx, 'description', e.target.value)} placeholder="Description..." style={inputMini}/>
                                <input type="number" value={l.quantite} onChange={e => modifierLigne(idx, 'quantite', parseFloat(e.target.value) || 1)} placeholder="Qté" style={inputMini}/>
                                <input type="number" value={l.prixUnitaire} onChange={e => modifierLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)} placeholder="Prix U." style={inputMini}/>
                                <div style={{ fontWeight: 800, color: '#F59E0B', textAlign: 'right', fontSize: 13 }}>{(l.sousTotal || 0).toLocaleString('fr-FR')} {devise}</div>
                                {form.lignes.length > 1 && <button type="button" onClick={() => supprimerLigne(idx)} style={{ width: 26, height: 26, background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '50%', color: '#EF4444', cursor: 'pointer' }}>✕</button>}
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: 14, background: 'rgba(245,158,11,0.05)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div><label style={lab}>Remise</label><input type="number" value={form.remise} onChange={e => {
                                const r = parseFloat(e.target.value) || 0;
                                const t = recalculerTotaux(form.lignes, r, form.fraisTransport);
                                setForm(p => ({ ...p, remise: r, ...t, resteAPayer: t.montantTotal - p.montantPaye }));
                            }} style={input}/></div>
                            <div><label style={lab}>Transport</label><input type="number" value={form.fraisTransport} onChange={e => {
                                const tr = parseFloat(e.target.value) || 0;
                                const t = recalculerTotaux(form.lignes, form.remise, tr);
                                setForm(p => ({ ...p, fraisTransport: tr, ...t, resteAPayer: t.montantTotal - p.montantPaye }));
                            }} style={input}/></div>
                            <div><label style={lab}>Montant payé</label><input type="number" value={form.montantPaye} onChange={e => {
                                const mp = parseFloat(e.target.value) || 0;
                                setForm(p => ({ ...p, montantPaye: mp, resteAPayer: p.montantTotal - mp }));
                            }} style={input}/></div>
                        </div>
                        <div style={{ paddingTop: 10, borderTop: '2px solid rgba(245,158,11,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>Sous-total :</span><span>{form.sousTotal.toLocaleString('fr-FR')} {devise}</span></div>
                            {form.remise > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#EF4444' }}><span>Remise :</span><span>-{form.remise.toLocaleString('fr-FR')} {devise}</span></div>}
                            {form.fraisTransport > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Transport :</span><span>+{form.fraisTransport.toLocaleString('fr-FR')} {devise}</span></div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900, color: '#F59E0B', paddingTop: 8 }}>
                                <span>TOTAL :</span><span>{form.montantTotal.toLocaleString('fr-FR')} {devise}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 6 }}>
                                <span style={{ color: '#10B981' }}>Payé : {form.montantPaye.toLocaleString('fr-FR')} {devise}</span>
                                <span style={{ color: '#EF4444' }}>Reste : {(form.montantTotal - form.montantPaye).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={lab}>📝 Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...input, resize: 'vertical' }}/>
                    </div>
                </div>
            </Modal>

            {/* MODAL DETAIL */}
            <Modal isOpen={modalDetail} onClose={() => setModalDetail(false)} title={`🛒 Achat ${achatDetail?.numero || ''}`} size="lg" icon="🛒">
                {achatDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ padding: 14, background: 'var(--gray-50)', borderRadius: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>🏭 {achatDetail.partenaireNom}</div>
                            {achatDetail.partenaireTel && <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {achatDetail.partenaireTel}</div>}
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Commandé le : {achatDetail.dateCommande}</div>
                        </div>

                        <div style={{ background: 'var(--gray-50)', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ padding: 12, fontWeight: 700 }}>🧾 Articles</div>
                            {(achatDetail.lignes || []).map((l, i) => (
                                <div key={i} style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{l.description}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{l.quantite} × {l.prixUnitaire.toLocaleString('fr-FR')} {devise}</div>
                                    </div>
                                    <div style={{ fontWeight: 800, color: '#F59E0B' }}>{(l.sousTotal || 0).toLocaleString('fr-FR')} {devise}</div>
                                </div>
                            ))}
                            <div style={{ padding: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, color: '#F59E0B' }}>
                                <span>TOTAL</span><span>{(achatDetail.montantTotal || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🔄 Changer statut</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {Object.entries(STATUTS).filter(([k]) => k !== achatDetail.statut).map(([k, v]) => (
                                    <button key={k} onClick={() => { handleChangerStatut(achatDetail.id, k); setAchatDetail(prev => ({ ...prev, statut: k })); }} style={{
                                        padding: '7px 14px', background: 'var(--gray-100)', border: '1px solid var(--border)',
                                        borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {v.emoji} {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleSupprimer}
                title="Supprimer cet achat ?"
                message={`L'achat ${achatSuppr?.numero} sera supprimé.`}
                confirmText="Supprimer"
                type="danger"
            />
        </div>
    );
};

const lab = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' };
const input = { width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif' };
const inputMini = { ...input, padding: '8px 10px', fontSize: 12 };
const btnSm = (color) => ({ padding: '6px 10px', background: `${color}15`, color, border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' });
const filterBtn = (active) => ({ padding: '8px 14px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? '#F59E0B' : 'var(--bg)', color: active ? 'white' : 'var(--text2)', fontFamily: 'Inter, sans-serif' });
const btnCancel = { padding: '10px 20px', border: '2px solid var(--border)', borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' };

export default AchatsPage;