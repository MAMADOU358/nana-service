import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import { exporterListePDF } from '../../utils/pdfGenerator';
import { COLLECTIONS } from '../../config/constants';
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from 'xlsx';

const VentesPage = () => {
    const { profil } = useAuth();
    const { entreprise } = useApp();
    const toast = useToast();

    const [periode, setPeriode] = useState('mois');
    const [dateDebut, setDateDebut] = useState('');
    const [dateFin, setDateFin]     = useState('');
    const [ventes, setVentes]       = useState([]);
    const [loading, setLoading]     = useState(true);

    const devise = entreprise?.devise || 'GNF';

    // Calculer dates période
    const getPeriodeDates = () => {
        const now = new Date();
        let debut = new Date();
        let fin   = new Date();

        switch(periode) {
            case 'aujourd_hui':
                debut.setHours(0,0,0,0);
                fin.setHours(23,59,59,999);
                break;
            case 'hier':
                debut.setDate(now.getDate() - 1);
                debut.setHours(0,0,0,0);
                fin.setDate(now.getDate() - 1);
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

    // Charger ventes
    useEffect(() => {
        setLoading(true);
        const { debut, fin } = getPeriodeDates();

        const q = query(
            collection(db, COLLECTIONS.COMMANDES),
            where('createdAt', '>=', Timestamp.fromDate(debut)),
            where('createdAt', '<=', Timestamp.fromDate(fin)),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, snap => {
            setVentes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });

        return () => unsub();
    }, [periode, dateDebut, dateFin]);

    // Stats
    const nonAnnulees = ventes.filter(v => v.statut !== 'annulee');
    const totalCA     = nonAnnulees.reduce((s, v) => s + (v.montantTotal || 0), 0);
    const totalPaye   = nonAnnulees.reduce((s, v) => s + (v.montantPaye || 0), 0);
    const impaye      = totalCA - totalPaye;
    const nbClients   = new Set(nonAnnulees.map(v => v.clientId).filter(Boolean)).size;
    const panierMoy   = nonAnnulees.length > 0 ? totalCA / nonAnnulees.length : 0;

    // Top produits/services vendus
    const compteurArticles = {};
    nonAnnulees.forEach(v => {
        (v.lignes || []).forEach(l => {
            const k = l.nom;
            if (!compteurArticles[k]) compteurArticles[k] = { qte: 0, ca: 0 };
            compteurArticles[k].qte += l.quantite || 1;
            compteurArticles[k].ca  += l.sousTotal || 0;
        });
    });
    const topArticles = Object.entries(compteurArticles)
        .sort((a, b) => b[1].ca - a[1].ca)
        .slice(0, 10)
        .map(([nom, d]) => ({ nom, ...d }));

    // Ventes par jour
    const parJour = {};
    nonAnnulees.forEach(v => {
        const d = v.createdAt?.toDate?.().toLocaleDateString('fr-FR') || '';
        if (!parJour[d]) parJour[d] = 0;
        parJour[d] += v.montantTotal || 0;
    });

    // Export Excel
    const exporterExcel = () => {
        if (ventes.length === 0) { toast.warning('Aucune donnée'); return; }
        const rows = ventes.map(v => ({
            'Numéro':      v.numero || v.id.slice(-8),
            'Date':        v.createdAt?.toDate?.().toLocaleString('fr-FR') || '—',
            'Client':      v.clientNom || '—',
            'Téléphone':   v.clientTel || '—',
            'Domaine':     v.domaineLabel || '—',
            'Articles':    (v.lignes || []).length,
            'Sous-total':  v.sousTotal || 0,
            'Montant Total': v.montantTotal || 0,
            'Payé':        v.montantPaye || 0,
            'Reste':       v.resteAPayer || 0,
            'Statut':      v.statut,
            'Devise':      devise,
        }));
        const ws = XLSXUtils.json_to_sheet(rows);
        const wb = XLSXUtils.book_new();
        XLSXUtils.book_append_sheet(wb, ws, 'Ventes');
        XLSXWriteFile(wb, `ventes_${periode}_${Date.now()}.xlsx`);
        toast.success('Export Excel téléchargé !');
    };

    // Export PDF
    const exporterPDF = () => {
        if (ventes.length === 0) { toast.warning('Aucune donnée'); return; }
        exporterListePDF(
            'Rapport de ventes',
            [
                { header: 'N°',       key: 'numero' },
                { header: 'Client',   key: 'clientNom' },
                { header: 'Domaine',  key: 'domaineLabel' },
                { header: 'Total',    key: 'montantTotal', format: v => `${(v||0).toLocaleString('fr-FR')} ${devise}` },
                { header: 'Payé',     key: 'montantPaye',  format: v => `${(v||0).toLocaleString('fr-FR')} ${devise}` },
                { header: 'Statut',   key: 'statut' },
            ],
            ventes,
            entreprise
        );
        toast.success('PDF téléchargé !');
    };

    const PERIODES = [
        { val: 'aujourd_hui',  label: "Aujourd'hui" },
        { val: 'hier',         label: 'Hier' },
        { val: 'semaine',      label: '7 jours' },
        { val: 'mois',         label: 'Ce mois' },
        { val: 'trimestre',    label: 'Trimestre' },
        { val: 'annee',        label: 'Année' },
        { val: 'personnalise', label: 'Personnalisé' },
    ];

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>💰 Ventes</h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>Suivi et analyse des ventes</p>
            </div>

            {/* Filtres période */}
            <div style={{
                background: 'var(--card)', borderRadius: 14, padding: 18,
                border: '1px solid var(--border)', marginBottom: 24,
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: periode === 'personnalise' ? 14 : 0 }}>
                    {PERIODES.map(p => (
                        <button key={p.val} onClick={() => setPeriode(p.val)} style={{
                            padding: '9px 16px', border: 'none', borderRadius: 10,
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: periode === p.val ? '#10B981' : 'var(--gray-100)',
                            color: periode === p.val ? 'white' : 'var(--text2)',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            {p.label}
                        </button>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button onClick={exporterExcel} style={{
                            padding: '9px 16px', background: 'rgba(16,185,129,0.1)',
                            color: '#10B981', border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>📊 Excel</button>
                        <button onClick={exporterPDF} style={{
                            padding: '9px 16px', background: 'rgba(239,68,68,0.1)',
                            color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}>📄 PDF</button>
                    </div>
                </div>

                {periode === 'personnalise' && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Du</label>
                            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                                style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif' }}/>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Au</label>
                            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                                style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif' }}/>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
                    {[1,2,3,4,5].map(i => <Skeleton key={i} height={100} borderRadius={14} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
                    <StatCard icon="💰" label="Chiffre d'affaires" value={`${totalCA.toLocaleString('fr-FR')} ${devise}`}    couleur="success" />
                    <StatCard icon="✅" label="Encaissé"            value={`${totalPaye.toLocaleString('fr-FR')} ${devise}`}   couleur="primary" />
                    <StatCard icon="⏳" label="Impayé"              value={`${impaye.toLocaleString('fr-FR')} ${devise}`}      couleur="warning" />
                    <StatCard icon="📋" label="Ventes"              value={nonAnnulees.length}                                  couleur="info" />
                    <StatCard icon="👥" label="Clients"             value={nbClients}                                           couleur="purple" />
                    <StatCard icon="📊" label="Panier moyen"        value={`${panierMoy.toLocaleString('fr-FR')} ${devise}`}   couleur="secondary" />
                </div>
            )}

            {/* Top articles */}
            {topArticles.length > 0 && (
                <div style={{ background: 'var(--card)', borderRadius: 14, padding: 20, border: '1px solid var(--border)', marginBottom: 24, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏆 Top articles vendus</h2>
                    {topArticles.map((a, i) => {
                        const max = topArticles[0].ca || 1;
                        const pct = Math.round((a.ca / max) * 100);
                        return (
                            <div key={a.nom} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 14 }}>
                                    <span><strong style={{ color: '#10B981' }}>#{i+1}</strong> {a.nom}</span>
                                    <span style={{ fontWeight: 700, color: '#10B981' }}>{a.qte} ventes — {a.ca.toLocaleString('fr-FR')} {devise}</span>
                                </div>
                                <div style={{ background: 'var(--gray-100)', borderRadius: 10, height: 8, overflow: 'hidden' }}>
                                    <div style={{ background: 'linear-gradient(135deg,#10B981,#059669)', height: '100%', width: `${pct}%`, borderRadius: 10, transition: 'width 0.5s' }}/>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tableau ventes */}
            <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700 }}>📋 Détail des ventes ({ventes.length})</h2>
                </div>
                {loading ? (
                    <div style={{ padding: 20 }}>{[1,2,3].map(i => <Skeleton key={i} height={50} borderRadius={8} style={{ marginBottom: 10 }}/>)}</div>
                ) : ventes.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>💰</div>
                        <p style={{ fontWeight: 600 }}>Aucune vente pour cette période</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#10B981', color: 'white' }}>
                                    {['N°','Date','Client','Domaine','Total','Payé','Reste','Statut'].map(h => (
                                        <th key={h} style={{ padding: '11px 14px', fontSize: 11, textAlign: 'left', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ventes.slice(0, 50).map((v, i) => (
                                    <tr key={v.id} style={{ borderBottom: i < ventes.length - 1 ? '1px solid var(--border)' : 'none' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#10B981', fontFamily: 'monospace', fontSize: 12 }}>
                                            {v.numero || v.id.slice(-8).toUpperCase()}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                                            {v.createdAt?.toDate?.().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>{v.clientNom || '—'}</td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>{v.domaineLabel || '—'}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 800 }}>{(v.montantTotal || 0).toLocaleString('fr-FR')} {devise}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#10B981' }}>{(v.montantPaye || 0).toLocaleString('fr-FR')}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#EF4444' }}>{(v.resteAPayer || 0).toLocaleString('fr-FR')}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: v.statut === 'annulee' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: v.statut === 'annulee' ? '#EF4444' : '#10B981' }}>
                                                {v.statut}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VentesPage;