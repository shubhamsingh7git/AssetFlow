import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CapabilityExplorer from './components/CapabilityExplorer';
import HowItWorks from './components/HowItWorks';
import ROICalculator from './components/ROICalculator';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import AdminPortal from './components/AdminPortal';
import OnboardingWizard from './components/OnboardingWizard';
import ForcePasswordChange from './components/ForcePasswordChange';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { LoginPage } from './components/ui/animated-characters-login-page';
import { isLoggedIn, login, adminRegister, logout, getCachedUser, cacheUser, handleGoogleCallback } from './lib/auth';
import { getOnboardingStatus } from './lib/onboarding';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  const checkOnboardingState = async () => {
    const user = getCachedUser();
    if (!user) return;
    if (user.role === 'Administrator' || (user as any).isOrganizationOwner) {
      try {
        const status = await getOnboardingStatus();
        if (!status.completed) {
          setOnboardingNeeded(true);
        } else {
          setOnboardingNeeded(false);
        }
      } catch (err) {
        // Fallback to cached state
        if (!(user as any).onboardingCompleted) {
          setOnboardingNeeded(true);
        }
      }
    } else {
      setOnboardingNeeded(false);
    }
  };

  const setUserState = (user: any) => {
    setUsername(user.username || user.name);
    setUserRole(user.role || null);
  };

  // Check auth state on mount — including Google OAuth callback & Reset Password tokens
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const authError = params.get('auth_error');

    // Check if this is a Password Reset link
    if (window.location.pathname.includes('/reset-password') || (token && !token.startsWith('ey') && !authError)) {
      if (token) {
        setResetToken(token);
        return;
      }
    }

    // Clean URL params regardless for OAuth
    if (token || authError) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle Google OAuth error
    if (authError) {
      setGoogleAuthError(authError);
      setShowLogin(true);
      return;
    }

    // Handle Google OAuth success — JWT token in URL (starts with "ey...")
    if (token && token.startsWith('ey')) {
      handleGoogleCallback(token)
        .then((user) => {
          setIsAuthenticated(true);
          setUserState(user);
          checkOnboardingState();
        })
        .catch(() => {
          setGoogleAuthError('Google authentication failed. Please try again.');
          setShowLogin(true);
        });
      return;
    }

    // Normal auth check
    if (isLoggedIn()) {
      setIsAuthenticated(true);
      const user = getCachedUser();
      if (user) {
        setUserState(user);
        checkOnboardingState();
      }
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setIsAuthenticated(true);
    const user = getCachedUser();
    if (user) {
      setUserState(user);
      // Check if employee needs to change password on first login
      if (user.forcePasswordChange && user.role !== 'Administrator') {
        setForcePasswordChange(true);
      }
    }
    setShowLogin(false);
    await checkOnboardingState();
  };

  const handleAdminRegister = async (companyName: string, adminName: string, email: string, password: string) => {
    await adminRegister(companyName, adminName, email, password);
    setIsAuthenticated(true);
    const user = getCachedUser();
    if (user) {
      setUserState(user);
    }
    setShowLogin(false);
    await checkOnboardingState();
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setUsername(null);
    setUserRole(null);
    setOnboardingNeeded(false);
    setForcePasswordChange(false);
  };

  const handlePasswordChanged = () => {
    setForcePasswordChange(false);
    // Update cached user
    const user = getCachedUser();
    if (user) {
      user.forcePasswordChange = false;
      cacheUser(user);
    }
  };

  // Render Admin Password Reset page if token is set
  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onComplete={() => {
          setResetToken(null);
          window.history.replaceState({}, '', '/');
          setShowLogin(true);
        }}
      />
    );
  }

  // If authenticated, route based on role — no frontend toggle
  if (isAuthenticated) {
    // Admin: check onboarding first
    if (userRole === 'Administrator') {
      if (onboardingNeeded) {
        return (
          <OnboardingWizard
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            onComplete={() => setOnboardingNeeded(false)}
          />
        );
      }

      return (
        <AdminPortal
          username={username}
          onLogout={handleLogout}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
        />
      );
    }

    // Employee / Department Head / Asset Manager → check force password change
    if (forcePasswordChange) {
      return (
        <ForcePasswordChange
          themeMode={themeMode}
          onPasswordChanged={handlePasswordChanged}
        />
      );
    }

    // Employee / Department Head / Asset Manager → Employee Dashboard
    return (
      <Dashboard
        username={username}
        onLogout={handleLogout}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />
    );
  }

  // Otherwise, render public landing page
  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      {/* Sticky Navigation Header */}
      <Navbar 
        isAuthenticated={isAuthenticated}
        username={username}
        onLoginClick={() => setShowLogin(true)}
        onLogoutClick={handleLogout}
      />

      {/* Main Page Layout */}
      <main className="flex-grow">
        {/* B2B Hero Section containing the Interactive Demo Screen */}
        <Hero />

        {/* Capability Explorer — 3D Carousel with Unified Controls */}
        <CapabilityExplorer />

        {/* How It Works — 4-step Process Flow */}
        <HowItWorks />

        {/* Dynamic ROI Calculator widget */}
        <ROICalculator />

        {/* Scalability and Trust Testimonials */}
        <Testimonials />
      </main>

      {/* Footer corporate notes & security logos */}
      <Footer />

      {/* Portal-based Login overlay */}
      {showLogin && (
        <LoginPage
          onLogin={handleLogin}
          onAdminRegister={handleAdminRegister}
          onClose={() => { setShowLogin(false); setGoogleAuthError(null); }}
          initialError={googleAuthError}
        />
      )}
    </div>
  );
}
