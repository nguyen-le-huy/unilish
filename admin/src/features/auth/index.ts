// ====================================
// AUTH FEATURE - PUBLIC API
// ====================================
// This file defines the public interface of the auth feature.
// Only import from this file when using auth feature from outside.

// Pages
export { default as LoginPage } from './pages/LoginPage/LoginPage';

// Components (if needed outside feature)
export { LoginForm } from './components/LoginForm/LoginForm';

// Hooks
export { useLogin, useLogout } from './hooks/useAuth';

// Types
export type { LoginFormData } from './types/auth.schema';
export { loginSchema } from './types/auth.schema';

// Store (for use in other parts of app)
export { useAuthStore } from './store/auth.store';
