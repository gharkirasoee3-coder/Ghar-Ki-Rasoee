import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../config/firebase.config';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import AdvancedCaptcha from '../../../components/common/AdvancedCaptcha';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // Redirect after successful login once role is loaded
  useEffect(() => {
    if (user && role) {
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.message || 'Failed to login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-gray-100 via-gray-50 to-red-50/20 p-4 md:p-6 lg:p-8 font-sans">
      {/* Outer Card Wrapper */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl min-h-[600px] flex flex-col md:flex-row transform transition-all duration-300 hover:shadow-primary/5">
        
        {/* Left Side: Illustration & Branding (Visible on MD and larger screens) */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-red-600 via-primary to-rose-700 text-white p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
          {/* Animated Decorative Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-48 h-48 rounded-full bg-white/10 blur-2xl animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 rounded-full bg-white/10 blur-2xl animate-blob [animation-delay:2s]" />
          
          {/* Top Logo Watermark */}
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="font-semibold text-lg tracking-wider">Ghar Ki Rasoee</span>
          </div>

          {/* SVG Illustration Container */}
          <div className="relative z-10 flex flex-col items-center justify-center my-8 flex-1 animate-wiggle">
            <img 
              src="/Fingerprint-bro.svg" 
              alt="Secure Login Illustration" 
              className="w-full max-w-[280px] lg:max-w-[320px] object-contain drop-shadow-xl" 
            />
          </div>

          {/* Bottom Callout Info */}
          <div className="relative z-10 space-y-2.5">
            <h3 className="text-xl font-bold tracking-tight">Protecting Your Account</h3>
            <p className="text-xs text-white/80 leading-relaxed font-light">
              We secure your identity and subscription profiles with standard high-level security verification checks.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold pt-1">
              <ShieldCheck size={14} className="animate-pulse" />
              <span>Full Encrypted Connection</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto space-y-6">
            
            {/* Header */}
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
                Welcome Back
              </h2>
              <p className="mt-1.5 text-sm text-gray-500 font-normal">
                Log in to order fresh meals or customize your subscription.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3.5 bg-red-50 border-l-4 border-red-500 rounded-md text-xs font-medium text-red-700 animate-fadeIn flex items-center gap-2">
                <span className="flex-shrink-0 text-red-500">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-sm bg-gray-50/50 focus:bg-white text-gray-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="himanshu@gmail.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-sm bg-gray-50/50 focus:bg-white text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="py-2.5 border-t border-b border-gray-100 my-2">
                <AdvancedCaptcha onVerify={setCaptchaVerified} />
              </div>

              <button
                type="submit"
                disabled={!captchaVerified}
                className={`w-full py-3 rounded-xl transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 ${
                  captchaVerified
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg cursor-pointer transform active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Login</span>
                <ArrowRight size={16} className={captchaVerified ? "animate-bounce-x" : ""} />
              </button>
            </form>

            {/* Footer switch page */}
            <div className="text-center pt-2">
              <p className="text-sm text-gray-500 font-normal">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-primary font-semibold hover:text-primary-hover transition-colors underline decoration-2 underline-offset-4 decoration-primary/30 hover:decoration-primary"
                >
                  Create one now
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
