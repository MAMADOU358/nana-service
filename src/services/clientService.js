import {
    collection, doc, addDoc, updateDoc,
    onSnapshot, query, where, orderBy,
    serverTimestamp, getDoc, getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/**
 * Écouter les clients
 */
export const ecouterClients = (callback, filtres = {}) => {
    const contraintes = [orderBy('nom', 'asc')];
    if (filtres.archive !== undefined) {
        contraintes.push(where('archive', '==', filtres.archive));
    }
    const q = query(collection(db, COLLECTIONS.CLIENTS), ...contraintes);
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Créer un client
 */
export const creerClient = async (donnees, userId = null) => {
    // Vérifier doublon par téléphone
    if (donnees.telephone) {
        const q = query(
            collection(db, COLLECTIONS.CLIENTS),
            where('telephone', '==', donnees.telephone.trim())
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            throw new Error(`Un client avec ce numéro existe déjà : ${snap.docs[0].data().nom}`);
        }
    }

    const client = {
        // Identité
        nom:        donnees.nom?.trim() || '',
        prenom:     donnees.prenom?.trim() || '',
        nomComplet: `${donnees.prenom || ''} ${donnees.nom || ''}`.trim(),
        genre:      donnees.genre || null,

        // Contact
        telephone:  donnees.telephone?.trim() || '',
        whatsapp:   donnees.whatsapp?.trim() || donnees.telephone?.trim() || '',
        email:      donnees.email?.trim().toLowerCase() || '',
        adresse:    donnees.adresse?.trim() || '',
        ville:      donnees.ville?.trim() || '',
        pays:       donnees.pays || 'Guinée',

        // Compte
        userId:     donnees.userId || null, // Si client a un compte
        avatar:     donnees.avatar || null,
        notes:      donnees.notes || '',
        type:       donnees.type || 'particulier', // particulier | entreprise

        // Entreprise (si type = entreprise)
        entreprise: donnees.entreprise?.trim() || '',
        siret:      donnees.siret?.trim() || '',

        // Financier
        solde:         0,
        totalAchats:   0,
        nbCommandes:   0,
        derniereCommande: null,
        creditAutorise: donnees.creditAutorise || false,
        limitCredit:   donnees.limitCredit || 0,

        // Statut
        actif:    true,
        archive:  false,
        fidelite: 0, // Points fidélité

        // Méta
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        source:    donnees.source || 'manuel', // manuel | inscription | import
    };

    const ref = await addDoc(collection(db, COLLECTIONS.CLIENTS), client);

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.CLIENTS,
        docId:          ref.id,
        nouvelleValeur: { nom: client.nomComplet, tel: client.telephone },
    });

    return ref.id;
};

/**
 * Mettre à jour un client
 */
export const mettreAJourClient = async (id, donnees, userId = null) => {
    const updates = {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    };

    // Recalculer nomComplet si nom/prénom changé
    if (donnees.nom || donnees.prenom) {
        const ref  = doc(db, COLLECTIONS.CLIENTS, id);
        const snap = await getDoc(ref);
        const data = snap.data();
        updates.nomComplet = `${donnees.prenom || data.prenom || ''} ${donnees.nom || data.nom || ''}`.trim();
    }

    await updateDoc(doc(db, COLLECTIONS.CLIENTS, id), updates);

    await logAction({
        action:         AUDIT_ACTIONS.MODIFICATION,
        collection:     COLLECTIONS.CLIENTS,
        docId:          id,
        nouvelleValeur: donnees,
    });
};

/**
 * Mettre à jour les stats client après commande
 */
export const mettreAJourStatsClient = async (clientId, montant) => {
    await updateDoc(doc(db, COLLECTIONS.CLIENTS, clientId), {
        totalAchats:      serverTimestamp(),
        nbCommandes:      increment(1),
        derniereCommande: serverTimestamp(),
        updatedAt:        serverTimestamp(),
    });
};

/**
 * Rechercher des clients
 */
export const rechercherClients = async (terme) => {
    const snap = await getDocs(
        query(
            collection(db, COLLECTIONS.CLIENTS),
            where('archive', '==', false),
            orderBy('nomComplet'),
        )
    );

    const t = terme.toLowerCase();
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c =>
            c.nomComplet?.toLowerCase().includes(t) ||
            c.telephone?.includes(t) ||
            c.email?.toLowerCase().includes(t) ||
            c.entreprise?.toLowerCase().includes(t)
        )
        .slice(0, 20);
};

/**
 * Archiver un client
 */
export const archiverClient = async (id, userId = null) => {
    await updateDoc(doc(db, COLLECTIONS.CLIENTS, id), {
        archive:    true,
        actif:      false,
        archivedAt: serverTimestamp(),
        archivedBy: userId,
        updatedAt:  serverTimestamp(),
    });
    await logAction({
        action:     AUDIT_ACTIONS.ARCHIVAGE,
        collection: COLLECTIONS.CLIENTS,
        docId:      id,
    });
};

export default {
    ecouterClients, creerClient, mettreAJourClient,
    mettreAJourStatsClient, rechercherClients, archiverClient,
};