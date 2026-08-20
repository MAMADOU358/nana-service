// ═══════════════════════════════════════════════
// CONSTANTES GLOBALES NANA SERVICE PRO
// ═══════════════════════════════════════════════

// Informations entreprise par défaut
export const ENTREPRISE_DEFAUT = {
    nom:         'NANA SERVICE',
    slogan:      'Votre partenaire de confiance',
    description: 'Services professionnels multi-domaines',
    telephone:   '',
    whatsapp:    '',
    email:       '',
    adresse:     '',
    ville:       '',
    pays:        'Guinée',
    devise:      'GNF',
    symboleDevise: 'GNF',
    logo:        null,
    siteWeb:     '',
    horaires:    {
        lundi:    { ouvert: true, debut: '08:00', fin: '18:00' },
        mardi:    { ouvert: true, debut: '08:00', fin: '18:00' },
        mercredi: { ouvert: true, debut: '08:00', fin: '18:00' },
        jeudi:    { ouvert: true, debut: '08:00', fin: '18:00' },
        vendredi: { ouvert: true, debut: '08:00', fin: '18:00' },
        samedi:   { ouvert: true, debut: '08:00', fin: '14:00' },
        dimanche: { ouvert: false, debut: '00:00', fin: '00:00' },
    }
};

// Rôles du système
export const ROLES = {
    SUPER_ADMIN:  'super_admin',
    ADMIN:        'admin',
    RESPONSABLE:  'responsable',
    CAISSIER:     'caissier',
    OPERATEUR:    'operateur',
    GRAPHISTE:    'graphiste',
    LIVREUR:      'livreur',
    CLIENT:       'client',
};

export const ROLES_LABELS = {
    super_admin:  { label: 'Super Administrateur', emoji: '👑', couleur: 'red'    },
    admin:        { label: 'Administrateur',        emoji: '🛡️', couleur: 'purple' },
    responsable:  { label: 'Responsable',           emoji: '👔', couleur: 'blue'   },
    caissier:     { label: 'Caissier',              emoji: '💰', couleur: 'green'  },
    operateur:    { label: 'Opérateur',             emoji: '⚙️', couleur: 'orange' },
    graphiste:    { label: 'Graphiste',             emoji: '🎨', couleur: 'pink'   },
    livreur:      { label: 'Livreur',               emoji: '🚚', couleur: 'yellow' },
    client:       { label: 'Client',                emoji: '👤', couleur: 'gray'   },
};

