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
    ecouterDepenses, creerDepense,
    mettreAJourDepense, supprimerDepense
} from '../../services/depenseService';
import { PERMISSIONS, MOYENS_PAIEMENT } from '../../config/constants';

const CATEGORIES = [
    { id: 'loyer',        label: '🏢 Loyer',              couleur: '#8B5CF6' },
    { id: 'electricite',  label: '⚡ Électricité',         couleur: '#F59E0B' },
    { id: 'eau',          label: '💧 Eau',                couleur: '#06B6D4' },
    { id: 'internet',     label: '🌐 Internet',           couleur: '#3B82F6' },
    { id: 'telephone',    label: '📞 Téléphone',          couleur: '#10B981' },
    { id: 'salaires',     label: '💰 Salaires',           couleur: '#EF4444' },
    { id: 'transport',    label: '🚗 Transport',          couleur: '#F97316' },
    { id: 'fournitures',  label: '📦 Fournitures',        couleur: '#EC4899' },
    { id: 'marketing',    label: '📢 Marketing',          couleur: '#14B8A6' },
    { id: 'maintenance',  label: '🔧 Maintenance',        couleur: '#6B7280' },
    { id: 'taxes',        label: '📋 Taxes & Impôts',     couleur: '#DC2626' },
    { id: 'autre',        label: '📌 Autre',              couleur: '#94A3B8' },
];

const DepensesPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [depenses, setDepenses] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [recherche, setRecherche] = useState('');
    const [filtreCateg, setFiltreCateg] = useState('');
    const [filtreMois, setFiltreMois]   = useState('');

    const [modalForm, setModalForm]     = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [depEdite, setDepEdite]       = useState(null);
    const [depSuppr, setDepSuppr]       = useState(null);
    const [loadingForm, setLoadingForm] = useState(false);
    const [loadingImg, setLoadingImg]   = useState(false);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            libelle: '', description: '', categorie: 'autre',
            montant: '', moyenPaiement: 'especes',
            date: new Date().toISOString().split('T')[0],
            boutiqueId: '', boutiqueLabel: '',
            justificatif: null, notes: '',
        };
    }

    useEffect(() => {
        const filtres = {};
        if (filtreCateg) filtres.categorie = filtreCateg;

        const unsub = ecouterDepenses(data => {
            setDepenses(data);
            setLoading(false);
        }, filtres);
        return () => unsub();
    }, [filtreCateg]);

    const depensesFiltres = depenses.filter(d => {
        if (recherche) {
            const t = recherche.toLowerCase();
            if (!((d.libelle||'').toLowerCase().includes(t) ||
                  (d.description||'').toLowerCase().includes(t))) return false;
        }
        if (filtreMois) {
            const mois = new Date(d.date).getMonth() + 1;
            if (mois !== parseInt(filtreMois)) return false;
        }
        return true;
    });

    const devise = entreprise?.devise || 'GNF';
    const totalGlobal = depenses.reduce((s, d) => s + (d.montant || 0), 0);
    const auj = new Date().toISOString().split('T')[0];
    const totalJour = depenses.filter(d => d.date === auj).reduce((s, d) => s + (d.montant || 0), 0);
    const mois = new Date().getMonth() + 1;
    const annee = new Date().getFullYear();
    const totalMois = depenses.filter(d => {
        const dt = new Date(d.date);
        return dt.getMonth() + 1 === mois && dt.getFullYear() === annee;
    }).reduce((s, d) => s + (d.montant || 0), 0);

    const ouvrirForm = (dep = null) => {
        if (dep) {
            setDepEdite(dep);
            setForm({ ...dep });
        } else {
            setDepEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    const handleUploadJust = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const res = await uploaderImageProduit(file, `depense_${Date.now()}`);
            setForm(p => ({ ...p, justificatif: res.url }));
            toast.success('Justificatif uploadé !');
        } catch (err) {
            toast.error('Erreur upload', err.message);
        } finally {
            setLoadingImg(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.libelle.trim()) { toast.warning('Libellé requis'); return; }
        if (!form.montant || parseFloat(form.montant) <= 0) { toast.warning('Montant requis'); return; }

        setLoadingForm(true);
        try {
            if (depEdite) {
                await mettreAJourDepense(depEdite.id, form, profil?.uid);
                toast.success('Dépense modifiée !');
            } else {
                await creerDepense({ ...form, devise }, profil?.uid);
                toast.success('Dépense enregistrée !');
            }
            setModalForm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    const handleSupprimer = async () => {
        try {
            await supprimerDepense(depSuppr.id, profil?.uid);
            toast.success('Dépense supprimée');
            setModalConfirm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const peutCreer = aPermission(PERMISSIONS.DEPENSES_CREER);
    const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
    const getMoyenPai = (id) => MOYENS_PAIEMENT.find(m => m.id === id) || MOYENS_PAIEMENT[0];

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        💸 Dépenses
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {depenses.length} dépense{depenses.length > 1 ? 's' : ''} enregistrée{depenses.length > 1 ? 's' : ''}
                    </p>
                </div>
                {peutCreer && (
                    <button onClick={() => ouvrirForm()} style={{
                        padding: '11px 22px',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        color: 'white', border: 'none', borderRadius: 12,
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        ➕ Nouvelle dépense
                    </button>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard icon="💰" label="Total global"        value={`${totalGlobal.toLocaleString('fr-FR')} ${devise}`}  couleur="danger"    />
                <StatCard icon="📅" label="Aujourd'hui"          value={`${totalJour.toLocaleString('fr-FR')} ${devise}`}    couleur="warning"   />
                <StatCard icon="📊" label="Ce mois"              value={`${totalMois.toLocaleString('fr-FR')} ${devise}`}    couleur="info"      />
                <StatCard icon="📋" label="Nombre total"         value={depenses.length}                                     couleur="primary"   />
            </div>

            {/* Filtres */}
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: 14,
                border: '1px solid var(--border)', marginBottom: 20,
                display: 'flex', gap: 12, flexWrap: 'wrap',
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input type="search" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 40px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--bg)', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
                </div>
                <select value={filtreCateg} onChange={e => setFiltreCateg(e.target.value)} style={select}>
                    <option value="">Toutes catégories</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select value={filtreMois} onChange={e => setFiltreMois(e.target.value)} style={select}>
                    <option value="">Tous les mois</option>
                    {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i) => (
                        <option key={i+1} value={i+1}>{m}</option>
                    ))}
                </select>
            </div>

            {/* Tableau */}
            <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: 20 }}>
                        {[1,2,3].map(i => <Skeleton key={i} height={50} borderRadius={8} style={{ marginBottom: 10 }} />)}
                    </div>
                ) : depensesFiltres.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>💸</div>
                        <p style={{ fontWeight: 600 }}>Aucune dépense enregistrée</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#EF4444', color: 'white' }}>
                                    {['Date','Libellé','Catégorie','Moyen','Montant','Justif.','Actions'].map(h => (
                                        <th key={h} style={{ padding: '12px 14px', fontSize: 11, textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {depensesFiltres.map((d, i) => {
                                    const cat = getCat(d.categorie);
                                    const moyen = getMoyenPai(d.moyenPaiement);
                                    return (
                                        <tr key={d.id} style={{ borderBottom: i < depensesFiltres.length - 1 ? '1px solid var(--border)' : 'none' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{d.date}</td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ fontWeight: 700, fontSize: 13 }}>{d.libelle}</div>
                                                {d.description && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{d.description.substring(0, 40)}</div>}
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: 20, background: `${cat.couleur}20`, color: cat.couleur, fontSize: 11, fontWeight: 600 }}>
                                                    {cat.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '11px 14px', fontSize: 12 }}>{moyen.emoji} {moyen.label}</td>
                                            <td style={{ padding: '11px 14px', fontWeight: 900, color: '#EF4444', fontSize: 15 }}>
                                                - {(d.montant || 0).toLocaleString('fr-FR')} {devise}
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                {d.justificatif ? (
                                                    <a href={d.justificatif} target="_blank" rel="noreferrer" style={{ color: '#10B981', fontSize: 16, textDecoration: 'none' }}>📎</a>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {peutCreer && (
                                                        <>
                                                            <button onClick={() => ouvrirForm(d)} style={btnSm('#0F2D6B')}>✏️</button>
                                                            <button onClick={() => { setDepSuppr(d); setModalConfirm(true); }} style={btnSm('#EF4444')}>🗑️</button>
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
                title={depEdite ? '✏️ Modifier la dépense' : '➕ Nouvelle dépense'}
                icon="💸"
                size="md"
                footer={
                    <>
                        <button onClick={() => setModalForm(false)} style={btnCancel}>Annuler</button>
                        <button onClick={handleSubmit} disabled={loadingForm} style={{
                            padding: '10px 24px',
                            background: loadingForm ? '#9CA3AF' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                            color: 'white', border: 'none', borderRadius: 10,
                            fontSize: 14, fontWeight: 700, cursor: loadingForm ? 'not-allowed' : 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            {loadingForm ? '⏳...' : (depEdite ? '💾 Modifier' : '➕ Enregistrer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={lab}>📝 Libellé *</label>
                        <input type="text" value={form.libelle} onChange={e => setForm(p => ({ ...p, libelle: e.target.value }))}
                            placeholder="Ex: Facture électricité Août" style={input}/>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={lab}>💰 Montant * ({devise})</label>
                            <input type="number" min="0" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
                                placeholder="0" style={{ ...input, fontSize: 18, fontWeight: 700 }}/>
                        </div>
                        <div>
                            <label style={lab}>📅 Date *</label>
                            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={input}/>
                        </div>
                    </div>

                    <div>
                        <label style={lab}>📋 Catégorie *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                            {CATEGORIES.map(c => (
                                <button key={c.id} type="button" onClick={() => setForm(p => ({ ...p, categorie: c.id }))}
                                    style={{
                                        padding: '8px 12px',
                                        border: `2px solid ${form.categorie === c.id ? c.couleur : 'var(--border)'}`,
                                        borderRadius: 10, cursor: 'pointer',
                                        background: form.categorie === c.id ? `${c.couleur}15` : 'var(--card)',
                                        color: form.categorie === c.id ? c.couleur : 'var(--text2)',
                                        fontSize: 12, fontWeight: 600, textAlign: 'left',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={lab}>💳 Moyen de paiement</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
                            {MOYENS_PAIEMENT.map(m => (
                                <button key={m.id} type="button" onClick={() => setForm(p => ({ ...p, moyenPaiement: m.id }))}
                                    style={{
                                        padding: '8px 10px', textAlign: 'center',
                                        border: `2px solid ${form.moyenPaiement === m.id ? '#0F2D6B' : 'var(--border)'}`,
                                        borderRadius: 10, cursor: 'pointer',
                                        background: form.moyenPaiement === m.id ? 'rgba(15,45,107,0.08)' : 'var(--card)',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                    <div style={{ fontSize: 18, marginBottom: 2 }}>{m.emoji}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{m.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={lab}>📝 Description / Notes</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Détails de la dépense..." rows={2} style={{ ...input, resize: 'vertical' }}/>
                    </div>

                    <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                        <label style={lab}>📎 Justificatif (photo, facture...)</label>
                        {form.justificatif && (
                            <div style={{ marginBottom: 8 }}>
                                <img src={form.justificatif} alt="Justificatif" style={{ maxHeight: 120, borderRadius: 8 }}/>
                            </div>
                        )}
                        <label style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', background: loadingImg ? '#9CA3AF' : '#0F2D6B',
                            color: 'white', borderRadius: 8, cursor: loadingImg ? 'wait' : 'pointer',
                            fontSize: 12, fontWeight: 600,
                        }}>
                            {loadingImg ? '⏳ Upload...' : '📷 Choisir un fichier'}
                            <input type="file" accept="image/*" onChange={handleUploadJust} disabled={loadingImg} style={{ display: 'none' }}/>
                        </label>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleSupprimer}
                title="Supprimer cette dépense ?"
                message={`La dépense "${depSuppr?.libelle}" sera supprimée définitivement.`}
                confirmText="Supprimer"
                type="danger"
            />
        </div>
    );
};

const lab = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' };
const input = { width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif' };
const select = { padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' };
const btnSm = (color) => ({ padding: '6px 10px', background: `${color}15`, color, border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' });
const btnCancel = { padding: '10px 20px', border: '2px solid var(--border)', borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' };

export default DepensesPage;