import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'patient'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const user = await register(
        formData.name, 
        formData.email, 
        formData.password, 
        formData.phone,
        formData.role
      );
      showToast('Registration successful!', 'success');
      navigate(`/${user.role}`);
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ 
      background: 'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.1) 0%, transparent 50%), var(--bg-gradient)' 
    }}>
      <div className="glass-card animate-fade-in w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>HealthSync</h1>
          <p style={{ color: 'var(--text-muted)' }}>Create a new account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" name="name" 
              value={formData.name} onChange={handleChange} 
              placeholder="John Doe" required 
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" name="email" 
              value={formData.email} onChange={handleChange} 
              placeholder="john@example.com" required 
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="tel" name="phone" 
              value={formData.phone} onChange={handleChange} 
              placeholder="+1 (555) 000-0000" 
            />
          </div>
          
          <div className="flex gap-4" style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Password</label>
              <input 
                type="password" name="password" 
                value={formData.password} onChange={handleChange} 
                placeholder="••••••••" required minLength={6}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Confirm</label>
              <input 
                type="password" name="confirmPassword" 
                value={formData.confirmPassword} onChange={handleChange} 
                placeholder="••••••••" required minLength={6}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            disabled={isSubmitting}
            style={{ width: '100%', padding: '1rem' }}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="text-center mt-6" style={{ fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to="/auth/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
