import {
    collection, doc, addDoc, updateDoc, getDoc,
    onSnapshot, query, where, orderBy, limit,
    serverTimestamp, runTransaction, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { ajusterStock } from './produitService';
import { mettreAJourStatsClient } from './clientService';
import { COLLECTIONS, AUDIT_ACTIONS, STATUTS_COMMANDE, NUMEROTATION } from '../config/constants';

/**
 * Générer un numéro de commande unique
 * Format: NS-CMD-2026-000001
 */
const genererNumero = async (annee) => {
    const debut  = Timestamp.fromDate(new Date(`${annee}-01-01`));
    const fin    = Timestamp.fromDate(new Date(`${annee}-12-31`));
    const snap   = await getDocs(query(
        collection(db, COLLECTIONS.COMMANDES),
        where('createdAt', '>=', debut),
        where('createdAt', '<=', fin),
        orderBy('createdAt', 'desc'),
        limit(1)
    ));

    const dernier = snap.empty ? 0 :
        parseInt(snap.docs[0].data().numero?.split('-').pop() || '0');

    const num = String(dernier + 1).padStart(6, '0');
    return `NS-CMD-${annee}-${num}`;
};

/**
 * Créer une commande
 */
export const creerCommande = async (donnees, userId = null) => {
    const annee = new Date().getFullYear();
    const numero = `NS-CMD-${annee}-${Date.now().toString().slice(-6)}`;

    const commande = {
        numero,
        // Client
        clientId:    donnees.clientId || null,
        clientNom:   donnees.clientNom || '',
        clientTel:   donnees.clientTel || '',
        clientEmail: donnees.clientEmail || '',

        // Domaine & Boutique
        domaineId:    donnees.domaineId || null,
        domaineLabel: donnees.domaineLabel || '',
        boutiqueId:   donnees.boutiqueId || null,
        boutiqueLabel: donnees.boutiqueLabel || '',

        // Lignes
        lignes: (donnees.lignes || []).map(l => ({
            produitId:    l.produitId || null,
            serviceId:    l.serviceId || null,
            type:         l.type || 'produit', // produit | service
            nom:          l.nom || '',
            description:  l.description || '',
            quantite:     parseFloat(l.quantite) || 1,
            prixUnitaire: parseFloat(l.prixUnitaire) || 0,
            remise:       parseFloat(l.remise) || 0,
            sousTotal:    calculerSousTotal(l),
            configuration: l.configuration || null, // Pour services configurables
        })),

        // Montants
        sousTotal:     donnees.sousTotal || 0,
        remiseGlobale: donnees.remiseGlobale || 0,
        fraisLivraison: donnees.fraisLivraison || 0,
        montantTotal:  donnees.montantTotal || 0,
        montantPaye:   0,
        resteAPayer:   donnees.montantTotal || 0,
        devise:        donnees.devise || 'GNF',

        // Livraison
        typeLivraison: donnees.typeLivraison || 'retrait', // retrait | livraison
        adresseLivraison: donnees.adresseLivraison || null,
        dateRemise:    donnees.dateRemise || null,
        noteLivraison: donnees.noteLivraison || '',

        // Fichiers joints
        fichiers: donnees.fichiers || [],

        // Statut
        statut:         'nouvelle',
        historiqueStatuts: [{
            statut:    'nouvelle',
            date:      new Date().toISOString(),
            userId,
            note:      'Commande créée',
        }],

        // Paiement
        statutPaiement: 'non_paye', // non_paye | partiel | paye
        paiements:      [],

        // Notes
        noteInterne:  donnees.noteInterne || '',
        noteClient:   donnees.noteClient || '',

        // Méta
        source:     donnees.source || 'admin', // admin | client | whatsapp
        annee,
        mois:       new Date().getMonth() + 1,
        jour:       new Date().getDate(),
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
        createdBy:  userId,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.COMMANDES), commande);

    // Déduire stock pour produits
    for (const ligne of commande.lignes) {
        if (ligne.type === 'produit' && ligne.produitId && ligne.quantite > 0) {
            try {
                await ajusterStock(ligne.produitId, ligne.quantite, 'sortie', {
                    motif:     `Commande ${numero}`,
                    commandeId: ref.id,
                    boutiqueId: commande.boutiqueId,
                    userId,
                });
            } catch (e) {
                console.warn('Stock non déduit pour', ligne.nom, ':', e.message);
            }
        }
    }

    // Mettre à jour stats client
    if (commande.clientId) {
        await mettreAJourStatsClient(commande.clientId, commande.montantTotal);
    }

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.COMMANDES,
        docId:          ref.id,
        nouvelleValeur: { numero, client: commande.clientNom, total: commande.montantTotal },
    });

    return { id: ref.id, numero };
};

