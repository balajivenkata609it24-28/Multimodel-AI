import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Mail, Phone, Lock, Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const value = identifier.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[\d\s()-]{7,}$/;

    if (!value || !password) {
      setError('Enter your email or phone number and password.');
      return;
    }

    if (!emailPattern.test(value) && !phonePattern.test(value)) {
      setError('Enter a valid email address or phone number.');
      return;
    }
    
    setLoading(true);
    setError('');

    // Mock authentication delay
    localStorage.setItem('vlm_authenticated', 'true');
    setLoading(false);
    navigate('/', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, rgba(205, 166, 120, 0.2) 0%, transparent 50%), var(--bg-primary)',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px 30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div className="logo-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '20px' }}>
          <Brain size={24} />
        </div>
        
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', marginBottom: '8px' }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '30px', textAlign: 'center' }}>
          Sign in to access your VLM Multimodal Assistant dashboard.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#a44332',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            width: '100%',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="setting-control">
            <label style={{ fontSize: '0.8rem' }}>Email or phone number</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              {identifier.includes('@') ? (
                <Mail size={16} className="text-dark" style={{ position: 'absolute', left: '12px' }} />
              ) : (
                <Phone size={16} className="text-dark" style={{ position: 'absolute', left: '12px' }} />
              )}
              <input 
                type="text" 
                placeholder="you@example.com or +1 555 123 4567" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px 12px 38px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          <div className="setting-control">
            <label style={{ fontSize: '0.8rem' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} className="text-dark" style={{ position: 'absolute', left: '12px' }} />
              <input 
                type="password" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px 12px 38px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px', fontSize: '0.95rem', marginTop: '10px' }} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Sign in to enter your assistant workspace.
        </div>
      </div>
    </div>
  );
};

export default Login;
