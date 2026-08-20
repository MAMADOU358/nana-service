import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Loader from './components/common/Loader';
import PanierFlottant from './components/common/PanierFlottant';
import BoutonAccueil  from './components/common/BoutonAccueil';


import './App.css';

// Pages publiques
const HomePublic       = lazy(() => import('./pages/public/HomePublic'));
const CataloguePublic  = lazy(() => import('./pages/public/CataloguePublic'));
const InscriptionPage  = lazy(() => import('./pages/public/InscriptionPage'));
const PanierPublicPage = lazy(() => import('./pages/public/PanierPublic'));

// Lazy loading des pages
const LoginPage     = lazy(() => import('./pages/auth/LoginPage'));
const ResetPage     = lazy(() => import('./pages/auth/ResetPage'));
const AdminLayout   = lazy(() => import('./layouts/AdminLayout'));
const ClientLayout  = lazy(() => import('./layouts/ClientLayout'));

// ═══════════════════════════════════════════════
// PAGES ADMIN
// ═══════════════════════════════════════════════

// Pages CRÉÉES (vraies pages)
const DashboardPage   = lazy(() => import('./pages/admin/DashboardPage'));
const DomainesPage    = lazy(() => import('./pages/admin/DomainesPage'));
const ProduitsPage    = lazy(() => import('./pages/admin/ProduitsPage'));
const CommandesPage   = lazy(() => import('./pages/admin/CommandesPage'));
const ClientsPage     = lazy(() => import('./pages/admin/ClientsPage'));
const StockPage       = lazy(() => import('./pages/admin/StockPage'));
const FacturesPage    = lazy(() => import('./pages/admin/FacturesPage'));
const RapportsPage    = lazy(() => import('./pages/admin/RapportsPage'));
const UsersPage       = lazy(() => import('./pages/admin/UsersPage'));
const ParametresPage  = lazy(() => import('./pages/admin/ParametresPage'));
const SauvegardesPage = lazy(() => import('./pages/admin/SauvegardesPage'));

// Pages VRAIES (créées récemment - remplacent les placeholders)
const ServicesPage    = lazy(() => import('./pages/admin/ServicesPageReal'));
const DevisPage       = lazy(() => import('./pages/admin/DevisPageReal'));
const DepensesPage    = lazy(() => import('./pages/admin/DepensesPageReal'));
const BoutiquesPage   = lazy(() => import('./pages/admin/BoutiquesPageReal'));
const PartenairesPage = lazy(() => import('./pages/admin/PartenairesPageReal'));
const AchatsPage      = lazy(() => import('./pages/admin/AchatsPageReal'));
const VentesPage      = lazy(() => import('./pages/admin/VentesPageReal'));
const AuditPage       = lazy(() => import('./pages/admin/AuditPageReal'));
const ZoneDangereusePage = lazy(() => import('./pages/admin/ResetPage'));
// Pages client
const ClientHomePage      = lazy(() => import('./pages/client/HomePage'));
const ClientCataloguePage = lazy(() => import('./pages/client/CataloguePage'));
const ClientPanierPage    = lazy(() => import('./pages/client/PanierPage'));
const ClientCommandePage  = lazy(() => import('./pages/client/CommandePage'));
const ClientProfilPage    = lazy(() => import('./pages/client/ProfilPage'));

// Route protégée admin
const AdminRoute = ({ children }) => {
    const { estConnecte, estClient, loading } = useAuth();
    if (loading) return <Loader fullscreen />;
    if (!estConnecte) return <Navigate to="/login" replace />;
    if (estClient) return <Navigate to="/mon-espace" replace />;
    return children;
};

// Route protégée client
const ClientRoute = ({ children }) => {
    const { estConnecte, loading } = useAuth();
    if (loading) return <Loader fullscreen />;
    if (!estConnecte) return <Navigate to="/login" replace />;
    return children;
};

// Route publique (non connecté)
const PublicRoute = ({ children }) => {
    const { estConnecte, estClient, loading } = useAuth();
    if (loading) return <Loader fullscreen />;
    if (estConnecte) {
        return estClient
            ? <Navigate to="/mon-espace" replace />
            : <Navigate to="/admin" replace />;
    }
    return children;
};

// App principale
function App() {
    return (
        <Router>
            <AuthProvider>
                <AppProvider>
                    <Suspense fallback={<Loader fullscreen message="Chargement..." />}>
                        <Routes>

                            {/* Routes publiques */}
                            <Route path="/login" element={
                                <PublicRoute><LoginPage /></PublicRoute>
                            } />
                            <Route path="/reset-password" element={
                                <PublicRoute><ResetPage /></PublicRoute>
                            } />

                            {/* Routes admin */}
                            <Route path="/admin" element={
                                <AdminRoute><AdminLayout /></AdminRoute>
                            }>
                                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                                <Route path="dashboard"   element={<DashboardPage />} />
                                <Route path="domaines"    element={<DomainesPage />} />
                                <Route path="boutiques"   element={<BoutiquesPage />} />
                                <Route path="produits"    element={<ProduitsPage />} />
                                <Route path="services"    element={<ServicesPage />} />
                                <Route path="commandes"   element={<CommandesPage />} />
                                <Route path="clients"     element={<ClientsPage />} />
                                <Route path="partenaires" element={<PartenairesPage />} />
                                <Route path="stock"       element={<StockPage />} />
                                <Route path="ventes"      element={<VentesPage />} />
                                <Route path="factures"    element={<FacturesPage />} />
                                <Route path="devis"       element={<DevisPage />} />
                                <Route path="achats"      element={<AchatsPage />} />
                                <Route path="depenses"    element={<DepensesPage />} />
                                <Route path="rapports"    element={<RapportsPage />} />
                                <Route path="audit"       element={<AuditPage />} />
                                <Route path="utilisateurs" element={<UsersPage />} />
                                <Route path="parametres"  element={<ParametresPage />} />
<Route path="reset" element={<ZoneDangereusePage />} />
<Route path="sauvegardes" element={<SauvegardesPage />} />
                            </Route>

                            {/* Routes espace client */}
                            <Route path="/mon-espace" element={
                                <ClientRoute><ClientLayout /></ClientRoute>
                            }>
                                <Route index element={<ClientHomePage />} />
                                <Route path="catalogue"  element={<ClientCataloguePage />} />
                                <Route path="panier"     element={<ClientPanierPage />} />
                                <Route path="commandes"  element={<ClientCommandePage />} />
                                <Route path="profil"     element={<ClientProfilPage />} />
                            </Route>

                            
                            {/* Routes publiques (sans connexion) */}
<Route path="/"             element={<HomePublic />} />
<Route path="/catalogue"    element={<CataloguePublic />} />
<Route path="/inscription"  element={<InscriptionPage />} />
<Route path="/panier-public" element={<PanierPublicPage />} />

                            {/* 404 */}
                            <Route path="*" element={
                                <div style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    minHeight: '100vh', gap: '16px',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    <div style={{ fontSize: 80 }}>🔍</div>
                                    <h1 style={{ fontSize: 24, fontWeight: 800 }}>Page introuvable</h1>
                                    <p style={{ color: '#6B7280' }}>La page que vous cherchez n'existe pas.</p>
                                    <a href="/admin" style={{
                                        padding: '10px 24px', background: '#0F2D6B',
                                        color: 'white', borderRadius: 10,
                                        textDecoration: 'none', fontWeight: 600
                                    }}>Retour à l'accueil</a>
                                </div>
                            } />

                        </Routes>
 				<BoutonAccueil />
                    
                        <PanierFlottant />
                    </Suspense>
                </AppProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;