/**
 * Changer le statut d'une commande
 */
export const changerStatut = async (commandeId, nouveauStatut, options = {}) => {
    const ref  = doc(db, COLLECTIONS.COMMANDES, commandeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Commande introuvable');

    const data = snap.data();
    const ancienStatut = data.statut;

    const historique = [...(data.historiqueStatuts || []), {
        statut:    nouveauStatut,
        date:      new Date().toISOString(),
        userId:    options.userId || null,
        note:      options.note || '',
    }];

    await updateDoc(ref, {
        statut:            nouveauStatut,
        historiqueStatuts: historique,
        updatedAt:         serverTimestamp(),
        updatedBy:         options.userId || null,
        ...(nouveauStatut === 'terminee' ? { termineAt: serverTimestamp() } : {}),
        ...(nouveauStatut === 'annulee'  ? { annuleeAt: serverTimestamp() } : {}),
    });

    await logAction({
        action:         AUDIT_ACTIONS.MODIFICATION,
        collection:     COLLECTIONS.COMMANDES,
        docId:          commandeId,
        ancienneValeur: { statut: ancienStatut },
        nouvelleValeur: { statut: nouveauStatut },
    });
};

/**
 * Écouter les commandes
 */
export const ecouterCommandes = (callback, filtres = {}) => {
    const contraintes = [orderBy('createdAt', 'desc')];

    if (filtres.statut) contraintes.push(where('statut', '==', filtres.statut));
    if (filtres.clientId) contraintes.push(where('clientId', '==', filtres.clientId));
    if (filtres.domaineId) contraintes.push(where('domaineId', '==', filtres.domaineId));
    if (filtres.boutiqueId) contraintes.push(where('boutiqueId', '==', filtres.boutiqueId));
    if (filtres.limit) contraintes.push(limit(filtres.limit));

    const q = query(collection(db, COLLECTIONS.COMMANDES), ...contraintes);
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Enregistrer un paiement sur une commande
 */
export const enregistrerPaiement = async (commandeId, paiement, userId = null) => {
    return await runTransaction(db, async (transaction) => {
        const ref  = doc(db, COLLECTIONS.COMMANDES, commandeId);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Commande introuvable');

        const data       = snap.data();
        const dejaPaye   = data.montantPaye || 0;
        const total      = data.montantTotal || 0;
        const nouveauPaye = dejaPaye + paiement.montant;
        const resteAPayer = Math.max(0, total - nouveauPaye);

        const statutPaiement = resteAPayer === 0 ? 'paye' :
            nouveauPaye > 0 ? 'partiel' : 'non_paye';

        const paiements = [...(data.paiements || []), {
            ...paiement,
            date:      new Date().toISOString(),
            createdBy: userId,
        }];

        transaction.update(ref, {
            montantPaye:    nouveauPaye,
            resteAPayer,
            statutPaiement,
            paiements,
            updatedAt:      serverTimestamp(),
        });

        // Créer doc paiement
        const paiementRef = doc(collection(db, COLLECTIONS.PAIEMENTS));
        transaction.set(paiementRef, {
            commandeId,
            commandeNumero: data.numero,
            clientId:       data.clientId,
            clientNom:      data.clientNom,
            ...paiement,
            createdAt:      serverTimestamp(),
            createdBy:      userId,
        });

        return { statutPaiement, resteAPayer, idPaiement: paiementRef.id };
    });
};

// Helper
const calculerSousTotal = (ligne) => {
    const qte   = parseFloat(ligne.quantite) || 1;
    const pu    = parseFloat(ligne.prixUnitaire) || 0;
    const rem   = parseFloat(ligne.remise) || 0;
    return parseFloat((qte * pu * (1 - rem / 100)).toFixed(2));
};

export default {
    creerCommande, changerStatut, ecouterCommandes, enregistrerPaiement,
};