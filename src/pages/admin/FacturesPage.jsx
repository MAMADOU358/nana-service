import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import {
    ecouterFactures, creerFacture,
    factureDepuisCommande, annulerFacture
} from '../../services/factureService';
import { ecouterCommandes } from '../../services/commandeService';
import { rechercherClients } from '../../services/clientService';
import {
    telechargerFacture, previsualiserFacture
} from '../../utils/pdfGenerator';
import { PERMISSIONS } from '../../config/constants';

const STATUTS = {
    non_payee:  { label: 'Non payée',     couleur: 'danger',  emoji: '❌' },
    partiel:    { label: 'Partiellement', couleur: 'warning', emoji: '⚠️' },
    payee:      { label: 'Payée',         couleur: 'success', emoji: '✅' },
    annulee:    { label: 'Annulée',       couleur: 'gray',    emoji: '🚫' },
};

const FacturesPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [factures, setFactures] = useState([]);
    const [commandes, setCommandes] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [filtreStatut, setFiltreStatut] = useState('all');
    const [recherche, setRecherche] = useState('');

    // Modals
    const [modalForm, setModalForm]         = useState(false);
    const [modalCmd, setModalCmd]           = useState(false);
    const [modalAnnul, setModalAnnul]       = useState(false);
    const [factureAnnul, setFactureAnnul]   = useState(null);
    const [motifAnnul, setMotifAnnul]       = useState('');
    const [loadingAnnul, setLoadingAnnul]   = useState(false);
    const [loadingForm, setLoadingForm]     = useState(false);

    // Recherche client
    const [rechClient, setRechClient] = useState('');
    const [clientsRech, setClientsRech] = useState([]);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            clientId: '', clientNom: '', clientTel: '', clientEmail: '', clientAdresse: '',
            lignes: [{ description: '', quantite: 1, unite: 'u', prixUnitaire: 0, remise: 0, sousTotal: 0 }],
            sousTotal: 0, remiseGlobale: 0, montantRemise: 0,
            tauxTVA: 0, montantTVA: 0, fraisLivraison: 0,
            montantTotal: 0, montantPaye: 0, resteAPayer: 0,
            dateEmission: new Date().toISOString().split('T')[0],
            dateEcheance: '',
            notes: '',
            conditionsPaiement: 'Paiement à réception',
        };
    }

    const devise = entreprise?.devise || 'GNF';

    useEffect(() => {
        const filtres = {};
        if (filtreStatut !== 'all') filtres.statut = filtreStatut;

        const unsub = ecouterFactures(data => {
            setFactures(data);
            setLoading(false);
        }, filtres);
        return () => unsub();
    }, [filtreStatut]);

    // Charger commandes pour modal
    useEffect(() => {
        const unsub = ecouterCommandes(data => {
            setCommandes(data);
        });
        return () => unsub();
    }, []);

    // Recherche client
    useEffect(() => {
        if (rechClient.length < 2) { setClientsRech([]); return; }
        const timer = setTimeout(async () => {
            const res = await rechercherClients(rechClient);
            setClientsRech(res);
        }, 300);
        return () => clearTimeout(timer);
    }, [rechClient]);

    const facturesFiltrees = factures.filter(f => {
        if (!recherche) return true;
        const t = recherche.toLowerCase();
        return (
            f.numero?.toLowerCase().includes(t) ||
            f.clientNom?.toLowerCase().includes(t) ||
            f.clientTel?.includes(t)
        );
    });

    // Stats
    const totalCA     = factures.filter(f => f.statut !== 'annulee').reduce((s, f) => s + (f.montantTotal || 0), 0);
    const totalPaye   = factures.filter(f => f.statut !== 'annulee').reduce((s, f) => s + (f.montantPaye || 0), 0);
    const totalImpaye = totalCA - totalPaye;
    const nbNonPayees = factures.filter(f => f.statut === 'non_payee').length;

    // Commandes disponibles pour facturation (payées et pas encore facturées)
    const commandesFacturables = commandes.filter(c =>
        c.statut !== 'annulee' &&
        !factures.some(f => f.commandeId === c.id)
    );

    // Recalculer totaux
    const recalculerTotaux = (lignes, remise = 0, tva = 0, livraison = 0) => {
        const sousTotal = lignes.reduce((s, l) => {
            const st = (l.quantite || 1) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100);
            return s + st;
        }, 0);
        const montantRemise = sousTotal * (remise / 100);
        const apresRemise = sousTotal - montantRemise;
        const montantTVA = apresRemise * (tva / 100);
        const montantTotal = apresRemise + montantTVA + parseFloat(livraison || 0);
        return { sousTotal, montantRemise, montantTVA, montantTotal };
    };

    // Modifier ligne
    const modifierLigne = (idx, champ, val) => {
        const lignes = [...form.lignes];
        lignes[idx] = { ...lignes[idx], [champ]: val };
        const l = lignes[idx];
        l.sousTotal = (l.quantite || 1) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100);
        const totaux = recalculerTotaux(lignes, form.remiseGlobale, form.tauxTVA, form.fraisLivraison);
        setForm(p => ({ ...p, lignes, ...totaux, resteAPayer: totaux.montantTotal - p.montantPaye }));
    };

    const ajouterLigne = () => {
        setForm(p => ({
            ...p,
            lignes: [...p.lignes, { description: '', quantite: 1, unite: 'u', prixUnitaire: 0, remise: 0, sousTotal: 0 }]
        }));
    };

    const supprimerLigne = (idx) => {
        const lignes = form.lignes.filter((_, i) => i !== idx);
        const totaux = recalculerTotaux(lignes, form.remiseGlobale, form.tauxTVA, form.fraisLivraison);
        setForm(p => ({ ...p, lignes, ...totaux }));
    };

    // Créer facture manuellement
    const handleCreer = async () => {
        if (!form.clientNom.trim()) { toast.warning('Client requis'); return; }
        if (form.lignes.every(l => !l.description)) { toast.warning('Ajoutez au moins une ligne'); return; }

        setLoadingForm(true);
        try {
            const { numero } = await creerFacture({ ...form, devise }, profil?.uid);
            toast.success('Facture créée !', `Facture ${numero}`);
            setModalForm(false);
            setForm(formVide());
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    // Créer facture depuis commande
    const handleFactureDepuisCmd = async (commandeId) => {
        try {
            const { numero } = await factureDepuisCommande(commandeId, profil?.uid);
            toast.success('Facture générée !', `Facture ${numero} créée depuis la commande`);
            setModalCmd(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    // Annuler facture
    const handleAnnuler = async () => {
        if (!factureAnnul) return;
        setLoadingAnnul(true);
        try {
            await annulerFacture(factureAnnul.id, motifAnnul, profil?.uid);
            toast.success('Facture annulée', `Un avoir a été créé pour ${factureAnnul.numero}`);
            setModalAnnul(false);
            setMotifAnnul('');
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingAnnul(false);
        }
    };

    const peutCreer = aPermission(PERMISSIONS.FACTURES_CREER);

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
                        🧾 Factures
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {factures.length} facture{factures.length > 1 ? 's' : ''} au total
                    </p>
                </div>
                {peutCreer && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setModalCmd(true)}
                            style={{
                                padding: '11px 22px',
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                color: 'white', border: 'none', borderRadius: 12,
                                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8,
                                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            🧾 Depuis commande
                        </button>
                        <button
                            onClick={() => setModalForm(true)}
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
                            ➕ Nouvelle facture
                        </button>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
                gap: 14, marginBottom: 24,
            }}>
                {[
                    { icon: '💰', label: 'Total facturé',    val: `${totalCA.toLocaleString('fr-FR')} ${devise}`,     color: '#0F2D6B' },
                    { icon: '✅', label: 'Total encaissé',    val: `${totalPaye.toLocaleString('fr-FR')} ${devise}`,   color: '#10B981' },
                    { icon: '⏳', label: 'Reste à encaisser', val: `${totalImpaye.toLocaleString('fr-FR')} ${devise}`, color: '#F59E0B' },
                    { icon: '❌', label: 'Non payées',        val: nbNonPayees,                                        color: '#EF4444' },
                ].map((s, i) => (
                    <div key={i} style={{
                        background: 'var(--card)', borderRadius: 12, padding: 16,
                        border: '1px solid var(--border)',
                        borderLeft: `4px solid ${s.color}`,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
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
                <div style={{ display: 'flex', gap: 6 }}>
                    {[
                        { val: 'all',        label: 'Toutes'         },
                        { val: 'non_payee',  label: '❌ Non payées'  },
                        { val: 'partiel',    label: '⚠️ Partielles'  },
                        { val: 'payee',      label: '✅ Payées'      },
                        { val: 'annulee',    label: '🚫 Annulées'    },
                    ].map(f => (
                        <button
                            key={f.val}
                            onClick={() => setFiltreStatut(f.val)}
                            style={{
                                padding: '8px 14px', border: 'none', borderRadius: 8,
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                background: filtreStatut === f.val ? '#0F2D6B' : 'var(--bg)',
                                color:      filtreStatut === f.val ? 'white'  : 'var(--text2)',
                                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {f.label}
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
                    <div style={{ padding: 20 }}>
                        {[1,2,3].map(i => <Skeleton key={i} height={60} borderRadius={8} style={{ marginBottom: 10 }} />)}
                    </div>
                ) : facturesFiltrees.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>🧾</div>
                        <p style={{ fontWeight: 600, marginBottom: 8 }}>
                            {recherche ? 'Aucune facture trouvée' : 'Aucune facture'}
                        </p>
                        {!recherche && peutCreer && (
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                                <button onClick={() => setModalCmd(true)} style={{
                                    padding: '10px 20px', background: '#10B981',
                                    color: 'white', border: 'none', borderRadius: 10,
                                    cursor: 'pointer', fontSize: 14, fontWeight: 700,
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    🧾 Depuis commande
                                </button>
                                <button onClick={() => setModalForm(true)} style={{
                                    padding: '10px 20px', background: '#0F2D6B',
                                    color: 'white', border: 'none', borderRadius: 10,
                                    cursor: 'pointer', fontSize: 14, fontWeight: 700,
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    ➕ Nouvelle facture
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['N° Facture','Client','Date','Total','Payé','Reste','Statut','Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 14px', fontSize: 11,
                                            textAlign: 'left', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {facturesFiltrees.map((f, i) => {
                                    const sc = STATUTS[f.statut] || STATUTS.non_payee;
                                    return (
                                        <tr key={f.id} style={{
                                            borderBottom: i < facturesFiltrees.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ fontWeight: 700, color: '#0F2D6B', fontFamily: 'monospace', fontSize: 13 }}>
                                                    {f.numero}
                                                </div>
                                                {f.commandeNumero && (
                                                    <div style={{ fontSize: 10, color: '#10B981', marginTop: 2 }}>
                                                        📋 {f.commandeNumero}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{f.clientNom || '—'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{f.clientTel}</div>
                                            </td>
                                            <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                                                {f.dateEmission || '—'}
                                            </td>
                                            <td style={{ padding: '11px 14px', fontWeight: 800, fontSize: 14 }}>
                                                {(f.montantTotal || 0).toLocaleString('fr-FR')} {devise}
                                            </td>
                                            <td style={{ padding: '11px 14px', fontWeight: 700, color: '#10B981' }}>
                                                {(f.montantPaye || 0).toLocaleString('fr-FR')} {devise}
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                {(f.resteAPayer || 0) > 0 ? (
                                                    <span style={{ fontWeight: 700, color: '#EF4444', fontSize: 13 }}>
                                                        {(f.resteAPayer || 0).toLocaleString('fr-FR')} {devise}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#10B981', fontWeight: 700 }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <Badge variant={sc.couleur} dot rounded>
                                                    {sc.emoji} {sc.label}
                                                </Badge>
                                            </td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        onClick={() => previsualiserFacture(f, entreprise)}
                                                        style={btnSm('#0F2D6B')}
                                                        title="Prévisualiser"
                                                    >
                                                        👁️
                                                    </button>
                                                    <button
                                                        onClick={() => telechargerFacture(f, entreprise)}
                                                        style={btnSm('#10B981')}
                                                        title="Télécharger PDF"
                                                    >
                                                        📄
                                                    </button>
                                                    {peutCreer && f.statut !== 'annulee' && (
                                                        <button
                                                            onClick={() => { setFactureAnnul(f); setModalAnnul(true); }}
                                                            style={btnSm('#EF4444')}
                                                            title="Annuler"
                                                        >
                                                            🚫
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

            {/* MODAL — DEPUIS COMMANDE */}
            <Modal
                isOpen={modalCmd}
                onClose={() => setModalCmd(false)}
                title="🧾 Créer facture depuis une commande"
                icon="🧾"
                size="lg"
            >
                <div style={{ marginBottom: 16 }}>
                    <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>
                        Sélectionnez une commande pour générer sa facture automatiquement :
                    </p>
                </div>

                {commandesFacturables.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                        <p style={{ fontWeight: 600 }}>Aucune commande facturable</p>
                        <p style={{ fontSize: 12, marginTop: 6 }}>
                            Toutes les commandes ont déjà été facturées ou sont annulées.
                        </p>
                    </div>
                ) : (
                    <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {commandesFacturables.map(cmd => (
                            <div
                                key={cmd.id}
                                onClick={() => {
                                    if (window.confirm(`Créer une facture pour la commande ${cmd.numero} ?`)) {
                                        handleFactureDepuisCmd(cmd.id);
                                    }
                                }}
                                style={{
                                    padding: 14, background: 'var(--gray-50)',
                                    border: '2px solid var(--border)', borderRadius: 12,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.borderColor = '#10B981';
                                    e.currentTarget.style.background = 'rgba(16,185,129,0.05)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.background = 'var(--gray-50)';
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, color: '#0F2D6B', fontFamily: 'monospace', fontSize: 14 }}>
                                        {cmd.numero}
                                    </div>
                                    <div style={{ fontSize: 13, marginTop: 4 }}>
                                        👤 {cmd.clientNom || '—'}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                        {cmd.createdAt?.toDate?.().toLocaleDateString('fr-FR') || '—'}
                                        {' • '}
                                        {(cmd.lignes || []).length} article(s)
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 900, fontSize: 18, color: '#10B981' }}>
                                        {(cmd.montantTotal || 0).toLocaleString('fr-FR')} {devise}
                                    </div>
                                    <div style={{ fontSize: 11, marginTop: 4 }}>
                                        <span style={{
                                            padding: '2px 8px', background: '#10B981',
                                            color: 'white', borderRadius: 20,
                                        }}>
                                            🧾 Facturer
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* MODAL — NOUVELLE FACTURE MANUELLE */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title="➕ Nouvelle facture manuelle"
                icon="🧾"
                size="xl"
                footer={
                    <>
                        <button onClick={() => setModalForm(false)} style={btnCancel}>Annuler</button>
                        <button onClick={handleCreer} disabled={loadingForm} style={{
                            padding: '10px 24px',
                            background: loadingForm ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                            color: 'white', border: 'none', borderRadius: 10,
                            fontSize: 14, fontWeight: 700,
                            cursor: loadingForm ? 'not-allowed' : 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            {loadingForm ? '⏳...' : '➕ Créer la facture'}
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
                            <label style={lab}>⏰ Date d'échéance</label>
                            <input type="date" value={form.dateEcheance} onChange={e => setForm(p => ({ ...p, dateEcheance: e.target.value }))} style={input}/>
                        </div>
                    </div>

                    {/* Lignes */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>🧾 Lignes de facture</div>
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
                    <div style={{ padding: 14, background: 'rgba(15,45,107,0.05)', borderRadius: 12, border: '1px solid rgba(15,45,107,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                                <label style={lab}>Remise (%)</label>
                                <input type="number" min="0" max="100" value={form.remiseGlobale}
                                    onChange={e => {
                                        const r = parseFloat(e.target.value) || 0;
                                        const t = recalculerTotaux(form.lignes, r, form.tauxTVA, form.fraisLivraison);
                                        setForm(p => ({ ...p, remiseGlobale: r, ...t }));
                                    }}
                                    style={input}/>
                            </div>
                            <div>
                                <label style={lab}>TVA (%)</label>
                                <input type="number" min="0" max="30" value={form.tauxTVA}
                                    onChange={e => {
                                        const t = parseFloat(e.target.value) || 0;
                                        const totaux = recalculerTotaux(form.lignes, form.remiseGlobale, t, form.fraisLivraison);
                                        setForm(p => ({ ...p, tauxTVA: t, ...totaux }));
                                    }}
                                    style={input}/>
                            </div>
                            <div>
                                <label style={lab}>Livraison ({devise})</label>
                                <input type="number" min="0" value={form.fraisLivraison}
                                    onChange={e => {
                                        const l = parseFloat(e.target.value) || 0;
                                        const t = recalculerTotaux(form.lignes, form.remiseGlobale, form.tauxTVA, l);
                                        setForm(p => ({ ...p, fraisLivraison: l, ...t }));
                                    }}
                                    style={input}/>
                            </div>
                        </div>
                        <div style={{ borderTop: '2px solid rgba(15,45,107,0.2)', paddingTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                <span>Sous-total :</span>
                                <span>{(form.sousTotal || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                            {form.montantRemise > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: '#EF4444' }}>
                                    <span>Remise :</span>
                                    <span>- {(form.montantRemise || 0).toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            )}
                            {form.montantTVA > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span>TVA :</span>
                                    <span>+ {(form.montantTVA || 0).toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            )}
                            {form.fraisLivraison > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span>Livraison :</span>
                                    <span>+ {(form.fraisLivraison || 0).toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, color: '#0F2D6B', paddingTop: 8 }}>
                                <span>TOTAL :</span>
                                <span>{(form.montantTotal || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={lab}>💰 Conditions de paiement</label>
                            <input type="text" value={form.conditionsPaiement} onChange={e => setForm(p => ({ ...p, conditionsPaiement: e.target.value }))} style={input}/>
                        </div>
                        <div>
                            <label style={lab}>📝 Notes</label>
                            <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes visibles sur la facture..." style={input}/>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL ANNULATION */}
            <Modal
                isOpen={modalAnnul}
                onClose={() => setModalAnnul(false)}
                title="🚫 Annuler cette facture ?"
                size="sm"
                icon="🚫"
                footer={
                    <>
                        <button onClick={() => setModalAnnul(false)} style={btnCancel}>Annuler</button>
                        <button
                            onClick={handleAnnuler}
                            disabled={loadingAnnul}
                            style={{
                                padding: '10px 24px',
                                background: loadingAnnul ? '#9CA3AF' : '#EF4444',
                                color: 'white', border: 'none', borderRadius: 10,
                                fontSize: 14, fontWeight: 700,
                                cursor: loadingAnnul ? 'not-allowed' : 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {loadingAnnul ? '⏳...' : '🚫 Confirmer'}
                        </button>
                    </>
                }
            >
                {factureAnnul && (
                    <div>
                        <div style={{
                            padding: '14px 16px', background: 'rgba(239,68,68,0.08)',
                            borderRadius: 10, marginBottom: 18,
                            border: '1px solid rgba(239,68,68,0.2)',
                        }}>
                            <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>
                                Facture {factureAnnul.numero}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                                {factureAnnul.clientNom} — {(factureAnnul.montantTotal || 0).toLocaleString('fr-FR')} {devise}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Motif d'annulation
                            </label>
                            <textarea
                                value={motifAnnul}
                                onChange={e => setMotifAnnul(e.target.value)}
                                placeholder="Expliquez la raison..."
                                rows={3}
                                style={{ ...input, resize: 'vertical' }}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const lab = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text)' };
const input = { width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif' };
const inputMini = { ...input, padding: '8px 10px', fontSize: 12 };
const btnSm = (color) => ({ padding: '6px 10px', background: `${color}15`, color, border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' });
const btnCancel = { padding: '10px 20px', border: '2px solid var(--border)', borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' };

export default FacturesPage;