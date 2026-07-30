"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, X, Building2, Users, ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import { getGoogleAuthUrl } from "@/lib/auth";
import { forgotPassword } from "@/lib/api";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ 
  size = 12, 
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({ 
  size = 48, 
  pupilSize = 16, 
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
};

export function LoginPage({ 
  onLogin, 
  onAdminRegister,
  onClose,
  initialError
}: { 
  onLogin?: (email: string, password: string) => Promise<void>; 
  onAdminRegister?: (companyName: string, adminName: string, email: string, password: string) => Promise<void>;
  onClose?: () => void;
  initialError?: string | null;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState(initialError || "");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password modal state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess(false);

    if (!forgotEmail.trim()) {
      setForgotError("Email address is required.");
      return;
    }

    setIsForgotLoading(true);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message || "Failed to process forgot password request.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  // portalMode: which portal selector state we are in
  const [portalMode, setPortalMode] = useState<'selector' | 'admin' | 'employee'>('selector');
  // For admin flow: login vs signup
  const [isAdminSignup, setIsAdminSignup] = useState(false);
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => {
            setIsPurplePeeking(false);
          }, 800);
        }, Math.random() * 3000 + 2000);
        return peekInterval;
      };

      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsPurplePeeking(false);
    }
  }, [password, showPassword, isPurplePeeking]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));

    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  const resetFormState = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCompanyName("");
    setAdminName("");
    setError("");
    setShowPassword(false);
  };

  const handlePortalSelect = (mode: 'admin' | 'employee') => {
    resetFormState();
    setPortalMode(mode);
    if (mode === 'admin') {
      setIsAdminSignup(false); // Default to admin login
    }
  };

  const handleBackToSelector = () => {
    resetFormState();
    setPortalMode('selector');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (portalMode === 'admin' && isAdminSignup) {
        // Admin Registration
        if (!companyName || !adminName || !email || !password) {
          setError("All fields are required.");
          setIsLoading(false);
          return;
        }
        if (companyName.length < 2) {
          setError("Company name must be at least 2 characters.");
          setIsLoading(false);
          return;
        }
        if (adminName.length < 2) {
          setError("Admin name must be at least 2 characters.");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setIsLoading(false);
          return;
        }
        if (onAdminRegister) await onAdminRegister(companyName, adminName, email, password);
      } else {
        // Login (both admin and employee use same login)
        if (!email || !password) {
          setError("Invalid email or password. Please try again.");
          setIsLoading(false);
          return;
        }
        if (onLogin) await onLogin(email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleAuthUrl();
  };

  // ─── Portal Selector UI ─────────────────────────────────────────────────────
  const renderPortalSelector = () => (
    <div className="w-full max-w-[420px]">
      <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-8">
        <div className="size-8 rounded-lg bg-brand-900 text-white flex items-center justify-center p-1">
          <Logo className="w-full h-full" />
        </div>
        <span className="font-doto text-xl tracking-widest text-brand-900 uppercase">AssetFlow</span>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl tracking-tight mb-2 font-doto font-bold text-surface-900">
          Choose Portal
        </h1>
        <p className="text-surface-650 text-sm font-semibold uppercase tracking-wider font-doto">
          Select your access gateway
        </p>
      </div>

      <div className="space-y-4">
        {/* Company Admin Card */}
        <button
          type="button"
          onClick={() => handlePortalSelect('admin')}
          className="w-full group relative flex items-center gap-4 p-5 rounded-xl border-2 border-surface-200 bg-white hover:border-brand-900 hover:shadow-lg transition-all duration-300 cursor-pointer text-left"
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-doto text-base font-bold uppercase tracking-wider text-surface-900">
              Company Admin
            </h3>
            <p className="text-xs text-surface-500 font-roboto mt-0.5">
              Manage your organization, departments, employees & assets
            </p>
          </div>
          <ArrowLeft className="w-5 h-5 text-surface-400 rotate-180 group-hover:text-brand-900 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Employee Card */}
        <button
          type="button"
          onClick={() => handlePortalSelect('employee')}
          className="w-full group relative flex items-center gap-4 p-5 rounded-xl border-2 border-surface-200 bg-white hover:border-brand-900 hover:shadow-lg transition-all duration-300 cursor-pointer text-left"
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-800 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-doto text-base font-bold uppercase tracking-wider text-surface-900">
              Employee
            </h3>
            <p className="text-xs text-surface-500 font-roboto mt-0.5">
              Access your assigned assets, bookings & raise requests
            </p>
          </div>
          <ArrowLeft className="w-5 h-5 text-surface-400 rotate-180 group-hover:text-brand-900 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      <div className="text-center text-xs text-surface-500 mt-8 font-doto uppercase tracking-wider font-semibold">
        Enterprise Asset Management System
      </div>
    </div>
  );

  // ─── Admin Flow UI (Login or Signup) ────────────────────────────────────────
  const renderAdminFlow = () => (
    <div className="w-full max-w-[420px]">
      <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-8">
        <div className="size-8 rounded-lg bg-brand-900 text-white flex items-center justify-center p-1">
          <Logo className="w-full h-full" />
        </div>
        <span className="font-doto text-xl tracking-widest text-brand-900 uppercase">AssetFlow</span>
      </div>

      {/* Back Button */}
      <button
        type="button"
        onClick={handleBackToSelector}
        className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-900 font-doto uppercase tracking-wider font-semibold mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to portal selection
      </button>

      {/* Login / Signup Toggle */}
      <div className="flex bg-surface-100 p-1.5 rounded-xl border border-surface-200 mb-8 font-doto text-xs font-bold uppercase tracking-wider shadow-inner">
        <button
          type="button"
          onClick={() => { setIsAdminSignup(false); setError(""); }}
          className={`flex-1 py-2.5 rounded-lg transition-all duration-200 cursor-pointer text-center ${
            !isAdminSignup
              ? "bg-brand-900 text-white shadow-md font-extrabold"
              : "text-surface-600 hover:text-surface-900 hover:bg-surface-200/50"
          }`}
        >
          Admin Login
        </button>
        <button
          type="button"
          onClick={() => { setIsAdminSignup(true); setError(""); }}
          className={`flex-1 py-2.5 rounded-lg transition-all duration-200 cursor-pointer text-center ${
            isAdminSignup
              ? "bg-brand-900 text-white shadow-md font-extrabold"
              : "text-surface-600 hover:text-surface-900 hover:bg-surface-200/50"
          }`}
        >
          Register Company
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl tracking-tight mb-2 font-doto font-bold text-surface-900">
          {isAdminSignup ? "Register Company" : "Admin Login"}
        </h1>
        <p className="text-surface-650 text-sm font-semibold uppercase tracking-wider font-doto">
          {isAdminSignup ? "Create your organization account" : "Authenticate as company admin"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isAdminSignup && (
          <>
            <div className="space-y-1.5 transition-all duration-200">
              <Label htmlFor="companyName" className="text-xs uppercase tracking-wider text-surface-650 font-doto font-semibold">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="ABC Technologies"
                value={companyName}
                autoComplete="off"
                onChange={(e) => setCompanyName(e.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                required
                minLength={2}
                className="h-11 bg-white border-surface-200 focus:border-brand-900 focus:ring-brand-900 text-surface-900 font-roboto"
              />
            </div>
            <div className="space-y-1.5 transition-all duration-200">
              <Label htmlFor="adminName" className="text-xs uppercase tracking-wider text-surface-650 font-doto font-semibold">Admin Name</Label>
              <Input
                id="adminName"
                type="text"
                placeholder="Shubham Singh"
                value={adminName}
                autoComplete="off"
                onChange={(e) => setAdminName(e.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                required
                minLength={2}
                className="h-11 bg-white border-surface-200 focus:border-brand-900 focus:ring-brand-900 text-surface-900 font-roboto"
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-surface-650 font-doto font-semibold">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@company.com"
            value={email}
            autoComplete="off"
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
            required
            className="h-11 bg-white border-surface-200 focus:border-brand-900 focus:ring-brand-900 text-surface-900 font-roboto"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs uppercase tracking-wider text-surface-650 font-doto font-semibold">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 pr-10 bg-white border-surface-200 focus:border-brand-900 focus:ring-brand-900 text-surface-900 font-roboto"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-800 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </div>

          {!isAdminSignup && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPasswordModal(true);
                  setForgotEmail(email);
                  setForgotSuccess(false);
                  setForgotError("");
                }}
                className="text-xs font-bold text-brand-900 hover:text-brand-800 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          )}
        </div>

        {isAdminSignup && (
          <div className="space-y-1.5 transition-all duration-200">
            <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-surface-650 font-doto font-semibold">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11 bg-white border-surface-200 focus:border-brand-900 focus:ring-brand-900 text-surface-900 font-roboto"
              />
            </div>
          </div>
        )}

        {!isAdminSignup && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" className="border-surface-300 data-[state=checked]:bg-brand-900 data-[state=checked]:text-white data-[state=checked]:border-brand-900" />
              <Label
                htmlFor="remember"
                className="text-xs font-semibold text-surface-650 cursor-pointer uppercase tracking-wider font-doto"
              >
                Remember Me
              </Label>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-650 bg-red-500/10 border border-red-500/20 rounded-lg font-doto uppercase tracking-wider">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-11 text-base font-bold font-doto uppercase tracking-widest bg-brand-900 hover:bg-brand-800 text-white cursor-pointer mt-2" 
          size="lg" 
          disabled={isLoading}
        >
          {isLoading 
            ? (isAdminSignup ? "Creating Company..." : "Logging In...") 
            : (isAdminSignup ? "Register Company" : "Login as Admin")
          }
        </Button>

        {!isAdminSignup && (
          <>
            <div className="relative flex items-center gap-4 py-1">
              <div className="flex-1 border-t border-surface-200"></div>
              <span className="text-xs text-surface-500 font-doto uppercase tracking-wider font-semibold">Or</span>
              <div className="flex-1 border-t border-surface-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-surface-200 rounded-lg text-sm font-bold text-surface-700 hover:bg-surface-50 hover:border-surface-300 transition-all font-doto uppercase tracking-wider cursor-pointer shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </form>

      <div className="text-center text-xs text-surface-500 mt-6 font-doto uppercase tracking-wider font-semibold">
        {isAdminSignup ? (
          <>
            Already registered?{" "}
            <button
              type="button"
              onClick={() => { setIsAdminSignup(false); setError(""); }}
              className="text-brand-900 font-bold hover:underline hover:text-brand-800 transition-colors cursor-pointer"
            >
              Admin Login
            </button>
          </>
        ) : (
          <>
            New company?{" "}
            <button
              type="button"
              onClick={() => { setIsAdminSignup(true); setError(""); }}
              className="text-brand-900 font-bold hover:underline hover:text-brand-800 transition-colors cursor-pointer"
            >
              Register Company
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ─── Employee Flow UI (Login only) ──────────────────────────────────────────
  const renderEmployeeFlow = () => (
    <div className="w-full max-w-[420px]">
      <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-8">
        <div className="size-8 rounded-lg bg-brand-900 text-white flex items-center justify-center p-1">
          <Logo className="w-full h-full" />
        </div>
        <span className="font-doto text-xl tracking-widest text-brand-900 uppercase">AssetFlow</span>
      </div>

      {/* Back Button */}
      <button
        type="button"
        onClick={handleBackToSelector}
        className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-900 font-doto uppercase tracking-wider font-semibold mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to portal selection
      </button>

      <div className="text-center mb-8">
        <h1 className="text-3xl tracking-tight mb-2 font-doto font-bold text-surface-900">
          Employee Login
        </h1>
        <p className="text-surface-650 text-sm font-semibold uppercase tracking-wider font-doto">
          Sign in with your company credentials
        </p>
      </div>

      {/* Info banner — employees don't self-register */}
      <div className="p-3 mb-6 text-xs text-brand-900 bg-brand-50 border border-brand-200 rounded-lg font-doto uppercase tracking-wider text-center font-semibold">
        Your account is created by your Company Admin
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-surface-650 font-doto font-semibold">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            autoComplete="off"
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
            required
            className="h-11 bg-white border-surface-200 focus:border-brand-900 focus:ring-brand-900 text-surface-900 font-roboto"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs uppercase tracking-wider text-surface-650 font-doto font-semibold">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 pr-10 bg-white border-surface-200 focus:border-brand-900 focus:ring-brand-900 text-surface-900 font-roboto"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-800 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <Checkbox id="remember-emp" className="border-surface-300 data-[state=checked]:bg-brand-900 data-[state=checked]:text-white data-[state=checked]:border-brand-900" />
            <Label
              htmlFor="remember-emp"
              className="text-xs font-semibold text-surface-650 cursor-pointer uppercase tracking-wider font-doto"
            >
              Remember Me
            </Label>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-650 bg-red-500/10 border border-red-500/20 rounded-lg font-doto uppercase tracking-wider">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-11 text-base font-bold font-doto uppercase tracking-widest bg-brand-900 hover:bg-brand-800 text-white cursor-pointer mt-2" 
          size="lg" 
          disabled={isLoading}
        >
          {isLoading ? "Logging In..." : "Login as Employee"}
        </Button>

        <div className="relative flex items-center gap-4 py-1">
          <div className="flex-1 border-t border-surface-200"></div>
          <span className="text-xs text-surface-500 font-doto uppercase tracking-wider font-semibold">Or</span>
          <div className="flex-1 border-t border-surface-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-surface-200 rounded-lg text-sm font-bold text-surface-700 hover:bg-surface-50 hover:border-surface-300 transition-all font-doto uppercase tracking-wider cursor-pointer shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-6.16z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="text-center text-xs text-surface-500 mt-6 font-doto uppercase tracking-wider font-semibold">
        Don't have credentials? Contact your Company Admin
      </div>
    </div>
  );

  return (
    <div 
      className="min-h-screen grid lg:grid-cols-2 fixed inset-0 z-[100] bg-surface-50 font-roboto select-none"
      style={{
        backgroundImage: `linear-gradient(rgba(248, 249, 250, 0.94), rgba(248, 249, 250, 0.98)), url('/clean_space_chains_bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Interactive Characters Left Column */}
      <div className="relative hidden lg:flex flex-col justify-between border-r border-surface-200 p-12 text-surface-900 overflow-hidden">
        <div className="relative z-20">
          <div className="flex items-center gap-2.5 text-lg font-semibold">
            <div className="size-8 rounded-lg bg-brand-900 text-white flex items-center justify-center p-1">
              <Logo className="w-full h-full" />
            </div>
            <span className="font-doto text-xl tracking-widest text-brand-900 uppercase">AssetFlow</span>
          </div>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <div className="relative" style={{ width: '550px', height: '400px' }}>
            {/* Purple Character */}
            <div 
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '70px',
                width: '180px',
                height: (isTyping || (password.length > 0 && !showPassword)) ? '440px' : '400px',
                backgroundColor: '#6C3FF5',
                borderRadius: '10px 10px 0 0',
                zIndex: 1,
                transform: (password.length > 0 && showPassword)
                  ? `skewX(0deg)`
                  : (isTyping || (password.length > 0 && !showPassword))
                    ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)` 
                    : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${20}px` : isLookingAtEachOther ? `${55}px` : `${45 + purplePos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? `${35}px` : isLookingAtEachOther ? `${65}px` : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall 
                  size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" 
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
                <EyeBall 
                  size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" 
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              </div>
            </div>

            {/* Black Character */}
            <div 
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '240px',
                width: '120px',
                height: '310px',
                backgroundColor: '#2D2D2D',
                borderRadius: '8px 8px 0 0',
                zIndex: 2,
                transform: (password.length > 0 && showPassword)
                  ? `skewX(0deg)`
                  : isLookingAtEachOther
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : (isTyping || (password.length > 0 && !showPassword))
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)` 
                      : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${10}px` : isLookingAtEachOther ? `${32}px` : `${26 + blackPos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? `${28}px` : isLookingAtEachOther ? `${12}px` : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall 
                  size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" 
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
                <EyeBall 
                  size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" 
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              </div>
            </div>

            {/* Orange Character */}
            <div 
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '0px',
                width: '240px',
                height: '200px',
                zIndex: 3,
                backgroundColor: '#FF9B6B',
                borderRadius: '120px 120px 0 0',
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${50}px` : `${82 + (orangePos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${85}px` : `${90 + (orangePos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
            </div>

            {/* Yellow Character */}
            <div 
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '310px',
                width: '140px',
                height: '230px',
                backgroundColor: '#E8D754',
                borderRadius: '70px 70px 0 0',
                zIndex: 4,
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${20}px` : `${52 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${35}px` : `${40 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
              <div 
                className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${10}px` : `${40 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${88}px` : `${88 + (yellowPos.faceY || 0)}px`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      </div>

      {/* Form Right Column */}
      <div className="relative flex items-center justify-center p-8 text-surface-900">
        {/* Close Button overlay */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 text-surface-500 hover:text-surface-900 transition-all bg-surface-100 hover:bg-surface-200 p-2.5 rounded-full border border-surface-200 hover:scale-105 active:scale-95 cursor-pointer"
            title="Return to landing page"
          >
            <X className="size-5" />
          </button>
        )}

        {portalMode === 'selector' && renderPortalSelector()}
        {portalMode === 'admin' && renderAdminFlow()}
        {portalMode === 'employee' && renderEmployeeFlow()}
      </div>

      {/* Admin Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-surface-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl text-surface-900 dark:text-zinc-100">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider font-sans">
                Admin Password Recovery
              </h3>
              <button onClick={() => setShowForgotPasswordModal(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-white font-bold cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4 p-2 text-center">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200 font-bold">
                  ✓
                </div>
                <h4 className="font-extrabold text-sm uppercase text-surface-900 dark:text-white">Reset Link Dispatched</h4>
                <p className="text-xs text-surface-600 dark:text-zinc-400 leading-relaxed font-medium">
                  If a Company Administrator account with email <strong>{forgotEmail}</strong> exists, a password reset link has been emailed via Resend. Check your inbox and follow the instructions.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="w-full bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-xs text-surface-600 dark:text-zinc-400 font-medium">
                  Enter your registered Company Admin email address. We will generate a secure reset link and email it to you via Resend.
                </p>

                {forgotError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">
                    {forgotError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="forgot_email" className="text-xs uppercase tracking-wider text-surface-650 font-semibold">
                    Admin Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="forgot_email"
                    type="email"
                    placeholder="admin@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="h-11 bg-white dark:bg-zinc-950 border-surface-200 dark:border-zinc-800 focus:border-brand-900 text-surface-900 dark:text-white font-roboto"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-grow bg-white dark:bg-zinc-900 hover:bg-surface-50 dark:hover:bg-zinc-800 border border-surface-300 dark:border-zinc-800 text-surface-700 dark:text-zinc-300 rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="flex-grow bg-brand-900 hover:bg-brand-800 text-white rounded-lg h-10 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 flex items-center justify-center"
                  >
                    {isForgotLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Component = LoginPage;
