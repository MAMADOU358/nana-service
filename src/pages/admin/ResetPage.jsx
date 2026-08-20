import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import {
    COLLECTIONS_SUPPRIMABLES,
    compterDocuments,
    supprimerCollection,
    supprimerPlusieursCollections,
    resetComplet,
} from '../../services/resetService';

const ResetPage = () => {
    const { estSuperAdmin, profil } = useAuth();
    const toast = useToast();

    const [comptages, setComptages] = useState({});
    const [selection, setSelection] = useState([]);
    const [loading, setLoading]     = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [modalResetTotal, setModalResetTotal] = useState(false);
    const [motConfirmation, setMotConfirmation] = useState('');
    const [motConfirmation2, setMotConfirmation2] = useState('');
    const [etape, setEtape] = useState(1); // 1 = choix, 2 = confirm, 3 = final
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [resultats, setResultats] = useState(null);

    // Vérifier accès super admin
    if (!estSuperAdmin) {
        return (
            <div style={{ 
                textAlign: 'center', padding: 80, 
                fontFamily: 'Inter, sans-serif' 
            }}>
                <div style={{ fontSize: 80 }}>🔒</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 16, color: '#EF4444' }}>
                    ACCÈS INTERDIT
                </h2>
                <p style={{ color: 'var(--text2)', maxWidth: 500, margin: '16px auto' }}>
                    Cette page est réservée UNIQUEMENT au Super Administrateur.
                    Les opérations ici sont IRRÉVERSIBLES et affectent TOUTES les données.
                </p>
            </div>
        );
    }

    // Compter les documents
    useEffect(() => {
        const chargerComptages = async () => {
            const comptes = {};
            for (const col of COLLECTIONS_SUPPRIMABLES) {
                comptes[col.id] = await compterDocuments(col.id);
            }
            setComptages(comptes);
        };
        chargerComptages();
    }, []);

    // Toggle sélection
    const toggleSelection = (id) => {
        setSelection(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Sélectionner tout
    const toutSelectionner = () => {
        setSelection(COLLECTIONS_SUPPRIMABLES.map(c => c.id));
    };

    // Désélectionner tout
    const toutDeselectionner = () => {
        setSelection([]);
    };

    // Supprimer les collections sélectionnées
    const supprimerSelection = async () => {
        if (selection.length === 0) {
            toast.warning('Sélectionnez au moins une collection');
            return;
        }

        if (motConfirmation !== 'SUPPRIMER') {
            toast.error('Erreur', 'Tapez "SUPPRIMER" pour confirmer');
            return;
        }

        setLoading(true);
        setProgress({ current: 0, total: selection.length });

        try {
            const res = await supprimerPlusieursCollections(selection, { 
                backupAvant: true 
            });
            
            setResultats(res);
            toast.success(
                '✅ Suppression terminée',
                `${res.totalDeleted} documents supprimés`
            );
            
            // Recompter
            const comptes = {};
            for (const col of COLLECTIONS_SUPPRIMABLES) {
                comptes[col.id] = await compterDocuments(col.id);
            }
            setComptages(comptes);
            
            setSelection([]);
            setMotConfirmation('');
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
            setModalConfirm(false);
        }
    };

    // RESET COMPLET
    const executerResetComplet = async () => {
        if (motConfirmation !== 'SUPPRIMER TOUT') {
            toast.error('Erreur', 'Tapez "SUPPRIMER TOUT" pour confirmer');
            return;
        }
        if (motConfirmation2 !== 'JE COMPRENDS') {
            toast.error('Erreur', 'Tapez "JE COMPRENDS" pour confirmer');
            return;
        }

        setLoading(true);
        try {
            const res = await resetComplet({ backupAvant: true });
            setResultats(res);
            toast.success(
                '💥 RESET COMPLET terminé',
                `${res.totalDeleted} documents supprimés`
            );
            
            // Recompter
            const comptes = {};
            for (const col of COLLECTIONS_SUPPRIMABLES) {
                comptes[col.id] = await compterDocuments(col.id);
            }
            setComptages(comptes);
            
            setMotConfirmation('');
            setMotConfirmation2('');
            setModalResetTotal(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalDocuments = Object.values(comptages).reduce((s, n) => s + n, 0);
    const nbSelectionnes = selection.reduce((s, id) => s + (comptages[id] || 0), 0);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ 
                    fontSize: 24, fontWeight: 800, 
                    color: '#EF4444', 
                    marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    ⚠️ Zone Dangereuse
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                    Suppression IRRÉVERSIBLE des données
                </p>
            </div>

            {/* AVERTISSEMENT PRINCIPAL */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
                border: '2px solid #EF4444',
                borderRadius: 14,
                padding: 20,
                marginBottom: 24,
                display: 'flex', gap: 16,
            }}>
                <div style={{ fontSize: 40 }}>⚠️</div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 900, fontSize: 16, color: '#991B1B', marginBottom: 8 }}>
                        ATTENTION - OPÉRATIONS IRRÉVERSIBLES
                    </h3>
                    <ul style={{ 
                        margin: 0, paddingLeft: 20, 
                        fontSize: 13, color: '#7F1D1D', 
                        lineHeight: 1.8 
                    }}>
                        <li>🔴 Les données supprimées ne peuvent PAS être récupérées</li>
                        <li>💾 Un backup automatique sera fait AVANT chaque suppression</li>
                        <li>🔒 Utilisateurs et paramètres NE SERONT PAS supprimés</li>
                        <li>📊 {totalDocuments} documents au total dans la base</li>
                    </ul>
                </div>
            </div>

            {/* Statistiques globales */}
            <div style={{
                background: 'var(--card)', borderRadius: 14, padding: 20,
                border: '1px solid var(--border)', marginBottom: 24,
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
            }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Total documents</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0F2D6B' }}>
                        {totalDocuments.toLocaleString('fr-FR')}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Sélectionnés</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B' }}>
                        {nbSelectionnes.toLocaleString('fr-FR')}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Collections</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>
                        {COLLECTIONS_SUPPRIMABLES.length}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Choisies</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444' }}>
                        {selection.length}
                    </div>
                </div>
            </div>

            {/* Actions rapides */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button onClick={toutSelectionner} style={{
                    padding: '10px 18px', background: '#F59E0B', color: 'white',
                    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                    ✅ Tout sélectionner
                </button>
                <button onClick={toutDeselectionner} style={{
                    padding: '10px 18px', background: '#6B7280', color: 'white',
                    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                    ❌ Tout désélectionner
                </button>
                <button 
                    onClick={() => setModalConfirm(true)} 
                    disabled={selection.length === 0 || loading}
                    style={{
                        padding: '10px 22px',
                        background: selection.length > 0 ? '#EF4444' : '#9CA3AF',
                        color: 'white', border: 'none', borderRadius: 10,
                        fontSize: 13, fontWeight: 700,
                        cursor: selection.length > 0 ? 'pointer' : 'not-allowed',
                        fontFamily: 'Inter, sans-serif',
                        marginLeft: 'auto',
                    }}
                >
                    🗑️ Supprimer sélection ({selection.length})
                </button>
                <button 
                    onClick={() => setModalResetTotal(true)}
                    disabled={loading}
                    style={{
                        padding: '10px 22px',
                        background: 'linear-gradient(135deg, #DC2626, #991B1B)',
                        color: 'white', border: 'none', borderRadius: 10,
                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
                    }}
                >
                    💥 RESET COMPLET
                </button>
            </div>

            {/* Liste des collections */}
            <div style={{
                background: 'var(--card)', borderRadius: 14,
                border: '1px solid var(--border)', overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                <div style={{
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: 'white',
                    fontWeight: 700, fontSize: 14,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span>⚠️ Sélectionnez les collections à SUPPRIMER</span>
                    <span style={{ fontSize: 12 }}>{selection.length} / {COLLECTIONS_SUPPRIMABLES.length}</span>
                </div>

                {COLLECTIONS_SUPPRIMABLES.map((col, i) => {
                    const nb = comptages[col.id] || 0;
                    const estSelectionne = selection.includes(col.id);
                    const dangerColors = {
                        high:   { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
                        medium: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
                        low:    { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
                    };
                    const dc = dangerColors[col.danger];

                    return (
                        <div 
                            key={col.id}
                            onClick={() => toggleSelection(col.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 20px',
                                borderBottom: i < COLLECTIONS_SUPPRIMABLES.length - 1 ? '1px solid var(--border)' : 'none',
                                cursor: 'pointer',
                                background: estSelectionne ? 'rgba(239,68,68,0.05)' : 'transparent',
                                transition: 'background 0.2s',
                            }}
                        >
                            {/* Checkbox */}
                            <div style={{
                                width: 22, height: 22, borderRadius: 6,
                                border: `2px solid ${estSelectionne ? '#EF4444' : 'var(--border)'}`,
                                background: estSelectionne ? '#EF4444' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {estSelectionne && (
                                    <span style={{ color: 'white', fontSize: 14, fontWeight: 900 }}>✓</span>
                                )}
                            </div>

                            {/* Icône */}
                            <div style={{ fontSize: 24 }}>{col.icon}</div>

                            {/* Label */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{col.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                    Collection : <code>{col.id}</code>
                                </div>
                            </div>

                            {/* Compteur */}
                            <div style={{
                                padding: '6px 14px',
                                background: dc.bg,
                                color: dc.text,
                                borderRadius: 20,
                                fontSize: 13, fontWeight: 800,
                                minWidth: 80, textAlign: 'center',
                            }}>
                                {nb.toLocaleString('fr-FR')} docs
                            </div>

                            {/* Niveau danger */}
                            <div style={{
                                padding: '3px 10px',
                                background: dc.border,
                                color: 'white',
                                borderRadius: 20,
                                fontSize: 10, fontWeight: 700,
                                textTransform: 'uppercase',
                            }}>
                                {col.danger === 'high' ? '🔴 CRITIQUE' : col.danger === 'medium' ? '🟡 MOYEN' : '🟢 FAIBLE'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL CONFIRMATION SIMPLE */}
            {modalConfirm && (
                <div style={overlay} onClick={() => !loading && setModalConfirm(false)}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 60, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', color: '#EF4444', marginBottom: 12 }}>
                            Confirmer la suppression
                        </h2>
                        <p style={{ textAlign: 'center', color: 'var(--text2)', marginBottom: 20 }}>
                            Vous allez supprimer <strong>{nbSelectionnes} documents</strong> dans {selection.length} collection(s).
                        </p>

                        <div style={{
                            padding: 14, background: '#FEE2E2',
                            borderRadius: 10, marginBottom: 20,
                            border: '1px solid #EF4444',
                        }}>
                            <div style={{ fontWeight: 700, marginBottom: 8, color: '#991B1B' }}>
                                Collections concernées :
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#7F1D1D' }}>
                                {selection.map(id => {
                                    const col = COLLECTIONS_SUPPRIMABLES.find(c => c.id === id);
                                    return (
                                        <li key={id}>
                                            {col?.label} : {(comptages[id] || 0).toLocaleString('fr-FR')} docs
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                                Pour confirmer, tapez : <code style={{ background: '#FEE2E2', padding: '2px 8px', borderRadius: 4 }}>SUPPRIMER</code>
                            </label>
                            <input
                                type="text"
                                value={motConfirmation}
                                onChange={e => setMotConfirmation(e.target.value)}
                                placeholder="Tapez SUPPRIMER"
                                style={{
                                    width: '100%', padding: 12,
                                    border: `2px solid ${motConfirmation === 'SUPPRIMER' ? '#10B981' : '#EF4444'}`,
                                    borderRadius: 10, fontSize: 14, fontWeight: 700,
                                    textAlign: 'center', letterSpacing: 2,
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>

                        <div style={{
                            padding: 12, background: '#DBEAFE',
                            borderRadius: 10, marginBottom: 20, fontSize: 12,
                            color: '#1E40AF',
                        }}>
                            💾 Un backup JSON sera téléchargé automatiquement AVANT la suppression
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button 
                                onClick={() => setModalConfirm(false)}
                                disabled={loading}
                                style={{
                                    flex: 1, padding: 12,
                                    background: '#6B7280', color: 'white',
                                    border: 'none', borderRadius: 10,
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={supprimerSelection}
                                disabled={loading || motConfirmation !== 'SUPPRIMER'}
                                style={{
                                    flex: 1, padding: 12,
                                    background: motConfirmation === 'SUPPRIMER' ? '#EF4444' : '#9CA3AF',
                                    color: 'white', border: 'none', borderRadius: 10,
                                    fontSize: 14, fontWeight: 700, 
                                    cursor: motConfirmation === 'SUPPRIMER' ? 'pointer' : 'not-allowed',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                {loading ? '⏳ Suppression...' : '🗑️ Confirmer suppression'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL RESET TOTAL */}
            {modalResetTotal && (
                <div style={overlay} onClick={() => !loading && setModalResetTotal(false)}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 80, textAlign: 'center', marginBottom: 16 }}>💥</div>
                        <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', color: '#DC2626', marginBottom: 12 }}>
                            RESET COMPLET DU SITE
                        </h2>
                        <p style={{ textAlign: 'center', color: 'var(--text2)', marginBottom: 20 }}>
                            Vous allez supprimer <strong>TOUTES</strong> les données de <strong>TOUTES</strong> les collections !
                        </p>

                        <div style={{
                            padding: 14, background: '#FEE2E2',
                            borderRadius: 10, marginBottom: 20,
                            border: '2px solid #DC2626',
                        }}>
                            <div style={{ fontWeight: 800, marginBottom: 8, color: '#991B1B' }}>
                                ⚠️ CETTE ACTION EST IRRÉVERSIBLE
                            </div>
                            <div style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.6 }}>
                                • {totalDocuments.toLocaleString('fr-FR')} documents seront supprimés<br/>
                                • Toutes les collections seront vidées<br/>
                                • Les utilisateurs et paramètres seront conservés<br/>
                                • Impossible d'annuler après validation<br/>
                                • Un backup complet sera téléchargé AVANT
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                                Étape 1 : Tapez <code style={{ background: '#FEE2E2', padding: '2px 8px', borderRadius: 4 }}>SUPPRIMER TOUT</code>
                            </label>
                            <input
                                type="text"
                                value={motConfirmation}
                                onChange={e => setMotConfirmation(e.target.value)}
                                placeholder="SUPPRIMER TOUT"
                                style={{
                                    width: '100%', padding: 12,
                                    border: `2px solid ${motConfirmation === 'SUPPRIMER TOUT' ? '#10B981' : '#EF4444'}`,
                                    borderRadius: 10, fontSize: 14, fontWeight: 700,
                                    textAlign: 'center', letterSpacing: 2,
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>

                        {motConfirmation === 'SUPPRIMER TOUT' && (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                                    Étape 2 : Tapez <code style={{ background: '#FEE2E2', padding: '2px 8px', borderRadius: 4 }}>JE COMPRENDS</code>
                                </label>
                                <input
                                    type="text"
                                    value={motConfirmation2}
                                    onChange={e => setMotConfirmation2(e.target.value)}
                                    placeholder="JE COMPRENDS"
                                    style={{
                                        width: '100%', padding: 12,
                                        border: `2px solid ${motConfirmation2 === 'JE COMPRENDS' ? '#10B981' : '#EF4444'}`,
                                        borderRadius: 10, fontSize: 14, fontWeight: 700,
                                        textAlign: 'center', letterSpacing: 2,
                                        outline: 'none', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button 
                                onClick={() => {
                                    setModalResetTotal(false);
                                    setMotConfirmation('');
                                    setMotConfirmation2('');
                                }}
                                disabled={loading}
                                style={{
                                    flex: 1, padding: 12,
                                    background: '#6B7280', color: 'white',
                                    border: 'none', borderRadius: 10,
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={executerResetComplet}
                                disabled={loading || motConfirmation !== 'SUPPRIMER TOUT' || motConfirmation2 !== 'JE COMPRENDS'}
                                style={{
                                    flex: 1, padding: 12,
                                    background: (motConfirmation === 'SUPPRIMER TOUT' && motConfirmation2 === 'JE COMPRENDS') 
                                        ? 'linear-gradient(135deg, #DC2626, #991B1B)' : '#9CA3AF',
                                    color: 'white', border: 'none', borderRadius: 10,
                                    fontSize: 14, fontWeight: 800,
                                    cursor: (motConfirmation === 'SUPPRIMER TOUT' && motConfirmation2 === 'JE COMPRENDS') ? 'pointer' : 'not-allowed',
                                    fontFamily: 'Inter, sans-serif',
                                    boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
                                }}
                            >
                                {loading ? '⏳ Suppression...' : '💥 CONFIRMER RESET TOTAL'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Résultats */}
            {resultats && (
                <div style={{
                    marginTop: 20,
                    padding: 20, background: 'rgba(16,185,129,0.1)',
                    borderRadius: 14, border: '1px solid #10B981',
                }}>
                    <h3 style={{ fontWeight: 800, color: '#10B981', marginBottom: 10 }}>
                        ✅ Opération terminée
                    </h3>
                    <div style={{ fontSize: 14 }}>
                        <strong>{resultats.totalDeleted}</strong> documents supprimés au total
                    </div>
                    {resultats.errors && resultats.errors.length > 0 && (
                        <div style={{ marginTop: 10, color: '#EF4444', fontSize: 12 }}>
                            ⚠️ {resultats.errors.length} erreur(s)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const overlay = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
};

const modal = {
    background: 'var(--card)', borderRadius: 20,
    padding: 30, maxWidth: 500, width: '100%',
    maxHeight: '90vh', overflow: 'auto',
    fontFamily: 'Inter, sans-serif',
};

export default ResetPage;