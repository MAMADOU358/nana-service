import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection, query, where, orderBy, limit,
    onSnapshot, getCountFromServer, Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { COLLECTIONS } from '../../config/constants';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Loader';

const DashboardPage = () => {
    const navigate  = useNavigate();
    const { profil } = useAuth();
    const { entreprise } = useApp();

    const [stats, setStats]       = useState(null);
    const [commandes, setCommandes] = useState([]);
    const [loading, setLoading]   = useState(true);

    const auj = new Date();
    auj.setHours(0, 0, 0, 0);

    // Charger stats
    useEffect(() => {
        const unsubs = [];

        // Commandes du jour
        const q1 = query(
            collection(db, COLLECTIONS.COMMANDES),
            where('createdAt', '>=', Timestamp.fromDate(auj)),
            orderBy('createdAt', 'desc')
        );

        const unsub1 = onSnapshot(q1, (snap) => {
            const cmdsAuj = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const caAuj = cmdsAuj
                .filter(c => c.statut !== 'annulee')
                .reduce((s, c) => s + (c.montantTotal || 0), 0);

            setCommandes(cmdsAuj.slice(0, 8));
            setStats(prev => ({
                ...prev,
                commandesAujourdhui: cmdsAuj.length,
                caAujourdhui: caAuj,
                commandesEnAttente: cmdsAuj.filter(c => c.statut === 'nouvelle').length,
            }));
            setLoading(false);
        });

        unsubs.push(unsub1);

        // Clients
        const unsub2 = onSnapshot(
            collection(db, COLLECTIONS.CLIENTS),
            (snap) => setStats(prev => ({ ...prev, totalClients: snap.size }))
        );
        unsubs.push(unsub2);

        // Produits stock faible
        const q3 = query(
            collection(db, COLLECTIONS.PRODUITS),
            where('actif', '==', true)
        );
        const unsub3 = onSnapshot(q3, (snap) => {
            const bas = snap.docs.filter(d => {
                const data = d.data();
                return (data.stockActuel || 0) <= (data.seuilAlerte || 5);
            }).length;
            setStats(prev => ({
                ...prev,
                totalProduits: snap.size,
                stockFaible: bas,
            }));
        });
        unsubs.push(unsub3);

        return () => unsubs.forEach(u => u());
    }, []);

    // Formatter prix
    const formatPrix = (n) => {
        const devise = entreprise?.devise || 'GNF';
        return (n || 0).toLocaleString('fr-FR') + ' ' + devise;
    };

    // Couleur statut
    const statutConfig = {
        nouvelle:    { label: 'Nouvelle',      variant: 'info'    },
        confirmee:   { label: 'Confirmée',     variant: 'primary' },
        preparation: { label: 'En préparation',variant: 'warning' },
        production:  { label: 'En production', variant: 'warning' },
        prete:       { label: 'Prête',         variant: 'success' },
        livree:      { label: 'Livrée',        variant: 'teal'    },
        terminee:    { label: 'Terminée',      variant: 'success' },
        annulee:     { label: 'Annulée',       variant: 'danger'  },
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text)',
                    marginBottom: 4,
                }}>
                    👋 Bonjour, {profil?.prenom || profil?.nom || 'Utilisateur'} !
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                    {new Date().toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })} — Voici votre résumé du jour
                </p>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
                gap: 16,
                marginBottom: 28,
            }}>
                <StatCard
                    icon="📋"
                    label="Commandes aujourd'hui"
                    value={loading ? '...' : (stats?.commandesAujourdhui || 0)}
                    couleur="primary"
                    loading={loading}
                    onClick={() => navigate('/admin/commandes')}
                />
                <StatCard
                    icon="💰"
                    label="CA aujourd'hui"
                    value={loading ? '...' : formatPrix(stats?.caAujourdhui)}
                    couleur="success"
                    loading={loading}
                    onClick={() => navigate('/admin/ventes')}
                />
                <StatCard
                    icon="⏳"
                    label="En attente"
                    value={loading ? '...' : (stats?.commandesEnAttente || 0)}
                    couleur="warning"
                    loading={loading}
                    onClick={() => navigate('/admin/commandes')}
                />
                <StatCard
                    icon="👥"
                    label="Clients"
                    value={loading ? '...' : (stats?.totalClients || 0)}
                    couleur="info"
                    loading={loading}
                    onClick={() => navigate('/admin/clients')}
                />
                <StatCard
                    icon="📦"
                    label="Produits actifs"
                    value={loading ? '...' : (stats?.totalProduits || 0)}
                    couleur="secondary"
                    loading={loading}
                    onClick={() => navigate('/admin/produits')}
                />
                <StatCard
                    icon="⚠️"
                    label="Stock faible"
                    value={loading ? '...' : (stats?.stockFaible || 0)}
                    couleur="danger"
                    loading={loading}
                    onClick={() => navigate('/admin/stock')}
                />
            </div>

            {/* Dernières commandes */}
            <div style={{
                background: 'var(--card)',
                borderRadius: 14,
                border: '1px solid var(--border)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                marginBottom: 24,
            }}>
                <div style={{
                    padding: '18px 22px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                        📋 Dernières commandes
                    </h2>
                    <button
                        onClick={() => navigate('/admin/commandes')}
                        style={{
                            fontSize: 13,
                            color: '#FF6B00',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        Voir tout →
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[1,2,3,4].map(i => (
                            <Skeleton key={i} height={50} borderRadius={8} />
                        ))}
                    </div>
                ) : commandes.length === 0 ? (
                    <div style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: 'var(--text2)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>
                            Aucune commande aujourd'hui
                        </p>
                        <button
                            onClick={() => navigate('/admin/commandes')}
                            style={{
                                marginTop: 14,
                                padding: '10px 20px',
                                background: '#0F2D6B',
                                color: 'white',
                                border: 'none',
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            Créer une commande
                        </button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['Réf.', 'Client', 'Domaine', 'Montant', 'Statut', 'Heure', 'Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '11px 16px',
                                            fontSize: 11,
                                            textAlign: 'left',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {commandes.map((cmd, i) => {
                                    const sc = statutConfig[cmd.statut] || { label: cmd.statut, variant: 'gray' };
                                    return (
                                        <tr key={cmd.id} style={{
                                            borderBottom: i < commandes.length - 1 ? '1px solid var(--border)' : 'none',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: '#0F2D6B',
                                                    fontSize: 13,
                                                    fontFamily: 'monospace',
                                                }}>
                                                    {cmd.numero || cmd.id.slice(-8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 13 }}>
                                                <div style={{ fontWeight: 600 }}>
                                                    {cmd.clientNom || '—'}
                                                </div>
                                                {cmd.clientTel && (
                                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                                        {cmd.clientTel}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>
                                                {cmd.domaineLabel || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: '#10B981',
                                                    fontSize: 13,
                                                }}>
                                                    {formatPrix(cmd.montantTotal)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <Badge variant={sc.variant} dot rounded>
                                                    {sc.label}
                                                </Badge>
                                            </td>
                                            <td style={{
                                                padding: '12px 16px',
                                                fontSize: 12,
                                                color: 'var(--text2)',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {cmd.createdAt?.toDate
                                                    ? cmd.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                                    : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <button
                                                    onClick={() => navigate(`/admin/commandes`)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: 'rgba(15,45,107,0.08)',
                                                        color: '#0F2D6B',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        fontFamily: 'Inter, sans-serif',
                                                    }}
                                                >
                                                    Voir →
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Actions rapides */}
            <div style={{
                background: 'var(--card)',
                borderRadius: 14,
                border: '1px solid var(--border)',
                padding: '18px 22px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                <h2 style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 16,
                }}>
                    ⚡ Actions rapides
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))',
                    gap: 12,
                }}>
                    {[
                        { icon: '➕', label: 'Nouvelle commande',  path: '/admin/commandes',   color: '#0F2D6B' },
                        { icon: '🧾', label: 'Créer une facture',  path: '/admin/factures',    color: '#10B981' },
                        { icon: '👤', label: 'Nouveau client',     path: '/admin/clients',     color: '#3B82F6' },
                        { icon: '📦', label: 'Ajouter un produit', path: '/admin/produits',    color: '#F59E0B' },
                        { icon: '📝', label: 'Nouveau devis',      path: '/admin/devis',       color: '#8B5CF6' },
                        { icon: '📊', label: 'Voir rapports',      path: '/admin/rapports',    color: '#EF4444' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.path)}
                            style={{
                                padding: '16px',
                                background: `${action.color}10`,
                                border: `1px solid ${action.color}25`,
                                borderRadius: 12,
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = `${action.color}20`;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = `${action.color}10`;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ fontSize: 26, marginBottom: 8 }}>{action.icon}</div>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: action.color,
                            }}>
                                {action.label}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;