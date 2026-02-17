// ====================================
// AUTH FEATURE - PUBLIC API
// ====================================

// Pages
export { default as LoginPage } from './pages/LoginPage/LoginPage';
export { default as RegisterPage } from './pages/RegisterPage/RegisterPage';
export { default as OTPVerifyPage } from './pages/OTPVerifyPage/OTPVerifyPage';
export { default as AuthSuccessPage } from './pages/AuthSuccessPage/AuthSuccessPage';

// Hooks
export * from './hooks/useLogin';
export * from './hooks/useRegister';
export * from './hooks/useVerifyOTP';
export * from './hooks/useGoogleCallback';

// Types
export * from './types';

// Components (optional - usually internal)
// export { default as LoginForm } from './components/form/LoginForm';
// export { default as RegisterForm } from './components/form/RegisterForm';
// export { default as OTPForm } from './components/form/OTPForm';
