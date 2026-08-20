import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { COLLECTIONS, ROLES } from '../../config/constants';

const InscriptionPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        prenom: '', nom: '', email: '',
        telephone: '', motdepasse: '', confirmerMdp: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.prenom || !form.nom || !form.email || !form.motdepasse) {
            setError('Tous les champs marqués * sont obligatoires');
            return;
        }
        if (form.motdepasse.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères');
            return;
        }
        if (form.motdepasse !== form.confirmerMdp) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, form.email.trim().toLowerCase(), form.motdepasse);

            await setDoc(doc(db, COLLECTIONS.UTILISATEURS, cred.user.uid), {
                uid:       cred.user.uid,
                nom:       form.nom.trim(),
                prenom:    form.prenom.trim(),
                email:     form.email.trim().toLowerCase(),
                telephone: form.telephone.trim(),
                role:      ROLES.CLIENT,
                actif:     true,
                avatar:    null,
                createdAt: serverTimestamp(),
                source:    'inscription',
            });

            navigate('/mon-espace', { replace: true });
        } catch (err) {
            const msgs = {
                'auth/email-already-in-use': 'Cet email est déjà utilisé',
                'auth/weak-password':        'Mot de passe trop faible',
                'auth/invalid-email':        'Email invalide',
            };
            setError(msgs[err.code] || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight:'100vh', display:'flex', alignItems:'center',
            justifyContent:'center', padding:20,
            background:'linear-gradient(135deg, #0A1F4E, #0F2D6B, #FF6B00)',
            fontFamily:'Inter, sans-serif',
        }}>
            <div style={{
                background:'white', borderRadius:24, padding:40,
                width:'100%', maxWidth:480, boxShadow:'0 30px 80px rgba(0,0,0,0.4)',
            }}>
                <div style={{ textAlign:'center', marginBottom:28 }}>
                    <div style={{
                        width:64, height:64, borderRadius:16,
                        background:'linear-gradient(135deg,#0F2D6B,#FF6B00)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:32, color:'white', margin:'0 auto 14px',
                    }}>📝</div>
                    <h1 style={{ fontSize:24, fontWeight:900, color:'#0F2D6B', marginBottom:4 }}>
                        Créer un compte
                    </h1>
                    <p style={{ fontSize:13, color:'#6B7280' }}>
                        Rejoignez NANA SERVICE en quelques secondes
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                        {[
                            { key:'prenom', label:'Prénom *', ph:'Jean' },
                            { key:'nom',    label:'Nom *',    ph:'Dupont' },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={labStyle}>{f.label}</label>
                                <input
                                    type="text"
                                    value={form[f.key]}
                                    onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setError(''); }}
                                    placeholder={f.ph}
                                    style={inputStyle}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom:12 }}>
                        <label style={labStyle}>Email *</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setError(''); }}
                            placeholder="votre@email.com"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom:12 }}>
                        <label style={labStyle}>Téléphone</label>
                        <input
                            type="tel"
                            value={form.telephone}
                            onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                            placeholder="+224 6XX XXX XXX"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom:12 }}>
                        <label style={labStyle}>Mot de passe * (min 8 caractères)</label>
                        <div style={{ position:'relative' }}>
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={form.motdepasse}
                                onChange={e => { setForm(p => ({ ...p, motdepasse: e.target.value })); setError(''); }}
                                placeholder="••••••••"
                                style={{ ...inputStyle, paddingRight:44 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{
                                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                    background:'none', border:'none', cursor:'pointer', fontSize:18,
                                }}
                            >
                                {showPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom:16 }}>
                        <label style={labStyle}>Confirmer le mot de passe *</label>
                        <input
                            type="password"
                            value={form.confirmerMdp}
                            onChange={e => { setForm(p => ({ ...p, confirmerMdp: e.target.value })); setError(''); }}
                            placeholder="••••••••"
                            style={{
                                ...inputStyle,
                                borderColor: form.confirmerMdp && form.motdepasse
                                    ? (form.motdepasse === form.confirmerMdp ? '#10B981' : '#EF4444')
                                    : '#E5E7EB'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding:'12px 14px', background:'rgba(239,68,68,0.1)',
                            border:'1px solid rgba(239,68,68,0.3)', borderRadius:10,
                            marginBottom:14, fontSize:13, color:'#991B1B',
                        }}>
                            ❌ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width:'100%', padding:14,
                            background: loading ? '#9CA3AF' : 'linear-gradient(135deg,#0F2D6B,#FF6B00)',
                            color:'white', border:'none', borderRadius:12,
                            fontSize:16, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
                            marginBottom:14, fontFamily:'Inter, sans-serif',
                            boxShadow:'0 6px 20px rgba(15,45,107,0.3)',
                        }}
                    >
                        {loading ? '⏳ Création...' : '✅ Créer mon compte'}
                    </button>

                    <div style={{ textAlign:'center', fontSize:13, color:'#6B7280', marginBottom:8 }}>
                        Déjà inscrit ?{' '}
                        <Link to="/login" style={{ color:'#FF6B00', fontWeight:700, textDecoration:'none' }}>
                            Se connecter
                        </Link>
                    </div>
                    <Link to="/" style={{ display:'block', textAlign:'center', color:'#6B7280', fontSize:12, textDecoration:'none' }}>
                        ← Retour à l'accueil
                    </Link>
                </form>
            </div>
        </div>
    );
};

const labStyle = { fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 };
const inputStyle = {
    width:'100%', padding:'11px 14px', border:'2px solid #E5E7EB',
    borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter, sans-serif',
};

export default InscriptionPage;