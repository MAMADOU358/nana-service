// ═══════════════════════════════════════════════
// CONFIGURATION IMGBB + STOCKAGE MÉDIAS
// ═══════════════════════════════════════════════

const IMGBB_API_KEY = process.env.REACT_APP_IMGBB_API_KEY;
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

// Cloudinary pour vidéos
const CLOUDINARY_CLOUD_NAME   = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

/**
 * Upload une image sur IMGBB
 * @param {File} file - Fichier image
 * @param {string} nom - Nom de l'image
 * @returns {Promise<object>} - Données de l'image uploadée
 */
export const uploadImage = async (file, nom = '') => {
    if (!IMGBB_API_KEY) {
        throw new Error('Clé API IMGBB non configurée');
    }

    // Validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error(`Image trop lourde. Maximum : 5MB (actuel : ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    const typesAutorises = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!typesAutorises.includes(file.type)) {
        throw new Error('Type d\'image non supporté. Utilisez : JPG, PNG, WEBP ou GIF');
    }

    // Convertir en base64
    const base64 = await fileToBase64(file);

    // Préparer la requête
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64.split(',')[1]); // Enlever le préfixe data:image/...;base64,
    if (nom) formData.append('name', nom);

    // Expiration : jamais (0)
    formData.append('expiration', '0');

    const response = await fetch(IMGBB_API_URL, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Erreur upload IMGBB : ' + response.statusText);
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error('Échec upload IMGBB : ' + (data.error?.message || 'Erreur inconnue'));
    }

    return {
        url:         data.data.url,
        urlThumb:    data.data.thumb?.url || data.data.url,
        urlMedium:   data.data.medium?.url || data.data.url,
        deleteUrl:   data.data.delete_url,
        id:          data.data.id,
        nom:         data.data.title,
        taille:      data.data.size,
        width:       data.data.width,
        height:      data.data.height,
        type:        file.type,
        uploadedAt:  new Date().toISOString(),
    };
};

/**
 * Upload plusieurs images sur IMGBB
 * @param {File[]} files - Tableau de fichiers images
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<object[]>} - Tableau des images uploadées
 */
export const uploadImages = async (files, onProgress = null) => {
    const results = [];
    let completed = 0;

    for (const file of files) {
        try {
            const result = await uploadImage(file, file.name);
            results.push({ success: true, data: result, file: file.name });
            completed++;
            if (onProgress) {
                onProgress(Math.round((completed / files.length) * 100));
            }
        } catch (error) {
            results.push({ success: false, error: error.message, file: file.name });
            completed++;
            if (onProgress) {
                onProgress(Math.round((completed / files.length) * 100));
            }
        }
    }

    return results;
};

/**
 * Upload une vidéo sur Cloudinary
 * @param {File} file - Fichier vidéo
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<object>} - Données de la vidéo uploadée
 */
export const uploadVideo = async (file, onProgress = null) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('Configuration Cloudinary manquante');
    }

    // Validation
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        throw new Error(`Vidéo trop lourde. Maximum : 100MB`);
    }

    const typesAutorises = ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/mkv'];
    if (!typesAutorises.includes(file.type)) {
        throw new Error('Type de vidéo non supporté');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'video');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve({
                    url:        data.secure_url,
                    publicId:   data.public_id,
                    format:     data.format,
                    taille:     data.bytes,
                    duration:   data.duration,
                    width:      data.width,
                    height:     data.height,
                    thumbnail:  data.secure_url.replace('/upload/', '/upload/so_0/').replace(`.${data.format}`, '.jpg'),
                    uploadedAt: new Date().toISOString(),
                });
            } else {
                reject(new Error('Erreur upload vidéo Cloudinary'));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Erreur réseau lors de l\'upload vidéo'));
        });

        xhr.open('POST', CLOUDINARY_API_URL);
        xhr.send(formData);
    });
};

/**
 * Upload un document (PDF, Word, etc.) sur Firebase Storage
 * @param {File} file - Fichier document
 * @param {string} chemin - Chemin dans Firebase Storage
 * @returns {Promise<object>} - Données du fichier uploadé
 */
export const uploadDocument = async (file, chemin) => {
    const { storage } = await import('./firebase');
    const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new Error('Document trop lourd. Maximum : 10MB');
    }

    const storageRef = ref(storage, `${chemin}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            null,
            reject,
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                    url,
                    nom:        file.name,
                    taille:     file.size,
                    type:       file.type,
                    chemin:     storageRef.fullPath,
                    uploadedAt: new Date().toISOString(),
                });
            }
        );
    });
};

// Helper : convertir File en base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default {
    uploadImage,
    uploadImages,
    uploadVideo,
    uploadDocument,
};