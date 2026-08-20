import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/**
 * Écouter les partenaires
 */
export const ecouterPartenaires = (callback, filtres = {}) => {
    const contraintes = [orderBy('nom', 'asc')];
    if (filtres.type) contraintes.push(where('type', '==', filtres.type));

    const q = query(collection(db, COLLECTIONS.PARTENAIRES), ...contraintes);
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Créer un partenaire
 */
export const creerPartenaire = async (donnees, userId = null) => {
    const partenaire = {
        nom:           donnees.nom?.trim() || '',
        type:          donnees.type || 'fournisseur',   // fournisseur, transporteur, prestataire, client_pro, autre
        entreprise:    donnees.entreprise?.trim() || '',
        contact:       donnees.contact?.trim() || '',
        telephone:     donnees.telephone?.trim() || '',
        whatsapp:      donnees.whatsapp?.trim() || '',
        email:         donnees.email?.trim() || '',
        adresse:       donnees.adresse?.trim() || '',
        ville:         donnees.ville?.trim() || '',
        pays:          donnees.pays || 'Guinée',
        siteWeb:       donnees.siteWeb?.trim() || '',
        siret:         donnees.siret?.trim() || '',
        specialite:    donnees.specialite?.trim() || '',
        conditions:    donnees.conditions?.trim() || '',
        notes:         donnees.notes?.trim() || '',
        logo:          donnees.logo || null,
        actif:         donnees.actif !== false,
        favori:        donnees.favori || false,
        note:          parseInt(donnees.note) || 0,   // 1-5 étoiles
        nbAchats:      0,
        totalAchats:   0,
        soldeDu:       0,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
        createdBy:     userId,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.PARTENAIRES), partenaire);
    await logAction({
        action: AUDIT_ACTIONS.CREATION,
        collection: COLLECTIONS.PARTENAIRES,
        docId: ref.id,
        nouvelleValeur: { nom: partenaire.nom, type: partenaire.type },
    });
    return ref.id;
};

export const mettreAJourPartenaire = async (id, donnees, userId = null) => {
    await updateDoc(doc(db, COLLECTIONS.PARTENAIRES, id), {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });
    await logAction({ action: AUDIT_ACTIONS.MODIFICATION, collection: COLLECTIONS.PARTENAIRES, docId: id });
};

export const supprimerPartenaire = async (id, userId = null) => {
    const snap = await getDoc(doc(db, COLLECTIONS.PARTENAIRES, id));
    await deleteDoc(doc(db, COLLECTIONS.PARTENAIRES, id));
    await logAction({
        action: AUDIT_ACTIONS.SUPPRESSION,
        collection: COLLECTIONS.PARTENAIRES,
        docId: id,
        ancienneValeur: snap.data(),
    });
};

export const togglePartenaire = async (id, actif) => {
    await updateDoc(doc(db, COLLECTIONS.PARTENAIRES, id), { actif, updatedAt: serverTimestamp() });
};

export const toggleFavoriPartenaire = async (id, favori) => {
    await updateDoc(doc(db, COLLECTIONS.PARTENAIRES, id), { favori, updatedAt: serverTimestamp() });
};

export default {
    ecouterPartenaires, creerPartenaire, mettreAJourPartenaire,
    supprimerPartenaire, togglePartenaire, toggleFavoriPartenaire,
};