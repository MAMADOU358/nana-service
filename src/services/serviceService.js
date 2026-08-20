import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp,
    getDoc, getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/**
 * Écouter les services
 */
export const ecouterServices = (callback, filtres = {}) => {
    const contraintes = [orderBy('createdAt', 'desc')];

    if (filtres.domaineId)  contraintes.push(where('domaineId',  '==', filtres.domaineId));
    if (filtres.categorie)  contraintes.push(where('categorie',  '==', filtres.categorie));
    if (filtres.actif !== undefined) contraintes.push(where('actif', '==', filtres.actif));

    const q = query(collection(db, COLLECTIONS.SERVICES), ...contraintes);
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Créer un service
 */
export const creerService = async (donnees, userId = null) => {
    const service = {
        nom:          donnees.nom?.trim() || '',
        reference:    donnees.reference?.trim() || 'SRV-' + Date.now().toString(36).toUpperCase(),
        description:  donnees.description?.trim() || '',
        categorie:    donnees.categorie || '',
        domaineId:    donnees.domaineId || null,
        domaineLabel: donnees.domaineLabel || '',

        // Prix fixe
        prix:         parseFloat(donnees.prix) || 0,
        prixAchat:    parseFloat(donnees.prixAchat) || 0,
        unite:        donnees.unite || 'service',
        devise:       donnees.devise || 'GNF',
        duree:        donnees.duree || null,       // Durée d'exécution en minutes

        // Média
        imageUrl:     donnees.imageUrl || null,
        emoji:        donnees.emoji || '⚙️',

        // Options
        actif:         donnees.actif !== false,
        visibleClient: donnees.visibleClient !== false,
        populaire:     donnees.populaire || false,
        nouveau:       donnees.nouveau || false,

        // Stats
        nbCommandes:  0,
        note:         0,

        // Méta
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
        createdBy:    userId,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.SERVICES), service);

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.SERVICES,
        docId:          ref.id,
        nouvelleValeur: { nom: service.nom, prix: service.prix },
    });

    return ref.id;
};

/**
 * Mettre à jour un service
 */
export const mettreAJourService = async (id, donnees, userId = null) => {
    const ref  = doc(db, COLLECTIONS.SERVICES, id);
    const snap = await getDoc(ref);
    const avant = snap.data();

    await updateDoc(ref, {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });

    await logAction({
        action:         AUDIT_ACTIONS.MODIFICATION,
        collection:     COLLECTIONS.SERVICES,
        docId:          id,
        ancienneValeur: { nom: avant.nom, prix: avant.prix },
        nouvelleValeur: donnees,
    });
};

/**
 * Supprimer un service
 */
export const supprimerService = async (id, userId = null) => {
    const ref  = doc(db, COLLECTIONS.SERVICES, id);
    const snap = await getDoc(ref);

    await deleteDoc(ref);

    await logAction({
        action:         AUDIT_ACTIONS.SUPPRESSION,
        collection:     COLLECTIONS.SERVICES,
        docId:          id,
        ancienneValeur: snap.data(),
    });
};

/**
 * Toggle disponibilité
 */
export const toggleService = async (id, actif) => {
    await updateDoc(doc(db, COLLECTIONS.SERVICES, id), {
        actif,
        updatedAt: serverTimestamp(),
    });
};

export default {
    ecouterServices, creerService, mettreAJourService,
    supprimerService, toggleService,
};