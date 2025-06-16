import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  
  if (!auth) return <Navigate to="/login" />;
  if (!auth.currentUser) return <Navigate to="/login" />;
  
  return children;
}
