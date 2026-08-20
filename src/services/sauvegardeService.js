import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../config/constants';
import { logAction } from './auditService';

/**
 * Collections à sauvegarder
 */
const COLLECTIONS_BACKUP = [
    'entreprise',
    'utilisateurs',
    'domaines',
    'boutiques',
    'produits',
    'services',
    'clients',
    'partenaires',
    'commandes',
    'factures',
    'devis',
    'achats',
    'depenses',
    'paiements',
    'stock',
    'mouvements_stock',
    'audit',
];

/**
 * 📦 EXPORTER TOUTES LES DONNÉES en JSON
 */
export const exporterToutesDonnees = async () => {
    const backup = {
        version:      '1.0',
        exportDate:   new Date().toISOString(),
        exportBy:     'admin',
        annee:        new Date().getFullYear(),
        collections:  {},
        totalDocs:    0,
    };

    for (const nomCollection of COLLECTIONS_BACKUP) {
        try {
            const snap = await getDocs(collection(db, nomCollection));
            const docs = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                // Convertir les Timestamps Firestore en ISO strings
                ...(d.data().createdAt ? { createdAt: d.data().createdAt.toDate?.().toISOString() || d.data().createdAt } : {}),
                ...(d.data().updatedAt ? { updatedAt: d.data().updatedAt.toDate?.().toISOString() || d.data().updatedAt } : {}),
                ...(d.data().timestamp ? { timestamp: d.data().timestamp.toDate?.().toISOString() || d.data().timestamp } : {}),
            }));
            
            backup.collections[nomCollection] = docs;
            backup.totalDocs += docs.length;
        } catch (err) {
            console.error(`Erreur export ${nomCollection}:`, err);
            backup.collections[nomCollection] = [];
        }
    }

    await logAction({
        action: 'export',
        details: { 
            totalDocs: backup.totalDocs, 
            collections: Object.keys(backup.collections).length 
        },
    });

    return backup;
};

/**
 * 💾 TÉLÉCHARGER le backup en JSON
 */
export const telechargerBackup = async () => {
    const backup = await exporterToutesDonnees();
    const nomFichier = `nana-service-backup-${new Date().toISOString().split('T')[0]}.json`;
    const contenu = JSON.stringify(backup, null, 2);
    
    const blob = new Blob([contenu], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomFichier;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { nomFichier, taille: blob.size, totalDocs: backup.totalDocs };
};

/**
 * 📥 IMPORTER un backup JSON
 */
export const importerBackup = async (fichier, options = {}) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.collections) {
                    throw new Error('Fichier de backup invalide');
                }
                
                const resultats = {
                    success: [],
                    errors: [],
                    totalImported: 0,
                };
                
                for (const [nomCollection, docs] of Object.entries(backup.collections)) {
                    if (!Array.isArray(docs) || docs.length === 0) continue;
                    
                    try {
                        // Import par batch de 500 (limite Firestore)
                        const batches = [];
                        for (let i = 0; i < docs.length; i += 500) {
                            batches.push(docs.slice(i, i + 500));
                        }
                        
                        for (const batchDocs of batches) {
                            const batch = writeBatch(db);
                            
                            for (const document of batchDocs) {
                                const { id, ...data } = document;
                                if (id) {
                                    const docRef = doc(db, nomCollection, id);
                                    batch.set(docRef, data, { merge: options.merge !== false });
                                    resultats.totalImported++;
                                }
                            }
                            
                            await batch.commit();
                        }
                        
                        resultats.success.push({ 
                            collection: nomCollection, 
                            count: docs.length 
                        });
                    } catch (err) {
                        resultats.errors.push({ 
                            collection: nomCollection, 
                            error: err.message 
                        });
                    }
                }
                
                await logAction({
                    action: 'import',
                    details: { 
                        totalImported: resultats.totalImported,
                        errors: resultats.errors.length 
                    },
                });
                
                resolve(resultats);
            } catch (err) {
                reject(err);
            }
        };
        
        reader.onerror = () => reject(new Error('Erreur lecture fichier'));
        reader.readAsText(fichier);
    });
};

/**
 * 📊 EXPORTER en Excel (via XLSX)
 */
export const exporterExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const backup = await exporterToutesDonnees();
    
    const wb = utils.book_new();
    
    for (const [nomCollection, docs] of Object.entries(backup.collections)) {
        if (docs.length === 0) continue;
        
        // Convertir les données pour Excel
        const rowsExcel = docs.map(d => {
            const row = {};
            for (const [key, value] of Object.entries(d)) {
                if (typeof value === 'object' && value !== null) {
                    row[key] = JSON.stringify(value);
                } else {
                    row[key] = value;
                }
            }
            return row;
        });
        
        const ws = utils.json_to_sheet(rowsExcel);
        utils.book_append_sheet(wb, ws, nomCollection.substring(0, 31));
    }
    
    const nomFichier = `nana-service-backup-${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(wb, nomFichier);
    
    return { nomFichier, totalDocs: backup.totalDocs };
};

/**
 * 🗂️ ARCHIVER UNE ANNÉE
 */
export const archiverAnnee = async (annee) => {
    const backup = await exporterToutesDonnees();
    backup.annee = annee;
    backup.type = 'archive_annuelle';
    
    // Sauvegarder dans Firestore
    await setDoc(
        doc(db, 'sauvegardes', `archive-${annee}-${Date.now()}`),
        {
            annee,
            date: new Date().toISOString(),
            totalDocs: backup.totalDocs,
            type: 'archive_annuelle',
        }
    );
    
    // Télécharger aussi le fichier
    const contenu = JSON.stringify(backup, null, 2);
    const blob = new Blob([contenu], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archive-${annee}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    await logAction({
        action: 'archivage_annuel',
        details: { annee, totalDocs: backup.totalDocs },
    });
    
    return backup;
};

export default {
    exporterToutesDonnees,
    telechargerBackup,
    importerBackup,
    exporterExcel,
    archiverAnnee,
};