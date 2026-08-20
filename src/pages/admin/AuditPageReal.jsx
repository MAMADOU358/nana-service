import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import { COLLECTIONS, AUDIT_ACTIONS } from '../../config/constants';

const ACTIONS_COLORS = {
    connexion:      { emoji: '🔐', couleur: 'success', label: 'Connexion' },
    deconnexion:    { emoji: '🚪', couleur: 'gray',    label: 'Déconnexion' },
    creation:       { emoji: '➕', couleur: 'info',    label: 'Création' },
    modification:   { emoji: '✏️', couleur: 'warning', label: 'Modification' },
    suppression:    { emoji: '🗑️', couleur: 'danger',  label: 'Suppression' },
    archivage:      { emoji: '📦', couleur: 'purple',  label: 'Archivage' },
    restauration:   { emoji: '♻️', couleur: 'success', label: 'Restauration' },
    export:         { emoji: '📤', couleur: 'info',    label: 'Export' },
    import:         { emoji: '📥', couleur: 'info',    label: 'Import' },
    paiement:       { emoji: '💰', couleur: 'success', label: 'Paiement' },
    permission:     { emoji: '🔑', couleur: 'warning', label: 'Permission' },
    parametre:      { emoji: '⚙️', couleur: 'gray',    label: 'Paramètre' },
    activation:     { emoji: '✅', couleur: 'success', label: 'Activation' },
    desactivation:  { emoji: '❌', couleur: 'danger',  label: 'Désactivation' },
    transfert_stock:{ emoji: '🔄', couleur: 'info',    label: 'Transfert stock' },
    inventaire:     { emoji: '📋', couleur: 'primary', label: 'Inventaire' },
};

const AuditPage = () => {
    const { estAdmin } = useAuth();
    const [logs, setLogs]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [filtreAction, setFiltreAction] = useState('all');
    const [recherche, setRecherche] = useState('');
    const [limitCount, setLimitCount] = useState(100);

    useEffect(() => {
        setLoading(true);
        let q = query(collection(db, COLLECTIONS.AUDIT), orderBy('timestamp', 'desc'), limit(limitCount));
        if (filtreAction !== 'all') {
            q = query(collection(db, COLLECTIONS.AUDIT), where('action', '==', filtreAction), orderBy('timestamp', 'desc'), limit(limitCount));
        }
        const unsub = onSnapshot(q, snap => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });
        return () => unsub();
    }, [filtreAction, limitCount]);

    const logsFiltres = logs.filter(l => {
        if (!recherche) return true;
        const t = recherche.toLowerCase();
        return (
            (l.userEmail || '').toLowerCase().includes(t) ||
            (l.action || '').toLowerCase().includes(t) ||
            (l.collection || '').toLowerCase().includes(t)
        );
    });

    // Stats
    const parAction = {};
    logs.forEach(l => {
        parAction[l.action] = (parAction[l.action] || 0) + 1;
    });
    const utilisateursUniques = new Set(logs.map(l => l.userId).filter(Boolean)).size;
    const auj = new Date().toDateString();
    const logsAuj = logs.filter(l => l.timestamp?.toDate?.().toDateString() === auj).length;

    const getAction = (a) => ACTIONS_COLORS[a] || { emoji: '📌', couleur: 'gray', label: a };

    if (!estAdmin) {
        return (
            <div style={{ textAlign: 'center', padding: 80, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontSize: 60 }}>🔒</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>Accès restreint</h2>
                <p style={{ color: 'var(--text2)' }}>Cette page est réservée aux administrateurs</p>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🔍 Audit & Historique</h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>Journal complet des actions effectuées</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard icon="📋" label="Total logs"           value={logs.length}          couleur="primary" />
                <StatCard icon="📅" label="Aujourd'hui"          value={logsAuj}              couleur="info"    />
                <StatCard icon="👥" label="Utilisateurs actifs"  value={utilisateursUniques}  couleur="success" />
                <StatCard icon="⚡" label="Types d'actions"      value={Object.keys(parAction).length} couleur="warning" />
            </div>

            {/* Filtres */}
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: 14,
                border: '1px solid var(--border)', marginBottom: 20,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                    <input type="search" placeholder="Rechercher email, action, collection..." value={recherche} onChange={e => setRecherche(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 40px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--bg)', outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
                </div>
                <select value={filtreAction} onChange={e => setFiltreAction(e.target.value)}
                    style={{ padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
                    <option value="all">Toutes les actions</option>
                    {Object.entries(ACTIONS_COLORS).map(([k, v]) => (
                        <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                </select>
                <select value={limitCount} onChange={e => setLimitCount(parseInt(e.target.value))}
                    style={{ padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--card)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
                    <option value="50">50 derniers</option>
                    <option value="100">100 derniers</option>
                    <option value="200">200 derniers</option>
                    <option value="500">500 derniers</option>
                </select>
            </div>

            {/* Tableau */}
            <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: 20 }}>{[1,2,3,4,5].map(i => <Skeleton key={i} height={50} borderRadius={8} style={{ marginBottom: 10 }}/>)}</div>
                ) : logsFiltres.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>🔍</div>
                        <p style={{ fontWeight: 600 }}>Aucun log trouvé</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['Date/Heure','Utilisateur','Action','Collection','Détails'].map(h => (
                                        <th key={h} style={{ padding: '12px 14px', fontSize: 11, textAlign: 'left', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {logsFiltres.map((l, i) => {
                                    const a = getAction(l.action);
                                    return (
                                        <tr key={l.id} style={{ borderBottom: i < logsFiltres.length - 1 ? '1px solid var(--border)' : 'none' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                                                {l.timestamp?.toDate?.().toLocaleString('fr-FR', {
                                                    day: '2-digit', month: '2-digit', year: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                }) || '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.userEmail || 'Système'}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>{l.userId?.slice(0, 12) || '—'}</div>
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <Badge variant={a.couleur} dot>{a.emoji} {a.label}</Badge>
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                {l.collection ? (
                                                    <code style={{ background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>
                                                        {l.collection}
                                                    </code>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', maxWidth: 300 }}>
                                                {l.details ? (
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {JSON.stringify(l.details).substring(0, 80)}
                                                    </div>
                                                ) : l.nouvelleValeur ? (
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {typeof l.nouvelleValeur === 'object'
                                                            ? Object.entries(l.nouvelleValeur).map(([k, v]) => `${k}: ${v}`).join(', ').substring(0, 80)
                                                            : String(l.nouvelleValeur).substring(0, 80)}
                                                    </div>
                                                ) : l.docId ? (
                                                    <code style={{ fontSize: 10 }}>{l.docId.substring(0, 20)}</code>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 16, padding: 14, background: 'rgba(15,45,107,0.05)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <span>
                    <strong>Sécurité :</strong> Ce journal est immuable et enregistre toutes les actions importantes.
                    Il ne peut PAS être modifié ou supprimé, garantissant la traçabilité complète.
                </span>
            </div>
        </div>
    );
};

export default AuditPage;