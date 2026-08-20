import React from 'react';

/* ═══════════════════════════════════════════════
   PAGE PLACEHOLDER GÉNÉRIQUE
   Pour toutes les pages pas encore développées
═══════════════════════════════════════════════ */

const PlaceholderPage = ({ 
    titre       = 'Page en construction', 
    emoji       = '🚧',
    description = 'Cette section sera bientôt disponible',
    fonctions   = [],
}) => {
    return (
        <div style={{
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            minHeight:       'calc(100vh - 200px)',
            padding:         40,
            fontFamily:      'Inter, sans-serif',
        }}>
            <div style={{
                background:    'var(--card)',
                borderRadius:  24,
                padding:       '50px 40px',
                border:        '2px dashed var(--border)',
                textAlign:     'center',
                maxWidth:      560,
                width:         '100%',
                boxShadow:     '0 8px 24px rgba(0,0,0,0.08)',
            }}>
                {/* Emoji animé */}
                <div style={{
                    fontSize:      80,
                    marginBottom:  20,
                    animation:     'bounce 2s infinite',
                }}>
                    {emoji}
                </div>
                
                {/* Titre */}
                <h1 style={{
                    fontSize:      28,
                    fontWeight:    800,
                    color:         'var(--text)',
                    marginBottom:  12,
                }}>
                    {titre}
                </h1>
                
                {/* Description */}
                <p style={{
                    fontSize:      15,
                    color:         'var(--text2)',
                    lineHeight:    1.6,
                    marginBottom:  24,
                }}>
                    {description}
                </p>

                {/* Badge */}
                <div style={{
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:           8,
                    padding:       '10px 20px',
                    background:    'rgba(255,107,0,0.1)',
                    border:        '1px solid rgba(255,107,0,0.3)',
                    borderRadius:  20,
                    color:         '#FF6B00',
                    fontSize:      13,
                    fontWeight:    700,
                    marginBottom:  30,
                }}>
                    ⚡ Prochainement disponible
                </div>

                {/* Fonctionnalités prévues */}
                {fonctions.length > 0 && (
                    <div style={{
                        paddingTop:   24,
                        borderTop:    '1px solid var(--border)',
                        textAlign:    'left',
                    }}>
                        <p style={{
                            fontWeight:    700,
                            marginBottom:  12,
                            fontSize:      14,
                            color:         'var(--text)',
                            textAlign:     'center',
                        }}>
                            📋 Fonctionnalités prévues
                        </p>
                        <div style={{
                            display:              'grid',
                            gridTemplateColumns:  'repeat(auto-fill, minmax(200px, 1fr))',
                            gap:                  8,
                        }}>
                            {fonctions.map((f, i) => (
                                <div key={i} style={{
                                    padding:      '10px 12px',
                                    background:   'var(--gray-50)',
                                    borderRadius: 8,
                                    fontSize:     12,
                                    color:        'var(--text2)',
                                    display:      'flex',
                                    alignItems:   'center',
                                    gap:          6,
                                    border:       '1px solid var(--border)',
                                }}>
                                    <span style={{ color: '#10B981' }}>✓</span> {f}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info */}
                <div style={{
                    marginTop:    24,
                    padding:      '12px 16px',
                    background:   'rgba(15,45,107,0.05)',
                    borderRadius: 10,
                    fontSize:     12,
                    color:        'var(--text2)',
                    lineHeight:   1.5,
                }}>
                    💡 Cette page fait partie de la roadmap NANA SERVICE PRO.
                    Elle sera implémentée dans une prochaine version.
                </div>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50%       { transform: translateY(-15px); }
                }
            `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════
// PAGES PRÉCONFIGURÉES
// ═══════════════════════════════════════════════

export const ServicesPage = () => (
    <PlaceholderPage 
        titre="⚙️ Services"
        emoji="⚙️"
        description="Gérez les services proposés par NANA SERVICE (imprimerie, graphisme, informatique...)"
        fonctions={[
            'Configuration services',
            'Prix personnalisés',
            'Formats et options',
            'Impression A4/A3',
            'Cartes de visite',
            'Flyers & affiches',
            'CV & documents',
            'Photos d\'identité',
            'T-shirts personnalisés',
        ]}
    />
);

export const BoutiquesPage = () => (
    <PlaceholderPage 
        titre="🏪 Boutiques & Emplacements"
        emoji="🏪"
        description="Gérez vos points de vente et emplacements physiques"
        fonctions={[
            'Multi-emplacements',
            'Stock par boutique',
            'Employés affectés',
            'Ventes par boutique',
            'Transferts stock',
            'Vue globale',
        ]}
    />
);

export const PartenairesPage = () => (
    <PlaceholderPage 
        titre="🤝 Partenaires & Fournisseurs"
        emoji="🤝"
        description="Gérez vos partenaires commerciaux et fournisseurs"
        fonctions={[
            'Fiches partenaires',
            'Contacts & documents',
            'Produits fournis',
            'Prix négociés',
            'Historique achats',
            'Paiements & soldes',
        ]}
    />
);

export const VentesPage = () => (
    <PlaceholderPage 
        titre="💰 Ventes & Caisse"
        emoji="💰"
        description="Suivi et analyse des ventes en temps réel"
        fonctions={[
            'Encaissements du jour',
            'Historique des ventes',
            'Ventes par produit',
            'Ventes par boutique',
            'Rapports détaillés',
            'Export Excel/PDF',
        ]}
    />
);

export const DevisPage = () => (
    <PlaceholderPage 
        titre="📝 Devis"
        emoji="📝"
        description="Créez et gérez les devis pour vos clients"
        fonctions={[
            'Créer un devis',
            'Templates prédéfinis',
            'Conversion en facture',
            'Envoi par email',
            'Suivi validation',
            'PDF téléchargeable',
        ]}
    />
);

export const AchatsPage = () => (
    <PlaceholderPage 
        titre="🛒 Achats Fournisseurs"
        emoji="🛒"
        description="Gérez les achats et approvisionnements"
        fonctions={[
            'Bons de commande',
            'Réceptions marchandises',
            'Paiements fournisseurs',
            'Historique achats',
            'Prix par fournisseur',
            'Suivi livraisons',
        ]}
    />
);

export const DepensesPage = () => (
    <PlaceholderPage 
        titre="💸 Dépenses"
        emoji="💸"
        description="Suivez toutes les dépenses de l'entreprise"
        fonctions={[
            'Enregistrer dépense',
            'Catégories personnalisées',
            'Dépenses par boutique',
            'Justificatifs (photos)',
            'Rapports par période',
            'Analyse budgétaire',
        ]}
    />
);

export const AuditPage = () => (
    <PlaceholderPage 
        titre="🔍 Audit & Historique"
        emoji="🔍"
        description="Consultez l'historique de toutes les actions effectuées"
        fonctions={[
            'Journal des connexions',
            'Historique modifications',
            'Suppressions tracées',
            'Filtres par utilisateur',
            'Filtres par action',
            'Export logs',
        ]}
    />
);

export default PlaceholderPage;