// Permissions granulaires
export const PERMISSIONS = {
    // Domaines
    DOMAINES_VOIR:      'domaines.voir',
    DOMAINES_CREER:     'domaines.creer',
    DOMAINES_MODIFIER:  'domaines.modifier',
    DOMAINES_SUPPRIMER: 'domaines.supprimer',
    DOMAINES_ARCHIVER:  'domaines.archiver',

    // Boutiques
    BOUTIQUES_VOIR:      'boutiques.voir',
    BOUTIQUES_CREER:     'boutiques.creer',
    BOUTIQUES_MODIFIER:  'boutiques.modifier',
    BOUTIQUES_SUPPRIMER: 'boutiques.supprimer',

    // Produits
    PRODUITS_VOIR:      'produits.voir',
    PRODUITS_CREER:     'produits.creer',
    PRODUITS_MODIFIER:  'produits.modifier',
    PRODUITS_SUPPRIMER: 'produits.supprimer',
    PRODUITS_PRIX:      'produits.prix',

    // Services
    SERVICES_VOIR:      'services.voir',
    SERVICES_CREER:     'services.creer',
    SERVICES_MODIFIER:  'services.modifier',
    SERVICES_SUPPRIMER: 'services.supprimer',

    // Commandes
    COMMANDES_VOIR:      'commandes.voir',
    COMMANDES_CREER:     'commandes.creer',
    COMMANDES_MODIFIER:  'commandes.modifier',
    COMMANDES_SUPPRIMER: 'commandes.supprimer',
    COMMANDES_ANNULER:   'commandes.annuler',

    // Clients
    CLIENTS_VOIR:      'clients.voir',
    CLIENTS_CREER:     'clients.creer',
    CLIENTS_MODIFIER:  'clients.modifier',
    CLIENTS_SUPPRIMER: 'clients.supprimer',

    // Partenaires
    PARTENAIRES_VOIR:      'partenaires.voir',
    PARTENAIRES_CREER:     'partenaires.creer',
    PARTENAIRES_MODIFIER:  'partenaires.modifier',
    PARTENAIRES_SUPPRIMER: 'partenaires.supprimer',

    // Stock
    STOCK_VOIR:      'stock.voir',
    STOCK_MODIFIER:  'stock.modifier',
    STOCK_TRANSFERT: 'stock.transfert',
    STOCK_INVENTAIRE:'stock.inventaire',

    // Finances
    VENTES_VOIR:      'ventes.voir',
    VENTES_CREER:     'ventes.creer',
    PAIEMENTS_VOIR:   'paiements.voir',
    PAIEMENTS_CREER:  'paiements.creer',
    FACTURES_VOIR:    'factures.voir',
    FACTURES_CREER:   'factures.creer',
    FACTURES_ANNULER: 'factures.annuler',
    DEVIS_VOIR:       'devis.voir',
    DEVIS_CREER:      'devis.creer',
    ACHATS_VOIR:      'achats.voir',
    ACHATS_CREER:     'achats.creer',
    DEPENSES_VOIR:    'depenses.voir',
    DEPENSES_CREER:   'depenses.creer',

    // Rapports
    RAPPORTS_VOIR:   'rapports.voir',
    RAPPORTS_EXPORT: 'rapports.export',

    // Audit
    AUDIT_VOIR: 'audit.voir',

    // Utilisateurs
    USERS_VOIR:      'users.voir',
    USERS_CREER:     'users.creer',
    USERS_MODIFIER:  'users.modifier',
    USERS_SUPPRIMER: 'users.supprimer',
    USERS_ROLES:     'users.roles',

    // Paramètres
    PARAMS_VOIR:     'params.voir',
    PARAMS_MODIFIER: 'params.modifier',

    // Sécurité
    SECURITE_VOIR:    'securite.voir',
    SECURITE_MODIFIER:'securite.modifier',

    // Import/Export
    IMPORT: 'import',
    EXPORT: 'export',

    // Sauvegardes
    BACKUP: 'backup',
};

