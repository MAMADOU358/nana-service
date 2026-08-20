import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, ENTREPRISE_DEFAUT } from '../config/constants';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp doit être utilisé dans AppProvider');
    return context;
};

export const AppProvider = ({ children }) => {
    const { user, profil } = useAuth();

    // Config entreprise
    const [entreprise, setEntreprise] = useState(ENTREPRISE_DEFAUT);
    const [parametres, setParametres] = useState({
        theme:           'light',
        langue:          'fr',
        animations:      true,
        sons:            true,
        volume:          0.5,
        notifications:   true,
        modePerformance: false,
    });

    // Données globales
    const [domaines, setDomaines]   = useState([]);
    const [boutiques, setBoutiques] = useState([]);
    const [alertesStock, setAlertesStock] = useState([]);

    // UI
    const [sidebarOuverte, setSidebarOuverte] = useState(true);
    const [pageActive, setPageActive]         = useState('dashboard');
    const [notifications, setNotifications]   = useState([]);
    const [loading, setLoading]               = useState(true);

    // Charger config entreprise
    useEffect(() => {
        const unsub = onSnapshot(
            doc(db, COLLECTIONS.ENTREPRISE, 'config'),
            (snap) => {
                if (snap.exists()) {
                    setEntreprise(prev => ({ ...prev, ...snap.data() }));
                }
            }
        );
        return () => unsub();
    }, []);

    // Charger paramètres
    useEffect(() => {
        const unsub = onSnapshot(
            doc(db, COLLECTIONS.PARAMETRES, 'general'),
            (snap) => {
                if (snap.exists()) {
                    setParametres(prev => ({ ...prev, ...snap.data() }));
                }
                setLoading(false);
            }
        );
        return () => unsub();
    }, []);

    // Charger domaines actifs
    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.DOMAINES),
            where('actif', '==', true),
            orderBy('ordre', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setDomaines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // Charger boutiques actives
    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.BOUTIQUES),
            where('actif', '==', true)
        );
        const unsub = onSnapshot(q, (snap) => {
            setBoutiques(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // Notifications temps réel (admin uniquement)
    useEffect(() => {
        if (!user || !profil || profil.role === 'client') return;

        const q = query(
            collection(db, COLLECTIONS.NOTIFICATIONS),
            where('destinataires', 'array-contains', user.uid),
            where('lu', '==', false),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsub = onSnapshot(q, (snap) => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsub();
    }, [user, profil]);

    // Alertes stock bas
    useEffect(() => {
        if (!user || !profil || profil.role === 'client') return;

        const q = query(
            collection(db, COLLECTIONS.PRODUITS),
            where('stockActuel', '<=', doc(db, 'produits', 'seuilAlerte'))
        );
        // Géré différemment - simplifié ici
    }, [user, profil]);

    // Getters utiles
    const getDomaineById = useCallback((id) => {
        return domaines.find(d => d.id === id) || null;
    }, [domaines]);

    const getBoutiqueById = useCallback((id) => {
        return boutiques.find(b => b.id === id) || null;
    }, [boutiques]);

    const domainesVisibles = domaines.filter(d => d.visibleClient !== false);

    const value = {
        // Config
        entreprise,
        parametres,

        // Données
        domaines,
        domainesVisibles,
        boutiques,
        alertesStock,
        notifications,
        notifNonLues: notifications.length,

        // UI
        sidebarOuverte,
        setSidebarOuverte,
        pageActive,
        setPageActive,
        loading,

        // Helpers
        getDomaineById,
        getBoutiqueById,

        // Thème
        theme:         parametres.theme || 'light',
        animationsON:  parametres.animations !== false,
        sonsON:        parametres.sons !== false,
        volume:        parametres.volume || 0.5,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export default AppContext;