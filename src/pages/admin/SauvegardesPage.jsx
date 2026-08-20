import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import { ConfirmModal } from '../../components/common/Modal';
import {
    telechargerBackup,
    importerBackup,
    exporterExcel,
    archiverAnnee,
} from '../../services/sauvegardeService';

const SauvegardesPage = () => {
    const { estSuperAdmin, estAdmin } = useAuth();
    const toast = useToast();
    
    const [loading, setLoading]           = useState(false);
    const [modalArchive, setModalArchive] = useState(false);
    const [modalImport, setModalImport]   = useState(false);
    const [fichierImport, setFichierImport] = useState(null);
    const [resultatImport, setResultatImport] = useState(null);
    const [anneeArchive, setAnneeArchive] = useState(new Date().getFullYear());

    if (!estAdmin) {
        return (
            <div style={{ textAlign: 'center', padding: 80, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontSize: 60 }}>🔒</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>Accès restreint</h2>
                <p style={{ color: 'var(--text2)' }}>Cette page est réservée aux administrateurs</p>
            </div>
        );
    }

    // Télécharger backup JSON
    const handleTelechargerJSON = async () => {
        setLoading(true);
        try {
            const res = await telechargerBackup();
            toast.success(
                '✅ Backup téléchargé !',
                `${res.totalDocs} documents (${(res.taille / 1024).toFixed(1)} KB)`
            );
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Télécharger backup Excel
    const handleTelechargerExcel = async () => {
        setLoading(true);
        try {
            const res = await exporterExcel();
            toast.success('✅ Excel téléchargé !', `${res.totalDocs} documents`);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Import backup
    const handleImport = async () => {
        if (!fichierImport) { toast.warning('Sélectionnez un fichier'); return; }
        
        setLoading(true);
        try {
            const res = await importerBackup(fichierImport, { merge: true });
            setResultatImport(res);
            toast.success(
                '✅ Import terminé !',
                `${res.totalImported} documents importés`
            );
        } catch (err) {
            toast.error('Erreur import', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Archiver l'année
    const handleArchiver = async () => {
        setLoading(true);
        try {
            const res = await archiverAnnee(anneeArchive);
            toast.success(
                '✅ Année archivée !',
                `${anneeArchive} - ${res.totalDocs} documents`
            );
            setModalArchive(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
                    💾 Sauvegardes & Archives
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                    Exportez, importez et archivez toutes vos données
                </p>
            </div>

            {/* Alertes sécurité */}
            <div style={{
                padding: 16, background: 'rgba(15,45,107,0.05)',
                borderRadius: 12, marginBottom: 24,
                border: '1px solid rgba(15,45,107,0.2)',
                display: 'flex', gap: 12,
            }}>
                <span style={{ fontSize: 24 }}>🔒</span>
                <div>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: '#0F2D6B' }}>
                        Sécurité maximale
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                        Vos backups contiennent TOUTES les données sensibles. 
                        Gardez-les dans un endroit sûr (Google Drive privé, disque externe chiffré, etc.).
                        Ne les partagez JAMAIS.
                    </div>
                </div>
            </div>

            {/* Actions principales */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 16, marginBottom: 24,
            }}>
                {/* Export JSON */}
                <div style={carte}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                        Export JSON complet
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
                        Sauvegarde TOUTES les données (commandes, produits, clients, factures...)
                        Format JSON pour restauration ultérieure.
                    </p>
                    <button 
                        onClick={handleTelechargerJSON} 
                        disabled={loading}
                        style={{...btn, background: '#0F2D6B'}}
                    >
                        {loading ? '⏳ Export...' : '📥 Télécharger JSON'}
                    </button>
                </div>

                {/* Export Excel */}
                <div style={carte}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                        Export Excel
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
                        Exportez toutes vos données dans un fichier Excel avec 
                        une feuille par collection. Idéal pour l'analyse.
                    </p>
                    <button 
                        onClick={handleTelechargerExcel} 
                        disabled={loading}
                        style={{...btn, background: '#10B981'}}
                    >
                        {loading ? '⏳ Export...' : '📊 Télécharger Excel'}
                    </button>
                </div>

                {/* Import */}
                <div style={carte}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📤</div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                        Importer un backup
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
                        Restaurer des données depuis un fichier JSON de backup.
                        Les données existantes seront fusionnées.
                    </p>
                    <button 
                        onClick={() => setModalImport(true)} 
                        disabled={loading}
                        style={{...btn, background: '#F59E0B'}}
                    >
                        📤 Importer un fichier
                    </button>
                </div>

                {/* Archive annuelle */}
                {estSuperAdmin && (
                    <div style={carte}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
                        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                            Archive annuelle
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
                            Archiver toutes les données d'une année complète.
                            Recommandé chaque fin d'année.
                        </p>
                        <button 
                            onClick={() => setModalArchive(true)} 
                            disabled={loading}
                            style={{...btn, background: '#8B5CF6'}}
                        >
                            🗂️ Archiver une année
                        </button>
                    </div>
                )}
            </div>

            {/* Conseils */}
            <div style={{
                background: 'var(--card)', borderRadius: 14, padding: 20,
                border: '1px solid var(--border)',
            }}>
                <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
                    💡 Conseils de sécurité
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                    {[
                        { icon: '📅', titre: 'Backup régulier', desc: 'Exportez au moins 1 fois par semaine' },
                        { icon: '🔐', titre: 'Stockage sûr', desc: 'Cloud privé (Google Drive, Dropbox)' },
                        { icon: '💾', titre: 'Multi-supports', desc: '3 copies : local, cloud, disque externe' },
                        { icon: '🗓️', titre: 'Archive annuelle', desc: 'Chaque 31 décembre, archivez l\'année' },
                    ].map((c, i) => (
                        <div key={i} style={{
                            padding: 14, background: 'var(--gray-50)',
                            borderRadius: 10, border: '1px solid var(--border)',
                        }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{c.titre}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL IMPORT */}
            {modalImport && (
                <div style={overlay} onClick={() => setModalImport(false)}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
                            📤 Importer un backup
                        </h2>
                        
                        <div style={{
                            padding: 12, background: 'rgba(245,158,11,0.1)',
                            borderRadius: 10, marginBottom: 16, fontSize: 12,
                            border: '1px solid rgba(245,158,11,0.3)',
                        }}>
                            ⚠️ <strong>Attention :</strong> L'import va MODIFIER les données existantes.
                            Faites un backup avant si nécessaire !
                        </div>

                        <input 
                            type="file" 
                            accept=".json"
                            onChange={e => setFichierImport(e.target.files?.[0] || null)}
                            style={{
                                width: '100%', padding: 10,
                                border: '2px dashed var(--border)',
                                borderRadius: 10, marginBottom: 16,
                            }}
                        />

                        {resultatImport && (
                            <div style={{
                                padding: 14, background: 'rgba(16,185,129,0.1)',
                                borderRadius: 10, marginBottom: 16, fontSize: 12,
                            }}>
                                ✅ <strong>Import réussi !</strong>
                                <div style={{ marginTop: 8 }}>
                                    Total : <strong>{resultatImport.totalImported}</strong> documents
                                </div>
                                {resultatImport.errors.length > 0 && (
                                    <div style={{ marginTop: 8, color: '#EF4444' }}>
                                        ⚠️ {resultatImport.errors.length} erreur(s)
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setModalImport(false); setResultatImport(null); }} 
                                style={{...btn, background: '#6B7280'}}>
                                Fermer
                            </button>
                            <button onClick={handleImport} disabled={loading || !fichierImport}
                                style={{...btn, background: '#F59E0B'}}>
                                {loading ? '⏳...' : '📤 Importer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ARCHIVE */}
            <ConfirmModal
                isOpen={modalArchive}
                onClose={() => setModalArchive(false)}
                onConfirm={handleArchiver}
                title={`Archiver l'année ${anneeArchive} ?`}
                message={`Toutes les données de ${anneeArchive} seront sauvegardées et téléchargées.`}
                confirmText={loading ? '⏳...' : 'Archiver'}
                type="warning"
            />
        </div>
    );
};

const carte = {
    background: 'var(--card)', borderRadius: 14, padding: 20,
    border: '1px solid var(--border)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
};

const btn = {
    width: '100%', padding: '12px',
    color: 'white', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
};

const overlay = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
};

const modal = {
    background: 'var(--card)', borderRadius: 16,
    padding: 24, maxWidth: 500, width: '100%',
    fontFamily: 'Inter, sans-serif',
};

export default SauvegardesPage;