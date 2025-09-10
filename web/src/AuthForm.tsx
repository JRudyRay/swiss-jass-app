import React, { useState } from 'react';
import { API_URL } from './config';

interface AuthFormProps {
  onLogin: (token: string, user: any) => void;
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  formCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    marginBottom: '0.5rem',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    textAlign: 'center' as const,
    color: '#6b7280',
    marginBottom: '2rem',
    fontSize: '0.9rem',
  },
  tabs: {
    display: 'flex',
    marginBottom: '2rem',
    gap: '0.5rem',
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    background: '#f3f4f6',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  activeTab: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  inputFocus: {
    borderColor: '#667eea',
  },
  avatarSection: {
    marginTop: '1rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '10px',
  },
  avatarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  avatarOption: {
    padding: '0.5rem',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.2s ease',
  },
  avatarSelected: {
    borderColor: '#667eea',
    background: '#f0f4ff',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  colorOption: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  colorSelected: {
    border: '3px solid #4c1d95',
    transform: 'scale(1.1)',
  },
  button: {
    padding: '1rem',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '1rem',
  },
  buttonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
  success: {
    background: '#d1fae5',
    color: '#059669',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
};

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    avatarShape: 'circle',
    avatarColor: '#3B82F6',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const avatarShapes = [
    { id: 'circle', name: 'Circle', emoji: '⭕' },
    { id: 'square', name: 'Square', emoji: '🔲' },
    { id: 'triangle', name: 'Triangle', emoji: '🔺' },
    { id: 'diamond', name: 'Diamond', emoji: '🔶' },
    { id: 'star', name: 'Star', emoji: '⭐' },
    { id: 'heart', name: 'Heart', emoji: '❤️' }
  ];

  const avatarColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailOrUsername: formData.email || formData.username,
            password: formData.password,
          }),
        });

        const data = await res.json();
        
        if (data.success) {
          setSuccess('Login successful! Redirecting...');
          setTimeout(() => {
            onLogin(data.token, data.user);
          }, 1000);
        } else {
          setError(data.message || 'Login failed');
        }
      } else {
        // Register
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            username: formData.username,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            avatarShape: formData.avatarShape,
            avatarColor: formData.avatarColor,
          }),
        });

        const data = await res.json();
        
        if (data.success) {
          setSuccess('Registration successful! Redirecting...');
          setTimeout(() => {
            onLogin(data.token, data.user);
          }, 1000);
        } else {
          setError(data.message || 'Registration failed');
        }
      }
    } catch (err) {
      setError('Network error. Please check if the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h1 style={styles.title}>Swiss Jass 🇨🇭</h1>
        <p style={styles.subtitle}>Traditional Swiss Card Game</p>

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(isLogin ? styles.activeTab : {}),
            }}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            style={{
              ...styles.tab,
              ...(!isLogin ? styles.activeTab : {}),
            }}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          {isLogin ? (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email or Username</label>
                <input
                  style={styles.input}
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email or username"
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                  style={styles.input}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Username</label>
                <input
                  style={styles.input}
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Choose a username"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>First Name</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Last Name</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                  style={styles.input}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  style={styles.input}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div style={styles.avatarSection}>
                <label style={styles.label}>Choose Avatar Shape</label>
                <div style={styles.avatarGrid}>
                  {avatarShapes.map(shape => (
                    <div
                      key={shape.id}
                      style={{
                        ...styles.avatarOption,
                        ...(formData.avatarShape === shape.id ? styles.avatarSelected : {}),
                      }}
                      onClick={() => setFormData({ ...formData, avatarShape: shape.id })}
                    >
                      <div style={{ fontSize: '1.5rem' }}>{shape.emoji}</div>
                      <div style={{ fontSize: '0.8rem' }}>{shape.name}</div>
                    </div>
                  ))}
                </div>

                <label style={{ ...styles.label, marginTop: '1rem' }}>Choose Avatar Color</label>
                <div style={styles.colorGrid}>
                  {avatarColors.map(color => (
                    <div
                      key={color}
                      style={{
                        ...styles.colorOption,
                        background: color,
                        ...(formData.avatarColor === color ? styles.colorSelected : {}),
                      }}
                      onClick={() => setFormData({ ...formData, avatarColor: color })}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <div style={styles.error}>❌ {error}</div>}
          {success && <div style={styles.success}>✅ {success}</div>}

          <button
            type="submit"
            style={styles.button}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};
