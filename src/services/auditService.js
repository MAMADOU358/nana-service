import {
    collection, addDoc, serverTimestamp,
    query, where, orderBy, limit, getDocs, onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/**
 * Enregistrer une action dans l'audit
 */
export const logAction = async ({
    action,
    collection: col = null,
    docId = null,
    ancienneValeur = null,
    nouvelleValeur = null,
    details = {},
    domaine = null,
    boutique = null,
}) => {
    try {
        const user = auth.currentUser;
        await addDoc(collection(db, COLLECTIONS.AUDIT), {
            action,
            collection: col,
            docId,
            ancienneValeur,
            nouvelleValeur,
            details,
            domaine,
            boutique,
            userId:    user?.uid || null,
            userEmail: user?.email || null,
            userAgent: navigator.userAgent,
            timestamp: serverTimestamp(),
            date:      new Date().toISOString(),
            annee:     new Date().getFullYear(),
            mois:      new Date().getMonth() + 1,
            jour:      new Date().getDate(),
        });
    } catch (err) {
        // Ne pas bloquer l'app si l'audit échoue
        console.error('Erreur audit :', err);
    }
};

/**
 * Récupérer les logs d'audit
 */
export const getLogs = async ({
    limitNb = 50,
    action = null,
    userId = null,
    dateDebut = null,
    dateFin = null,
} = {}) => {
    let q = query(
        collection(db, COLLECTIONS.AUDIT),
        orderBy('timestamp', 'desc'),
        limit(limitNb)
    );

    if (action) {
        q = query(q, where('action', '==', action));
    }
    if (userId) {
        q = query(q, where('userId', '==', userId));
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Écouter les logs en temps réel
 */
export const ecouterLogs = (callback, options = {}) => {
    const q = query(
        collection(db, COLLECTIONS.AUDIT),
        orderBy('timestamp', 'desc'),
        limit(options.limit || 100)
    );

    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

export default { logAction, getLogs, ecouterLogs };