// Permissions par défaut selon le rôle
export const PERMISSIONS_PAR_ROLE = {
    super_admin: Object.values(PERMISSIONS), // Tout

    admin: [
        PERMISSIONS.DOMAINES_VOIR, PERMISSIONS.DOMAINES_CREER, PERMISSIONS.DOMAINES_MODIFIER, PERMISSIONS.DOMAINES_ARCHIVER,
        PERMISSIONS.BOUTIQUES_VOIR, PERMISSIONS.BOUTIQUES_CREER, PERMISSIONS.BOUTIQUES_MODIFIER,
        PERMISSIONS.PRODUITS_VOIR, PERMISSIONS.PRODUITS_CREER, PERMISSIONS.PRODUITS_MODIFIER, PERMISSIONS.PRODUITS_SUPPRIMER, PERMISSIONS.PRODUITS_PRIX,
        PERMISSIONS.SERVICES_VOIR, PERMISSIONS.SERVICES_CREER, PERMISSIONS.SERVICES_MODIFIER, PERMISSIONS.SERVICES_SUPPRIMER,
        PERMISSIONS.COMMANDES_VOIR, PERMISSIONS.COMMANDES_CREER, PERMISSIONS.COMMANDES_MODIFIER, PERMISSIONS.COMMANDES_ANNULER,
        PERMISSIONS.CLIENTS_VOIR, PERMISSIONS.CLIENTS_CREER, PERMISSIONS.CLIENTS_MODIFIER,
        PERMISSIONS.PARTENAIRES_VOIR, PERMISSIONS.PARTENAIRES_CREER, PERMISSIONS.PARTENAIRES_MODIFIER,
        PERMISSIONS.STOCK_VOIR, PERMISSIONS.STOCK_MODIFIER, PERMISSIONS.STOCK_TRANSFERT, PERMISSIONS.STOCK_INVENTAIRE,
        PERMISSIONS.VENTES_VOIR, PERMISSIONS.VENTES_CREER,
        PERMISSIONS.PAIEMENTS_VOIR, PERMISSIONS.PAIEMENTS_CREER,
        PERMISSIONS.FACTURES_VOIR, PERMISSIONS.FACTURES_CREER,
        PERMISSIONS.DEVIS_VOIR, PERMISSIONS.DEVIS_CREER,
        PERMISSIONS.ACHATS_VOIR, PERMISSIONS.ACHATS_CREER,
        PERMISSIONS.DEPENSES_VOIR, PERMISSIONS.DEPENSES_CREER,
        PERMISSIONS.RAPPORTS_VOIR, PERMISSIONS.RAPPORTS_EXPORT,
        PERMISSIONS.AUDIT_VOIR,
        PERMISSIONS.USERS_VOIR, PERMISSIONS.USERS_CREER, PERMISSIONS.USERS_MODIFIER,
        PERMISSIONS.PARAMS_VOIR, PERMISSIONS.PARAMS_MODIFIER,
        PERMISSIONS.IMPORT, PERMISSIONS.EXPORT,
    ],

    responsable: [
        PERMISSIONS.DOMAINES_VOIR,
        PERMISSIONS.BOUTIQUES_VOIR,
        PERMISSIONS.PRODUITS_VOIR, PERMISSIONS.PRODUITS_CREER, PERMISSIONS.PRODUITS_MODIFIER, PERMISSIONS.PRODUITS_PRIX,
        PERMISSIONS.SERVICES_VOIR, PERMISSIONS.SERVICES_CREER, PERMISSIONS.SERVICES_MODIFIER,
        PERMISSIONS.COMMANDES_VOIR, PERMISSIONS.COMMANDES_CREER, PERMISSIONS.COMMANDES_MODIFIER,
        PERMISSIONS.CLIENTS_VOIR, PERMISSIONS.CLIENTS_CREER, PERMISSIONS.CLIENTS_MODIFIER,
        PERMISSIONS.PARTENAIRES_VOIR, PERMISSIONS.PARTENAIRES_CREER,
        PERMISSIONS.STOCK_VOIR, PERMISSIONS.STOCK_MODIFIER, PERMISSIONS.STOCK_TRANSFERT,
        PERMISSIONS.VENTES_VOIR, PERMISSIONS.VENTES_CREER,
        PERMISSIONS.PAIEMENTS_VOIR, PERMISSIONS.PAIEMENTS_CREER,
        PERMISSIONS.FACTURES_VOIR, PERMISSIONS.FACTURES_CREER,
        PERMISSIONS.DEVIS_VOIR, PERMISSIONS.DEVIS_CREER,
        PERMISSIONS.ACHATS_VOIR,
        PERMISSIONS.DEPENSES_VOIR, PERMISSIONS.DEPENSES_CREER,
        PERMISSIONS.RAPPORTS_VOIR,
        PERMISSIONS.USERS_VOIR,
        PERMISSIONS.EXPORT,
    ],

    caissier: [
        PERMISSIONS.COMMANDES_VOIR, PERMISSIONS.COMMANDES_CREER,
        PERMISSIONS.CLIENTS_VOIR, PERMISSIONS.CLIENTS_CREER,
        PERMISSIONS.VENTES_VOIR, PERMISSIONS.VENTES_CREER,
        PERMISSIONS.PAIEMENTS_VOIR, PERMISSIONS.PAIEMENTS_CREER,
        PERMISSIONS.FACTURES_VOIR, PERMISSIONS.FACTURES_CREER,
        PERMISSIONS.DEVIS_VOIR, PERMISSIONS.DEVIS_CREER,
        PERMISSIONS.STOCK_VOIR,
        PERMISSIONS.PRODUITS_VOIR,
        PERMISSIONS.SERVICES_VOIR,
        PERMISSIONS.RAPPORTS_VOIR,
    ],

    operateur: [
        PERMISSIONS.PRODUITS_VOIR, PERMISSIONS.PRODUITS_MODIFIER,
        PERMISSIONS.SERVICES_VOIR, PERMISSIONS.SERVICES_MODIFIER,
        PERMISSIONS.COMMANDES_VOIR, PERMISSIONS.COMMANDES_MODIFIER,
        PERMISSIONS.STOCK_VOIR, PERMISSIONS.STOCK_MODIFIER,
        PERMISSIONS.CLIENTS_VOIR,
    ],

    graphiste: [
        PERMISSIONS.COMMANDES_VOIR, PERMISSIONS.COMMANDES_MODIFIER,
        PERMISSIONS.SERVICES_VOIR,
        PERMISSIONS.CLIENTS_VOIR,
    ],

    livreur: [
        PERMISSIONS.COMMANDES_VOIR, PERMISSIONS.COMMANDES_MODIFIER,
        PERMISSIONS.CLIENTS_VOIR,
    ],

    client: [], // Géré séparément via espace client
};

