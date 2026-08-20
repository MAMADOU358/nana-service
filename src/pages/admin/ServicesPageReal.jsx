import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Loader';
import {
    ecouterServices, creerService, mettreAJourService,
    supprimerService, toggleService
} from '../../services/serviceService';
import { uploaderImageProduit } from '../../services/uploadService';
import { PERMISSIONS } from '../../config/constants';

const CATEGORIES_SUGGERES = [
    'Impression', 'Graphisme', 'Photo', 'Personnalisation',
    'Documents', 'Informatique', 'Formation', 'Autre',
];

const EMOJIS_SERVICES = [
    '⚙️','🖨️','🎨','📸','👕','📄','💻','🎓','📱','🖥️','🎁','🎉','📐','✏️','🖌️','🎭'
];

const ServicesPage = () => {
    const { profil, aPermission } = useAuth();
    const { entreprise, domaines } = useApp();
    const toast = useToast();

    const [services, setServices]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [recherche, setRecherche]       = useState('');
    const [filtreDomaine, setFiltreDomaine] = useState('');
    const [filtreCateg, setFiltreCateg]   = useState('');

    // Modals
    const [modalForm, setModalForm]       = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [serviceEdite, setServiceEdite] = useState(null);
    const [serviceSuppr, setServiceSuppr] = useState(null);
    const [loadingForm, setLoadingForm]   = useState(false);
    const [loadingImg, setLoadingImg]     = useState(false);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            nom: '', reference: '', description: '',
            categorie: '', domaineId: '', domaineLabel: '',
            prix: '', prixAchat: '', unite: 'service',
            duree: '', emoji: '⚙️', imageUrl: '',
            actif: true, visibleClient: true,
            populaire: false, nouveau: false,
        };
    }

    // Charger services
    useEffect(() => {
        const filtres = {};
        if (filtreDomaine) filtres.domaineId = filtreDomaine;

        const unsub = ecouterServices(data => {
            setServices(data);
            setLoading(false);
        }, filtres);
        return () => unsub();
    }, [filtreDomaine]);

    // Filtrer
    const servicesFiltres = services.filter(s => {
        if (filtreCateg && s.categorie !== filtreCateg) return false;
        if (recherche) {
            const t = recherche.toLowerCase();
            if (!((s.nom || '').toLowerCase().includes(t) ||
                  (s.description || '').toLowerCase().includes(t) ||
                  (s.reference || '').toLowerCase().includes(t))) return false;
        }
        return true;
    });

    const categories = [...new Set(services.map(s => s.categorie).filter(Boolean))];
    const totalPrix  = services.filter(s => s.actif).reduce((sum, s) => sum + (s.prix || 0), 0);
    const devise     = entreprise?.devise || 'GNF';

    // Ouvrir formulaire
    const ouvrirForm = (service = null) => {
        if (service) {
            setServiceEdite(service);
            setForm({
                nom:           service.nom || '',
                reference:     service.reference || '',
                description:   service.description || '',
                categorie:     service.categorie || '',
                domaineId:     service.domaineId || '',
                domaineLabel:  service.domaineLabel || '',
                prix:          service.prix || '',
                prixAchat:     service.prixAchat || '',
                unite:         service.unite || 'service',
                duree:         service.duree || '',
                emoji:         service.emoji || '⚙️',
                imageUrl:      service.imageUrl || '',
                actif:         service.actif !== false,
                visibleClient: service.visibleClient !== false,
                populaire:     service.populaire || false,
                nouveau:       service.nouveau || false,
            });
        } else {
            setServiceEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    // Upload image
    const handleImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const result = await uploaderImageProduit(file, form.nom || 'service');
            setForm(p => ({ ...p, imageUrl: result.url }));
            toast.success('Image uploadée !');
        } catch (err) {
            toast.error('Erreur upload', err.message);
        } finally {
            setLoadingImg(false);
        }
    };

    // Soumettre
    const handleSubmit = async () => {
        if (!form.nom.trim()) { toast.warning('Nom requis'); return; }
        if (!form.prix || parseFloat(form.prix) < 0) { toast.warning('Prix requis'); return; }

        setLoadingForm(true);
        try {
            if (serviceEdite) {
                await mettreAJourService(serviceEdite.id, form, profil?.uid);
                toast.success('Service modifié !', form.nom);
            } else {
                await creerService(form, profil?.uid);
                toast.success('Service créé !', form.nom);
            }
            setModalForm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    // Supprimer
    const handleSupprimer = async () => {
        try {
            await supprimerService(serviceSuppr.id, profil?.uid);
            toast.success('Service supprimé', serviceSuppr.nom);
            setModalConfirm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    // Toggle
    const handleToggle = async (service) => {
        try {
            await toggleService(service.id, !service.actif);
            toast.info(!service.actif ? '✅ Service activé' : '❌ Service désactivé', service.nom);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const peutCreer    = aPermission(PERMISSIONS.SERVICES_CREER);
    const peutModifier = aPermission(PERMISSIONS.SERVICES_MODIFIER);
    const peutSuppr    = aPermission(PERMISSIONS.SERVICES_SUPPRIMER);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap',
                gap: 12, marginBottom: 24,
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        ⚙️ Services
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {services.length} service{services.length > 1 ? 's' : ''} configuré{services.length > 1 ? 's' : ''}
                    </p>
                </div>
                {peutCreer && (
                    <button
                        onClick={() => ouvrirForm()}
                        style={{
                            padding: '11px 22px',
                            background: 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                            color: 'white', border: 'none', borderRadius: 12,
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 4px 14px rgba(15,45,107,0.3)',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        ➕ Nouveau service
                    </button>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14, marginBottom: 24,
            }}>
                <StatCard icon="⚙️" label="Total services"    value={services.length} couleur="primary" />
                <StatCard icon="✅" label="Actifs"             value={services.filter(s => s.actif).length} couleur="success" />
                <StatCard icon="👁️" label="Visibles clients"   value={services.filter(s => s.visibleClient).length} couleur="info" />
                <StatCard icon="🔥" label="Populaires"          value={services.filter(s => s.populaire).length} couleur="warning" />
            </div>

            {/* Filtres */}
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: 16,
                border: '1px solid var(--border)', marginBottom: 20,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input
                        type="search"
                        placeholder="Rechercher un service..."
                        value={recherche}
                        onChange={e => setRecherche(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px 10px 40px',
                            border: '2px solid var(--border)', borderRadius: 10,
                            fontSize: 14, background: 'var(--bg)', color: 'var(--text)',
                            outline: 'none', fontFamily: 'Inter, sans-serif',
                        }}
                    />
                </div>
                <select
                    value={filtreDomaine}
                    onChange={e => setFiltreDomaine(e.target.value)}
                    style={inputStyle}
                >
                    <option value="">Tous les domaines</option>
                    {domaines.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.nom}</option>)}
                </select>
                <select
                    value={filtreCateg}
                    onChange={e => setFiltreCateg(e.target.value)}
                    style={inputStyle}
                >
                    <option value="">Toutes catégories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Grille services */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} height={280} borderRadius={14} />)}
                </div>
            ) : servicesFiltres.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 20px',
                    background: 'var(--card)', borderRadius: 14,
                    border: '2px dashed var(--border)',
                }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>⚙️</div>
                    <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                        {recherche ? 'Aucun service trouvé' : 'Aucun service configuré'}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                        {recherche
                            ? `Aucun résultat pour "${recherche}"`
                            : 'Créez votre premier service pour commencer'}
                    </p>
                    {peutCreer && !recherche && (
                        <button
                            onClick={() => ouvrirForm()}
                            style={{
                                padding: '11px 22px', background: '#0F2D6B',
                                color: 'white', border: 'none', borderRadius: 10,
                                cursor: 'pointer', fontSize: 14, fontWeight: 700,
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            ➕ Créer un service
                        </button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 16,
                }}>
                    {servicesFiltres.map(s => (
                        <div key={s.id} style={{
                            background: 'var(--card)', borderRadius: 14,
                            overflow: 'hidden', border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            display: 'flex', flexDirection: 'column',
                            opacity: s.actif ? 1 : 0.6,
                            transition: 'all 0.25s',
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                        }}
                        >
                            {/* Image / Emoji */}
                            <div style={{
                                height: 160, position: 'relative',
                                background: s.imageUrl ? 'transparent' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 64, color: 'white', overflow: 'hidden',
                            }}>
                                {s.imageUrl
                                    ? <img src={s.imageUrl} alt={s.nom} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                    : s.emoji || '⚙️'}

                                {/* Badges */}
                                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 5, flexDirection: 'column' }}>
                                    {s.populaire && (
                                        <span style={{
                                            background: '#FF6B00', color: 'white',
                                            padding: '3px 10px', borderRadius: 20,
                                            fontSize: 11, fontWeight: 700,
                                        }}>🔥 Populaire</span>
                                    )}
                                    {s.nouveau && (
                                        <span style={{
                                            background: '#3B82F6', color: 'white',
                                            padding: '3px 10px', borderRadius: 20,
                                            fontSize: 11, fontWeight: 700,
                                        }}>✨ Nouveau</span>
                                    )}
                                </div>

                                {/* Status */}
                                {!s.actif && (
                                    <div style={{
                                        position: 'absolute', bottom: 10, right: 10,
                                        background: '#EF4444', color: 'white',
                                        padding: '4px 12px', borderRadius: 20,
                                        fontSize: 11, fontWeight: 700,
                                    }}>❌ Inactif</div>
                                )}
                            </div>

                            {/* Contenu */}
                            <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    fontSize: 11, color: '#FF6B00', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                                }}>
                                    {s.categorie || s.domaineLabel || 'Service'}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>
                                    {s.nom}
                                </div>
                                {s.description && (
                                    <div style={{
                                        fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
                                        marginBottom: 12,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}>
                                        {s.description}
                                    </div>
                                )}

                                {/* Prix */}
                                <div style={{ marginTop: 'auto', marginBottom: 12 }}>
                                    <div style={{ fontWeight: 900, fontSize: 22, color: '#0F2D6B' }}>
                                        {(s.prix || 0).toLocaleString('fr-FR')} {devise}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                        par {s.unite}
                                        {s.duree && ` • ⏱ ${s.duree} min`}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    {peutModifier && (
                                        <>
                                            <button
                                                onClick={() => handleToggle(s)}
                                                style={{
                                                    flex: 1, padding: '8px',
                                                    background: s.actif ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: s.actif ? '#EF4444' : '#10B981',
                                                    border: 'none', borderRadius: 8,
                                                    fontSize: 12, fontWeight: 700,
                                                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                                }}
                                            >
                                                {s.actif ? '❌ Désactiver' : '✅ Activer'}
                                            </button>
                                            <button
                                                onClick={() => ouvrirForm(s)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(15,45,107,0.1)', color: '#0F2D6B',
                                                    border: 'none', borderRadius: 8, cursor: 'pointer',
                                                    fontSize: 13, fontFamily: 'Inter, sans-serif',
                                                }}
                                            >
                                                ✏️
                                            </button>
                                        </>
                                    )}
                                    {peutSuppr && (
                                        <button
                                            onClick={() => { setServiceSuppr(s); setModalConfirm(true); }}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                                                border: 'none', borderRadius: 8, cursor: 'pointer',
                                                fontSize: 13, fontFamily: 'Inter, sans-serif',
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL FORMULAIRE */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={serviceEdite ? `✏️ Modifier — ${serviceEdite.nom}` : '➕ Nouveau service'}
                icon="⚙️"
                size="lg"
                footer={
                    <>
                        <button onClick={() => setModalForm(false)} style={btnCancelStyle}>
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loadingForm}
                            style={btnPrimaryStyle(loadingForm)}
                        >
                            {loadingForm ? '⏳ Sauvegarde...' : (serviceEdite ? '💾 Modifier' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Image + Emoji */}
                    <div style={{
                        display: 'flex', gap: 16, padding: 14,
                        background: 'var(--gray-50)', borderRadius: 12,
                        border: '1px dashed var(--border)',
                    }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 12,
                            background: form.imageUrl ? 'transparent' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 36, color: 'white', overflow: 'hidden', flexShrink: 0,
                        }}>
                            {form.imageUrl
                                ? <img src={form.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                : form.emoji}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                                Image ou emoji
                            </div>
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px',
                                background: loadingImg ? '#9CA3AF' : '#0F2D6B',
                                color: 'white', borderRadius: 8,
                                cursor: loadingImg ? 'wait' : 'pointer',
                                fontSize: 12, fontWeight: 600, marginBottom: 6,
                            }}>
                                {loadingImg ? '⏳...' : '📷 Image'}
                                <input type="file" accept="image/*" onChange={handleImage} disabled={loadingImg} style={{ display: 'none' }} />
                            </label>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                {EMOJIS_SERVICES.map(e => (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, emoji: e }))}
                                        style={{
                                            width: 32, height: 32, fontSize: 18,
                                            border: `2px solid ${form.emoji === e ? '#0F2D6B' : 'transparent'}`,
                                            borderRadius: 8, cursor: 'pointer',
                                            background: 'white',
                                        }}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Nom + Référence */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                        <div>
                            <label style={labStyle}>Nom du service *</label>
                            <input
                                type="text"
                                value={form.nom}
                                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                                placeholder="Ex: Impression A4 Couleur"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labStyle}>Référence</label>
                            <input
                                type="text"
                                value={form.reference}
                                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                                placeholder="Auto-générée"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Catégorie + Domaine */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={labStyle}>Catégorie *</label>
                            <input
                                type="text"
                                value={form.categorie}
                                onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                                placeholder="Ex: Impression"
                                list="cats-list"
                                style={inputStyle}
                            />
                            <datalist id="cats-list">
                                {CATEGORIES_SUGGERES.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label style={labStyle}>Domaine</label>
                            <select
                                value={form.domaineId}
                                onChange={e => {
                                    const d = domaines.find(x => x.id === e.target.value);
                                    setForm(p => ({
                                        ...p, domaineId: e.target.value,
                                        domaineLabel: d?.nom || '',
                                    }));
                                }}
                                style={inputStyle}
                            >
                                <option value="">Aucun domaine</option>
                                {domaines.map(d => (
                                    <option key={d.id} value={d.id}>{d.emoji} {d.nom}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label style={labStyle}>Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Description détaillée du service..."
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    {/* Prix */}
                    <div style={{
                        padding: 16, background: 'rgba(16,185,129,0.05)',
                        borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#065F46', marginBottom: 12 }}>
                            💰 Tarification
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labStyle}>Prix de vente * ({devise})</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.prix}
                                    onChange={e => setForm(p => ({ ...p, prix: e.target.value }))}
                                    placeholder="0"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labStyle}>Coût de revient</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.prixAchat}
                                    onChange={e => setForm(p => ({ ...p, prixAchat: e.target.value }))}
                                    placeholder="Optionnel"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labStyle}>Unité</label>
                                <input
                                    type="text"
                                    value={form.unite}
                                    onChange={e => setForm(p => ({ ...p, unite: e.target.value }))}
                                    placeholder="service, page..."
                                    list="unites"
                                    style={inputStyle}
                                />
                                <datalist id="unites">
                                    {['service','page','unité','heure','pièce','lot'].map(u => <option key={u} value={u} />)}
                                </datalist>
                            </div>
                        </div>

                        {form.prix && form.prixAchat && (
                            <div style={{
                                marginTop: 10, padding: '8px 12px',
                                background: 'rgba(255,255,255,0.5)', borderRadius: 8,
                                fontSize: 12, color: 'var(--text2)',
                                display: 'flex', justifyContent: 'space-between',
                            }}>
                                <span>Marge brute :</span>
                                <strong style={{ color: '#10B981' }}>
                                    {(parseFloat(form.prix) - parseFloat(form.prixAchat)).toLocaleString('fr-FR')} {devise}
                                    {' '}({(((parseFloat(form.prix) - parseFloat(form.prixAchat)) / parseFloat(form.prix)) * 100).toFixed(1)}%)
                                </strong>
                            </div>
                        )}
                    </div>

                    {/* Durée */}
                    <div>
                        <label style={labStyle}>⏱ Durée d'exécution (minutes, optionnel)</label>
                        <input
                            type="number"
                            min="0"
                            value={form.duree}
                            onChange={e => setForm(p => ({ ...p, duree: e.target.value }))}
                            placeholder="Ex: 15"
                            style={inputStyle}
                        />
                    </div>

                    {/* Options */}
                    <div style={{
                        padding: 14, background: 'var(--gray-50)',
                        borderRadius: 12, border: '1px solid var(--border)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⚙️ Options</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                                { key: 'actif',         label: '✅ Service actif' },
                                { key: 'visibleClient', label: '👁️ Visible par les clients' },
                                { key: 'populaire',     label: '🔥 Populaire' },
                                { key: 'nouveau',       label: '✨ Nouveau' },
                            ].map(opt => (
                                <label key={opt.key} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    padding: '8px 10px', background: 'white',
                                    borderRadius: 8, border: '1px solid var(--border)',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={form[opt.key]}
                                        onChange={e => setForm(p => ({ ...p, [opt.key]: e.target.checked }))}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL CONFIRMATION */}
            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleSupprimer}
                title="Supprimer ce service ?"
                message={`Le service "${serviceSuppr?.nom}" sera supprimé définitivement.`}
                confirmText="Supprimer"
                type="danger"
                motConfirmation="SUPPRIMER"
            />
        </div>
    );
};

// Styles
const labStyle = {
    fontSize: 13, fontWeight: 600, display: 'block',
    marginBottom: 5, color: 'var(--text)',
};

const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '2px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
};

const btnCancelStyle = {
    padding: '10px 20px', border: '2px solid var(--border)',
    borderRadius: 10, background: 'var(--card)', color: 'var(--text)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
};

const btnPrimaryStyle = (loading) => ({
    padding: '10px 24px',
    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
    color: 'white', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'Inter, sans-serif',
});

export default ServicesPage;