import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Loader';
import {
    ecouterCommandes, changerStatut,
    enregistrerPaiement, creerCommande
} from '../../services/commandeService';
import { rechercherClients } from '../../services/clientService';
import { telechargerTicket, previsualiserFacture } from '../../utils/pdfGenerator';
import { PERMISSIONS, STATUTS_COMMANDE, MOYENS_PAIEMENT } from '../../config/constants';

const STATUTS_CONFIG = {
    nouvelle:    { label: 'Nouvelle',       couleur: 'info',     emoji: '🆕', suivant: 'confirmee'   },
    confirmee:   { label: 'Confirmée',      couleur: 'primary',  emoji: '✅', suivant: 'preparation' },
    preparation: { label: 'En préparation', couleur: 'warning',  emoji: '⚙️', suivant: 'production'  },
    production:  { label: 'En production',  couleur: 'warning',  emoji: '🏭', suivant: 'prete'       },
    prete:       { label: 'Prête',          couleur: 'success',  emoji: '📦', suivant: 'livree'      },
    livree:      { label: 'Livrée',         couleur: 'teal',     emoji: '🚚', suivant: 'terminee'    },
    terminee:    { label: 'Terminée',       couleur: 'success',  emoji: '🎉', suivant: null          },
    annulee:     { label: 'Annulée',        couleur: 'danger',   emoji: '❌', suivant: null          },
};

const CommandesPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise, domaines } = useApp();
    const toast = useToast();

    const [commandes, setCommandes]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [filtreStatut, setFiltreStatut] = useState('all');
    const [recherche, setRecherche]   = useState('');

    // Modals
    const [modalDetail, setModalDetail]   = useState(false);
    const [modalPaiement, setModalPaiement] = useState(false);
    const [modalNouv, setModalNouv]       = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [cmdSelectionnee, setCmdSelectionnee] = useState(null);
    const [cmdAnnuler, setCmdAnnuler]     = useState(null);

    // Paiement form
    const [paiForm, setPaiForm] = useState({
        montant: '', moyen: 'especes', reference: '', note: '',
    });
    const [loadingPai, setLoadingPai] = useState(false);

    // Nouvelle commande form
    const [nouvForm, setNouvForm] = useState(nouvFormVide());
    const [loadingNouv, setLoadingNouv] = useState(false);
    const [clientsRecherche, setClientsRecherche] = useState([]);
    const [rechercheClient, setRechercheClient]   = useState('');

    function nouvFormVide() {
        return {
            clientId: '', clientNom: '', clientTel: '', clientEmail: '',
            domaineId: '', domaineLabel: '',
            lignes: [{ nom: '', quantite: 1, prixUnitaire: 0, remise: 0, sousTotal: 0 }],
            sousTotal: 0, remiseGlobale: 0, fraisLivraison: 0, montantTotal: 0,
            typeLivraison: 'retrait', noteInterne: '', noteClient: '',
        };
    }

    // Charger commandes
    useEffect(() => {
        const filtres = {};
        if (filtreStatut !== 'all') filtres.statut = filtreStatut;

        const unsub = ecouterCommandes((data) => {
            setCommandes(data);
            setLoading(false);
        }, filtres);
        return () => unsub();
    }, [filtreStatut]);

    // Commandes filtrées
    const commandesFiltrees = commandes.filter(c => {
        if (!recherche) return true;
        const t = recherche.toLowerCase();
        return (
            c.numero?.toLowerCase().includes(t) ||
            c.clientNom?.toLowerCase().includes(t) ||
            c.clientTel?.includes(t)
        );
    });

    // Compter par statut
    const compterStatut = (statut) => commandes.filter(c => c.statut === statut).length;

    // Changer statut d'une commande
    const handleChangerStatut = async (commandeId, nouveauStatut) => {
        try {
            await changerStatut(commandeId, nouveauStatut, { userId: profil?.uid });
            toast.success('Statut mis à jour', `Commande → ${STATUTS_CONFIG[nouveauStatut]?.label}`);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    // Enregistrer paiement
    const handlePaiement = async () => {
        if (!paiForm.montant || parseFloat(paiForm.montant) <= 0) {
            toast.warning('Montant requis', 'Entrez un montant valide');
            return;
        }
        setLoadingPai(true);
        try {
            const result = await enregistrerPaiement(cmdSelectionnee.id, {
                montant:   parseFloat(paiForm.montant),
                moyen:     paiForm.moyen,
                reference: paiForm.reference,
                note:      paiForm.note,
            }, profil?.uid);
            toast.success('Paiement enregistré !',
                result.resteAPayer === 0 ? '✅ Commande entièrement payée' : `Reste: ${result.resteAPayer.toLocaleString('fr-FR')} ${entreprise?.devise}`
            );
            setModalPaiement(false);
            setPaiForm({ montant: '', moyen: 'especes', reference: '', note: '' });
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingPai(false);
        }
    };

    // Rechercher clients
    useEffect(() => {
        if (rechercheClient.length < 2) { setClientsRecherche([]); return; }
        const timer = setTimeout(async () => {
            const res = await rechercherClients(rechercheClient);
            setClientsRecherche(res);
        }, 300);
        return () => clearTimeout(timer);
    }, [rechercheClient]);

    // Calculer totaux commande
    const recalculerTotaux = (lignes, remise = 0, livraison = 0) => {
        const sousTotal = lignes.reduce((s, l) => {
            const st = (l.quantite || 1) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100);
            return s + st;
        }, 0);
        const montantRemise = sousTotal * (remise / 100);
        const total = sousTotal - montantRemise + parseFloat(livraison || 0);
        return { sousTotal, montantTotal: total };
    };

    // Modifier ligne commande
    const modifierLigne = (idx, champ, val) => {
        const lignes = [...nouvForm.lignes];
        lignes[idx] = { ...lignes[idx], [champ]: val };
        // Recalculer sous-total ligne
        const l = lignes[idx];
        l.sousTotal = (l.quantite || 1) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100);
        const { sousTotal, montantTotal } = recalculerTotaux(
            lignes, nouvForm.remiseGlobale, nouvForm.fraisLivraison
        );
        setNouvForm(p => ({ ...p, lignes, sousTotal, montantTotal }));
    };

    const ajouterLigne = () => setNouvForm(p => ({
        ...p, lignes: [...p.lignes, { nom: '', quantite: 1, prixUnitaire: 0, remise: 0, sousTotal: 0 }]
    }));

    const supprimerLigne = (idx) => {
        const lignes = nouvForm.lignes.filter((_, i) => i !== idx);
        const { sousTotal, montantTotal } = recalculerTotaux(
            lignes, nouvForm.remiseGlobale, nouvForm.fraisLivraison
        );
        setNouvForm(p => ({ ...p, lignes, sousTotal, montantTotal }));
    };

    // Créer nouvelle commande
    const handleCreerCommande = async () => {
        if (!nouvForm.clientNom.trim()) { toast.warning('Client requis'); return; }
        if (nouvForm.lignes.every(l => !l.nom)) { toast.warning('Ajoutez au moins un article'); return; }

        setLoadingNouv(true);
        try {
            const { id, numero } = await creerCommande({
                ...nouvForm,
                devise: entreprise?.devise || 'GNF',
            }, profil?.uid);
            toast.success('Commande créée !', `Commande ${numero} enregistrée`);
            setModalNouv(false);
            setNouvForm(nouvFormVide());
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingNouv(false);
        }
    };

    const devise = entreprise?.devise || 'GNF';
    const peutCreer = aPermission(PERMISSIONS.COMMANDES_CREER);
    const peutModifier = aPermission(PERMISSIONS.COMMANDES_MODIFIER);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24,
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        📋 Commandes
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {commandes.length} commande{commandes.length > 1 ? 's' : ''} au total
                    </p>
                </div>
                {peutCreer && (
                    <button
                        onClick={() => setModalNouv(true)}
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
                        ➕ Nouvelle commande
                    </button>
                )}
            </div>

            {/* Stats par statut */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 10, marginBottom: 20,
            }}>
                {Object.entries(STATUTS_CONFIG).map(([key, s]) => (
                    <button
                        key={key}
                        onClick={() => setFiltreStatut(filtreStatut === key ? 'all' : key)}
                        style={{
                            padding: '12px 10px',
                            background: filtreStatut === key ? '#0F2D6B' : 'var(--card)',
                            color:      filtreStatut === key ? 'white'  : 'var(--text)',
                            border: `2px solid ${filtreStatut === key ? '#0F2D6B' : 'var(--border)'}`,
                            borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                            transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                            {compterStatut(key)}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>
                            {s.label}
                        </div>
                    </button>
                ))}
                <button
                    onClick={() => setFiltreStatut('all')}
                    style={{
                        padding: '12px 10px',
                        background: filtreStatut === 'all' ? '#FF6B00' : 'var(--card)',
                        color:      filtreStatut === 'all' ? 'white'  : 'var(--text)',
                        border: `2px solid ${filtreStatut === 'all' ? '#FF6B00' : 'var(--border)'}`,
                        borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                    }}
                >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
                    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                        {commandes.length}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>
                        Toutes
                    </div>
                </button>
            </div>

            {/* Barre de recherche */}
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: '12px 14px',
                border: '1px solid var(--border)', marginBottom: 20,
                display: 'flex', gap: 12, alignItems: 'center',
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input
                        type="search"
                        placeholder="Rechercher par numéro, client, téléphone..."
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
            </div>

            {/* Tableau commandes */}
            <div style={{
                background: 'var(--card)', borderRadius: 14,
                border: '1px solid var(--border)', overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                {loading ? (
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1,2,3,4,5].map(i => <Skeleton key={i} height={65} borderRadius={8} />)}
                    </div>
                ) : commandesFiltrees.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
                        <p style={{ fontSize: 15, fontWeight: 600 }}>
                            {recherche ? 'Aucune commande trouvée' : 'Aucune commande'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['N° Commande', 'Client', 'Domaine', 'Articles', 'Total', 'Payé', 'Reste', 'Statut', 'Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 14px', fontSize: 11,
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
                                {commandesFiltrees.map((cmd, i) => {
                                    const sc = STATUTS_CONFIG[cmd.statut] || STATUTS_CONFIG.nouvelle;
                                    const suivant = sc.suivant;
                                    const scSuivant = suivant ? STATUTS_CONFIG[suivant] : null;

                                    return (
                                        <tr key={cmd.id} style={{
                                            borderBottom: i < commandesFiltrees.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Numéro */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{
                                                    fontWeight: 700, color: '#0F2D6B',
                                                    fontSize: 13, fontFamily: 'monospace',
                                                }}>
                                                    {cmd.numero}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                                                    {cmd.createdAt?.toDate
                                                        ? cmd.createdAt.toDate().toLocaleString('fr-FR', {
                                                            day: '2-digit', month: '2-digit',
                                                            hour: '2-digit', minute: '2-digit'
                                                          })
                                                        : '—'}
                                                </div>
                                            </td>

                                            {/* Client */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ fontWeight: 700, fontSize: 13 }}>
                                                    {cmd.clientNom || '—'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                                    {cmd.clientTel}
                                                </div>
                                            </td>

                                            {/* Domaine */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <Badge variant="primary">
                                                    {cmd.domaineLabel || '—'}
                                                </Badge>
                                            </td>

                                            {/* Nb articles */}
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <span style={{
                                                    fontWeight: 700, fontSize: 14,
                                                    background: 'rgba(15,45,107,0.08)',
                                                    color: '#0F2D6B',
                                                    padding: '3px 10px',
                                                    borderRadius: 20,
                                                }}>
                                                    {cmd.lignes?.length || 0}
                                                </span>
                                            </td>

                                            {/* Total */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontWeight: 800, color: '#111827', fontSize: 14 }}>
                                                    {(cmd.montantTotal || 0).toLocaleString('fr-FR')} {devise}
                                                </span>
                                            </td>

                                            {/* Payé */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ fontWeight: 700, color: '#10B981', fontSize: 13 }}>
                                                    {(cmd.montantPaye || 0).toLocaleString('fr-FR')} {devise}
                                                </span>
                                            </td>

                                            {/* Reste */}
                                            <td style={{ padding: '12px 14px' }}>
                                                {(cmd.resteAPayer || 0) > 0 ? (
                                                    <span style={{ fontWeight: 700, color: '#EF4444', fontSize: 13 }}>
                                                        {(cmd.resteAPayer || 0).toLocaleString('fr-FR')} {devise}
                                                    </span>
                                                ) : (
                                                    <Badge variant="success" dot>Payée</Badge>
                                                )}
                                            </td>

                                            {/* Statut */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <Badge variant={sc.couleur} dot>
                                                    {sc.emoji} {sc.label}
                                                </Badge>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                    {/* Voir détail */}
                                                    <button
                                                        onClick={() => { setCmdSelectionnee(cmd); setModalDetail(true); }}
                                                        style={btnStyle('#0F2D6B')}
                                                        title="Voir détail"
                                                    >
                                                        👁️
                                                    </button>

                                                    {/* Avancer statut */}
                                                    {peutModifier && scSuivant && (
                                                        <button
                                                            onClick={() => handleChangerStatut(cmd.id, suivant)}
                                                            style={btnStyle('#10B981')}
                                                            title={`→ ${scSuivant.label}`}
                                                        >
                                                            {scSuivant.emoji}
                                                        </button>
                                                    )}

                                                    {/* Paiement */}
                                                    {peutModifier && (cmd.resteAPayer || 0) > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setCmdSelectionnee(cmd);
                                                                setPaiForm({ montant: String(cmd.resteAPayer), moyen: 'especes', reference: '', note: '' });
                                                                setModalPaiement(true);
                                                            }}
                                                            style={btnStyle('#FF6B00')}
                                                            title="Enregistrer paiement"
                                                        >
                                                            💰
                                                        </button>
                                                    )}

                                                    {/* Ticket */}
                                                    <button
                                                        onClick={() => telechargerTicket(cmd, entreprise)}
                                                        style={btnStyle('#6B7280')}
                                                        title="Télécharger ticket"
                                                    >
                                                        🖨️
                                                    </button>

                                                    {/* Annuler */}
                                                    {peutModifier && cmd.statut !== 'terminee' && cmd.statut !== 'annulee' && (
                                                        <button
                                                            onClick={() => { setCmdAnnuler(cmd); setModalConfirm(true); }}
                                                            style={btnStyle('#EF4444')}
                                                            title="Annuler commande"
                                                        >
                                                            ❌
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

            {/* ═══ MODAL DETAIL COMMANDE ═══ */}
            <Modal
                isOpen={modalDetail}
                onClose={() => setModalDetail(false)}
                title={`📋 Commande ${cmdSelectionnee?.numero || ''}`}
                size="lg"
                icon="📋"
            >
                {cmdSelectionnee && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Infos client et statut */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ padding: 14, background: 'var(--gray-50)', borderRadius: 10 }}>
                                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 6 }}>
                                    👤 CLIENT
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{cmdSelectionnee.clientNom}</div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{cmdSelectionnee.clientTel}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{cmdSelectionnee.clientEmail}</div>
                            </div>
                            <div style={{ padding: 14, background: 'var(--gray-50)', borderRadius: 10 }}>
                                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 6 }}>
                                    📊 STATUT
                                </div>
                                <Badge variant={STATUTS_CONFIG[cmdSelectionnee.statut]?.couleur || 'gray'} dot size="lg">
                                    {STATUTS_CONFIG[cmdSelectionnee.statut]?.emoji} {STATUTS_CONFIG[cmdSelectionnee.statut]?.label}
                                </Badge>
                                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8 }}>
                                    Paiement : {cmdSelectionnee.statutPaiement === 'paye' ? '✅ Payée' : cmdSelectionnee.statutPaiement === 'partiel' ? '⚠️ Partiel' : '❌ Non payée'}
                                </div>
                            </div>
                        </div>

                        {/* Articles */}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text)' }}>
                                🧾 Articles commandés
                            </div>
                            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                {(cmdSelectionnee.lignes || []).map((l, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', padding: '10px 14px',
                                        borderBottom: i < (cmdSelectionnee.lignes?.length - 1) ? '1px solid var(--border)' : 'none',
                                        background: i % 2 === 0 ? 'var(--card)' : 'var(--gray-50)',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{l.nom}</div>
                                            {l.description && (
                                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{l.description}</div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                                                {l.quantite} × {(l.prixUnitaire || 0).toLocaleString('fr-FR')} {devise}
                                                {l.remise > 0 && ` (-${l.remise}%)`}
                                            </div>
                                            <div style={{ fontWeight: 800, color: '#10B981', fontSize: 14 }}>
                                                {(l.sousTotal || 0).toLocaleString('fr-FR')} {devise}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totaux */}
                        <div style={{
                            background: 'rgba(15,45,107,0.05)', borderRadius: 10,
                            padding: 14, border: '1px solid rgba(15,45,107,0.1)',
                        }}>
                            {[
                                { label: 'Sous-total', val: cmdSelectionnee.sousTotal },
                                cmdSelectionnee.remiseGlobale > 0 && { label: 'Remise globale', val: -cmdSelectionnee.remiseGlobale },
                                cmdSelectionnee.fraisLivraison > 0 && { label: 'Livraison', val: cmdSelectionnee.fraisLivraison },
                            ].filter(Boolean).map((t, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontSize: 13, color: 'var(--text2)', marginBottom: 4,
                                }}>
                                    <span>{t.label}</span>
                                    <span>{(t.val || 0).toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            ))}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontWeight: 800, fontSize: 16, color: '#0F2D6B',
                                paddingTop: 10, borderTop: '2px solid rgba(15,45,107,0.2)', marginTop: 8,
                            }}>
                                <span>Total</span>
                                <span>{(cmdSelectionnee.montantTotal || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 13, color: '#10B981', fontWeight: 700, marginTop: 4,
                            }}>
                                <span>Payé</span>
                                <span>{(cmdSelectionnee.montantPaye || 0).toLocaleString('fr-FR')} {devise}</span>
                            </div>
                            {(cmdSelectionnee.resteAPayer || 0) > 0 && (
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontSize: 14, color: '#EF4444', fontWeight: 800, marginTop: 4,
                                }}>
                                    <span>Reste à payer</span>
                                    <span>{(cmdSelectionnee.resteAPayer || 0).toLocaleString('fr-FR')} {devise}</span>
                                </div>
                            )}
                        </div>

                        {/* Changer statut */}
                        {peutModifier && (
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text)' }}>
                                    🔄 Changer le statut
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {Object.entries(STATUTS_CONFIG)
                                        .filter(([k]) => k !== cmdSelectionnee.statut)
                                        .map(([key, s]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    handleChangerStatut(cmdSelectionnee.id, key);
                                                    setCmdSelectionnee(prev => ({ ...prev, statut: key }));
                                                }}
                                                style={{
                                                    padding: '7px 14px',
                                                    background: 'var(--gray-100)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 8, cursor: 'pointer',
                                                    fontSize: 12, fontWeight: 600,
                                                    fontFamily: 'Inter, sans-serif',
                                                    color: 'var(--text)',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.background = '#0F2D6B';
                                                    e.currentTarget.style.color = 'white';
                                                    e.currentTarget.style.borderColor = '#0F2D6B';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.background = 'var(--gray-100)';
                                                    e.currentTarget.style.color = 'var(--text)';
                                                    e.currentTarget.style.borderColor = 'var(--border)';
                                                }}
                                            >
                                                {s.emoji} {s.label}
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => telechargerTicket(cmdSelectionnee, entreprise)}
                                style={{
                                    flex: 1, padding: '10px',
                                    background: '#0F2D6B', color: 'white',
                                    border: 'none', borderRadius: 10,
                                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}
                            >
                                🖨️ Ticket
                            </button>
                            {(cmdSelectionnee.resteAPayer || 0) > 0 && (
                                <button
                                    onClick={() => {
                                        setModalDetail(false);
                                        setPaiForm({ montant: String(cmdSelectionnee.resteAPayer), moyen: 'especes', reference: '', note: '' });
                                        setModalPaiement(true);
                                    }}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: '#FF6B00', color: 'white',
                                        border: 'none', borderRadius: 10,
                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    💰 Paiement
                                </button>
                            )}
                        </div>

                        {/* Historique statuts */}
                        {(cmdSelectionnee.historiqueStatuts || []).length > 0 && (
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                                    📜 Historique
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[...(cmdSelectionnee.historiqueStatuts || [])].reverse().map((h, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 12px', background: 'var(--gray-50)',
                                            borderRadius: 8, fontSize: 12,
                                        }}>
                                            <span>{STATUTS_CONFIG[h.statut]?.emoji}</span>
                                            <span style={{ fontWeight: 600 }}>{STATUTS_CONFIG[h.statut]?.label}</span>
                                            <span style={{ color: 'var(--text2)', marginLeft: 'auto' }}>
                                                {new Date(h.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ═══ MODAL PAIEMENT ═══ */}
            <Modal
                isOpen={modalPaiement}
                onClose={() => setModalPaiement(false)}
                title="💰 Enregistrer un paiement"
                icon="💰"
                size="sm"
                footer={
                    <>
                        <button
                            onClick={() => setModalPaiement(false)}
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
                            onClick={handlePaiement}
                            disabled={loadingPai}
                            style={{
                                padding: '10px 24px',
                                background: loadingPai ? '#9CA3AF' : '#10B981',
                                color: 'white', border: 'none', borderRadius: 10,
                                fontSize: 14, fontWeight: 700,
                                cursor: loadingPai ? 'not-allowed' : 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {loadingPai ? '⏳ Traitement...' : '✅ Confirmer'}
                        </button>
                    </>
                }
            >
                {cmdSelectionnee && (
                    <div>
                        <div style={{
                            padding: '12px 14px', background: 'rgba(16,185,129,0.08)',
                            borderRadius: 10, marginBottom: 18,
                            border: '1px solid rgba(16,185,129,0.2)',
                        }}>
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>
                                Commande {cmdSelectionnee.numero}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>Reste à payer :</span>
                                <span style={{ fontWeight: 800, color: '#EF4444', fontSize: 15 }}>
                                    {(cmdSelectionnee.resteAPayer || 0).toLocaleString('fr-FR')} {devise}
                                </span>
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Montant reçu *
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={cmdSelectionnee.resteAPayer || undefined}
                                value={paiForm.montant}
                                onChange={e => setPaiForm(p => ({ ...p, montant: e.target.value }))}
                                placeholder="0"
                                style={{
                                    width: '100%', padding: '12px 14px',
                                    border: '2px solid #10B981', borderRadius: 10,
                                    fontSize: 18, fontWeight: 700,
                                    background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Moyen de paiement
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {MOYENS_PAIEMENT.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setPaiForm(p => ({ ...p, moyen: m.id }))}
                                        style={{
                                            padding: '10px 8px', textAlign: 'center',
                                            border: `2px solid ${paiForm.moyen === m.id ? '#0F2D6B' : 'var(--border)'}`,
                                            borderRadius: 10,
                                            background: paiForm.moyen === m.id ? 'rgba(15,45,107,0.08)' : 'var(--card)',
                                            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        }}
                                    >
                                        <div style={{ fontSize: 18, marginBottom: 2 }}>{m.emoji}</div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>
                                            {m.label}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Référence / N° Transaction (optionnel)
                            </label>
                            <input
                                type="text"
                                value={paiForm.reference}
                                onChange={e => setPaiForm(p => ({ ...p, reference: e.target.value }))}
                                placeholder="Ex: TXN-1234567890"
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* ═══ MODAL NOUVELLE COMMANDE ═══ */}
            <Modal
                isOpen={modalNouv}
                onClose={() => setModalNouv(false)}
                title="➕ Nouvelle commande"
                icon="📋"
                size="xl"
                footer={
                    <>
                        <button
                            onClick={() => setModalNouv(false)}
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
                            onClick={handleCreerCommande}
                            disabled={loadingNouv}
                            style={{
                                padding: '10px 24px',
                                background: loadingNouv ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                color: 'white', border: 'none', borderRadius: 10,
                                fontSize: 14, fontWeight: 700,
                                cursor: loadingNouv ? 'not-allowed' : 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {loadingNouv ? '⏳ Création...' : '✅ Créer la commande'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Client */}
                    <div style={{
                        padding: 16, background: 'rgba(15,45,107,0.04)',
                        borderRadius: 12, border: '1px solid rgba(15,45,107,0.1)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F2D6B', marginBottom: 12 }}>
                            👤 Client
                        </div>
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                            <input
                                type="text"
                                placeholder="Rechercher un client..."
                                value={rechercheClient}
                                onChange={e => setRechercheClient(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                            {clientsRecherche.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: 'var(--card)', border: '1px solid var(--border)',
                                    borderRadius: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                    zIndex: 1000, maxHeight: 200, overflowY: 'auto',
                                }}>
                                    {clientsRecherche.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                setNouvForm(p => ({
                                                    ...p, clientId: c.id,
                                                    clientNom: c.nomComplet,
                                                    clientTel: c.telephone,
                                                    clientEmail: c.email,
                                                }));
                                                setRechercheClient(c.nomComplet);
                                                setClientsRecherche([]);
                                            }}
                                            style={{
                                                padding: '10px 14px', cursor: 'pointer',
                                                borderBottom: '1px solid var(--border)',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nomComplet}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{c.telephone}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { key: 'clientNom', label: 'Nom *',      ph: 'Nom du client' },
                                { key: 'clientTel', label: 'Téléphone',  ph: '+224 6XX XXX XXX' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                                    <input
                                        type="text"
                                        value={nouvForm[f.key]}
                                        onChange={e => setNouvForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.ph}
                                        style={{
                                            width: '100%', padding: '9px 12px',
                                            border: '2px solid var(--border)', borderRadius: 10,
                                            fontSize: 13, background: 'var(--card)', color: 'var(--text)',
                                            outline: 'none', fontFamily: 'Inter, sans-serif',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Domaine */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Domaine
                            </label>
                            <select
                                value={nouvForm.domaineId}
                                onChange={e => {
                                    const d = domaines.find(x => x.id === e.target.value);
                                    setNouvForm(p => ({ ...p, domaineId: e.target.value, domaineLabel: d?.nom || '' }));
                                }}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                <option value="">Sélectionner un domaine</option>
                                {domaines.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Type de livraison
                            </label>
                            <select
                                value={nouvForm.typeLivraison}
                                onChange={e => setNouvForm(p => ({ ...p, typeLivraison: e.target.value }))}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                <option value="retrait">🏪 Retrait en boutique</option>
                                <option value="livraison">🚚 Livraison à domicile</option>
                            </select>
                        </div>
                    </div>

                    {/* Lignes articles */}
                    <div>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: 10,
                        }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                                🧾 Articles
                            </div>
                            <button
                                type="button"
                                onClick={ajouterLigne}
                                style={{
                                    padding: '6px 14px',
                                    background: '#0F2D6B', color: 'white',
                                    border: 'none', borderRadius: 8,
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                ➕ Ajouter
                            </button>
                        </div>

                        {nouvForm.lignes.map((ligne, idx) => (
                            <div key={idx} style={{
                                display: 'grid',
                                gridTemplateColumns: '3fr 1fr 2fr 1fr auto',
                                gap: 10, marginBottom: 10, alignItems: 'center',
                                padding: 12, background: 'var(--gray-50)',
                                borderRadius: 10, border: '1px solid var(--border)',
                            }}>
                                <input
                                    type="text"
                                    value={ligne.nom}
                                    onChange={e => modifierLigne(idx, 'nom', e.target.value)}
                                    placeholder="Description article..."
                                    style={inputMiniStyle}
                                />
                                <input
                                    type="number"
                                    value={ligne.quantite}
                                    onChange={e => modifierLigne(idx, 'quantite', parseFloat(e.target.value) || 1)}
                                    min="1"
                                    placeholder="Qté"
                                    style={inputMiniStyle}
                                />
                                <input
                                    type="number"
                                    value={ligne.prixUnitaire}
                                    onChange={e => modifierLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    placeholder="Prix unitaire"
                                    style={inputMiniStyle}
                                />
                                <div style={{
                                    fontWeight: 800, fontSize: 13,
                                    color: '#10B981', textAlign: 'right',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {(ligne.sousTotal || 0).toLocaleString('fr-FR')} {devise}
                                </div>
                                {nouvForm.lignes.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => supprimerLigne(idx)}
                                        style={{
                                            width: 28, height: 28,
                                            background: 'rgba(239,68,68,0.1)',
                                            border: 'none', borderRadius: '50%',
                                            color: '#EF4444', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14,
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Total commande */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end',
                            padding: 14, background: 'rgba(15,45,107,0.05)',
                            borderRadius: 10, border: '1px solid rgba(15,45,107,0.1)',
                            marginTop: 8,
                        }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Sous-total</div>
                                <div style={{ fontWeight: 800, fontSize: 20, color: '#0F2D6B' }}>
                                    {(nouvForm.montantTotal || 0).toLocaleString('fr-FR')} {devise}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                            Note interne
                        </label>
                        <textarea
                            value={nouvForm.noteInterne}
                            onChange={e => setNouvForm(p => ({ ...p, noteInterne: e.target.value }))}
                            placeholder="Note pour le staff (non visible client)..."
                            rows={2}
                            style={{
                                width: '100%', padding: '10px 14px',
                                border: '2px solid var(--border)', borderRadius: 10,
                                fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical',
                            }}
                        />
                    </div>
                </div>
            </Modal>

            {/* ═══ MODAL ANNULATION ═══ */}
            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={async () => {
                    await handleChangerStatut(cmdAnnuler.id, 'annulee');
                    setModalConfirm(false);
                }}
                title="Annuler cette commande ?"
                message={`La commande "${cmdAnnuler?.numero}" sera annulée. Cette action peut être annulée en changeant le statut.`}
                confirmText="Oui, annuler"
                type="danger"
            />
        </div>
    );
};

// Styles réutilisables
const btnStyle = (color) => ({
    padding: '6px 10px',
    background: `${color}18`,
    color,
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Inter, sans-serif',
});

const inputMiniStyle = {
    width: '100%', padding: '8px 10px',
    border: '2px solid var(--border)', borderRadius: 8,
    fontSize: 13, background: 'var(--card)', color: 'var(--text)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
};

export default CommandesPage;