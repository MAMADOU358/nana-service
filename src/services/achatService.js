import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp,
    getDoc, getDocs, limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

export const genererNumeroAchat = async () => {
    const annee = new Date().getFullYear();
    const snap = await getDocs(query(
        collection(db, COLLECTIONS.ACHATS),
        where('annee', '==', annee),
        orderBy('numero', 'desc'),
        limit(1)
    ));
    const dernier = snap.empty ? 0 :
        parseInt(snap.docs[0].data().numero?.split('-').pop() || '0');
    const num = String(dernier + 1).padStart(6, '0');
    return `NS-ACH-${annee}-${num}`;
};

export const ecouterAchats = (callback, filtres = {}) => {
    const contraintes = [orderBy('createdAt', 'desc')];
    if (filtres.statut) contraintes.push(where('statut', '==', filtres.statut));
    if (filtres.partenaireId) contraintes.push(where('partenaireId', '==', filtres.partenaireId));

    const q = query(collection(db, COLLECTIONS.ACHATS), ...contraintes);
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

export const creerAchat = async (donnees, userId = null) => {
    const numero = await genererNumeroAchat();

    const achat = {
        numero,
        partenaireId:    donnees.partenaireId || null,
        partenaireNom:   donnees.partenaireNom || '',
        partenaireTel:   donnees.partenaireTel || '',
        lignes: (donnees.lignes || []).map((l, i) => ({
            numero:       i + 1,
            description:  l.description || '',
            quantite:     parseFloat(l.quantite) || 1,
            unite:        l.unite || 'u',
            prixUnitaire: parseFloat(l.prixUnitaire) || 0,
            sousTotal:    parseFloat(l.sousTotal) || 0,
        })),
        sousTotal:       donnees.sousTotal || 0,
        remise:          donnees.remise || 0,
        fraisTransport:  donnees.fraisTransport || 0,
        montantTotal:    donnees.montantTotal || 0,
        montantPaye:     donnees.montantPaye || 0,
        resteAPayer:     donnees.resteAPayer || donnees.montantTotal || 0,
        devise:          donnees.devise || 'GNF',
        statut:          donnees.statut || 'commande', // commande, reçu, payé, annulé
        statutPaiement:  donnees.statutPaiement || 'non_paye',
        dateCommande:    donnees.dateCommande || new Date().toISOString().split('T')[0],
        dateReception:   donnees.dateReception || null,
        notes:           donnees.notes || '',
        annee:           new Date().getFullYear(),
        mois:            new Date().getMonth() + 1,
        createdAt:       serverTimestamp(),
        updatedAt:       serverTimestamp(),
        createdBy:       userId,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.ACHATS), achat);
    await logAction({
        action: AUDIT_ACTIONS.CREATION,
        collection: COLLECTIONS.ACHATS,
        docId: ref.id,
        nouvelleValeur: { numero, partenaire: achat.partenaireNom, total: achat.montantTotal },
    });
    return { id: ref.id, numero };
};

export const mettreAJourAchat = async (id, donnees, userId = null) => {
    await updateDoc(doc(db, COLLECTIONS.ACHATS, id), {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });
    await logAction({ action: AUDIT_ACTIONS.MODIFICATION, collection: COLLECTIONS.ACHATS, docId: id });
};

export const changerStatutAchat = async (id, statut) => {
    await updateDoc(doc(db, COLLECTIONS.ACHATS, id), {
        statut,
        ...(statut === 'reçu' ? { dateReception: new Date().toISOString().split('T')[0] } : {}),
        updatedAt: serverTimestamp(),
    });
};

export const supprimerAchat = async (id, userId = null) => {
    const snap = await getDoc(doc(db, COLLECTIONS.ACHATS, id));
    await deleteDoc(doc(db, COLLECTIONS.ACHATS, id));
    await logAction({
        action: AUDIT_ACTIONS.SUPPRESSION,
        collection: COLLECTIONS.ACHATS,
        docId: id,
        ancienneValeur: snap.data(),
    });
};

export default {
    genererNumeroAchat, ecouterAchats, creerAchat,
    mettreAJourAchat, changerStatutAchat, supprimerAchat,
};