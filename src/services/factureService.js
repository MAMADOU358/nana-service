import {
    collection, doc, addDoc, updateDoc, getDoc,
    onSnapshot, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS, NUMEROTATION } from '../config/constants';

/**
 * Générer un numéro de facture
 * Format: NS-FAC-2026-000001
 */
export const genererNumeroFacture = async () => {
    const annee = new Date().getFullYear();
    return `${NUMEROTATION.FACTURE}-${annee}-${Date.now().toString().slice(-6)}`;
};

/**
 * Créer une facture
 */
export const creerFacture = async (donnees, userId = null) => {
    const numero = await genererNumeroFacture();

    const facture = {
        numero,
        type:    donnees.type || 'facture', // facture | avoir | recu | bon_commande | bon_livraison

        // Client
        clientId:    donnees.clientId || null,
        clientNom:   donnees.clientNom || '',
        clientTel:   donnees.clientTel || '',
        clientEmail: donnees.clientEmail || '',
        clientAdresse: donnees.clientAdresse || '',

        // Lien commande
        commandeId:     donnees.commandeId || null,
        commandeNumero: donnees.commandeNumero || null,

        // Domaine & Boutique
        domaineId:    donnees.domaineId || null,
        boutiqueId:   donnees.boutiqueId || null,
        boutiqueLabel: donnees.boutiqueLabel || '',

        // Lignes
        lignes: (donnees.lignes || []).map((l, i) => ({
            numero:       i + 1,
            description:  l.nom || l.description || '',
            quantite:     parseFloat(l.quantite) || 1,
            unite:        l.unite || 'u',
            prixUnitaire: parseFloat(l.prixUnitaire) || 0,
            remise:       parseFloat(l.remise) || 0,
            sousTotal:    parseFloat(l.sousTotal) || 0,
        })),

        // Montants
        sousTotal:      donnees.sousTotal || 0,
        remiseGlobale:  donnees.remiseGlobale || 0,
        tauxTVA:        donnees.tauxTVA || 0,
        montantTVA:     donnees.montantTVA || 0,
        fraisLivraison: donnees.fraisLivraison || 0,
        montantTotal:   donnees.montantTotal || 0,
        montantPaye:    donnees.montantPaye || 0,
        resteAPayer:    donnees.resteAPayer || donnees.montantTotal || 0,
        devise:         donnees.devise || 'GNF',

        // Statut
        statut:      donnees.statut || 'non_payee', // non_payee | partiel | payee | annulee

        // Dates
        dateEmission:  donnees.dateEmission || new Date().toISOString().split('T')[0],
        dateEcheance:  donnees.dateEcheance || null,

        // Paiements
        paiements:     donnees.paiements || [],

        // Notes
        notes:         donnees.notes || '',
        conditionsPaiement: donnees.conditionsPaiement || '',

        // Méta
        annee:      new Date().getFullYear(),
        mois:       new Date().getMonth() + 1,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
        createdBy:  userId,
        archive:    false,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.FACTURES), facture);

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.FACTURES,
        docId:          ref.id,
        nouvelleValeur: { numero, client: facture.clientNom, total: facture.montantTotal },
    });

    return { id: ref.id, numero };
};

/**
 * Créer une facture depuis une commande
 */
export const factureDepuisCommande = async (commandeId, userId = null) => {
    const snap = await getDoc(doc(db, COLLECTIONS.COMMANDES, commandeId));
    if (!snap.exists()) throw new Error('Commande introuvable');

    const cmd = snap.data();

    return await creerFacture({
        commandeId,
        commandeNumero: cmd.numero,
        clientId:       cmd.clientId,
        clientNom:      cmd.clientNom,
        clientTel:      cmd.clientTel,
        clientEmail:    cmd.clientEmail,
        domaineId:      cmd.domaineId,
        boutiqueId:     cmd.boutiqueId,
        boutiqueLabel:  cmd.boutiqueLabel,
        lignes:         cmd.lignes || [],
        sousTotal:      cmd.sousTotal || 0,
        remiseGlobale:  cmd.remiseGlobale || 0,
        fraisLivraison: cmd.fraisLivraison || 0,
        montantTotal:   cmd.montantTotal || 0,
        montantPaye:    cmd.montantPaye || 0,
        resteAPayer:    cmd.resteAPayer || 0,
        paiements:      cmd.paiements || [],
        statut:         cmd.statutPaiement === 'paye' ? 'payee' : 'non_payee',
        devise:         cmd.devise,
    }, userId);
};

/**
 * Écouter les factures
 */
export const ecouterFactures = (callback, filtres = {}) => {
    const contraintes = [orderBy('createdAt', 'desc')];
    if (filtres.statut) contraintes.push(where('statut', '==', filtres.statut));
    if (filtres.clientId) contraintes.push(where('clientId', '==', filtres.clientId));
    if (filtres.annee) contraintes.push(where('annee', '==', filtres.annee));

    const q = query(collection(db, COLLECTIONS.FACTURES), ...contraintes);
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Annuler une facture (créer un avoir)
 */
export const annulerFacture = async (factureId, motif = '', userId = null) => {
    const ref  = doc(db, COLLECTIONS.FACTURES, factureId);
    const snap = await getDoc(ref);
    const fact = snap.data();

    // Mettre à jour la facture originale
    await updateDoc(ref, {
        statut:    'annulee',
        annulee:   true,
        motifAnnulation: motif,
        annuleeAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Créer un avoir
    await creerFacture({
        ...fact,
        type:           'avoir',
        factureId:      factureId,
        factureNumero:  fact.numero,
        montantTotal:   -fact.montantTotal,
        notes:          `Avoir pour annulation facture ${fact.numero}. Motif: ${motif}`,
    }, userId);

    await logAction({
        action:     AUDIT_ACTIONS.MODIFICATION,
        collection: COLLECTIONS.FACTURES,
        docId:      factureId,
        details:    { action: 'annulation', motif },
    });
};

export default {
    genererNumeroFacture, creerFacture, factureDepuisCommande,
    ecouterFactures, annulerFacture,
};