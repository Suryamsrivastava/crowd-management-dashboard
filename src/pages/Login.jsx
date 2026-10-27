import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { EyeIcon, EyeOffIcon, Logo } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your login ID and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(
        err?.response?.status === 401
          ? 'Invalid login ID or password'
          : getErrorMessage(err, 'Login failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login__hero">
        <h1>
          Welcome to the
          <br />
          Crowd Management System
        </h1>
      </div>

      <form className="login__card" onSubmit={onSubmit} noValidate>
        <div className="login__brand">
          <Logo />
        </div>
        <div className="login__body">
          <div className="field">
            <label htmlFor="email">
              Log In <span aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              aria-invalid={!!error}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">
              Password <span aria-hidden="true">*</span>
            </label>
            <div className="field__password">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                aria-invalid={!!error}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
}
