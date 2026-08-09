import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../config/firebase.config';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import AdvancedCaptcha from '../../../components/common/AdvancedCaptcha';
import { ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const navigate = useNavigate();

  // OTP Verification States
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp('');
    setOtpError('');
  };

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    setError('');
    try {
      await axios.post(`${ENV.API_URL}/auth/send-otp`, { email });
      setOtpSent(true);
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to send verification code.';
      setError(errMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    setError('');
    try {
      await axios.post(`${ENV.API_URL}/auth/verify-otp`, { email, otp });
      setOtpVerified(true);
      setOtpError('');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to verify code.';
      setOtpError(errMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Sync User to Backend (Firestore)
      const token = await user.getIdToken();
      await axios.post(`${ENV.API_URL}/auth/sync`, {
        name,
        phone,
        email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate('/dashboard');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.message || 'Failed to register');
    }
  };

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength();
  const isPasswordStrong = strengthScore === 5;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-gray-100 via-gray-50 to-red-50/20 p-4 md:p-6 lg:p-8 font-sans">
      {/* Outer Card Wrapper */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-5xl min-h-[650px] flex flex-col md:flex-row transform transition-all duration-300 hover:shadow-primary/5">
        
        {/* Left Side: Illustration & Branding (Visible on MD and larger screens) */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-red-600 via-primary to-rose-700 text-white p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
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
              alt="Secure Register Illustration" 
              className="w-full max-w-[280px] lg:max-w-[320px] object-contain drop-shadow-xl" 
            />
          </div>

          {/* Bottom Callout Info */}
          <div className="relative z-10 space-y-2.5">
            <h3 className="text-xl font-bold tracking-tight">Create Secure Profile</h3>
            <p className="text-xs text-white/80 leading-relaxed font-light">
              We sync your details securely so you can order, manage, and cancel meal packages anytime.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold pt-1">
              <ShieldCheck size={14} className="animate-pulse" />
              <span>Full Encrypted Connection</span>
            </div>
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="w-full md:w-7/12 p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-xl mx-auto space-y-6">
            
            {/* Header */}
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
                Create Account
              </h2>
              <p className="mt-1.5 text-sm text-gray-500 font-normal">
                Join us to get fresh homemade meals delivered straight to you.
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
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Form Input Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-sm bg-gray-50/50 focus:bg-white text-gray-900"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Himanshu kumar"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-sm bg-gray-50/50 focus:bg-white text-gray-900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </div>

                {/* Email (Full width on grid) */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-sm bg-gray-50/50 focus:bg-white text-gray-900"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="himanshu@gmail.com"
                    disabled={otpVerified}
                    required
                  />
                </div>

                {/* Send OTP Trigger Button */}
                {!otpSent && !otpVerified && (
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!email || otpLoading}
                      onClick={handleSendOtp}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                        email && !otpLoading
                          ? 'bg-gray-800 text-white hover:bg-gray-900 cursor-pointer shadow-sm active:scale-95'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {otpLoading ? 'Sending...' : 'Send Verification Code'}
                    </button>
                  </div>
                )}

                {/* OTP Verification Input Box */}
                {otpSent && !otpVerified && (
                  <div className="md:col-span-2 p-4 bg-red-50/30 border border-red-100 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-primary">
                        Verification Code Sent!
                      </label>
                      {countdown > 0 ? (
                        <span className="text-[11px] text-gray-500 font-medium">
                          Resend code in {countdown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-[11px] text-primary hover:text-primary-hover font-bold transition focus:outline-none"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter the 6-digit code sent to <strong>{email}</strong>.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-center font-bold tracking-widest text-lg"
                      />
                      <button
                        type="button"
                        disabled={otp.length !== 6 || otpLoading}
                        onClick={handleVerifyOtp}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                          otp.length === 6 && !otpLoading
                            ? 'bg-primary text-white hover:bg-primary-hover shadow-md cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {otpLoading ? 'Verifying...' : 'Verify Code'}
                      </button>
                    </div>
                    {otpError && (
                      <p className="text-xs font-medium text-red-500 animate-shake">
                        ✗ {otpError}
                      </p>
                    )}
                  </div>
                )}

                {/* Verified Indicator Box */}
                {otpVerified && (
                  <div className="md:col-span-2 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between text-xs font-medium text-emerald-800 animate-fadeIn">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">✓</span>
                      Email address verified successfully!
                    </span>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-sm bg-gray-50/50 focus:bg-white text-gray-900"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 outline-none text-sm bg-gray-50/50 focus:bg-white text-gray-900"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Password Match and Strength Guides */}
              <div className="space-y-2 pt-1">
                {/* Match indicator */}
                {confirmPassword && (
                  <div className="text-xs transition-all duration-300 animate-fadeIn">
                    {password === confirmPassword ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        ✓ Passwords match
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold flex items-center gap-1">
                        ✗ Passwords do not match
                      </span>
                    )}
                  </div>
                )}

                {/* Password Strength meter */}
                {password && (
                  <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-fadeIn">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Password Strength:</span>
                      <span className={`font-bold transition-all duration-300 ${
                        strengthScore <= 1 ? 'text-red-500' :
                        strengthScore <= 3 ? 'text-amber-600' :
                        strengthScore === 4 ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`}>
                        {strengthScore <= 1 ? 'Weak ❌' :
                         strengthScore <= 3 ? 'Fair ⚠️' :
                         strengthScore === 4 ? 'Good 👍' :
                         'Strong 💪'}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ease-out ${
                          strengthScore <= 1 ? 'w-1/5 bg-red-500' :
                          strengthScore <= 3 ? 'w-1/2 bg-amber-500' :
                          strengthScore === 4 ? 'w-3/4 bg-yellow-400' :
                          'w-full bg-emerald-500'
                        }`}
                      />
                    </div>

                    {/* Requirements checklist */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-gray-500 pt-1">
                      <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-emerald-600 font-semibold' : ''}`}>
                        <span>{password.length >= 8 ? '✓' : '•'}</span> 8+ Characters
                      </div>
                      <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-emerald-600 font-semibold' : ''}`}>
                        <span>{/[A-Z]/.test(password) ? '✓' : '•'}</span> 1 Uppercase Letter
                      </div>
                      <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-emerald-600 font-semibold' : ''}`}>
                        <span>{/[a-z]/.test(password) ? '✓' : '•'}</span> 1 Lowercase Letter
                      </div>
                      <div className={`flex items-center gap-1 ${/\d/.test(password) ? 'text-emerald-600 font-semibold' : ''}`}>
                        <span>{/\d/.test(password) ? '✓' : '•'}</span> 1 Number
                      </div>
                      <div className={`flex items-center gap-1 col-span-2 ${/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password) ? 'text-emerald-600 font-semibold' : ''}`}>
                        <span>{/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password) ? '✓' : '•'}</span> 1 Special Character
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Captcha */}
              <div className="py-2.5 border-t border-b border-gray-100 my-2">
                <AdvancedCaptcha onVerify={setCaptchaVerified} />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isPasswordStrong || !name || !phone || !email || password !== confirmPassword || !captchaVerified || !otpVerified}
                className={`w-full py-3 rounded-xl transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 ${
                  isPasswordStrong && name && phone && email && password === confirmPassword && captchaVerified && otpVerified
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg cursor-pointer transform active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Create Account</span>
                <ArrowRight size={16} className={captchaVerified ? "animate-bounce-x" : ""} />
              </button>
            </form>

            {/* Footer switch page */}
            <div className="text-center pt-2">
              <p className="text-sm text-gray-500 font-normal">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-primary font-semibold hover:text-primary-hover transition-colors underline decoration-2 underline-offset-4 decoration-primary/30 hover:decoration-primary"
                >
                  Login
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
