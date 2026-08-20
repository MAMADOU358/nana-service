import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { telechargerBackup } from './sauvegardeService';

/**
 * ⚠️ COLLECTIONS DISPONIBLES POUR SUPPRESSION
 */
export const COLLECTIONS_SUPPRIMABLES = [
    { id: 'commandes',        label: '📋 Commandes',       icon: '📋', danger: 'high' },
    { id: 'factures',         label: '🧾 Factures',        icon: '🧾', danger: 'high' },
    { id: 'devis',            label: '📝 Devis',           icon: '📝', danger: 'medium' },
    { id: 'achats',           label: '🛒 Achats',          icon: '🛒', danger: 'medium' },
    { id: 'depenses',         label: '💸 Dépenses',        icon: '💸', danger: 'medium' },
    { id: 'paiements',        label: '💰 Paiements',       icon: '💰', danger: 'high' },
    { id: 'mouvements_stock', label: '📦 Mouvements stock', icon: '📦', danger: 'low' },
    { id: 'clients',          label: '👥 Clients',         icon: '👥', danger: 'high' },
    { id: 'partenaires',      label: '🤝 Partenaires',     icon: '🤝', danger: 'medium' },
    { id: 'produits',         label: '📦 Produits',        icon: '📦', danger: 'medium' },
    { id: 'services',         label: '⚙️ Services',        icon: '⚙️', danger: 'medium' },
    { id: 'domaines',         label: '🏢 Domaines',        icon: '🏢', danger: 'high' },
    { id: 'boutiques',        label: '🏪 Boutiques',       icon: '🏪', danger: 'high' },
    { id: 'notifications',    label: '🔔 Notifications',   icon: '🔔', danger: 'low' },
    { id: 'audit',            label: '🔍 Audit (logs)',    icon: '🔍', danger: 'low' },
];

/**
 * ⚠️ NE JAMAIS SUPPRIMER
 */
const COLLECTIONS_PROTEGEES = [
    'utilisateurs',    // Comptes staff
    'entreprise',      // Config entreprise
    'parametres',      // Paramètres
];

/**
 * 🗑️ Compter les documents d'une collection
 */
export const compterDocuments = async (nomCollection) => {
    try {
        const snap = await getDocs(collection(db, nomCollection));
        return snap.size;
    } catch (err) {
        console.error(`Erreur comptage ${nomCollection}:`, err);
        return 0;
    }
};

/**
 * 🗑️ Supprimer TOUS les documents d'UNE collection
 */
export const supprimerCollection = async (nomCollection, options = {}) => {
    // Protection
    if (COLLECTIONS_PROTEGEES.includes(nomCollection)) {
        throw new Error(`❌ Collection "${nomCollection}" PROTÉGÉE - Impossible de supprimer`);
    }

    // Backup automatique AVANT suppression
    if (options.backupAvant !== false) {
        await telechargerBackup();
    }

    try {
        const snap = await getDocs(collection(db, nomCollection));
        
        if (snap.empty) {
            return { success: true, deleted: 0, collection: nomCollection };
        }

        // Suppression par batch de 500 (limite Firestore)
        const docs = snap.docs;
        let deleted = 0;

        for (let i = 0; i < docs.length; i += 500) {
            const batch = writeBatch(db);
            const batchDocs = docs.slice(i, i + 500);
            
            batchDocs.forEach(d => {
                batch.delete(doc(db, nomCollection, d.id));
            });
            
            await batch.commit();
            deleted += batchDocs.length;
        }

        // Logger l'action
        await logAction({
            action: 'suppression_totale_collection',
            details: {
                collection: nomCollection,
                nbSupprimes: deleted,
                backupFait: options.backupAvant !== false,
            },
        });

        return { success: true, deleted, collection: nomCollection };
    } catch (err) {
        console.error(`Erreur suppression ${nomCollection}:`, err);
        throw err;
    }
};

/**
 * 🔥 SUPPRIMER PLUSIEURS COLLECTIONS
 */
export const supprimerPlusieursCollections = async (collections, options = {}) => {
    // Backup automatique
    if (options.backupAvant !== false) {
        await telechargerBackup();
    }

    const resultats = {
        success: [],
        errors: [],
        totalDeleted: 0,
    };

    for (const nomCollection of collections) {
        try {
            const res = await supprimerCollection(nomCollection, { backupAvant: false });
            resultats.success.push(res);
            resultats.totalDeleted += res.deleted;
        } catch (err) {
            resultats.errors.push({
                collection: nomCollection,
                error: err.message,
            });
        }
    }

    await logAction({
        action: 'reset_multiple_collections',
        details: {
            collections,
            totalDeleted: resultats.totalDeleted,
            errors: resultats.errors.length,
        },
    });

    return resultats;
};

/**
 * 💥 RESET COMPLET (garde uniquement utilisateurs et config)
 */
export const resetComplet = async (options = {}) => {
    // Backup obligatoire
    if (options.backupAvant !== false) {
        await telechargerBackup();
    }

    const collectionsASupprimer = COLLECTIONS_SUPPRIMABLES.map(c => c.id);
    
    const resultats = await supprimerPlusieursCollections(
        collectionsASupprimer,
        { backupAvant: false } // Déjà fait au-dessus
    );

    await logAction({
        action: 'RESET_COMPLET_SITE',
        details: {
            totalDeleted: resultats.totalDeleted,
            collections: collectionsASupprimer,
        },
    });

    return resultats;
};

export default {
    COLLECTIONS_SUPPRIMABLES,
    compterDocuments,
    supprimerCollection,
    supprimerPlusieursCollections,
    resetComplet,
};