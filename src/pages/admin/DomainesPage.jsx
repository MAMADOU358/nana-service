import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Loader';
import {
    ecouterDomaines, creerDomaine,
    mettreAJourDomaine, toggleDomaine, archiverDomaine
} from '../../services/domaineService';
import { uploaderLogo } from '../../services/uploadService';
import { PERMISSIONS, DOMAINES_TYPES } from '../../config/constants';

const EMOJIS_DOMAINES = ['📚','🖨️','🎨','💻','📱','👕','💸','📸','🏪','📋','🔧','📦'];

const DomainesPage = () => {
    const { profil, aPermission } = useAuth();
    const toast = useToast();

    const [domaines, setDomaines]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [modalForm, setModalForm]     = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [domaineEdite, setDomaineEdite] = useState(null);
    const [domaineSuppr, setDomaineSuppr] = useState(null);
    const [loadingForm, setLoadingForm] = useState(false);
    const [loadingImg, setLoadingImg]   = useState(false);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            nom: '', description: '', slogan: '', emoji: '🏪',
            couleur: '#0F2D6B', type: 'autre',
            actif: true, visibleClient: true,
            commandesActives: true, prixVisibles: true,
            logo: null, logoUrl: '',
            labelCombine: '',
        };
    }

    useEffect(() => {
        const unsub = ecouterDomaines((data) => {
            setDomaines(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const ouvrirForm = (domaine = null) => {
        if (domaine) {
            setDomaineEdite(domaine);
            setForm({
                nom:              domaine.nom || '',
                description:      domaine.description || '',
                slogan:           domaine.slogan || '',
                emoji:            domaine.emoji || '🏪',
                couleur:          domaine.couleur || '#0F2D6B',
                type:             domaine.type || 'autre',
                actif:            domaine.actif !== false,
                visibleClient:    domaine.visibleClient !== false,
                commandesActives: domaine.commandesActives !== false,
                prixVisibles:     domaine.prixVisibles !== false,
                logo:             domaine.logo || null,
                logoUrl:          domaine.logo || '',
                labelCombine:     domaine.labelCombine || '',
            });
        } else {
            setDomaineEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    const handleUploadLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoadingImg(true);
        try {
            const result = await uploaderLogo(file, form.nom || 'domaine');
            setForm(p => ({ ...p, logo: result.url, logoUrl: result.url }));
            toast.success('Logo uploadé !');
        } catch (err) {
            toast.error('Erreur upload', err.message);
        } finally {
            setLoadingImg(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.nom.trim()) { toast.warning('Nom requis'); return; }
        setLoadingForm(true);
        try {
            const data = { ...form, logo: form.logoUrl || null };
            if (domaineEdite) {
                await mettreAJourDomaine(domaineEdite.id, data, profil?.uid);
                toast.success('Domaine modifié !', form.nom);
            } else {
                await creerDomaine(data, profil?.uid);
                toast.success('Domaine créé !', form.nom);
            }
            setModalForm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    const handleToggle = async (domaine) => {
        try {
            await toggleDomaine(domaine.id, !domaine.actif, profil?.uid);
            toast.success(
                !domaine.actif ? '✅ Domaine activé' : '❌ Domaine désactivé',
                domaine.nom
            );
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const handleArchiver = async () => {
        try {
            await archiverDomaine(domaineSuppr.id, profil?.uid);
            toast.success('Domaine archivé', domaineSuppr.nom);
            setModalConfirm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const peutCreer    = aPermission(PERMISSIONS.DOMAINES_CREER);
    const peutModifier = aPermission(PERMISSIONS.DOMAINES_MODIFIER);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24,
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        🏢 Domaines d'activité
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {domaines.filter(d => !d.archive).length} domaine{domaines.length > 1 ? 's' : ''} configuré{domaines.length > 1 ? 's' : ''}
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
                        ➕ Nouveau domaine
                    </button>
                )}
            </div>

            {/* Grille domaines */}
            {loading ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16,
                }}>
                    {[1,2,3,4].map(i => <Skeleton key={i} height={200} borderRadius={14} />)}
                </div>
            ) : domaines.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 20px',
                    color: 'var(--text2)',
                }}>
                    <div style={{ fontSize: 60, marginBottom: 16 }}>🏢</div>
                    <p style={{ fontSize: 16, fontWeight: 600 }}>Aucun domaine configuré</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Créez votre premier domaine d'activité</p>
                    {peutCreer && (
                        <button
                            onClick={() => ouvrirForm()}
                            style={{
                                marginTop: 16, padding: '11px 22px',
                                background: '#0F2D6B', color: 'white',
                                border: 'none', borderRadius: 12, cursor: 'pointer',
                                fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            ➕ Créer un domaine
                        </button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16,
                }}>
                    {domaines.filter(d => !d.archive).map(d => (
                        <div
                            key={d.id}
                            style={{
                                background: 'var(--card)',
                                borderRadius: 16,
                                overflow: 'hidden',
                                border: `2px solid ${d.actif ? d.couleur || '#0F2D6B' : 'var(--border)'}`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                opacity: d.actif ? 1 : 0.65,
                                transition: 'all 0.25s',
                            }}
                        >
                            {/* Header coloré */}
                            <div style={{
                                background: `linear-gradient(135deg, ${d.couleur || '#0F2D6B'}, ${d.couleur || '#0F2D6B'}cc)`,
                                padding: '20px 20px 16px',
                                color: 'white',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* Fond déco */}
                                <div style={{
                                    position: 'absolute', right: -10, top: -10,
                                    fontSize: 80, opacity: 0.1,
                                    lineHeight: 1,
                                }}>
                                    {d.emoji || '🏪'}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: 'rgba(255,255,255,0.2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 26, flexShrink: 0,
                                        }}>
                                            {d.logo
                                                ? <img src={d.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                                                : d.emoji || '🏪'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{d.nom}</div>
                                            {d.slogan && (
                                                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 3 }}>{d.slogan}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Toggle actif */}
                                    {peutModifier && (
                                        <label style={{
                                            position: 'relative', display: 'inline-block',
                                            width: 44, height: 24, cursor: 'pointer', flexShrink: 0,
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={d.actif !== false}
                                                onChange={() => handleToggle(d)}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span style={{
                                                position: 'absolute', inset: 0,
                                                background: d.actif ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                                                borderRadius: 24, transition: '0.3s',
                                                border: '2px solid rgba(255,255,255,0.5)',
                                            }}>
                                                <span style={{
                                                    position: 'absolute', height: 16, width: 16,
                                                    left: d.actif ? 22 : 2, top: 2,
                                                    background: 'white', borderRadius: '50%',
                                                    transition: '0.3s',
                                                }} />
                                            </span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Contenu */}
                            <div style={{ padding: '14px 18px' }}>
                                {d.description && (
                                    <p style={{
                                        fontSize: 12, color: 'var(--text2)',
                                        marginBottom: 12, lineHeight: 1.5,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}>
                                        {d.description}
                                    </p>
                                )}

                                {/* Badges statut */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                                    <Badge variant={d.actif ? 'success' : 'danger'} dot rounded>
                                        {d.actif ? 'Actif' : 'Inactif'}
                                    </Badge>
                                    {!d.visibleClient && (
                                        <Badge variant="gray" rounded>🔒 Caché</Badge>
                                    )}
                                    {!d.commandesActives && (
                                        <Badge variant="warning" rounded>🚫 Commandes off</Badge>
                                    )}
                                    {!d.prixVisibles && (
                                        <Badge variant="gray" rounded>💰 Prix cachés</Badge>
                                    )}
                                </div>

                                {/* Stats */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 8, marginBottom: 14,
                                }}>
                                    {[
                                        { label: 'Produits',  val: d.nbProduits || 0 },
                                        { label: 'Services',  val: d.nbServices || 0 },
                                        { label: 'Ventes',    val: d.nbVentes   || 0 },
                                    ].map(s => (
                                        <div key={s.label} style={{
                                            textAlign: 'center', padding: '8px',
                                            background: 'var(--gray-50)', borderRadius: 8,
                                        }}>
                                            <div style={{ fontWeight: 800, fontSize: 18, color: d.couleur || '#0F2D6B' }}>
                                                {s.val}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>
                                                {s.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                {peutModifier && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => ouvrirForm(d)}
                                            style={{
                                                flex: 1, padding: '8px',
                                                background: `${d.couleur || '#0F2D6B'}15`,
                                                color: d.couleur || '#0F2D6B',
                                                border: 'none', borderRadius: 8,
                                                fontSize: 13, fontWeight: 700,
                                                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            ✏️ Modifier
                                        </button>
                                        <button
                                            onClick={() => { setDomaineSuppr(d); setModalConfirm(true); }}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'rgba(239,68,68,0.08)',
                                                color: '#EF4444', border: 'none',
                                                borderRadius: 8, cursor: 'pointer',
                                                fontSize: 13, fontFamily: 'Inter, sans-serif',
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL FORMULAIRE */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={domaineEdite ? `✏️ Modifier — ${domaineEdite.nom}` : '➕ Nouveau domaine'}
                icon="🏢"
                size="lg"
                footer={
                    <>
                        <button
                            onClick={() => setModalForm(false)}
                            style={{
                                padding: '10px 20px', border: '2px solid var(--border)',
                                borderRadius: 10, background: 'var(--card)', color: 'var(--text)',
                                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loadingForm}
                            style={{
                                padding: '10px 24px',
                                background: loadingForm ? '#9CA3AF' : 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                color: 'white', border: 'none', borderRadius: 10,
                                fontSize: 14, fontWeight: 700,
                                cursor: loadingForm ? 'not-allowed' : 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            {loadingForm ? '⏳ Sauvegarde...' : (domaineEdite ? '💾 Modifier' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Logo + aperçu */}
                    <div style={{
                        display: 'flex', gap: 16, padding: 16,
                        background: `${form.couleur || '#0F2D6B'}10`,
                        borderRadius: 12, border: `1px solid ${form.couleur || '#0F2D6B'}30`,
                        alignItems: 'center',
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 14,
                            background: form.logoUrl ? 'transparent' : form.couleur || '#0F2D6B',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32, color: 'white', flexShrink: 0, overflow: 'hidden',
                        }}>
                            {form.logoUrl
                                ? <img src={form.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : form.emoji}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{form.nom || 'Aperçu domaine'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{form.slogan}</div>
                            <label style={{
                                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', background: form.couleur || '#0F2D6B',
                                color: 'white', borderRadius: 8, cursor: loadingImg ? 'wait' : 'pointer',
                                fontSize: 12, fontWeight: 600,
                            }}>
                                {loadingImg ? '⏳...' : '📷 Logo'}
                                <input type="file" accept="image/*" onChange={handleUploadLogo} disabled={loadingImg} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* Nom et type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Nom du domaine *
                            </label>
                            <input
                                type="text"
                                value={form.nom}
                                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                                placeholder="Ex: Librairie & Papeterie"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Type d'activité
                            </label>
                            <select
                                value={form.type}
                                onChange={e => {
                                    const t = DOMAINES_TYPES.find(x => x.id === e.target.value);
                                    setForm(p => ({
                                        ...p, type: e.target.value,
                                        emoji: t?.emoji || p.emoji,
                                        couleur: t?.couleur || p.couleur,
                                    }));
                                }}
                                style={inputStyle}
                            >
                                {DOMAINES_TYPES.map(t => (
                                    <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                            Slogan court
                        </label>
                        <input
                            type="text"
                            value={form.slogan}
                            onChange={e => setForm(p => ({ ...p, slogan: e.target.value }))}
                            placeholder="Ex: Tout pour votre bureau"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Description du domaine..."
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    {/* Emoji et couleur */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                Emoji
                            </label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {EMOJIS_DOMAINES.map(e => (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, emoji: e }))}
                                        style={{
                                            width: 40, height: 40, fontSize: 22,
                                            border: `2px solid ${form.emoji === e ? '#0F2D6B' : 'var(--border)'}`,
                                            borderRadius: 10, cursor: 'pointer',
                                            background: form.emoji === e ? 'rgba(15,45,107,0.08)' : 'var(--card)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                Couleur
                            </label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['#0F2D6B','#FF6B00','#10B981','#EF4444','#8B5CF6','#F59E0B','#EC4899','#06B6D4','#374151'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, couleur: c }))}
                                        style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: c, border: `3px solid ${form.couleur === c ? '#111' : 'transparent'}`,
                                            cursor: 'pointer',
                                            boxShadow: form.couleur === c ? '0 0 0 3px rgba(0,0,0,0.2)' : 'none',
                                        }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={form.couleur}
                                    onChange={e => setForm(p => ({ ...p, couleur: e.target.value }))}
                                    style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
                                    title="Couleur personnalisée"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    <div style={{
                        padding: 14, background: 'var(--gray-50)',
                        borderRadius: 12, border: '1px solid var(--border)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>⚙️ Options de visibilité</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                                { key: 'actif',            label: '✅ Domaine actif'          },
                                { key: 'visibleClient',    label: '👁️ Visible par les clients' },
                                { key: 'commandesActives', label: '🛒 Commandes activées'      },
                                { key: 'prixVisibles',     label: '💰 Prix visibles'           },
                            ].map(opt => (
                                <label key={opt.key} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    padding: '8px 10px', background: 'var(--card)',
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

            {/* CONFIRM ARCHIVAGE */}
            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleArchiver}
                title="Archiver ce domaine ?"
                message={`Le domaine "${domaineSuppr?.nom}" sera archivé. Ses produits et services restent conservés.`}
                confirmText="Archiver"
                type="warning"
                motConfirmation="ARCHIVER"
            />
        </div>
    );
};

const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '2px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
};

export default DomainesPage;