import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

export const ecouterBoutiques = (callback) => {
    const q = query(collection(db, COLLECTIONS.BOUTIQUES), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

export const creerBoutique = async (donnees, userId = null) => {
    const boutique = {
        nom:           donnees.nom?.trim() || '',
        adresse:       donnees.adresse?.trim() || '',
        ville:         donnees.ville?.trim() || '',
        telephone:     donnees.telephone?.trim() || '',
        email:         donnees.email?.trim() || '',
        responsable:   donnees.responsable?.trim() || '',
        emoji:         donnees.emoji || '🏪',
        couleur:       donnees.couleur || '#0F2D6B',
        image:         donnees.image || null,
        horaires:      donnees.horaires || '08:00 - 18:00',
        actif:         donnees.actif !== false,
        principale:    donnees.principale || false,
        nbCommandes:   0,
        chiffreAffaire: 0,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
        createdBy:     userId,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.BOUTIQUES), boutique);
    await logAction({
        action: AUDIT_ACTIONS.CREATION,
        collection: COLLECTIONS.BOUTIQUES,
        docId: ref.id,
        nouvelleValeur: { nom: boutique.nom },
    });
    return ref.id;
};

export const mettreAJourBoutique = async (id, donnees, userId = null) => {
    await updateDoc(doc(db, COLLECTIONS.BOUTIQUES, id), {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });
    await logAction({ action: AUDIT_ACTIONS.MODIFICATION, collection: COLLECTIONS.BOUTIQUES, docId: id });
};

export const supprimerBoutique = async (id, userId = null) => {
    const snap = await getDoc(doc(db, COLLECTIONS.BOUTIQUES, id));
    await deleteDoc(doc(db, COLLECTIONS.BOUTIQUES, id));
    await logAction({
        action: AUDIT_ACTIONS.SUPPRESSION,
        collection: COLLECTIONS.BOUTIQUES,
        docId: id,
        ancienneValeur: snap.data(),
    });
};

export const toggleBoutique = async (id, actif) => {
    await updateDoc(doc(db, COLLECTIONS.BOUTIQUES, id), { actif, updatedAt: serverTimestamp() });
};

export default { ecouterBoutiques, creerBoutique, mettreAJourBoutique, supprimerBoutique, toggleBoutique };