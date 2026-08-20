import React, { useState, useEffect } from 'react';
import {
    collection, query, onSnapshot,
    doc, setDoc, updateDoc, deleteDoc,
    serverTimestamp, orderBy
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Loader';
import {
    COLLECTIONS, ROLES, ROLES_LABELS,
    PERMISSIONS, PERMISSIONS_PAR_ROLE
} from '../../config/constants';

const UsersPage = () => {
    const { profil, aPermission, estSuperAdmin, logAudit } = useAuth();
    const toast = useToast();

    const [users, setUsers]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [modalForm, setModalForm]       = useState(false);
    const [modalPerms, setModalPerms]     = useState(false);
    const [modalConfirm, setModalConfirm] = useState(false);
    const [userEdite, setUserEdite]       = useState(null);
    const [userPerms, setUserPerms]       = useState(null);
    const [userSuppr, setUserSuppr]       = useState(null);
    const [loadingForm, setLoadingForm]   = useState(false);

    const [form, setForm] = useState(formVide());
    const [permsExtra, setPermsExtra]     = useState([]);
    const [permsRetirees, setPermsRetirees] = useState([]);

    function formVide() {
        return {
            nom: '', prenom: '', email: '',
            telephone: '', role: ROLES.OPERATEUR,
            actif: true, motdepasse: '',
            boutiqueIds: [], domaineIds: [],
        };
    }

    useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.UTILISATEURS),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const ouvrirForm = (user = null) => {
        if (user) {
            setUserEdite(user);
            setForm({
                nom:       user.nom || '',
                prenom:    user.prenom || '',
                email:     user.email || '',
                telephone: user.telephone || '',
                role:      user.role || ROLES.OPERATEUR,
                actif:     user.actif !== false,
                motdepasse: '',
                boutiqueIds: user.boutiqueIds || [],
                domaineIds:  user.domaineIds  || [],
            });
        } else {
            setUserEdite(null);
            setForm(formVide());
        }
        setModalForm(true);
    };

    const ouvrirPerms = (user) => {
        setUserPerms(user);
        setPermsExtra(user.permissionsExtra || []);
        setPermsRetirees(user.permissionsRetirees || []);
        setModalPerms(true);
    };

    const handleSubmit = async () => {
        if (!form.nom.trim() || !form.email.trim()) {
            toast.warning('Champs requis', 'Nom et email sont obligatoires');
            return;
        }
        setLoadingForm(true);
        try {
            if (userEdite) {
                // Modifier utilisateur existant
                await updateDoc(doc(db, COLLECTIONS.UTILISATEURS, userEdite.id), {
                    nom:       form.nom.trim(),
                    prenom:    form.prenom.trim(),
                    telephone: form.telephone.trim(),
                    role:      form.role,
                    actif:     form.actif,
                    updatedAt: serverTimestamp(),
                    updatedBy: profil?.uid,
                });
                toast.success('Utilisateur modifié !', `${form.prenom} ${form.nom}`);
            } else {
                // Créer nouveau compte Firebase Auth + Firestore
                if (!form.motdepasse || form.motdepasse.length < 8) {
                    toast.warning('Mot de passe requis', 'Minimum 8 caractères');
                    setLoadingForm(false);
                    return;
                }

                const cred = await createUserWithEmailAndPassword(
                    auth, form.email.trim(), form.motdepasse
                );

                await setDoc(doc(db, COLLECTIONS.UTILISATEURS, cred.user.uid), {
                    uid:       cred.user.uid,
                    nom:       form.nom.trim(),
                    prenom:    form.prenom.trim(),
                    email:     form.email.trim().toLowerCase(),
                    telephone: form.telephone.trim(),
                    role:      form.role,
                    actif:     true,
                    avatar:    null,
                    permissionsExtra:    [],
                    permissionsRetirees: [],
                    boutiqueIds: form.boutiqueIds,
                    domaineIds:  form.domaineIds,
                    createdAt: serverTimestamp(),
                    createdBy: profil?.uid,
                });

                await logAudit('creation_utilisateur', {
                    email:  form.email,
                    role:   form.role,
                    nom:    `${form.prenom} ${form.nom}`,
                });

                toast.success('Utilisateur créé !', `${form.prenom} ${form.nom}`);
            }
            setModalForm(false);
        } catch (err) {
            const msgs = {
                'auth/email-already-in-use': 'Cet email est déjà utilisé',
                'auth/weak-password':        'Mot de passe trop faible (min 8 caractères)',
                'auth/invalid-email':        'Email invalide',
            };
            toast.error('Erreur', msgs[err.code] || err.message);
        } finally {
            setLoadingForm(false);
        }
    };

    const sauverPermissions = async () => {
        if (!userPerms) return;
        try {
            await updateDoc(doc(db, COLLECTIONS.UTILISATEURS, userPerms.id), {
                permissionsExtra:    permsExtra,
                permissionsRetirees: permsRetirees,
                updatedAt:           serverTimestamp(),
            });
            toast.success('Permissions sauvegardées !');
            setModalPerms(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const toggleActif = async (user) => {
        try {
            await updateDoc(doc(db, COLLECTIONS.UTILISATEURS, user.id), {
                actif:     !user.actif,
                updatedAt: serverTimestamp(),
            });
            toast.info(!user.actif ? '✅ Compte activé' : '❌ Compte désactivé', user.nom);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const supprimerUser = async () => {
        if (!userSuppr) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.UTILISATEURS, userSuppr.id));
            toast.success('Utilisateur supprimé');
            setModalConfirm(false);
        } catch (err) {
            toast.error('Erreur', err.message);
        }
    };

    const peutCreer    = aPermission(PERMISSIONS.USERS_CREER);
    const peutModifier = aPermission(PERMISSIONS.USERS_MODIFIER);
    const peutRoles    = aPermission(PERMISSIONS.USERS_ROLES);

    // Toggle permission individuelle
    const togglePermExtra = (perm) => {
        if (permsExtra.includes(perm)) {
            setPermsExtra(prev => prev.filter(p => p !== perm));
        } else {
            setPermsExtra(prev => [...prev, perm]);
            setPermsRetirees(prev => prev.filter(p => p !== perm));
        }
    };

    const togglePermRetiree = (perm) => {
        if (permsRetirees.includes(perm)) {
            setPermsRetirees(prev => prev.filter(p => p !== perm));
        } else {
            setPermsRetirees(prev => [...prev, perm]);
            setPermsExtra(prev => prev.filter(p => p !== perm));
        }
    };

    // Calculer permissions effectives
    const getPermsEffectives = (user) => {
        const base     = PERMISSIONS_PAR_ROLE[user.role] || [];
        const extra    = user.permissionsExtra    || [];
        const retirees = user.permissionsRetirees || [];
        return [...new Set([...base, ...extra])].filter(p => !retirees.includes(p));
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* En-tête */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24,
            }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                        👥 Utilisateurs & Permissions
                    </h1>
                    <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                        {users.length} compte{users.length > 1 ? 's' : ''} configuré{users.length > 1 ? 's' : ''}
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
                        ➕ Nouvel utilisateur
                    </button>
                )}
            </div>

            {/* Tableau */}
            <div style={{
                background: 'var(--card)', borderRadius: 14,
                border: '1px solid var(--border)', overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
                {loading ? (
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1,2,3].map(i => <Skeleton key={i} height={70} borderRadius={8} />)}
                    </div>
                ) : users.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>👥</div>
                        <p style={{ fontWeight: 600 }}>Aucun utilisateur</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0F2D6B', color: 'white' }}>
                                    {['Utilisateur','Email','Rôle','Permissions','Statut','Dernière connexion','Actions'].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 14px', fontSize: 11,
                                            textAlign: 'left', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => {
                                    const rl  = ROLES_LABELS[u.role] || { label: u.role, emoji: '👤', couleur: 'gray' };
                                    const permsEff = getPermsEffectives(u);
                                    const isSelf = profil?.uid === u.id;

                                    return (
                                        <tr key={u.id} style={{
                                            borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                                            background: isSelf ? 'rgba(255,107,0,0.03)' : 'transparent',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                                        onMouseOut={e => e.currentTarget.style.background = isSelf ? 'rgba(255,107,0,0.03)' : 'transparent'}
                                        >
                                            {/* Utilisateur */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 40, height: 40, borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #0F2D6B, #FF6B00)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 16, color: 'white', fontWeight: 700,
                                                        flexShrink: 0, overflow: 'hidden',
                                                    }}>
                                                        {u.avatar
                                                            ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : (u.prenom?.charAt(0) || u.nom?.charAt(0) || '?').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                                                            {u.prenom} {u.nom}
                                                            {isSelf && (
                                                                <span style={{
                                                                    marginLeft: 6, fontSize: 10, padding: '2px 6px',
                                                                    background: 'rgba(255,107,0,0.15)', color: '#FF6B00',
                                                                    borderRadius: 10, fontWeight: 700,
                                                                }}>
                                                                    Vous
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                                            {u.telephone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)' }}>
                                                {u.email}
                                            </td>

                                            {/* Rôle */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <Badge variant={rl.couleur}>
                                                    {rl.emoji} {rl.label}
                                                </Badge>
                                            </td>

                                            {/* Permissions */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                                    <span style={{ fontWeight: 700, color: '#0F2D6B' }}>
                                                        {permsEff.length}
                                                    </span> permission{permsEff.length > 1 ? 's' : ''}
                                                    {(u.permissionsExtra?.length || 0) > 0 && (
                                                        <span style={{ color: '#10B981', marginLeft: 4 }}>
                                                            +{u.permissionsExtra.length} extra
                                                        </span>
                                                    )}
                                                    {(u.permissionsRetirees?.length || 0) > 0 && (
                                                        <span style={{ color: '#EF4444', marginLeft: 4 }}>
                                                            -{u.permissionsRetirees.length} retirée{u.permissionsRetirees.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Statut */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <label style={{ cursor: !isSelf ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={u.actif !== false}
                                                        onChange={() => !isSelf && toggleActif(u)}
                                                        disabled={isSelf}
                                                    />
                                                    <Badge variant={u.actif !== false ? 'success' : 'danger'} dot>
                                                        {u.actif !== false ? 'Actif' : 'Inactif'}
                                                    </Badge>
                                                </label>
                                            </td>

                                            {/* Connexion */}
                                            <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text2)' }}>
                                                {u.derniereConnexion
                                                    ? new Date(u.derniereConnexion?.seconds * 1000 || u.derniereConnexion).toLocaleString('fr-FR', {
                                                        day: '2-digit', month: '2-digit',
                                                        hour: '2-digit', minute: '2-digit'
                                                      })
                                                    : 'Jamais'}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {peutModifier && (
                                                        <button
                                                            onClick={() => ouvrirForm(u)}
                                                            style={btnSm('#0F2D6B')}
                                                            title="Modifier"
                                                        >
                                                            ✏️
                                                        </button>
                                                    )}
                                                    {peutRoles && (
                                                        <button
                                                            onClick={() => ouvrirPerms(u)}
                                                            style={btnSm('#8B5CF6')}
                                                            title="Permissions"
                                                        >
                                                            🔑
                                                        </button>
                                                    )}
                                                    {estSuperAdmin && !isSelf && (
                                                        <button
                                                            onClick={() => { setUserSuppr(u); setModalConfirm(true); }}
                                                            style={btnSm('#EF4444')}
                                                            title="Supprimer"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL FORMULAIRE */}
            <Modal
                isOpen={modalForm}
                onClose={() => setModalForm(false)}
                title={userEdite ? `✏️ Modifier — ${userEdite.prenom} ${userEdite.nom}` : '➕ Nouvel utilisateur'}
                icon="👤"
                size="md"
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
                            {loadingForm ? '⏳ Création...' : (userEdite ? '💾 Modifier' : '➕ Créer')}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {[
                            { key: 'prenom', label: 'Prénom', ph: 'Jean'   },
                            { key: 'nom',    label: 'Nom *',  ph: 'Dupont', required: true },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                                <input
                                    type="text"
                                    value={form[f.key]}
                                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                    placeholder={f.ph}
                                    style={inputStyle}
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                            Email * {userEdite && <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(non modifiable)</span>}
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="email@exemple.com"
                            disabled={!!userEdite}
                            style={{ ...inputStyle, opacity: userEdite ? 0.6 : 1 }}
                        />
                    </div>

                    {!userEdite && (
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                Mot de passe initial * (min. 8 caractères)
                            </label>
                            <input
                                type="text"
                                value={form.motdepasse}
                                onChange={e => setForm(p => ({ ...p, motdepasse: e.target.value }))}
                                placeholder="Minimum 8 caractères"
                                style={inputStyle}
                            />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                Téléphone
                            </label>
                            <input
                                type="tel"
                                value={form.telephone}
                                onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                                placeholder="+224 6XX XXX XXX"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>
                                Rôle *
                            </label>
                            <select
                                value={form.role}
                                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                style={inputStyle}
                                disabled={!peutRoles && !estSuperAdmin}
                            >
                                {Object.entries(ROLES_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Info rôle */}
                    <div style={{
                        padding: '12px 14px',
                        background: 'rgba(15,45,107,0.04)',
                        borderRadius: 10, border: '1px solid rgba(15,45,107,0.1)',
                        fontSize: 12, color: 'var(--text2)',
                    }}>
                        <strong>Permissions du rôle {ROLES_LABELS[form.role]?.label} :</strong>
                        <span> {(PERMISSIONS_PAR_ROLE[form.role] || []).length} permission{(PERMISSIONS_PAR_ROLE[form.role] || []).length > 1 ? 's' : ''}</span>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <input
                            type="checkbox"
                            checked={form.actif}
                            onChange={e => setForm(p => ({ ...p, actif: e.target.checked }))}
                        />
                        ✅ Compte actif
                    </label>
                </div>
            </Modal>

            {/* MODAL PERMISSIONS */}
            <Modal
                isOpen={modalPerms}
                onClose={() => setModalPerms(false)}
                title={`🔑 Permissions — ${userPerms?.prenom} ${userPerms?.nom}`}
                size="lg"
                icon="🔑"
                footer={
                    <>
                        <button
                            onClick={() => setModalPerms(false)}
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
                            onClick={sauverPermissions}
                            style={{
                                padding: '10px 24px',
                                background: 'linear-gradient(135deg, #0F2D6B, #1E4DB7)',
                                color: 'white', border: 'none', borderRadius: 10,
                                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        >
                            💾 Sauvegarder
                        </button>
                    </>
                }
            >
                {userPerms && (
                    <div>
                        {/* Légende */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                            {[
                                { color: '#10B981', label: '✅ Incluse dans le rôle' },
                                { color: '#FF6B00', label: '➕ Ajoutée manuellement' },
                                { color: '#EF4444', label: '❌ Retirée du rôle'      },
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} />
                                    <span>{l.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Groupes de permissions */}
                        {[
                            { titre: '🏢 Domaines',   perms: Object.values(PERMISSIONS).filter(p => p.startsWith('domaines.')) },
                            { titre: '🏪 Boutiques',  perms: Object.values(PERMISSIONS).filter(p => p.startsWith('boutiques.')) },
                            { titre: '📦 Produits',   perms: Object.values(PERMISSIONS).filter(p => p.startsWith('produits.')) },
                            { titre: '⚙️ Services',   perms: Object.values(PERMISSIONS).filter(p => p.startsWith('services.')) },
                            { titre: '📋 Commandes',  perms: Object.values(PERMISSIONS).filter(p => p.startsWith('commandes.')) },
                            { titre: '👥 Clients',    perms: Object.values(PERMISSIONS).filter(p => p.startsWith('clients.')) },
                            { titre: '💰 Finances',   perms: Object.values(PERMISSIONS).filter(p => ['ventes.','paiements.','factures.','devis.','achats.','depenses.'].some(x => p.startsWith(x))) },
                            { titre: '📦 Stock',      perms: Object.values(PERMISSIONS).filter(p => p.startsWith('stock.')) },
                            { titre: '📈 Rapports',   perms: Object.values(PERMISSIONS).filter(p => p.startsWith('rapports.')) },
                            { titre: '👤 Utilisateurs', perms: Object.values(PERMISSIONS).filter(p => p.startsWith('users.')) },
                            { titre: '⚙️ Paramètres', perms: Object.values(PERMISSIONS).filter(p => p.startsWith('params.') || p === PERMISSIONS.IMPORT || p === PERMISSIONS.EXPORT || p === PERMISSIONS.BACKUP) },
                        ].map(groupe => (
                            <div key={groupe.titre} style={{ marginBottom: 16 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text)' }}>
                                    {groupe.titre}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                                    {groupe.perms.map(perm => {
                                        const baseRole  = (PERMISSIONS_PAR_ROLE[userPerms.role] || []).includes(perm);
                                        const estExtra  = permsExtra.includes(perm);
                                        const estRetiree = permsRetirees.includes(perm);
                                        const effective = (baseRole || estExtra) && !estRetiree;

                                        let bg    = 'var(--gray-50)';
                                        let color = 'var(--text2)';
                                        let border = 'var(--border)';

                                        if (estExtra)   { bg = 'rgba(255,107,0,0.08)'; color = '#FF6B00'; border = 'rgba(255,107,0,0.3)'; }
                                        if (estRetiree) { bg = 'rgba(239,68,68,0.08)'; color = '#EF4444'; border = 'rgba(239,68,68,0.3)'; }
                                        if (baseRole && !estRetiree && !estExtra) { bg = 'rgba(16,185,129,0.08)'; color = '#10B981'; border = 'rgba(16,185,129,0.3)'; }

                                        const permLabel = perm.split('.').pop().replace(/_/g, ' ');

                                        return (
                                            <div key={perm} style={{
                                                padding: '8px 10px', borderRadius: 8,
                                                background: bg, border: `1px solid ${border}`,
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'space-between', gap: 6,
                                            }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, color, flex: 1 }}>
                                                    {permLabel}
                                                </span>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    {/* Bouton ajouter */}
                                                    {!baseRole && (
                                                        <button
                                                            onClick={() => togglePermExtra(perm)}
                                                            style={{
                                                                width: 22, height: 22,
                                                                background: estExtra ? '#FF6B00' : 'var(--gray-200)',
                                                                border: 'none', borderRadius: 4,
                                                                cursor: 'pointer', fontSize: 12,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            }}
                                                            title="Ajouter cette permission"
                                                        >
                                                            {estExtra ? '✓' : '+'}
                                                        </button>
                                                    )}
                                                    {/* Bouton retirer */}
                                                    {(baseRole || estExtra) && (
                                                        <button
                                                            onClick={() => togglePermRetiree(perm)}
                                                            style={{
                                                                width: 22, height: 22,
                                                                background: estRetiree ? '#EF4444' : 'var(--gray-200)',
                                                                border: 'none', borderRadius: 4,
                                                                cursor: 'pointer', fontSize: 12,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: estRetiree ? 'white' : 'var(--text2)',
                                                            }}
                                                            title="Retirer cette permission"
                                                        >
                                                            —
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* CONFIRM SUPPRESSION */}
            <ConfirmModal
                isOpen={modalConfirm}
                onClose={() => setModalConfirm(false)}
                onConfirm={supprimerUser}
                title="Supprimer cet utilisateur ?"
                message={`Le compte de "${userSuppr?.prenom} ${userSuppr?.nom}" sera supprimé définitivement de Firestore. Le compte Firebase Auth reste actif.`}
                confirmText="Supprimer"
                type="danger"
                motConfirmation="SUPPRIMER"
            />
        </div>
    );
};

const btnSm = (color) => ({
    padding: '6px 10px', background: `${color}15`,
    color, border: 'none', borderRadius: 8,
    fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: 'Inter, sans-serif',
});

const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '2px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--card)', color: 'var(--text)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
};

export default UsersPage;