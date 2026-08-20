import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import {
    ecouterDevis, creerDevis, mettreAJourDevis,
    changerStatutDevis, convertirEnCommande, supprimerDevis
} from '../../services/devisService';
import { rechercherClients } from '../../services/clientService';
import { PERMISSIONS } from '../../config/constants';

const STATUTS = {
    en_attente: { label: 'En attente', couleur: 'warning',  emoji: '⏳' },
    envoye:     { label: 'Envoyé',      couleur: 'info',     emoji: '📤' },
    accepte:    { label: 'Accepté',     couleur: 'success',  emoji: '✅' },
    refuse:     { label: 'Refusé',      couleur: 'danger',   emoji: '❌' },
    expire:     { label: 'Expiré',      couleur: 'gray',     emoji: '⏰' },
    converti:   { label: 'Converti',    couleur: 'purple',   emoji: '🎉' },
};

const DevisPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise, domaines } = useApp();
    const toast = useToast();

    const [devisList, setDevisList] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [filtreStatut, setFiltreStatut] = useState('all');
    const [recherche, setRecherche] = useState('');

    // Modals
    const [modalForm, setModalForm]   = useState(false);
    const [modalDetail, setModalDetail] = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [modalConvert, setModalConvert] = useState(false);
    const [devisEdite, setDevisEdite]   = useState(null);
    const [devisDetail, setDevisDetail] = useState(null);
    const [devisSuppr, setDevisSuppr]   = useState(null);
    const [devisConvert, setDevisConvert] = useState(null);
    const [loadingForm, setLoadingForm] = useState(false);

    const [rechClient, setRechClient] = useState('');
    const [clientsRech, setClientsRech] = useState([]);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            clientId: '', clientNom: '', clientTel: '', clientEmail: '', clientAdresse: '',
            domaineId: '', domaineLabel: '',
            lignes: [{ description: '', quantite: 1, prixUnitaire: 0, remise: 0, sousTotal: 0, unite: 'u' }],
            sousTotal: 0, remiseGlobale: 0, montantRemise: 0,
            tauxTVA: 0, montantTVA: 0, montantTotal: 0,
            dateEmission: new Date().toISOString().split('T')[0],
            dateExpiration: '',
            notes: '',
            conditionsPaiement: 'Paiement à 30 jours',
            conditionsLivraison: '',
        };
    }

    // Charger devis
    useEffect(() => {
        const filtres = {};
        if (filtreStatut !== 'all') filtres.statut = filtreStatut;

        const unsub = ecouterDevis(data => {
            setDevisList(data);
            setLoading(false);
        }, filtres);
        return () => unsub();
    }, [filtreStatut]);

    // Rechercher clients
    useEffect(() => {
        if (rechClient.length < 2) { setClientsRech([]); return; }
        const timer = setTimeout(async () => {
            const res = await rechercherClients(rechClient);
            setClientsRech(res);
        }, 300);
        return () => clearTimeout(timer);
    }, [rechClient]);

    // Filtrer
    const devisFiltres = devisList.filter(d => {
        if (!recherche) return true;
        const t = recherche.toLowerCase();
        return (
            d.numero?.toLowerCase().includes(t) ||
            d.clientNom?.toLowerCase().includes(t) ||
            d.clientTel?.includes(t)
        );
    });

    // Stats
    const total     = devisList.length;
    const enAttente = devisList.filter(d => d.statut === 'en_attente').length;
    const acceptes  = devisList.filter(d => d.statut === 'accepte').length;
    const convertis = devisList.filter(d => d.convertiEnCommande).length;
    const montantTotal = devisList.filter(d => d.statut === 'accepte').reduce((s, d) => s + (d.montantTotal || 0), 0);

    const devise = entreprise?.devise || 'GNF';

    // Ouvrir form
    const ouvrirForm = (devis = null) => {
        if (devis) {
            setDevisEdite(devis);
            setForm({ ...devis });
        } else {
            setDevisEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    // Recalculer totaux
    const recalculerTotaux = (lignes, remise = 0, tva = 0) => {
        const sousTotal = lignes.reduce((s, l) => {
            const st = (l.quantite || 1) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100);
            return s + st;
        }, 0);
        const montantRemise = sousTotal * (remise / 100);
        const apresRemise   = sousTotal - montantRemise;
        const montantTVA    = apresRemise * (tva / 100);
        const montantTotal  = apresRemise + montantTVA;
        return { sousTotal, montantRemise, montantTVA, montantTotal };
    };

    // Modifier ligne
    const modifierLigne = (idx, champ, val) => {
        const lignes = [...form.lignes];
        lignes[idx] = { ...lignes[idx], [champ]: val };
        const l = lignes[idx];
        l.sousTotal = (l.quantite || 1) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100);
        const totaux = recalculerTotaux(lignes, form.remiseGlobale, form.tauxTVA);
        setForm(p => ({ ...p, lignes, ...totaux }));
    };

    const ajouterLigne = () => {
        const lignes = [...form.lignes, { description: '', quantite: 1, prixUnitaire: 0, remise: 0, sousTotal: 0, unite: 'u' }];
        setForm(p => ({ ...p, lignes }));
    };

    const supprimerLigne = (idx) => {
        const lignes = form.lignes.filter((_, i) => i !== idx);
        const totaux = recalculerTotaux(lignes, form.remiseGlobale, form.tauxTVA);
        setForm(p => ({ ...p, lignes, ...totaux }));
    };

    // Soumettre
    const handleSubmit = async () => {
        if (!form.clientNom.trim()) { toast.warning('Client requis'); return; }
        if (form.lignes.every(l => !l.description)) { toast.warning('Ajoutez au moins une ligne'); return; }

        setLoadingForm(true);
        try {
            if (devisEdite) {
                await mettreAJourDevis(devisEdite.id, form, profil?.uid);
                toast.success('Devis modifié !', form.clientNom);
            } else {
                const { numero } = await creerDevis({ ...form, devise }, profil?.uid);
                toast.success('Devis créé !', `Devis ${numero}`);
            }
            setModalForm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    // Changer statut
    const handleChangerStatut = async (devisId, statut) => {
        try {
            await changerStatutDevis(devisId, statut, { userId: profil?.uid });
            toast.success(`${STATUTS[statut].emoji} ${STATUTS[statut].label}`);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    // Convertir
    const handleConvertir = async () => {
        try {
            const { numero } = await convertirEnCommande(devisConvert.id, profil?.uid);
            toast.success('Devis converti !', `Commande ${numero} créée`);
            setModalConvert(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    // Supprimer
    const handleSupprimer = async () => {
        try {
            await supprimerDevis(devisSuppr.id, profil?.uid);
            toast.success('Devis supprimé');
            setModalConfirm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const peutCreer = aPermission(PERMISSIONS.DEVIS_CREER);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap',
                gap: 12, marginBottom: 24,
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        📝 Devis
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {total} devis au total
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
                        ➕ Nouveau devis
                    </button>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14, marginBottom: 24,
            }}>
                <StatCard icon="📝" label="Total devis"       value={total}                                                             couleur="primary"   />
                <StatCard icon="⏳" label="En attente"        value={enAttente}                                                         couleur="warning"   />
                <StatCard icon="✅" label="Acceptés"          value={acceptes}                                                          couleur="success"   />
                <StatCard icon="🎉" label="Convertis"         value={convertis}                                                         couleur="purple"    />
                <StatCard icon="💰" label="Montant accepté"    value={`${montantTotal.toLocaleString('fr-FR')} ${devise}`}              couleur="secondary" />
            </div>

            {/* Filtres */}
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: '12px 16px',
                border: '1px solid var(--border)', marginBottom: 20,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input
                        type="search"
                        placeholder="Rechercher numéro, client..."
                        value={recherche}
                        onChange={e => setRecherche(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px 10px 40px',
                            border: '2px solid var(--border)', borderRadius: 10,
                            fontSize: 14, background: 'var(--bg)', color: 'var(--text)',
                            outline: 'none', fontFamily: 'Inter, sans-serif',
                        }}
                    />
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

            {/* Tableau */}
            <div style={{
                background: 'var(--card)', borderRadius: 14,
                border: '1px solid var(--border)', overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                {loading ? (
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1,2,3,4].map(i => <Skeleton key={i} height={60} borderRadius={8} />)}
                    </div>
                ) : devisFiltres.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>📝</div>
                        <p style={{ fontWeight: 600, fontSize: 15 }}>
                            {recherche ? 'Aucun devis trouvé' : 'Aucun devis créé'}
                        </p>
                        {peutCreer && !recherche && (
                            <button onClick={() => ouvrirForm()} style={{
                                marginTop: 16, padding: '11px 22px',
                                background: '#0F2D6B', color: 'white',
                                border: 'none', borderRadius: 10, cursor: 'pointer',
                                fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                            }}>
                                ➕ Créer le premier devis
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['N° Devis','Client','Date','Expiration','Montant','Statut','Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 14px', fontSize: 11,
                                            textAlign: 'left', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {devisFiltres.map((d, i) => {
                                    const s = STATUTS[d.statut] || STATUTS.en_attente;
                                    return (
                                        <tr key={d.id} style={{
                                            borderBottom: i < devisFiltres.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ fontWeight: 700, color: '#0F2D6B', fontFamily: 'monospace', fontSize: 13 }}>
                                                    {d.numero}
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.clientNom}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{d.clientTel}</div>
                                            </td>
                                            <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>
                                                {d.dateEmission}
                                            </td>
                                            <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>
                                                {d.dateExpiration || '—'}
                                            </td>
                                            <td style={{ padding: '11px 14px', fontWeight: 800, fontSize: 14, color: '#0F2D6B' }}>
                                                {(d.montantTotal || 0).toLocaleString('fr-FR')} {devise}
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <Badge variant={s.couleur} dot rounded>
                                                    {s.emoji} {s.label}
                                                </Badge>
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => { setDevisDetail(d); setModalDetail(true); }}
                                                        style={btnSm('#0F2D6B')}
                                                        title="Voir détails"
                                                    >👁️</button>
                                                    {peutCreer && d.statut !== 'converti' && (
                                                        <button
                                                            onClick={() => ouvrirForm(d)}
                                                            style={btnSm('#3B82F6')}
                                                            title="Modifier"
                                                        >✏️</button>
                                                    )}
                                                    {d.statut === 'accepte' && !d.convertiEnCommande && (
                                                        <button
                                                            onClick={() => { setDevisConvert(d); setModalConvert(true); }}
                                                            style={btnSm('#10B981')}
                                                            title="Convertir en commande"
                                                        >🎉</button>
                                                    )}
                                                    {peutCreer && (
                                                        <button
                                                            onClick={() => { setDevisSuppr(d); setModalConfirm(true); }}
                                                            style={btnSm('#EF4444')}
                                                            title="Supprimer"
                                                        >🗑️</button>
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
                title={devisEdite ? `✏️ Modifier — ${devisEdite.numero}` : '➕ Nouveau devis'}
                icon="📝"
                size="xl"
                footer={
                    <>
                        <button onClick={() => setModalForm(false)} style={btnCancel}>Annuler</button>
                        <button onClick={handleSubmit} disabled={loadingForm} style={btnSave(loadingForm)}>
                            {loadingForm ? '⏳ Sauvegarde...' : (devisEdite ? '💾 Modifier' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Client */}
                    <div style={{ padding: 14, background: 'rgba(15,45,107,0.04)', borderRadius: 12, border: '1px solid rgba(15,45,107,0.1)' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F2D6B', marginBottom: 10 }}>👤 Client</div>
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                            <input
                                type="text"
                                placeholder="Rechercher un client existant..."
                                value={rechClient}
                                onChange={e => setRechClient(e.target.value)}
                                style={input}
                            />
                            {clientsRech.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: 'var(--card)', border: '1px solid var(--border)',
                                    borderRadius: 10, zIndex: 1000, maxHeight: 200, overflowY: 'auto',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                }}>
                                    {clientsRech.map(c => (
                                        <div key={c.id} onClick={() => {
                                            setForm(p => ({
                                                ...p, clientId: c.id,
                                                clientNom: c.nomComplet, clientTel: c.telephone,
                                                clientEmail: c.email, clientAdresse: c.adresse,
                                            }));
                                            setRechClient(c.nomComplet);
                                            setClientsRech([]);
                                        }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nomComplet}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.telephone}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <input type="text" value={form.clientNom} onChange={e => setForm(p => ({ ...p, clientNom: e.target.value }))} placeholder="Nom complet *" style={input}/>
                            <input type="tel" value={form.clientTel} onChange={e => setForm(p => ({ ...p, clientTel: e.target.value }))} placeholder="Téléphone" style={input}/>
                            <input type="email" value={form.clientEmail} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))} placeholder="Email" style={input}/>
                            <input type="text" value={form.clientAdresse} onChange={e => setForm(p => ({ ...p, clientAdresse: e.target.value }))} placeholder="Adresse" style={input}/>
                        </div>
                    </div>

                    {/* Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={lab}>📅 Date d'émission</label>
                            <input type="date" value={form.dateEmission} onChange={e => setForm(p => ({ ...p, dateEmission: e.target.value }))} style={input}/>
                        </div>
                        <div>
                            <label style={lab}>⏰ Date d'expiration</label>
                            <input type="date" value={form.dateExpiration} onChange={e => setForm(p => ({ ...p, dateExpiration: e.target.value }))} style={input}/>
                        </div>
                    </div>

                    {/* Lignes */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>🧾 Lignes du devis</div>
                            <button type="button" onClick={ajouterLigne} style={{
                                padding: '6px 14px', background: '#0F2D6B', color: 'white',
                                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}>➕ Ajouter</button>
                        </div>
                        {form.lignes.map((l, idx) => (
                            <div key={idx} style={{
                                display: 'grid',
                                gridTemplateColumns: '3fr 1fr 2fr 1fr 1.5fr auto',
                                gap: 8, marginBottom: 8, alignItems: 'center',
                                padding: 10, background: 'var(--gray-50)', borderRadius: 10,
                            }}>
                                <input type="text" value={l.description} onChange={e => modifierLigne(idx, 'description', e.target.value)} placeholder="Description..." style={inputMini}/>
                                <input type="number" value={l.quantite} onChange={e => modifierLigne(idx, 'quantite', parseFloat(e.target.value) || 1)} placeholder="Qté" style={inputMini}/>
                                <input type="number" value={l.prixUnitaire} onChange={e => modifierLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)} placeholder="Prix U." style={inputMini}/>
                                <input type="number" value={l.remise} onChange={e => modifierLigne(idx, 'remise', parseFloat(e.target.value) || 0)} placeholder="Rem %" style={inputMini}/>
                                <div style={{ fontWeight: 800, color: '#10B981', textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' }}>
                                    {(l.sousTotal || 0).toLocaleString('fr-FR')} {devise}
                                </div>
                                {form.lignes.length > 1 && (
                                    <button type="button" onClick={() => supprimerLigne(idx)} style={{
                                        width: 26, height: 26, background: 'rgba(239,68,68,0.1)',
                                        border: 'none', borderRadius: '50%', color: '#EF4444', cursor: 'pointer',
                                    }}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Totaux */}
                    <div style={{ padding: 14, background: 'rgba(16,185,129,0.05)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                                <label style={lab}>Remise globale (%)</label>
                                <input type="number" min="0" max="100" value={form.remiseGlobale}
                                    onChange={e => {
                                        const r = parseFloat(e.target.value) || 0;
                                        const t = recalculerTotaux(form.lignes, r, form.tauxTVA);
                                        setForm(p => ({ ...p, remiseGlobale: r, ...t }));
                                    }}
                                    style={input}/>
                            </div>
                            <div>
                                <label style={lab}>TVA (%)</label>
                                <input type="number" min="0" max="30" value={form.tauxTVA}
                                    onChange={e => {
                                        const t = parseFloat(e.target.value) || 0;
                                        const totaux = recalculerTotaux(form.lignes, form.remiseGlobale, t);
                                        setForm(p => ({ ...p, tauxTVA: t, ...totaux }));
                                    }}
                                    style={input}/>
                            </div>
                        </div>
                        <div style={{ borderTop: '2px solid rgba(16,185,129,0.3)', paddingTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                <span>Sous-total :</span>
                                <span>{(form.sousTotal || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                            {form.montantRemise > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: '#EF4444' }}>
                                    <span>Remise ({form.remiseGlobale}%) :</span>
                                    <span>- {(form.montantRemise || 0).toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            )}
                            {form.montantTVA > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span>TVA ({form.tauxTVA}%) :</span>
                                    <span>+ {(form.montantTVA || 0).toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900, color: '#10B981', paddingTop: 8, borderTop: '1px solid rgba(16,185,129,0.3)' }}>
                                <span>TOTAL :</span>
                                <span>{(form.montantTotal || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label style={lab}>📝 Notes / Commentaires</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Notes internes ou visibles sur le devis..." rows={3}
                            style={{ ...input, resize: 'vertical' }}/>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={lab}>💰 Conditions de paiement</label>
                            <input type="text" value={form.conditionsPaiement} onChange={e => setForm(p => ({ ...p, conditionsPaiement: e.target.value }))} style={input}/>
                        </div>
                        <div>
                            <label style={lab}>🚚 Conditions de livraison</label>
                            <input type="text" value={form.conditionsLivraison} onChange={e => setForm(p => ({ ...p, conditionsLivraison: e.target.value }))} style={input}/>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL DETAIL */}
            <Modal
                isOpen={modalDetail}
                onClose={() => setModalDetail(false)}
                title={`📝 Devis ${devisDetail?.numero || ''}`}
                size="lg"
                icon="📝"
            >
                {devisDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 10 }}>
                                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>👤 CLIENT</div>
                                <div style={{ fontWeight: 700, marginTop: 4 }}>{devisDetail.clientNom}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{devisDetail.clientTel}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{devisDetail.clientEmail}</div>
                            </div>
                            <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 10 }}>
                                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>📊 STATUT</div>
                                <Badge variant={STATUTS[devisDetail.statut].couleur} dot size="lg">
                                    {STATUTS[devisDetail.statut].emoji} {STATUTS[devisDetail.statut].label}
                                </Badge>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                                    Émission : {devisDetail.dateEmission}
                                </div>
                            </div>
                        </div>

                        {/* Lignes */}
                        <div style={{ background: 'var(--gray-50)', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                                🧾 Lignes du devis
                            </div>
                            {(devisDetail.lignes || []).map((l, i) => (
                                <div key={i} style={{
                                    padding: '10px 14px',
                                    borderBottom: i < devisDetail.lignes.length - 1 ? '1px solid var(--border)' : 'none',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{l.description}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                            {l.quantite} × {l.prixUnitaire.toLocaleString('fr-FR')} {devise}
                                            {l.remise > 0 && ` (-${l.remise}%)`}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 800, color: '#10B981' }}>
                                        {(l.sousTotal || 0).toLocaleString('fr-FR')} {devise}
                                    </div>
                                </div>
                            ))}
                            <div style={{ padding: 12, background: 'rgba(15,45,107,0.05)', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, color: '#0F2D6B' }}>
                                <span>TOTAL</span>
                                <span>{(devisDetail.montantTotal || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                        </div>

                        {/* Actions statut */}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🔄 Changer le statut</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {Object.entries(STATUTS).filter(([k]) => k !== devisDetail.statut).map(([k, v]) => (
                                    <button key={k} onClick={() => {
                                        handleChangerStatut(devisDetail.id, k);
                                        setDevisDetail(prev => ({ ...prev, statut: k }));
                                    }} style={{
                                        padding: '7px 14px', background: 'var(--gray-100)',
                                        border: '1px solid var(--border)', borderRadius: 8,
                                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {v.emoji} {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {devisDetail.statut === 'accepte' && !devisDetail.convertiEnCommande && (
                            <button onClick={() => { setModalDetail(false); setDevisConvert(devisDetail); setModalConvert(true); }} style={{
                                width: '100%', padding: 12, background: '#10B981', color: 'white',
                                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                🎉 Convertir en commande
                            </button>
                        )}
                    </div>
                )}
            </Modal>

            {/* MODAL CONVERT */}
            <ConfirmModal
                isOpen={modalConvert}
                onClose={() => setModalConvert(false)}
                onConfirm={handleConvertir}
                title="Convertir ce devis en commande ?"
                message={`Le devis ${devisConvert?.numero} sera converti en commande pour ${devisConvert?.clientNom}.`}
                confirmText="🎉 Convertir"
                type="success"
            />

            {/* CONFIRM SUPPR */}
            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleSupprimer}
                title="Supprimer ce devis ?"
                message={`Le devis ${devisSuppr?.numero} sera supprimé définitivement.`}
                confirmText="Supprimer"
                type="danger"
            />
        </div>
    );
};

const lab = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' };
const input = {
    width: '100%', padding: '10px 14px',
    border: '2px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
};
const inputMini = { ...input, padding: '8px 10px', fontSize: 12 };
const btnSm = (color) => ({
    padding: '6px 10px', background: `${color}15`,
    color, border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
});
const filterBtn = (active) => ({
    padding: '8px 14px', border: 'none', borderRadius: 8,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: active ? '#0F2D6B' : 'var(--bg)',
    color:      active ? 'white' : 'var(--text2)',
    fontFamily: 'Inter, sans-serif',
});
const btnCancel = {
    padding: '10px 20px', border: '2px solid var(--border)',
    borderRadius: 10, background: 'var(--card)', color: 'var(--text)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
};
const btnSave = (loading) => ({
    padding: '10px 24px',
    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
    color: 'white', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'Inter, sans-serif',
});

export default DevisPage;