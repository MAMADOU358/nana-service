import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Loader';
import { ecouterClients, creerClient, mettreAJourClient, archiverClient } from '../../services/clientService';
import { PERMISSIONS } from '../../config/constants';

const ClientsPage = () => {
    const { profil, aPermission } = useAuth();
    const toast = useToast();

    const [clients, setClients]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [recherche, setRecherche] = useState('');
    const [filtreType, setFiltreType] = useState('');

    const [modalForm, setModalForm]       = useState(false);
    const [modalDetail, setModalDetail]   = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [clientEdite, setClientEdite]   = useState(null);
    const [clientDetail, setClientDetail] = useState(null);
    const [clientSuppr, setClientSuppr]   = useState(null);
    const [loadingForm, setLoadingForm]   = useState(false);

    const [form, setForm] = useState(formVide());

    function formVide() {
        return {
            nom: '', prenom: '', genre: '', type: 'particulier',
            telephone: '', whatsapp: '', email: '',
            adresse: '', ville: '', pays: 'Guinée',
            entreprise: '', notes: '', source: 'manuel',
        };
    }

    // Charger clients
    useEffect(() => {
        const unsub = ecouterClients((data) => {
            setClients(data);
            setLoading(false);
        }, { archive: false });
        return () => unsub();
    }, []);

    // Filtrer
    const clientsFiltres = clients.filter(c => {
        if (recherche) {
            const t = recherche.toLowerCase();
            if (!(c.nomComplet?.toLowerCase().includes(t) ||
                  c.telephone?.includes(t) ||
                  c.email?.toLowerCase().includes(t) ||
                  c.entreprise?.toLowerCase().includes(t))) return false;
        }
        if (filtreType && c.type !== filtreType) return false;
        return true;
    });

    // Ouvrir form
    const ouvrirForm = (client = null) => {
        if (client) {
            setClientEdite(client);
            setForm({
                nom:       client.nom || '',
                prenom:    client.prenom || '',
                genre:     client.genre || '',
                type:      client.type || 'particulier',
                telephone: client.telephone || '',
                whatsapp:  client.whatsapp || '',
                email:     client.email || '',
                adresse:   client.adresse || '',
                ville:     client.ville || '',
                pays:      client.pays || 'Guinée',
                entreprise: client.entreprise || '',
                notes:     client.notes || '',
                source:    client.source || 'manuel',
            });
        } else {
            setClientEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    // Soumettre
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nom.trim())       { toast.warning('Nom requis');       return; }
        if (!form.telephone.trim()) { toast.warning('Téléphone requis'); return; }

        setLoadingForm(true);
        try {
            if (clientEdite) {
                await mettreAJourClient(clientEdite.id, form, profil?.uid);
                toast.success('Client modifié', `${form.prenom} ${form.nom} mis à jour`);
            } else {
                await creerClient(form, profil?.uid);
                toast.success('Client créé', `${form.prenom} ${form.nom} ajouté`);
            }
            setModalForm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    const handleArchiver = async () => {
        try {
            await archiverClient(clientSuppr.id, profil?.uid);
            toast.success('Client archivé');
            setModalConfirm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const peutCreer    = aPermission(PERMISSIONS.CLIENTS_CREER);
    const peutModifier = aPermission(PERMISSIONS.CLIENTS_MODIFIER);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24,
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        👥 Clients
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {clients.length} client{clients.length > 1 ? 's' : ''} enregistré{clients.length > 1 ? 's' : ''}
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
                        ➕ Nouveau client
                    </button>
                )}
            </div>

            {/* Filtres */}
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: 14,
                border: '1px solid var(--border)', marginBottom: 20,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input
                        type="search"
                        placeholder="Rechercher par nom, téléphone, email..."
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
                    value={filtreType}
                    onChange={e => setFiltreType(e.target.value)}
                    style={{
                        padding: '10px 14px', border: '2px solid var(--border)',
                        borderRadius: 10, fontSize: 14, background: 'var(--card)',
                        color: 'var(--text)', fontFamily: 'Inter, sans-serif',
                    }}
                >
                    <option value="">Tous les types</option>
                    <option value="particulier">Particuliers</option>
                    <option value="entreprise">Entreprises</option>
                </select>
            </div>

            {/* Liste clients */}
            <div style={{
                background: 'var(--card)', borderRadius: 14,
                border: '1px solid var(--border)', overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                {loading ? (
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1,2,3,4].map(i => <Skeleton key={i} height={64} borderRadius={8} />)}
                    </div>
                ) : clientsFiltres.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>👥</div>
                        <p style={{ fontSize: 15, fontWeight: 600 }}>
                            {recherche ? 'Aucun client trouvé' : 'Aucun client enregistré'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['Client', 'Contact', 'Type', 'Commandes', 'Total achats', 'Dernière commande', 'Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 16px', fontSize: 11,
                                            textAlign: 'left', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {clientsFiltres.map((c, i) => (
                                    <tr key={c.id} style={{
                                        borderBottom: i < clientsFiltres.length - 1 ? '1px solid var(--border)' : 'none',
                                        cursor: 'pointer',
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => { setClientDetail(c); setModalDetail(true); }}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 16, color: 'white', fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {c.nomComplet?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                                                        {c.nomComplet || '—'}
                                                    </div>
                                                    {c.entreprise && (
                                                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                                            🏢 {c.entreprise}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: 13 }}>📞 {c.telephone || '—'}</div>
                                            {c.email && (
                                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>✉️ {c.email}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <Badge variant={c.type === 'entreprise' ? 'primary' : 'info'}>
                                                {c.type === 'entreprise' ? '🏢 Entreprise' : '👤 Particulier'}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 15, textAlign: 'center' }}>
                                            {c.nbCommandes || 0}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10B981' }}>
                                            {(c.totalAchats || 0).toLocaleString('fr-FR')}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>
                                            {c.derniereCommande
                                                ? (c.derniereCommande.toDate
                                                    ? c.derniereCommande.toDate().toLocaleDateString('fr-FR')
                                                    : '—')
                                                : 'Jamais'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {peutModifier && (
                                                    <button
                                                        onClick={() => ouvrirForm(c)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: 'rgba(15,45,107,0.08)',
                                                            color: '#0F2D6B', border: 'none',
                                                            borderRadius: 8, fontSize: 12,
                                                            fontWeight: 600, cursor: 'pointer',
                                                            fontFamily: 'Inter, sans-serif',
                                                        }}
                                                    >
                                                        ✏️
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setProduitSuppr?.(c); setClientSuppr(c); setModalConfirm(true); }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: 'rgba(239,68,68,0.08)',
                                                        color: '#EF4444', border: 'none',
                                                        borderRadius: 8, fontSize: 12,
                                                        fontWeight: 600, cursor: 'pointer',
                                                        fontFamily: 'Inter, sans-serif',
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL FORMULAIRE */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={clientEdite ? `✏️ Modifier — ${clientEdite.nomComplet}` : '➕ Nouveau client'}
                icon="👥"
                size="lg"
                footer={
                    <>
                        <button
                            onClick={() => setModalForm(false)}
                            style={{
                                padding: '10px 20px', border: '2px solid var(--border)',
                                borderRadius: 10, background: 'var(--card)', color: 'var(--text)',
                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
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
                            {loadingForm ? '⏳ Sauvegarde...' : (clientEdite ? '💾 Sauvegarder' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    {/* Type */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                        {['particulier', 'entreprise'].map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, type: t }))}
                                style={{
                                    flex: 1, padding: '10px',
                                    border: `2px solid ${form.type === t ? '#0F2D6B' : 'var(--border)'}`,
                                    borderRadius: 10, background: form.type === t ? 'rgba(15,45,107,0.08)' : 'var(--card)',
                                    color: form.type === t ? '#0F2D6B' : 'var(--text2)',
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                {t === 'particulier' ? '👤 Particulier' : '🏢 Entreprise'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        {[
                            { key: 'prenom', label: 'Prénom', placeholder: 'Jean' },
                            { key: 'nom',    label: 'Nom *',  placeholder: 'Dupont', required: true },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                    {f.label}
                                </label>
                                <input
                                    type="text"
                                    value={form[f.key]}
                                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                    placeholder={f.placeholder}
                                    required={f.required}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        border: '2px solid var(--border)', borderRadius: 10,
                                        fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                        outline: 'none', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        {[
                            { key: 'telephone', label: 'Téléphone *', placeholder: '+224 6XX XXX XXX', type: 'tel', required: true },
                            { key: 'whatsapp',  label: 'WhatsApp',    placeholder: '+224 6XX XXX XXX', type: 'tel' },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                                <input
                                    type={f.type || 'text'}
                                    value={form[f.key]}
                                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                    placeholder={f.placeholder}
                                    required={f.required}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        border: '2px solid var(--border)', borderRadius: 10,
                                        fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                        outline: 'none', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="client@email.com"
                            style={{
                                width: '100%', padding: '10px 14px',
                                border: '2px solid var(--border)', borderRadius: 10,
                                fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                outline: 'none', fontFamily: 'Inter, sans-serif',
                            }}
                        />
                    </div>

                    {form.type === 'entreprise' && (
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Nom de l'entreprise</label>
                            <input
                                type="text"
                                value={form.entreprise}
                                onChange={e => setForm(p => ({ ...p, entreprise: e.target.value }))}
                                placeholder="ACME SARL"
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Adresse</label>
                            <input
                                type="text"
                                value={form.adresse}
                                onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
                                placeholder="Quartier, rue..."
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Ville</label>
                            <input
                                type="text"
                                value={form.ville}
                                onChange={e => setForm(p => ({ ...p, ville: e.target.value }))}
                                placeholder="Conakry"
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '2px solid var(--border)', borderRadius: 10,
                                    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'Inter, sans-serif',
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Notes internes</label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Informations supplémentaires..."
                            rows={2}
                            style={{
                                width: '100%', padding: '10px 14px',
                                border: '2px solid var(--border)', borderRadius: 10,
                                fontSize: 14, background: 'var(--card)', color: 'var(--text)',
                                outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical',
                            }}
                        />
                    </div>
                </form>
            </Modal>

            {/* MODAL DÉTAIL CLIENT */}
            <Modal
                isOpen={modalDetail}
                onClose={() => setModalDetail(false)}
                title={`👤 ${clientDetail?.nomComplet || 'Client'}`}
                size="md"
            >
                {clientDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Infos */}
                        {[
                            { icon: '📞', label: 'Téléphone', val: clientDetail.telephone },
                            { icon: '💬', label: 'WhatsApp',  val: clientDetail.whatsapp },
                            { icon: '✉️', label: 'Email',     val: clientDetail.email },
                            { icon: '📍', label: 'Adresse',   val: [clientDetail.adresse, clientDetail.ville, clientDetail.pays].filter(Boolean).join(', ') },
                        ].filter(i => i.val).map(item => (
                            <div key={item.label} style={{
                                display: 'flex', gap: 12, padding: '12px 14px',
                                background: 'var(--gray-50)', borderRadius: 10,
                            }}>
                                <span style={{ fontSize: 18 }}>{item.icon}</span>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 2 }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.val}</div>
                                </div>
                            </div>
                        ))}

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{
                                padding: 14, background: 'rgba(15,45,107,0.05)',
                                borderRadius: 10, border: '1px solid rgba(15,45,107,0.1)', textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#0F2D6B' }}>
                                    {clientDetail.nbCommandes || 0}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Commandes</div>
                            </div>
                            <div style={{
                                padding: 14, background: 'rgba(16,185,129,0.05)',
                                borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)', textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>
                                    {(clientDetail.totalAchats || 0).toLocaleString('fr-FR')}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Total achats</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            {clientDetail.telephone && (
                                <a
                                    href={`tel:${clientDetail.telephone}`}
                                    style={{
                                        flex: 1, padding: '10px', background: '#10B981',
                                        color: 'white', border: 'none', borderRadius: 10,
                                        fontSize: 13, fontWeight: 700, textAlign: 'center',
                                        textDecoration: 'none', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    📞 Appeler
                                </a>
                            )}
                            {clientDetail.whatsapp && (
                                <a
                                    href={`https://wa.me/${clientDetail.whatsapp.replace(/[^0-9]/g,'')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        flex: 1, padding: '10px', background: '#25D366',
                                        color: 'white', border: 'none', borderRadius: 10,
                                        fontSize: 13, fontWeight: 700, textAlign: 'center',
                                        textDecoration: 'none', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    💬 WhatsApp
                                </a>
                            )}
                            {peutModifier && (
                                <button
                                    onClick={() => { setModalDetail(false); ouvrirForm(clientDetail); }}
                                    style={{
                                        flex: 1, padding: '10px', background: '#0F2D6B',
                                        color: 'white', border: 'none', borderRadius: 10,
                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                    }}
                                >
                                    ✏️ Modifier
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL CONFIRMATION */}
            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={handleArchiver}
                title="Archiver ce client ?"
                message={`Le client "${clientSuppr?.nomComplet}" sera archivé. Ses données et historique sont conservés.`}
                confirmText="Archiver"
                type="warning"
            />
        </div>
    );
};

export default ClientsPage;