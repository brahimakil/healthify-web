import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to log in. Please check your credentials.');
      console.error(error);
    }
    
    setLoading(false);
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-${theme.colors.background.light} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-md w-full space-y-8 bg-${theme.card.background} p-8 rounded-xl shadow-lg`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold text-${theme.colors.text.dark}`}>
            Sign in to Healthify
          </h2>
          <p className={`mt-2 text-center text-sm text-${theme.colors.text.muted}`}>
            Your professional dietitian portal
          </p>
        </div>
        
        {error && (
          <div className={`p-3 rounded-md bg-${theme.colors.danger} bg-opacity-10 text-${theme.colors.danger}`}>
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-3 border border-${theme.colors.text.muted} placeholder-${theme.colors.text.muted} text-${theme.colors.text.dark} rounded-t-md focus:outline-none focus:ring-${theme.colors.primary} focus:border-${theme.colors.primary} focus:z-10 sm:text-sm`}
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-3 border border-${theme.colors.text.muted} placeholder-${theme.colors.text.muted} text-${theme.colors.text.dark} rounded-b-md focus:outline-none focus:ring-${theme.colors.primary} focus:border-${theme.colors.primary} focus:z-10 sm:text-sm`}
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className={`h-4 w-4 text-${theme.colors.primary} focus:ring-${theme.colors.primary} border-${theme.colors.text.muted} rounded`}
              />
              <label htmlFor="remember-me" className={`ml-2 block text-sm text-${theme.colors.text.light}`}>
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className={`font-medium text-${theme.colors.primary} hover:text-${theme.button.primaryHover}`}>
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-black font-bold"
              style={{ color: 'black', backgroundColor: '#4f46e5' }}
            >
              {loading ? <LoadingSpinner /> : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <Link to="/signup" className={`font-medium text-${theme.colors.primary} hover:text-${theme.button.primaryHover}`}>
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
