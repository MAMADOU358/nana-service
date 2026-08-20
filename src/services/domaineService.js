import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp,
    getDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/**
 * Écouter les domaines
 */
export const ecouterDomaines = (callback, filtres = {}) => {
    const contraintes = [orderBy('ordre', 'asc')];
    if (filtres.actif !== undefined) {
        contraintes.push(where('actif', '==', filtres.actif));
    }
    if (filtres.archive !== undefined) {
        contraintes.push(where('archive', '==', filtres.archive));
    }
    const q = query(collection(db, COLLECTIONS.DOMAINES), ...contraintes);
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Créer un domaine
 */
export const creerDomaine = async (donnees, userId = null) => {
    // Compter domaines existants pour l'ordre
    const snap = await getDocs(collection(db, COLLECTIONS.DOMAINES));
    const ordre = snap.size;

    const domaine = {
        nom:              donnees.nom?.trim() || '',
        description:      donnees.description?.trim() || '',
        slogan:           donnees.slogan?.trim() || '',
        emoji:            donnees.emoji || '🏪',
        couleur:          donnees.couleur || '#0F2D6B',
        logo:             donnees.logo || null,
        type:             donnees.type || 'autre',
        ordre,

        // Visibilité
        actif:            donnees.actif !== false,
        visibleClient:    donnees.visibleClient !== false,
        commandesActives: donnees.commandesActives !== false,
        prixVisibles:     donnees.prixVisibles !== false,

        // Combinaison affichage
        combinerAvec:     donnees.combinerAvec || [],
        labelCombine:     donnees.labelCombine || '',

        // Config
        devise:           donnees.devise || 'GNF',
        boutiqueIds:      donnees.boutiqueIds || [],

        // Stats
        nbProduits: 0,
        nbServices: 0,
        nbVentes:   0,

        // Méta
        archive:    false,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
        createdBy:  userId,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.DOMAINES), domaine);

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.DOMAINES,
        docId:          ref.id,
        nouvelleValeur: { nom: domaine.nom },
    });

    return ref.id;
};

/**
 * Mettre à jour un domaine
 */
export const mettreAJourDomaine = async (id, donnees, userId = null) => {
    const ref  = doc(db, COLLECTIONS.DOMAINES, id);
    const snap = await getDoc(ref);
    const avant = snap.data();

    await updateDoc(ref, {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });

    await logAction({
        action:         AUDIT_ACTIONS.MODIFICATION,
        collection:     COLLECTIONS.DOMAINES,
        docId:          id,
        ancienneValeur: { nom: avant.nom, actif: avant.actif },
        nouvelleValeur: donnees,
    });
};

/**
 * Activer / Désactiver un domaine
 */
export const toggleDomaine = async (id, actif, userId = null) => {
    await updateDoc(doc(db, COLLECTIONS.DOMAINES, id), {
        actif,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });
    await logAction({
        action:     actif ? AUDIT_ACTIONS.ACTIVATION : AUDIT_ACTIONS.DESACTIVATION,
        collection: COLLECTIONS.DOMAINES,
        docId:      id,
    });
};

/**
 * Archiver un domaine
 */
export const archiverDomaine = async (id, userId = null) => {
    const snap = await getDoc(doc(db, COLLECTIONS.DOMAINES, id));
    await updateDoc(doc(db, COLLECTIONS.DOMAINES, id), {
        archive:    true,
        actif:      false,
        archivedAt: serverTimestamp(),
        archivedBy: userId,
        updatedAt:  serverTimestamp(),
    });
    await logAction({
        action:         AUDIT_ACTIONS.ARCHIVAGE,
        collection:     COLLECTIONS.DOMAINES,
        docId:          id,
        ancienneValeur: snap.data(),
    });
};

/**
 * Réordonner les domaines (drag and drop)
 */
export const reordonnerDomaines = async (domaines) => {
    const batch = writeBatch(db);
    domaines.forEach((d, i) => {
        batch.update(doc(db, COLLECTIONS.DOMAINES, d.id), {
            ordre:     i,
            updatedAt: serverTimestamp(),
        });
    });
    await batch.commit();
};

// Fix: getDocs import manquant
import { getDocs } from 'firebase/firestore';

export default {
    ecouterDomaines, creerDomaine, mettreAJourDomaine,
    toggleDomaine, archiverDomaine, reordonnerDomaines,
};