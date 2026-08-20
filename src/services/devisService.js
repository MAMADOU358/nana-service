import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp,
    getDoc, getDocs, limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS, NUMEROTATION } from '../config/constants';

/**
 * Générer un numéro de devis unique
 * Format : NS-DEV-2026-000001
 */
export const genererNumeroDevis = async () => {
    const annee = new Date().getFullYear();
    const snap = await getDocs(query(
        collection(db, COLLECTIONS.DEVIS),
        where('annee', '==', annee),
        orderBy('numero', 'desc'),
        limit(1)
    ));
    const dernier = snap.empty ? 0 :
        parseInt(snap.docs[0].data().numero?.split('-').pop() || '0');
    const num = String(dernier + 1).padStart(6, '0');
    return `${NUMEROTATION.DEVIS}-${annee}-${num}`;
};

/**
 * Écouter les devis
 */
export const ecouterDevis = (callback, filtres = {}) => {
    const contraintes = [orderBy('createdAt', 'desc')];

    if (filtres.statut)   contraintes.push(where('statut',   '==', filtres.statut));
    if (filtres.clientId) contraintes.push(where('clientId', '==', filtres.clientId));
    if (filtres.annee)    contraintes.push(where('annee',    '==', filtres.annee));

    const q = query(collection(db, COLLECTIONS.DEVIS), ...contraintes);
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Créer un devis
 */
export const creerDevis = async (donnees, userId = null) => {
    const numero = await genererNumeroDevis();

    const devis = {
        numero,

        // Client
        clientId:      donnees.clientId || null,
        clientNom:     donnees.clientNom || '',
        clientTel:     donnees.clientTel || '',
        clientEmail:   donnees.clientEmail || '',
        clientAdresse: donnees.clientAdresse || '',

        // Domaine
        domaineId:    donnees.domaineId || null,
        domaineLabel: donnees.domaineLabel || '',

        // Lignes
        lignes: (donnees.lignes || []).map((l, i) => ({
            numero:       i + 1,
            description:  l.description || l.nom || '',
            quantite:     parseFloat(l.quantite) || 1,
            unite:        l.unite || 'u',
            prixUnitaire: parseFloat(l.prixUnitaire) || 0,
            remise:       parseFloat(l.remise) || 0,
            sousTotal:    parseFloat(l.sousTotal) || 0,
        })),

        // Montants
        sousTotal:      donnees.sousTotal || 0,
        remiseGlobale:  donnees.remiseGlobale || 0,
        montantRemise:  donnees.montantRemise || 0,
        tauxTVA:        donnees.tauxTVA || 0,
        montantTVA:     donnees.montantTVA || 0,
        montantTotal:   donnees.montantTotal || 0,
        devise:         donnees.devise || 'GNF',

        // Statut
        statut:         'en_attente',  // en_attente, envoye, accepte, refuse, expire, converti
        historiqueStatuts: [{
            statut: 'en_attente',
            date:   new Date().toISOString(),
            userId,
            note:   'Devis créé',
        }],

        // Dates
        dateEmission:  donnees.dateEmission || new Date().toISOString().split('T')[0],
        dateExpiration: donnees.dateExpiration || null,
        dateAcceptation: null,

        // Conversion
        convertiEnCommande: false,
        commandeId:         null,
        commandeNumero:     null,

        // Notes
        notes:              donnees.notes || '',
        conditionsPaiement: donnees.conditionsPaiement || 'Paiement à 30 jours',
        conditionsLivraison: donnees.conditionsLivraison || '',

        // Méta
        annee:      new Date().getFullYear(),
        mois:       new Date().getMonth() + 1,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
        createdBy:  userId,
        archive:    false,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.DEVIS), devis);

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.DEVIS,
        docId:          ref.id,
        nouvelleValeur: { numero, client: devis.clientNom, total: devis.montantTotal },
    });

    return { id: ref.id, numero };
};

/**
 * Mettre à jour un devis
 */
export const mettreAJourDevis = async (id, donnees, userId = null) => {
    const ref = doc(db, COLLECTIONS.DEVIS, id);
    await updateDoc(ref, {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    });

    await logAction({
        action:         AUDIT_ACTIONS.MODIFICATION,
        collection:     COLLECTIONS.DEVIS,
        docId:          id,
        nouvelleValeur: donnees,
    });
};

/**
 * Changer le statut d'un devis
 */
export const changerStatutDevis = async (devisId, nouveauStatut, options = {}) => {
    const ref  = doc(db, COLLECTIONS.DEVIS, devisId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Devis introuvable');

    const data = snap.data();
    const historique = [...(data.historiqueStatuts || []), {
        statut:  nouveauStatut,
        date:    new Date().toISOString(),
        userId:  options.userId || null,
        note:    options.note || '',
    }];

    const updates = {
        statut:            nouveauStatut,
        historiqueStatuts: historique,
        updatedAt:         serverTimestamp(),
    };

    if (nouveauStatut === 'accepte') {
        updates.dateAcceptation = serverTimestamp();
    }

    await updateDoc(ref, updates);

    await logAction({
        action:         AUDIT_ACTIONS.MODIFICATION,
        collection:     COLLECTIONS.DEVIS,
        docId:          devisId,
        ancienneValeur: { statut: data.statut },
        nouvelleValeur: { statut: nouveauStatut },
    });
};

/**
 * Convertir un devis en commande
 */
export const convertirEnCommande = async (devisId, userId = null) => {
    const snap = await getDoc(doc(db, COLLECTIONS.DEVIS, devisId));
    if (!snap.exists()) throw new Error('Devis introuvable');

    const devis = snap.data();

    // Créer la commande
    const { creerCommande } = await import('./commandeService');
    const { id, numero } = await creerCommande({
        clientId:       devis.clientId,
        clientNom:      devis.clientNom,
        clientTel:      devis.clientTel,
        clientEmail:    devis.clientEmail,
        domaineId:      devis.domaineId,
        domaineLabel:   devis.domaineLabel,
        lignes: devis.lignes.map(l => ({
            type:         'service',
            nom:          l.description,
            quantite:     l.quantite,
            prixUnitaire: l.prixUnitaire,
            remise:       l.remise,
            sousTotal:    l.sousTotal,
        })),
        sousTotal:      devis.sousTotal,
        remiseGlobale:  devis.remiseGlobale,
        montantTotal:   devis.montantTotal,
        devise:         devis.devise,
        source:         'devis',
        note:           `Converti depuis devis ${devis.numero}`,
    }, userId);

    // Mettre à jour le devis
    await updateDoc(doc(db, COLLECTIONS.DEVIS, devisId), {
        convertiEnCommande: true,
        commandeId:         id,
        commandeNumero:     numero,
        statut:             'converti',
        updatedAt:          serverTimestamp(),
    });

    return { id, numero };
};

/**
 * Supprimer un devis
 */
export const supprimerDevis = async (id, userId = null) => {
    const ref  = doc(db, COLLECTIONS.DEVIS, id);
    const snap = await getDoc(ref);

    await deleteDoc(ref);

    await logAction({
        action:         AUDIT_ACTIONS.SUPPRESSION,
        collection:     COLLECTIONS.DEVIS,
        docId:          id,
        ancienneValeur: snap.data(),
    });
};

export default {
    genererNumeroDevis, ecouterDevis, creerDevis,
    mettreAJourDevis, changerStatutDevis,
    convertirEnCommande, supprimerDevis,
};