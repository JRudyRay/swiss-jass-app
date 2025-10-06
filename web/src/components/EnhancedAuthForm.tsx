import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import './EnhancedAuthForm.css';

interface AuthFormProps {
  onLogin: (token: string, user: any) => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export const EnhancedAuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
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
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, label: '', color: '' });
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

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

  // Calculate password strength
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    
    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character types
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: '#EF4444' };
    if (score <= 4) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (score <= 5) return { score: 3, label: 'Good', color: '#84CC16' };
    return { score: 4, label: 'Strong', color: '#10B981' };
  };

  useEffect(() => {
    if (!isLogin && formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password, isLogin]);

  // Validate email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate username
  const validateUsername = (username: string): boolean => {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  };

  // Handle field validation
  const validateField = (name: string, value: string) => {
    const errors = { ...fieldErrors };

    switch (name) {
      case 'email':
        if (!validateEmail(value) && value) {
          errors.email = 'Invalid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'username':
        if (!validateUsername(value) && value) {
          errors.username = 'Username must be at least 3 characters (letters, numbers, underscore)';
        } else {
          delete errors.username;
        }
        break;
      case 'password':
        if (value.length < 6 && value) {
          errors.password = 'Password must be at least 6 characters';
        } else {
          delete errors.password;
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password && value) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
    }

    setFieldErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Final validation
    if (Object.keys(fieldErrors).length > 0) {
      setError('Please fix the errors before submitting');
      return;
    }

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
          
          // Save token if remember me is checked
          if (formData.rememberMe) {
            localStorage.setItem('authToken', data.token);
          }
          
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
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    // Validate on change
    if (type !== 'checkbox') {
      validateField(name, value);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-shape auth-shape-1"></div>
        <div className="auth-shape auth-shape-2"></div>
        <div className="auth-shape auth-shape-3"></div>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            <span className="auth-flag">🇨🇭</span>
            Swiss Jass
          </h1>
          <p className="auth-subtitle">Traditional Swiss Card Game</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true);
              setError('');
              setFieldErrors({});
            }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false);
              setError('');
              setFieldErrors({});
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error">
            <span className="auth-alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="auth-alert auth-alert-success">
            <span className="auth-alert-icon">✓</span>
            {success}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isLogin ? (
            <>
              <div className="auth-input-group">
                <label className="auth-label">Email or Username</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">👤</span>
                  <input
                    type="text"
                    name="email"
                    className="auth-input"
                    placeholder="Enter your email or username"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="auth-input"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="auth-remember">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                  />
                  <span>Remember me</span>
                </label>
                <a href="#" className="auth-forgot-link">Forgot password?</a>
              </div>
            </>
          ) : (
            <>
              <div className="auth-row">
                <div className="auth-input-group">
                  <label className="auth-label">First Name</label>
                  <div className="auth-input-wrapper">
                    <input
                      type="text"
                      name="firstName"
                      className="auth-input"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Last Name</label>
                  <div className="auth-input-wrapper">
                    <input
                      type="text"
                      name="lastName"
                      className="auth-input"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Username</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">@</span>
                  <input
                    type="text"
                    name="username"
                    className={`auth-input ${fieldErrors.username ? 'error' : ''}`}
                    placeholder="Choose a unique username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    autoComplete="username"
                  />
                </div>
                {fieldErrors.username && (
                  <span className="auth-field-error">{fieldErrors.username}</span>
                )}
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">✉️</span>
                  <input
                    type="email"
                    name="email"
                    className={`auth-input ${fieldErrors.email ? 'error' : ''}`}
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <span className="auth-field-error">{fieldErrors.email}</span>
                )}
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className={`auth-input ${fieldErrors.password ? 'error' : ''}`}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="auth-field-error">{fieldErrors.password}</span>
                )}
                {formData.password && !fieldErrors.password && (
                  <div className="password-strength">
                    <div className="password-strength-bar">
                      <div
                        className="password-strength-fill"
                        style={{
                          width: `${(passwordStrength.score / 4) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        }}
                      ></div>
                    </div>
                    <span className="password-strength-label" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Confirm Password</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className={`auth-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
                )}
              </div>

              <div className="auth-avatar-section">
                <label className="auth-label">Avatar Style</label>
                <div className="auth-avatar-shapes">
                  {avatarShapes.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      className={`auth-avatar-shape ${formData.avatarShape === shape.id ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, avatarShape: shape.id })}
                      title={shape.name}
                    >
                      {shape.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="auth-avatar-section">
                <label className="auth-label">Avatar Color</label>
                <div className="auth-avatar-colors">
                  {avatarColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`auth-avatar-color ${formData.avatarColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, avatarColor: color })}
                    ></button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className={`auth-submit ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || Object.keys(fieldErrors).length > 0}
          >
            {isLoading ? (
              <>
                <span className="auth-spinner"></span>
                {isLogin ? 'Logging in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Login' : 'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setFieldErrors({});
                }}
                className="auth-link"
              >
                Register now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setFieldErrors({});
                }}
                className="auth-link"
              >
                Login here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAuthForm;
