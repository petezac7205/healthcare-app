import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      showToast('Login successful!', 'success');
      navigate(`/${user.role}`);
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ 
      background: 'radial-gradient(circle at 50% 50%, rgba(0, 212, 170, 0.1) 0%, transparent 50%), var(--bg-gradient)' 
    }}>
      <div className="glass-card animate-fade-in w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>HealthSync</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            disabled={isSubmitting}
            style={{ width: '100%', padding: '1rem' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="text-center mt-6" style={{ fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
          <Link to="/auth/register" style={{ fontWeight: 600 }}>Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
