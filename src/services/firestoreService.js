import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    getDoc, getDocs, onSnapshot, query, where,
    orderBy, limit, startAfter, serverTimestamp,
    writeBatch, increment, runTransaction, getCountFromServer
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/* ═══════════════════════════════════════════════
   SERVICE GÉNÉRIQUE FIRESTORE
═══════════════════════════════════════════════ */

/**
 * Créer un document
 */
export const creerDoc = async (col, donnees, options = {}) => {
    const ref = await addDoc(collection(db, col), {
        ...donnees,
        actif:     true,
        archive:   false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: options.userId || null,
    });

    if (options.audit !== false) {
        await logAction({
            action:       AUDIT_ACTIONS.CREATION,
            collection:   col,
            docId:        ref.id,
            nouvelleValeur: donnees,
            domaine:      options.domaine || null,
            boutique:     options.boutique || null,
        });
    }

    return ref.id;
};

/**
 * Mettre à jour un document
 */
export const mettreAJourDoc = async (col, id, donnees, options = {}) => {
    const ref = doc(db, col, id);

    // Snapshot avant modification pour audit
    let ancienneValeur = null;
    if (options.audit !== false) {
        const snap = await getDoc(ref);
        ancienneValeur = snap.data();
    }

    await updateDoc(ref, {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: options.userId || null,
    });

    if (options.audit !== false) {
        await logAction({
            action:         AUDIT_ACTIONS.MODIFICATION,
            collection:     col,
            docId:          id,
            ancienneValeur,
            nouvelleValeur: donnees,
            domaine:        options.domaine || null,
            boutique:       options.boutique || null,
        });
    }
};

/**
 * Archiver un document (soft delete)
 */
export const archiverDoc = async (col, id, options = {}) => {
    const ref = doc(db, col, id);
    const snap = await getDoc(ref);

    await updateDoc(ref, {
        archive:    true,
        actif:      false,
        archivedAt: serverTimestamp(),
        archivedBy: options.userId || null,
        updatedAt:  serverTimestamp(),
    });

    await logAction({
        action:       AUDIT_ACTIONS.ARCHIVAGE,
        collection:   col,
        docId:        id,
        ancienneValeur: snap.data(),
        domaine:      options.domaine || null,
    });
};

/**
 * Restaurer un document archivé
 */
export const restaurerDoc = async (col, id, options = {}) => {
    await updateDoc(doc(db, col, id), {
        archive:     false,
        actif:       true,
        restoredAt:  serverTimestamp(),
        restoredBy:  options.userId || null,
        updatedAt:   serverTimestamp(),
    });

    await logAction({
        action:     AUDIT_ACTIONS.RESTAURATION,
        collection: col,
        docId:      id,
    });
};

/**
 * Supprimer définitivement (avec confirmation)
 */
export const supprimerDoc = async (col, id, options = {}) => {
    const ref  = doc(db, col, id);
    const snap = await getDoc(ref);

    await deleteDoc(ref);

    await logAction({
        action:         AUDIT_ACTIONS.SUPPRESSION,
        collection:     col,
        docId:          id,
        ancienneValeur: snap.data(),
    });
};

/**
 * Récupérer un document par ID
 */
export const getDocById = async (col, id) => {
    const snap = await getDoc(doc(db, col, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
};

/**
 * Récupérer une collection avec filtres
 */
export const getDocs_ = async (col, filtres = {}) => {
    let q = collection(db, col);
    const contraintes = [];

    if (filtres.where) {
        filtres.where.forEach(([champ, op, val]) => {
            contraintes.push(where(champ, op, val));
        });
    }
    if (filtres.orderBy) {
        filtres.orderBy.forEach(([champ, dir]) => {
            contraintes.push(orderBy(champ, dir || 'asc'));
        });
    }
    if (filtres.limit) contraintes.push(limit(filtres.limit));
    if (filtres.startAfter) contraintes.push(startAfter(filtres.startAfter));

    q = query(q, ...contraintes);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Écouter une collection en temps réel
 */
export const ecouter = (col, filtres = {}, callback) => {
    let q = collection(db, col);
    const contraintes = [];

    if (filtres.where) {
        filtres.where.forEach(([champ, op, val]) => {
            contraintes.push(where(champ, op, val));
        });
    }
    if (filtres.orderBy) {
        filtres.orderBy.forEach(([champ, dir]) => {
            contraintes.push(orderBy(champ, dir || 'asc'));
        });
    }
    if (filtres.limit) contraintes.push(limit(filtres.limit));

    q = query(q, ...contraintes);
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Erreur écoute :', err));
};

/**
 * Compter les documents
 */
export const compterDocs = async (col, filtres = []) => {
    let q = collection(db, col);
    if (filtres.length > 0) {
        q = query(q, ...filtres.map(([c, op, v]) => where(c, op, v)));
    }
    const snap = await getCountFromServer(q);
    return snap.data().count;
};

/**
 * Opération batch (plusieurs écritures atomiques)
 */
export const executerBatch = async (operations) => {
    const batch_ = writeBatch(db);
    operations.forEach(op => {
        const ref = doc(db, op.collection, op.id || doc(collection(db, op.collection)).id);
        if (op.type === 'set')    batch_.set(ref, op.data);
        if (op.type === 'update') batch_.update(ref, op.data);
        if (op.type === 'delete') batch_.delete(ref);
    });
    await batch_.commit();
};

export default {
    creerDoc, mettreAJourDoc, archiverDoc, restaurerDoc,
    supprimerDoc, getDocById, getDocs_, ecouter,
    compterDocs, executerBatch,
};