// Domaines d'activité
export const DOMAINES_TYPES = [
    { id: 'librairie',     label: 'Librairie & Papeterie',         emoji: '📚', couleur: '#3B82F6' },
    { id: 'imprimerie',    label: 'Imprimerie',                    emoji: '🖨️', couleur: '#8B5CF6' },
    { id: 'graphisme',     label: 'Graphisme',                     emoji: '🎨', couleur: '#EC4899' },
    { id: 'informatique',  label: 'Informatique',                  emoji: '💻', couleur: '#06B6D4' },
    { id: 'electronique',  label: 'Électronique & Accessoires',    emoji: '📱', couleur: '#F59E0B' },
    { id: 'mode',          label: 'Mode & Personnalisation',       emoji: '👕', couleur: '#10B981' },
    { id: 'transfert',     label: 'Transfert d\'argent',           emoji: '💸', couleur: '#EF4444' },
    { id: 'autre',         label: 'Autre activité',                emoji: '🏪', couleur: '#6B7280' },
];

// Statuts commandes
export const STATUTS_COMMANDE = {
    NOUVELLE:    { label: 'Nouvelle',     couleur: 'blue',   emoji: '🆕' },
    CONFIRMEE:   { label: 'Confirmée',    couleur: 'cyan',   emoji: '✅' },
    PREPARATION: { label: 'En préparation', couleur: 'yellow', emoji: '⚙️' },
    PRODUCTION:  { label: 'En production', couleur: 'orange', emoji: '🏭' },
    PRETE:       { label: 'Prête',        couleur: 'green',  emoji: '📦' },
    LIVREE:      { label: 'Livrée',       couleur: 'teal',   emoji: '🚚' },
    TERMINEE:    { label: 'Terminée',     couleur: 'emerald',emoji: '🎉' },
    ANNULEE:     { label: 'Annulée',      couleur: 'red',    emoji: '❌' },
};

// Statuts factures
export const STATUTS_FACTURE = {
    NON_PAYEE:       { label: 'Non payée',        couleur: 'red',    emoji: '❌' },
    PARTIELLEMENT:   { label: 'Partiellement',    couleur: 'orange', emoji: '⚠️' },
    PAYEE:           { label: 'Payée',            couleur: 'green',  emoji: '✅' },
    ANNULEE:         { label: 'Annulée',          couleur: 'gray',   emoji: '🚫' },
};

