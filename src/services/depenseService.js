import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp,
    getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/**
 * Écouter les dépenses
 */
export const ecouterDepenses = (callback, filtres = {}) => {
    const contraintes = [orderBy('date', 'desc')];
    if (filtres.categorie) contraintes.push(where('categorie', '==', filtres.categorie));
    if (filtres.boutiqueId) contraintes.push(where('boutiqueId', '==', filtres.boutiqueId));

    const q = query(collection(db, COLLECTIONS.DEPENSES), ...contraintes);
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Créer une dépense
 */
export const creerDepense = async (donnees, userId = null) => {
    const depense = {
        libelle:      donnees.libelle?.trim() || '',
        description:  donnees.description?.trim() || '',
        categorie:    donnees.categorie || 'Autre',
        montant:      parseFloat(donnees.montant) || 0,
        devise:       donnees.devise || 'GNF',
        date:         donnees.date || new Date().toISOString().split('T')[0],
        moyenPaiement: donnees.moyenPaiement || 'especes',
        boutiqueId:   donnees.boutiqueId || null,
        boutiqueLabel: donnees.boutiqueLabel || '',
        justificatif: donnees.justificatif || null,
        notes:        donnees.notes || '',
        annee:        new Date().getFullYear(),
        mois:         new Date().getMonth() + 1,
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
        createdBy:    userId,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.DEPENSES), depense);

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.DEPENSES,
        docId:          ref.id,
        nouvelleValeur: { libelle: depense.libelle, montant: depense.montant },
    });

    return ref.id;
};

/**
 * Mettre à jour une dépense
 */
export const mettreAJourDepense = async (id, donnees, userId = null) => {
    await updateDoc(doc(db, COLLECTIONS.DEPENSES, id), {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });

    await logAction({
        action:     AUDIT_ACTIONS.MODIFICATION,
        collection: COLLECTIONS.DEPENSES,
        docId:      id,
    });
};

/**
 * Supprimer une dépense
 */
export const supprimerDepense = async (id, userId = null) => {
    const snap = await getDoc(doc(db, COLLECTIONS.DEPENSES, id));
    await deleteDoc(doc(db, COLLECTIONS.DEPENSES, id));
    await logAction({
        action:         AUDIT_ACTIONS.SUPPRESSION,
        collection:     COLLECTIONS.DEPENSES,
        docId:          id,
        ancienneValeur: snap.data(),
    });
};

export default { ecouterDepenses, creerDepense, mettreAJourDepense, supprimerDepense };