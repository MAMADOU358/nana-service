import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    sendPasswordResetEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
} from 'firebase/auth';
import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { COLLECTIONS, ROLES, PERMISSIONS_PAR_ROLE, AUDIT_ACTIONS } from '../config/constants';

// Contexte
const AuthContext = createContext(null);

// Hook personnalisé
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
    return context;
};

// Provider
export const AuthProvider = ({ children }) => {
    const [user, setUser]           = useState(null);
    const [profil, setProfil]       = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);

    // Tentatives de connexion
    const [tentatives, setTentatives]   = useState(0);
    const [bloqueJusqu, setBloqueJusqu] = useState(null);
    const MAX_TENTATIVES = 5;
    const DUREE_BLOCAGE  = 15 * 60 * 1000; // 15 minutes

    // Charger profil utilisateur depuis Firestore
    const chargerProfil = useCallback(async (uid) => {
        try {
            const docRef  = doc(db, COLLECTIONS.UTILISATEURS, uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfil(data);

                // Calculer permissions
                const permsRole  = PERMISSIONS_PAR_ROLE[data.role] || [];
                const permsExtra = data.permissionsExtra || [];
                const permsRetir = data.permissionsRetirees || [];

                const permsFinales = [
                    ...new Set([...permsRole, ...permsExtra])
                ].filter(p => !permsRetir.includes(p));

                setPermissions(permsFinales);
                return data;
            } else {
                console.error('Profil utilisateur introuvable :', uid);
                return null;
            }
        } catch (err) {
            console.error('Erreur chargement profil :', err);
            return null;
        }
    }, []);

    // Observer état auth
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                await chargerProfil(firebaseUser.uid);
            } else {
                setUser(null);
                setProfil(null);
                setPermissions([]);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [chargerProfil]);

    // Logger action audit
    const logAudit = useCallback(async (action, details = {}) => {
        try {
            const auditRef = collection(db, COLLECTIONS.AUDIT);
            await setDoc(doc(auditRef), {
                action,
                userId:      user?.uid || null,
                userNom:     profil?.nom || 'Système',
                userEmail:   user?.email || null,
                userRole:    profil?.role || null,
                details,
                ip:          null, // Côté serveur uniquement
                userAgent:   navigator.userAgent,
                timestamp:   serverTimestamp(),
                date:        new Date().toISOString(),
            });
        } catch (err) {
            console.error('Erreur audit :', err);
        }
    }, [user, profil]);

    // Connexion
    const connexion = useCallback(async (email, motdepasse) => {
        setError(null);

        // Vérifier blocage
        if (bloqueJusqu && Date.now() < bloqueJusqu) {
            const restant = Math.ceil((bloqueJusqu - Date.now()) / 60000);
            throw new Error(`Trop de tentatives. Réessayez dans ${restant} minute(s).`);
        }

        try {
            // Vérifier si utilisateur actif
            const q = query(
                collection(db, COLLECTIONS.UTILISATEURS),
                where('email', '==', email)
            );
            const snap = await getDocs(q);

            if (!snap.empty) {
                const userData = snap.docs[0].data();
                if (userData.actif === false) {
                    throw new Error('Ce compte est désactivé. Contactez l\'administrateur.');
                }
            }

            const result = await signInWithEmailAndPassword(auth, email, motdepasse);

            // Réinitialiser tentatives
            setTentatives(0);
            setBloqueJusqu(null);

            // Mettre à jour dernière connexion
            await updateDoc(doc(db, COLLECTIONS.UTILISATEURS, result.user.uid), {
                derniereConnexion: serverTimestamp(),
                dernierIP:         null, // À faire côté serveur
            });

            // Logger connexion
            await logAudit(AUDIT_ACTIONS.CONNEXION, { email });

            return result.user;

        } catch (err) {
            // Gérer tentatives échouées
            if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                const nouvellesTentatives = tentatives + 1;
                setTentatives(nouvellesTentatives);

                if (nouvellesTentatives >= MAX_TENTATIVES) {
                    const blocageJusqu = Date.now() + DUREE_BLOCAGE;
                    setBloqueJusqu(blocageJusqu);
                    setTentatives(0);
                    throw new Error('Compte bloqué 15 minutes après trop de tentatives.');
                }

                const restantes = MAX_TENTATIVES - nouvellesTentatives;
                throw new Error(
                    `Email ou mot de passe incorrect. ${restantes} tentative(s) restante(s).`
                );
            }

            // Autres erreurs Firebase
            const messages = {
                'auth/user-not-found':    'Aucun compte avec cet email.',
                'auth/wrong-password':    'Mot de passe incorrect.',
                'auth/invalid-email':     'Email invalide.',
                'auth/user-disabled':     'Compte désactivé.',
                'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
                'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
            };

            throw new Error(messages[err.code] || err.message);
        }
    }, [tentatives, bloqueJusqu, logAudit]);

    // Déconnexion
    const deconnexion = useCallback(async () => {
        try {
            await logAudit(AUDIT_ACTIONS.DECONNEXION);
            await signOut(auth);
        } catch (err) {
            console.error('Erreur déconnexion :', err);
        }
    }, [logAudit]);

    // Réinitialiser mot de passe
    const reinitialiserMotDePasse = useCallback(async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            await logAudit('reset_password', { email });
        } catch (err) {
            const messages = {
                'auth/user-not-found': 'Aucun compte avec cet email.',
                'auth/invalid-email':  'Email invalide.',
            };
            throw new Error(messages[err.code] || err.message);
        }
    }, [logAudit]);

    // Changer mot de passe
    const changerMotDePasse = useCallback(async (ancienMdp, nouveauMdp) => {
        try {
            const credential = EmailAuthProvider.credential(user.email, ancienMdp);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, nouveauMdp);
            await logAudit('changement_mot_de_passe');
        } catch (err) {
            const messages = {
                'auth/wrong-password': 'Ancien mot de passe incorrect.',
                'auth/weak-password':  'Nouveau mot de passe trop faible (minimum 8 caractères).',
            };
            throw new Error(messages[err.code] || err.message);
        }
    }, [user, logAudit]);

    // Vérifier permission
    const aPermission = useCallback((permission) => {
        if (!profil) return false;
        if (profil.role === ROLES.SUPER_ADMIN) return true;
        return permissions.includes(permission);
    }, [profil, permissions]);

    // Vérifier plusieurs permissions (toutes)
    const aPermissions = useCallback((perms) => {
        return perms.every(p => aPermission(p));
    }, [aPermission]);

    // Vérifier au moins une permission
    const aUnePermission = useCallback((perms) => {
        return perms.some(p => aPermission(p));
    }, [aPermission]);

    // Mettre à jour profil
    const mettreAJourProfil = useCallback(async (donnees) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, COLLECTIONS.UTILISATEURS, user.uid), {
                ...donnees,
                updatedAt: serverTimestamp(),
            });
            setProfil(prev => ({ ...prev, ...donnees }));
            await logAudit(AUDIT_ACTIONS.MODIFICATION, { collection: 'profil', donnees });
        } catch (err) {
            throw new Error('Erreur mise à jour profil : ' + err.message);
        }
    }, [user, logAudit]);

    // Rafraîchir profil
    const rafraichirProfil = useCallback(async () => {
        if (user) await chargerProfil(user.uid);
    }, [user, chargerProfil]);

    // Valeur du contexte
    const value = {
        // État
        user,
        profil,
        permissions,
        loading,
        error,
        estConnecte:    !!user,
        estSuperAdmin:  profil?.role === ROLES.SUPER_ADMIN,
        estAdmin:       [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(profil?.role),
        estClient:      profil?.role === ROLES.CLIENT,

        // Actions auth
        connexion,
        deconnexion,
        reinitialiserMotDePasse,
        changerMotDePasse,

        // Permissions
        aPermission,
        aPermissions,
        aUnePermission,

        // Profil
        mettreAJourProfil,
        rafraichirProfil,

        // Audit
        logAudit,

        // Sécurité
        tentatives,
        estBloque: bloqueJusqu && Date.now() < bloqueJusqu,
        bloqueJusqu,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;