// Moyens de paiement
export const MOYENS_PAIEMENT = [
    { id: 'especes',      label: 'Espèces',       emoji: '💵' },
    { id: 'mobile_money', label: 'Mobile Money',  emoji: '📱' },
    { id: 'virement',     label: 'Virement',      emoji: '🏦' },
    { id: 'carte',        label: 'Carte',         emoji: '💳' },
    { id: 'autre',        label: 'Autre',         emoji: '💰' },
];

// Numérotation des documents
export const NUMEROTATION = {
    FACTURE: 'NS-FAC',
    DEVIS:   'NS-DEV',
    BON_CMD: 'NS-BC',
    BON_LIV: 'NS-BL',
    AVOIR:   'NS-AV',
};

// Collections Firestore
export const COLLECTIONS = {
    ENTREPRISE:   'entreprise',
    DOMAINES:     'domaines',
    BOUTIQUES:    'boutiques',
    UTILISATEURS: 'utilisateurs',
    CLIENTS:      'clients',
    PARTENAIRES:  'partenaires',
    PRODUITS:     'produits',
    SERVICES:     'services',
    COMMANDES:    'commandes',
    FACTURES:     'factures',
    DEVIS:        'devis',
    PAIEMENTS:    'paiements',
    STOCK:        'stock',
    MOUVEMENTS:   'mouvements_stock',
    ACHATS:       'achats',
    DEPENSES:     'depenses',
    AUDIT:        'audit',
    NOTIFICATIONS:'notifications',
    PARAMETRES:   'parametres',
    SAUVEGARDES:  'sauvegardes',
    PANIERS:      'paniers',
};

// Types d'événements d'audit
export const AUDIT_ACTIONS = {
    CONNEXION:      'connexion',
    DECONNEXION:    'deconnexion',
    CREATION:       'creation',
    MODIFICATION:   'modification',
    SUPPRESSION:    'suppression',
    ARCHIVAGE:      'archivage',
    RESTAURATION:   'restauration',
    EXPORT:         'export',
    IMPORT:         'import',
    PAIEMENT:       'paiement',
    PERMISSION:     'permission',
    PARAMETRE:      'parametre',
    ACTIVATION:     'activation',
    DESACTIVATION:  'desactivation',
    TRANSFERT:      'transfert_stock',
    INVENTAIRE:     'inventaire',
};

// Limites de fichiers
export const FICHIERS = {
    IMAGE_MAX_SIZE:   5 * 1024 * 1024,  // 5MB
    VIDEO_MAX_SIZE:   100 * 1024 * 1024, // 100MB
    DOC_MAX_SIZE:     10 * 1024 * 1024,  // 10MB
    IMAGE_TYPES:      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    VIDEO_TYPES:      ['video/mp4', 'video/webm', 'video/avi', 'video/mov'],
    DOC_TYPES:        ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Thèmes couleurs
export const COULEURS = {
    primary:   '#0F2D6B', // Bleu marine NANA SERVICE
    secondary: '#FF6B00', // Orange NANA SERVICE
    accent:    '#FFFFFF', // Blanc
    success:   '#10B981',
    warning:   '#F59E0B',
    danger:    '#EF4444',
    info:      '#3B82F6',
};

// Sons disponibles
export const SONS = {
    NOUVELLE_COMMANDE:  'nouvelle_commande',
    CONFIRMATION:       'confirmation',
    COMMANDE_PRETE:     'commande_prete',
    PAIEMENT:           'paiement',
    ERREUR:             'erreur',
    STOCK_FAIBLE:       'stock_faible',
    LIVRAISON:          'livraison',
    NOTIFICATION:       'notification',
};

export default {
    ENTREPRISE_DEFAUT,
    ROLES,
    ROLES_LABELS,
    PERMISSIONS,
    PERMISSIONS_PAR_ROLE,
    DOMAINES_TYPES,
    STATUTS_COMMANDE,
    STATUTS_FACTURE,
    MOYENS_PAIEMENT,
    NUMEROTATION,
    COLLECTIONS,
    AUDIT_ACTIONS,
    FICHIERS,
    COULEURS,
    SONS,
};