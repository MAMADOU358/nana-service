import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp,
    increment, runTransaction, getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import { COLLECTIONS, AUDIT_ACTIONS } from '../config/constants';

/**
 * Écouter tous les produits
 */
export const ecouterProduits = (callback, filtres = {}) => {
    const contraintes = [orderBy('createdAt', 'desc')];

    if (filtres.domaineId) contraintes.push(where('domaineId', '==', filtres.domaineId));
    if (filtres.boutiqueId) contraintes.push(where('boutiqueId', '==', filtres.boutiqueId));
    if (filtres.categorie) contraintes.push(where('categorie', '==', filtres.categorie));
    if (filtres.actif !== undefined) contraintes.push(where('actif', '==', filtres.actif));
    if (filtres.archive !== undefined) contraintes.push(where('archive', '==', filtres.archive));

    const q = query(collection(db, COLLECTIONS.PRODUITS), ...contraintes);
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/**
 * Créer un produit
 */
export const creerProduit = async (donnees, userId = null) => {
    const produit = {
        // Infos de base
        nom:          donnees.nom?.trim() || '',
        reference:    donnees.reference?.trim() || genererReference(),
        description:  donnees.description?.trim() || '',
        descriptionCourte: donnees.descriptionCourte?.trim() || '',

        // Catégorisation
        categorie:    donnees.categorie || '',
        sousCategorie: donnees.sousCategorie || '',
        domaineId:    donnees.domaineId || null,
        domaineLabel: donnees.domaineLabel || '',
        boutiqueId:   donnees.boutiqueId || null,
        boutiqueLabel: donnees.boutiqueLabel || '',
        tags:         donnees.tags || [],

        // Médias
        images:       donnees.images || [],
        imageUrl:     donnees.imageUrl || null,
        videos:       donnees.videos || [],

        // Prix
        prixAchat:    parseFloat(donnees.prixAchat) || 0,
        prixVente:    parseFloat(donnees.prixVente) || 0,
        prixPromo:    donnees.prixPromo ? parseFloat(donnees.prixPromo) : null,
        promoActive:  donnees.promoActive || false,
        marge:        calculerMarge(donnees.prixAchat, donnees.prixVente),
        devise:       donnees.devise || 'GNF',

        // Stock
        stockActuel:  parseInt(donnees.stockActuel) || 0,
        stockMin:     parseInt(donnees.stockMin) || 0,
        seuilAlerte:  parseInt(donnees.seuilAlerte) || 5,
        stockMax:     parseInt(donnees.stockMax) || 999,
        gererStock:   donnees.gererStock !== false,
        unite:        donnees.unite || 'unité',

        // Fournisseur
        fournisseurId:    donnees.fournisseurId || null,
        fournisseurLabel: donnees.fournisseurLabel || '',

        // Variantes
        aVariantes:   donnees.aVariantes || false,
        variantes:    donnees.variantes || [],

        // Visibilité
        actif:          donnees.actif !== false,
        visibleClient:  donnees.visibleClient !== false,
        archive:        false,

        // Divers
        poids:        donnees.poids || null,
        dimensions:   donnees.dimensions || null,
        codeBarres:   donnees.codeBarres || null,
        notes:        donnees.notes || '',

        // Méta
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
        createdBy:  userId,
        nbVentes:   0,
        nbVues:     0,
    };

    const ref = await addDoc(collection(db, COLLECTIONS.PRODUITS), produit);

    // Créer entrée stock initiale
    if (produit.stockActuel > 0) {
        await addDoc(collection(db, COLLECTIONS.MOUVEMENTS), {
            produitId:   ref.id,
            produitNom:  produit.nom,
            type:        'entree_initiale',
            quantite:    produit.stockActuel,
            stockAvant:  0,
            stockApres:  produit.stockActuel,
            motif:       'Stock initial',
            boutiqueId:  produit.boutiqueId,
            createdAt:   serverTimestamp(),
            createdBy:   userId,
        });
    }

    await logAction({
        action:         AUDIT_ACTIONS.CREATION,
        collection:     COLLECTIONS.PRODUITS,
        docId:          ref.id,
        nouvelleValeur: { nom: produit.nom, prix: produit.prixVente },
    });

    return ref.id;
};

/**
 * Mettre à jour un produit
 */
export const mettreAJourProduit = async (id, donnees, userId = null) => {
    const ref  = doc(db, COLLECTIONS.PRODUITS, id);
    const snap = await getDoc(ref);
    const avant = snap.data();

    const updates = {
        ...donnees,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    };

    // Recalculer marge si prix changés
    if (donnees.prixAchat || donnees.prixVente) {
        const achat  = donnees.prixAchat  || avant.prixAchat  || 0;
        const vente  = donnees.prixVente  || avant.prixVente  || 0;
        updates.marge = calculerMarge(achat, vente);
    }

    await updateDoc(ref, updates);

    await logAction({
        action:         AUDIT_ACTIONS.MODIFICATION,
        collection:     COLLECTIONS.PRODUITS,
        docId:          id,
        ancienneValeur: { nom: avant.nom, prix: avant.prixVente, stock: avant.stockActuel },
        nouvelleValeur: { nom: donnees.nom, prix: donnees.prixVente, stock: donnees.stockActuel },
    });
};

/**
 * Ajuster le stock (entrée/sortie)
 */
export const ajusterStock = async (produitId, quantite, type, options = {}) => {
    const ref = doc(db, COLLECTIONS.PRODUITS, produitId);

    return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Produit introuvable');

        const avant = snap.data().stockActuel || 0;
        const delta = type === 'entree' ? Math.abs(quantite) : -Math.abs(quantite);
        const apres = Math.max(0, avant + delta);

        transaction.update(ref, {
            stockActuel: apres,
            updatedAt:   serverTimestamp(),
        });

        // Mouvement de stock
        const mvtRef = doc(collection(db, COLLECTIONS.MOUVEMENTS));
        transaction.set(mvtRef, {
            produitId,
            produitNom:  snap.data().nom,
            type,
            quantite:    Math.abs(quantite),
            stockAvant:  avant,
            stockApres:  apres,
            motif:       options.motif || '',
            commandeId:  options.commandeId || null,
            boutiqueId:  options.boutiqueId || null,
            createdAt:   serverTimestamp(),
            createdBy:   options.userId || null,
        });

        return { avant, apres, delta };
    });
};

/**
 * Supprimer (archiver) un produit
 */
export const archiverProduit = async (id, userId = null) => {
    await updateDoc(doc(db, COLLECTIONS.PRODUITS, id), {
        archive:    true,
        actif:      false,
        archivedAt: serverTimestamp(),
        archivedBy: userId,
    });

    await logAction({
        action:     AUDIT_ACTIONS.ARCHIVAGE,
        collection: COLLECTIONS.PRODUITS,
        docId:      id,
    });
};

// Helpers
const genererReference = () => {
    return 'NS-' + Date.now().toString(36).toUpperCase();
};

const calculerMarge = (prixAchat, prixVente) => {
    const achat = parseFloat(prixAchat) || 0;
    const vente = parseFloat(prixVente) || 0;
    if (achat === 0 || vente === 0) return 0;
    return parseFloat(((vente - achat) / achat * 100).toFixed(2));
};

export default {
    ecouterProduits, creerProduit, mettreAJourProduit,
    ajusterStock, archiverProduit,
};