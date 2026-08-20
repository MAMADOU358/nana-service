import { uploadImage, uploadImages, uploadVideo, uploadDocument } from '../config/imgbb';

/**
 * Service d'upload centralisé
 * Gère IMGBB (images), Cloudinary (vidéos), Firebase Storage (docs)
 */

/**
 * Uploader une image de produit
 */
export const uploaderImageProduit = async (file, nomProduit = '') => {
    const nom = `produit_${nomProduit}_${Date.now()}`.replace(/\s/g, '_');
    return await uploadImage(file, nom);
};

/**
 * Uploader plusieurs images de produit
 */
export const uploaderImagesGalerie = async (files, onProgress = null) => {
    return await uploadImages(Array.from(files), onProgress);
};

/**
 * Uploader le logo de l'entreprise ou d'un domaine
 */
export const uploaderLogo = async (file, nom = 'logo') => {
    const maxSize = 5 * 1024 * 1024; // 5MB pour logo
    if (file.size > maxSize) {
        throw new Error('Logo trop lourd. Maximum : 5MB');
    }
    return await uploadImage(file, nom);
};

/**
 * Uploader l'avatar d'un utilisateur/client
 */
export const uploaderAvatar = async (file, userId) => {
    const maxSize = 5 * 1024 * 1024; // 5MB pour avatar
    if (file.size > maxSize) {
        throw new Error('Avatar trop lourd. Maximum : 5MB');
    }
    return await uploadImage(file, `avatar_${userId}`);
};

/**
 * Uploader une vidéo de produit/service
 */
export const uploaderVideo = async (file, onProgress = null) => {
    return await uploadVideo(file, onProgress);
};

/**
 * Uploader un document de commande
 * (ex: fichier client pour impression, logo, etc.)
 */
export const uploaderFichierCommande = async (file, commandeId) => {
    // Images → IMGBB
    if (file.type.startsWith('image/')) {
        return await uploadImage(file, `commande_${commandeId}_${file.name}`);
    }
    // Vidéos → Cloudinary
    if (file.type.startsWith('video/')) {
        return await uploadVideo(file);
    }
    // Documents → Firebase Storage
    return await uploadDocument(file, `commandes/${commandeId}`);
};

/**
 * Uploader un fichier de facture PDF
 */
export const uploaderFacturePDF = async (blob, factureNumero) => {
    const file = new File([blob], `${factureNumero}.pdf`, { type: 'application/pdf' });
    return await uploadDocument(file, `factures/${new Date().getFullYear()}`);
};

/**
 * Valider un fichier avant upload
 */
export const validerFichier = (file, options = {}) => {
    const {
        maxSize   = 5 * 1024 * 1024, // 5MB par défaut
        types     = null,             // null = tous
        minWidth  = null,
        minHeight = null,
    } = options;

    const erreurs = [];

    if (file.size > maxSize) {
        erreurs.push(`Fichier trop lourd : ${(file.size / 1024 / 1024).toFixed(1)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`);
    }

    if (types && !types.includes(file.type)) {
        erreurs.push(`Type non supporté : ${file.type}. Accepté : ${types.join(', ')}`);
    }

    return {
        valide:  erreurs.length === 0,
        erreurs,
    };
};

export default {
    uploaderImageProduit, uploaderImagesGalerie, uploaderLogo,
    uploaderAvatar, uploaderVideo, uploaderFichierCommande,
    uploaderFacturePDF, validerFichier,
};