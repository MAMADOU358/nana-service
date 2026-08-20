import React, { useState, useEffect } from 'react';
import {
    collection, query, where, orderBy,
    getDocs, Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import { exporterListePDF } from '../../utils/pdfGenerator';
import { COLLECTIONS } from '../../config/constants';
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from 'xlsx';

const RapportsPage = () => {
    const { entreprise } = useApp();
    const toast = useToast();

    const [periode, setPeriode]     = useState('mois');
    const [dateDebut, setDateDebut] = useState('');
    const [dateFin, setDateFin]     = useState('');
    const [loading, setLoading]     = useState(false);
    const [stats, setStats]         = useState(null);
    const [commandes, setCommandes] = useState([]);
    const [topProduits, setTopProduits] = useState([]);

    const devise = entreprise?.devise || 'GNF';

    // Calculer période
    const getPeriodeDates = () => {
        const now = new Date();
        let debut = new Date();
        let fin   = new Date();

        switch(periode) {
            case 'aujourd_hui':
                debut.setHours(0,0,0,0);
                fin.setHours(23,59,59,999);
                break;
            case 'semaine':
                debut.setDate(now.getDate() - 7);
                debut.setHours(0,0,0,0);
                break;
            case 'mois':
                debut.setDate(1);
                debut.setHours(0,0,0,0);
                break;
            case 'trimestre':
                debut.setMonth(now.getMonth() - 3);
                debut.setHours(0,0,0,0);
                break;
            case 'annee':
                debut = new Date(now.getFullYear(), 0, 1);
                break;
            case 'personnalise':
                if (dateDebut) debut = new Date(dateDebut);
                if (dateFin)   fin   = new Date(dateFin);
                fin.setHours(23,59,59,999);
                break;
            default:
                debut.setDate(1);
        }

        return { debut, fin };
    };

    // Charger rapport
    const chargerRapport = async () => {
        setLoading(true);
        try {
            const { debut, fin } = getPeriodeDates();
            const debutTS = Timestamp.fromDate(debut);
            const finTS   = Timestamp.fromDate(fin);

            // Commandes de la période
            const q = query(
                collection(db, COLLECTIONS.COMMANDES),
                where('createdAt', '>=', debutTS),
                where('createdAt', '<=', finTS),
                orderBy('createdAt', 'desc')
            );

            const snap = await getDocs(q);
            const cmds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCommandes(cmds);

            // Calculs
            const nonAnnulees = cmds.filter(c => c.statut !== 'annulee');
            const caTotal     = nonAnnulees.reduce((s, c) => s + (c.montantTotal || 0), 0);
            const caPaye      = nonAnnulees.reduce((s, c) => s + (c.montantPaye || 0), 0);
            const nbClients   = new Set(nonAnnulees.map(c => c.clientId).filter(Boolean)).size;
            const panierMoy   = nonAnnulees.length > 0 ? caTotal / nonAnnulees.length : 0;

            // Top produits
            const prodCpt = {};
            nonAnnulees.forEach(cmd => {
                (cmd.lignes || []).forEach(l => {
                    const k = l.nom;
                    if (!prodCpt[k]) prodCpt[k] = { qte: 0, ca: 0 };
                    prodCpt[k].qte += l.quantite || 1;
                    prodCpt[k].ca  += l.sousTotal || 0;
                });
            });

            const top = Object.entries(prodCpt)
                .sort((a, b) => b[1].ca - a[1].ca)
                .slice(0, 10)
                .map(([nom, d]) => ({ nom, ...d }));
            setTopProduits(top);

            setStats({
                caTotal, caPaye, caImpaye: caTotal - caPaye,
                nbCommandes: cmds.length, nbNonAnnulees: nonAnnulees.length,
                nbAnnulees: cmds.filter(c => c.statut === 'annulee').length,
                nbClients, panierMoy,
            });

        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { chargerRapport(); }, [periode]);

    // Export CSV
    const exporterCSV = () => {
        if (commandes.length === 0) { toast.warning('Aucune donnée à exporter'); return; }

        const { debut, fin } = getPeriodeDates();
        const rows = commandes.map(c => ({
            'Numéro':        c.numero || c.id.slice(-8),
            'Date':          c.createdAt?.toDate?.().toLocaleString('fr-FR') || '—',
            'Client':        c.clientNom || '—',
            'Téléphone':     c.clientTel || '—',
            'Domaine':       c.domaineLabel || '—',
            'Montant Total': c.montantTotal || 0,
            'Montant Payé':  c.montantPaye  || 0,
            'Reste':         c.resteAPayer  || 0,
            'Statut':        c.statut || '—',
            'Source':        c.source || '—',
            'Devise':        devise,
        }));

        const ws  = XLSXUtils.json_to_sheet(rows);
        const wb  = XLSXUtils.book_new();
        XLSXUtils.book_append_sheet(wb, ws, 'Commandes');
        XLSXWriteFile(wb, `rapport_${periode}_${Date.now()}.xlsx`);
        toast.success('Export Excel téléchargé !');
    };

    // Export PDF
    const exporterPDF = () => {
        if (commandes.length === 0) { toast.warning('Aucune donnée'); return; }
        exporterListePDF(
            'Rapport de ventes',
            [
                { header: 'N°',          key: 'numero'       },
                { header: 'Client',      key: 'clientNom'    },
                { header: 'Domaine',     key: 'domaineLabel' },
                { header: 'Total',       key: 'montantTotal', format: v => `${(v||0).toLocaleString('fr-FR')} ${devise}` },
                { header: 'Payé',        key: 'montantPaye',  format: v => `${(v||0).toLocaleString('fr-FR')} ${devise}` },
                { header: 'Statut',      key: 'statut'       },
            ],
            commandes,
            entreprise
        );
        toast.success('PDF téléchargé !');
    };

    const PERIODES = [
        { val: 'aujourd_hui', label: "Aujourd'hui" },
        { val: 'semaine',     label: '7 derniers jours' },
        { val: 'mois',        label: 'Ce mois' },
        { val: 'trimestre',   label: 'Ce trimestre' },
        { val: 'annee',       label: 'Cette année' },
        { val: 'personnalise',label: 'Personnalisé' },
    ];

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                    📈 Rapports & Statistiques
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>Analyses de performance et exports</p>
            </div>

            {/* Filtres période */}
            <div style={{
                background: 'var(--card)', borderRadius: 14, padding: 20,
                border: '1px solid var(--border)', marginBottom: 24,
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                <div style={{
                    display: 'flex', gap: 8, flexWrap: 'wrap',
                    alignItems: 'center', marginBottom: periode === 'personnalise' ? 14 : 0,
                }}>
                    {PERIODES.map(p => (
                        <button
                            key={p.val}
                            onClick={() => setPeriode(p.val)}
                            style={{
                                padding: '9px 16px', border: 'none', borderRadius: 10,
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                background: periode === p.val ? '#0F2D6B' : 'var(--gray-100)',
                                color:      periode === p.val ? 'white'  : 'var(--text2)',
                                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {p.label}
                        </button>
                    ))}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button
                            onClick={exporterCSV}
                            style={{
                                padding: '9px 16px',
                                background: 'rgba(16,185,129,0.1)',
                                color: '#10B981', border: '1px solid rgba(16,185,129,0.3)',
                                borderRadius: 10, fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            📊 Excel
                        </button>
                        <button
                            onClick={exporterPDF}
                            style={{
                                padding: '9px 16px',
                                background: 'rgba(239,68,68,0.1)',
                                color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 10, fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            📄 PDF
                        </button>
                    </div>
                </div>

                {/* Dates personnalisées */}
                {periode === 'personnalise' && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                Du
                            </label>
                            <input
                                type="date"
                                value={dateDebut}
                                onChange={e => setDateDebut(e.target.value)}
                                style={{
                                    padding: '9px 12px', border: '2px solid var(--border)',
                                    borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif',
                                    background: 'var(--card)', color: 'var(--text)',
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                Au
                            </label>
                            <input
                                type="date"
                                value={dateFin}
                                onChange={e => setDateFin(e.target.value)}
                                style={{
                                    padding: '9px 12px', border: '2px solid var(--border)',
                                    borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif',
                                    background: 'var(--card)', color: 'var(--text)',
                                }}
                            />
                        </div>
                        <button
                            onClick={chargerRapport}
                            style={{
                                padding: '10px 20px', marginTop: 20,
                                background: '#0F2D6B', color: 'white',
                                border: 'none', borderRadius: 10,
                                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            🔍 Analyser
                        </button>
                    </div>
                )}
            </div>

            {/* Stats */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
                    {[1,2,3,4,5].map(i => <Skeleton key={i} height={100} borderRadius={14} />)}
                </div>
            ) : stats ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))',
                    gap: 16, marginBottom: 24,
                }}>
                    <StatCard icon="💰" label="Chiffre d'affaires" value={`${(stats.caTotal || 0).toLocaleString('fr-FR')} ${devise}`} couleur="success" />
                    <StatCard icon="✅" label="Montant encaissé" value={`${(stats.caPaye || 0).toLocaleString('fr-FR')} ${devise}`} couleur="primary" />
                    <StatCard icon="⏳" label="Reste à encaisser" value={`${(stats.caImpaye || 0).toLocaleString('fr-FR')} ${devise}`} couleur="warning" />
                    <StatCard icon="📋" label="Commandes" value={stats.nbNonAnnulees || 0} couleur="info" />
                    <StatCard icon="👥" label="Clients distincts" value={stats.nbClients || 0} couleur="purple" />
                    <StatCard icon="📊" label="Panier moyen" value={`${(stats.panierMoy || 0).toLocaleString('fr-FR')} ${devise}`} couleur="secondary" />
                </div>
            ) : null}

            {/* Top produits */}
            {topProduits.length > 0 && (
                <div style={{
                    background: 'var(--card)', borderRadius: 14, padding: 22,
                    border: '1px solid var(--border)', marginBottom: 24,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
                        🏆 Top produits/services vendus
                    </h2>
                    {topProduits.map((p, i) => {
                        const maxCA = topProduits[0]?.ca || 1;
                        const pct   = Math.round((p.ca / maxCA) * 100);

                        return (
                            <div key={p.nom} style={{ marginBottom: 14 }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    marginBottom: 5, fontSize: 14,
                                }}>
                                    <span>
                                        <strong style={{ color: '#0F2D6B' }}>#{i+1}</strong>
                                        {' '}{p.nom}
                                    </span>
                                    <span style={{ fontWeight: 700, color: '#10B981' }}>
                                        {p.qte} ventes — {(p.ca || 0).toLocaleString('fr-FR')} {devise}
                                    </span>
                                </div>
                                <div style={{
                                    background: 'var(--gray-100)', borderRadius: 10,
                                    height: 10, overflow: 'hidden',
                                }}>
                                    <div style={{
                                        background: `linear-gradient(135deg, #0F2D6B, #FF6B00)`,
                                        height: '100%', width: `${pct}%`,
                                        borderRadius: 10, transition: 'width 0.5s',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tableau commandes */}
            {commandes.length > 0 && (
                <div style={{
                    background: 'var(--card)', borderRadius: 14,
                    border: '1px solid var(--border)', overflow: 'hidden',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                }}>
                    <div style={{
                        padding: '16px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                            📋 Commandes de la période ({commandes.length})
                        </h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['N°', 'Date', 'Client', 'Domaine', 'Total', 'Payé', 'Statut'].map(h => (
                                        <th key={h} style={{
                                            padding: '11px 14px', fontSize: 11,
                                            textAlign: 'left', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {commandes.slice(0, 50).map((c, i) => (
                                    <tr key={c.id} style={{
                                        borderBottom: i < commandes.length - 1 ? '1px solid var(--border)' : 'none',
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F2D6B', fontFamily: 'monospace', fontSize: 12 }}>
                                            {c.numero || c.id.slice(-8).toUpperCase()}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                                            {c.createdAt?.toDate?.().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) || '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>
                                            {c.clientNom || '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                                            {c.domaineLabel || '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>
                                            {(c.montantTotal || 0).toLocaleString('fr-FR')} {devise}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#10B981' }}>
                                            {(c.montantPaye || 0).toLocaleString('fr-FR')} {devise}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                background: c.statut === 'terminee' ? 'rgba(16,185,129,0.1)' :
                                                            c.statut === 'annulee'  ? 'rgba(239,68,68,0.1)' : 'rgba(15,45,107,0.1)',
                                                color:      c.statut === 'terminee' ? '#10B981' :
                                                            c.statut === 'annulee'  ? '#EF4444' : '#0F2D6B',
                                            }}>
                                                {c.statut || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RapportsPage;