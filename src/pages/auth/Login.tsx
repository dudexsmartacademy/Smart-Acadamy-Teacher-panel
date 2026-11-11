import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Users,
  LineChart,
  BadgeCheck,
  X,
  ArrowLeft,
  KeyRound,
  RotateCcw,
  Edit3,
} from 'lucide-react';

type AuthMethod = 'password' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, sendOtp, verifyOtp } = useAuth();

  // Selected sign-in method: 'password' or 'otp'
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');

  // Password Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Login State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  // Common UI State
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotStep, setForgotStep] = useState<'input' | 'success'>('input');
  const [forgotError, setForgotError] = useState<string | null>(null);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  // Method Switcher
  const handleMethodChange = (method: AuthMethod) => {
    setAuthMethod(method);
    setError(null);
    setSuccessMessage(null);
  };

  // ----------------------------------------------------
  // 1. Password Sign-In Handler
  // ----------------------------------------------------
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      setError('Please provide a valid faculty email address.');
      return;
    }

    if (!loginPassword) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await signIn(
        loginEmail.trim(),
        loginPassword
      );

      if (authError) {
        setError(authError);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError(
        'An unexpected error occurred during sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 2. OTP Sign-In Handlers
  // ----------------------------------------------------
  const handleSendOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (!otpEmail.trim() || !otpEmail.includes('@')) {
      setError(
        'Please enter a valid faculty email address to receive OTP.'
      );
      return;
    }

    setOtpLoading(true);

    try {
      const result = await sendOtp(otpEmail.trim());

      if (result.error) {
        setError(result.error);
      } else {
        setOtpSent(true);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpTimer(45);

        setSuccessMessage(
          result.message || `Verification code sent to ${otpEmail}`
        );

        // Focus first digit box
        setTimeout(() => {
          digitRefs.current[0]?.focus();
        }, 100);
      }
    } catch {
      setError(
        'Failed to dispatch OTP code. Please check connection and try again.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste event of multi-character code
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, '').slice(0, 6).split('');

      if (pastedDigits.length > 0) {
        const newDigits = [...otpDigits];

        pastedDigits.forEach((digit, i) => {
          if (index + i < 6) {
            newDigits[index + i] = digit;
          }
        });

        setOtpDigits(newDigits);

        const nextFocus = Math.min(index + pastedDigits.length, 5);
        digitRefs.current[nextFocus]?.focus();
      }

      return;
    }

    // Single digit input
    const cleanValue = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleanValue && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();

    const token = otpDigits.join('');

    if (token.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error: verifyError } = await verifyOtp(
        otpEmail.trim(),
        token
      );

      if (verifyError) {
        setError(verifyError);
      } else {
        setSuccessMessage(
          'OTP verified successfully! Launching workspace...'
        );

        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch {
      setError('Failed to verify OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 3. Forgot Password / Faculty Recovery Handlers
  // ----------------------------------------------------
  const openForgotModal = (prefill?: string) => {
    setForgotEmail(prefill || loginEmail || '');
    setForgotStep('input');
    setForgotError(null);
    setShowForgotModal(true);
  };

  const handleCheckForgotAccount = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const clean = forgotEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setForgotError('Please enter a valid faculty email address.');
      return;
    }

    setForgotSent(true);

    try {
      const res = await authService.resetPasswordForEmail(clean);

      if (res.error) {
        setForgotError(res.error);
      } else {
        setForgotStep('success');
      }
    } catch {
      setForgotError('Failed to send password reset instructions. Please try again.');
    } finally {
      setForgotSent(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1b1c1e] flex flex-col justify-between selection:bg-[#d8bd96] selection:text-[#1b1c1e] relative font-sans">

      {/* Decorative ambient background accents */}
      <div className="fixed top-0 right-0 w-[450px] h-[450px] bg-[#e9ded0]/40 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40 -z-10" />

      <div className="fixed bottom-0 left-0 w-[550px] h-[550px] bg-[#f3ece3]/70 rounded-full blur-3xl pointer-events-none -ml-40 -mb-40 -z-10" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-[#e7ded3] bg-[#fffdf9]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#1b1c1e] text-[#faf7f2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden p-1">
            <img src="/logo.png" alt="DudeX Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#1b1c1e] font-serif leading-none">
              Dudex Smart Academy
            </h1>

            <p className="text-[10px] font-medium text-[#8c857d] uppercase tracking-wider mt-0.5">
              Teacher Portal Gateway
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-[#554b42] hover:text-[#1b1c1e] px-2.5 py-1.5 rounded-lg hover:bg-[#f3ece3] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9c7449]" />
            <span>Academy Home</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3ece3] border border-[#e7ded3] text-[11px] font-medium text-[#554b42]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#b08e67]" />
            <span>Secure Access</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto">

          {/* Left Column: Brand & Portal Feature Showcase */}
          <div className="lg:col-span-5 hidden lg:flex flex-col justify-between rounded-3xl bg-[#1b1c1e] text-[#faf7f2] p-6 xl:p-8 shadow-lg relative overflow-hidden">

            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#b08e67_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-[#b08e67]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#242527] border border-[#3b3a39] text-[10px] font-semibold text-[#b08e67] mb-4">
                <Sparkles className="w-3 h-3" />
                <span>Next-Gen Educator Hub</span>
              </div>

              <h2 className="text-xl xl:text-2xl font-bold tracking-tight text-white leading-snug font-serif">
                Streamlined Teaching, Smart Assessments &amp; Real-Time Insights.
              </h2>

              <p className="mt-2.5 text-xs text-[#8c857d] leading-relaxed">
                Welcome to Dudex Smart Academy faculty portal. Build adaptive
                MCQ tests, conduct live classes, and monitor student outcomes
                in one unified platform.
              </p>

              {/* Feature Highlights List */}
              <div className="mt-5 space-y-3">

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#242527]/70 border border-[#383736]/60">
                  <div className="p-1.5 rounded-lg bg-[#b08e67]/15 text-[#b08e67] shrink-0 mt-0.5">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      Smart Question Bank &amp; MCQs
                    </h4>

                    <p className="text-[10px] text-[#8c857d] mt-0.5">
                      Automated test generation with adaptive grading.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#242527]/70 border border-[#383736]/60">
                  <div className="p-1.5 rounded-lg bg-[#b08e67]/15 text-[#b08e67] shrink-0 mt-0.5">
                    <LineChart className="w-3.5 h-3.5" />
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      Student Analytics &amp; At-Risk Alerts
                    </h4>

                    <p className="text-[10px] text-[#8c857d] mt-0.5">
                      Identify struggling students early with rich metrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#242527]/70 border border-[#383736]/60">
                  <div className="p-1.5 rounded-lg bg-[#b08e67]/15 text-[#b08e67] shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      Attendance &amp; Classroom Workflow
                    </h4>

                    <p className="text-[10px] text-[#8c857d] mt-0.5">
                      Record attendance and share lecture notes easily.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Testimonial / Trust Tag */}
            <div className="relative z-10 mt-6 pt-4 border-t border-[#2e2f32] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#b08e67] font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Trusted by 45+ Departments</span>
                </div>

                <p className="text-[10px] text-[#8c857d] mt-0.5">
                  Dudex Academic Suite • Version 2.4
                </p>
              </div>

              <div className="flex -space-x-1.5">
                <div className="w-6 h-6 rounded-full bg-[#3b3a39] border-2 border-[#1b1c1e] flex items-center justify-center text-[9px] font-bold text-white">
                  CS
                </div>

                <div className="w-6 h-6 rounded-full bg-[#b08e67] border-2 border-[#1b1c1e] flex items-center justify-center text-[9px] font-bold text-white">
                  AI
                </div>

                <div className="w-6 h-6 rounded-full bg-[#5e8065] border-2 border-[#1b1c1e] flex items-center justify-center text-[9px] font-bold text-white">
                  MA
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Sign-In Form */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-[#fffdf9] border border-[#e7ded3] rounded-3xl p-5 sm:p-7 shadow-[0_4px_24px_rgb(27,28,30,0.05)]">

              {/* Header inside form */}
              <div className="mb-4">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1b1c1e] font-serif">
                  Faculty Sign In
                </h3>

                <p className="text-xs text-[#8c857d] mt-1">
                  Authenticate using your registered faculty credentials or
                  instant email OTP.
                </p>
              </div>

              {/* Sign-In Method Selector Tabs */}
              <div className="flex p-1 bg-[#f3ece3] rounded-xl mb-4 border border-[#e7ded3]/80">
                <button
                  type="button"
                  onClick={() => handleMethodChange('password')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-180 flex items-center justify-center gap-2 cursor-pointer ${
                    authMethod === 'password'
                      ? 'bg-[#fffdf9] text-[#1b1c1e] shadow-xs font-bold'
                      : 'text-[#8c857d] hover:text-[#1b1c1e]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange('otp')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-180 flex items-center justify-center gap-2 cursor-pointer ${
                    authMethod === 'otp'
                      ? 'bg-[#fffdf9] text-[#1b1c1e] shadow-xs font-bold'
                      : 'text-[#8c857d] hover:text-[#1b1c1e]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Email OTP Login</span>
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-3.5 bg-[#f8ebe7] border border-[#f2ded8] rounded-xl flex flex-col gap-2 text-xs text-[#a75b52] animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#a75b52]" />
                    <span className="flex-1 leading-relaxed">{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-[#a75b52] hover:opacity-70 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {authMethod === 'otp' && (error.includes('Password Login') || error.includes('provisioned') || error.includes('credentials')) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (otpEmail) setLoginEmail(otpEmail);
                        handleMethodChange('password');
                      }}
                      className="self-start text-[11px] font-bold text-[#9c7449] hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Switch to Password Login &rarr;</span>
                    </button>
                  )}
                  {authMethod === 'password' && (error.includes('credentials') || error.includes('password') || error.includes('assigned')) && (
                    <button
                      type="button"
                      onClick={() => openForgotModal(loginEmail)}
                      className="self-start text-[11px] font-bold text-[#9c7449] hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                    >
                      <Sparkles className="w-3 h-3 text-[#b08e67]" />
                      <span>Account provisioned by Admin? Recover or Set Password &rarr;</span>
                    </button>
                  )}
                </div>
              )}

              {/* Success Banner */}
              {successMessage && (
                <div className="mb-4 p-3 bg-[#edf1e9] border border-[#e4ebdf] rounded-xl flex items-center gap-2.5 text-xs text-[#5e8065] animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#5e8065]" />

                  <span className="flex-1">{successMessage}</span>

                  <button
                    type="button"
                    onClick={() => setSuccessMessage(null)}
                    className="text-[#5e8065] hover:opacity-70 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* METHOD 1: EMAIL & PASSWORD LOGIN */}
              {authMethod === 'password' && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="space-y-3.5"
                >
                  {/* Email Input */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#554b42] mb-1">
                      Faculty Email Address
                    </label>

                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8c857d]">
                        <Mail className="h-4 w-4" />
                      </div>

                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="teacher@dudex.local"
                        className="block w-full pl-9 pr-3.5 py-2.5 bg-[#fffdf9] border border-[#e7ded3] rounded-xl text-xs sm:text-sm text-[#1b1c1e] placeholder-[#8c857d] focus:outline-none focus:border-[#b08e67] focus:ring-2 focus:ring-[#b08e67]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#554b42]">
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={() => openForgotModal(loginEmail)}
                        className="text-[11px] text-[#9c7449] hover:text-[#1b1c1e] font-medium transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8c857d]">
                        <Lock className="h-4 w-4" />
                      </div>

                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full pl-9 pr-9 py-2.5 bg-[#fffdf9] border border-[#e7ded3] rounded-xl text-xs sm:text-sm text-[#1b1c1e] placeholder-[#8c857d] focus:outline-none focus:border-[#b08e67] focus:ring-2 focus:ring-[#b08e67]/20 transition-all"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowLoginPassword(!showLoginPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8c857d] hover:text-[#1b1c1e] transition-colors cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#554b42] select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[#e7ded3] text-[#1b1c1e] focus:ring-[#b08e67] cursor-pointer"
                      />

                      <span>Keep me signed in on this device</span>
                    </label>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1 flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#faf7f2] bg-[#1b1c1e] hover:bg-[#242527] active:scale-[0.99] shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </div>
                    ) : (
                      <>
                        <span>Sign In with Password</span>
                        <ArrowRight className="w-4 h-4 text-[#b08e67]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* METHOD 2: EMAIL OTP LOGIN */}
              {authMethod === 'otp' && (
                <div className="space-y-4">
                  {!otpSent ? (
                    /* Step 1: Request OTP */
                    <form
                      onSubmit={handleSendOtp}
                      className="space-y-3.5"
                    >
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#554b42] mb-1">
                          Faculty Email Address
                        </label>

                        <div className="relative rounded-xl shadow-xs">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8c857d]">
                            <Mail className="h-4 w-4" />
                          </div>

                          <input
                            type="email"
                            required
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            placeholder="faculty@dudex.edu"
                            className="block w-full pl-9 pr-3.5 py-2.5 bg-[#fffdf9] border border-[#e7ded3] rounded-xl text-xs sm:text-sm text-[#1b1c1e] placeholder-[#8c857d] focus:outline-none focus:border-[#b08e67] focus:ring-2 focus:ring-[#b08e67]/20 transition-all"
                          />
                        </div>

                        <p className="text-[11px] text-[#8c857d] mt-1.5 leading-relaxed">
                          We will generate and dispatch a secure 6-digit
                          one-time passcode to your email inbox.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={otpLoading}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#faf7f2] bg-[#1b1c1e] hover:bg-[#242527] active:scale-[0.99] shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        {otpLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Sending OTP Code...</span>
                          </div>
                        ) : (
                          <>
                            <span>Get OTP on Email</span>
                            <ArrowRight className="w-4 h-4 text-[#b08e67]" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Step 2: Enter & Verify 6-digit OTP */
                    <form
                      onSubmit={handleVerifyOtp}
                      className="space-y-4 animate-in fade-in duration-200"
                    >
                      <div className="p-3 bg-[#f3ece3]/60 border border-[#e7ded3] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#b08e67]/20 text-[#9c7449]">
                            <Mail className="w-4 h-4" />
                          </div>

                          <div>
                            <p className="text-[11px] text-[#8c857d]">
                              OTP dispatched to:
                            </p>

                            <p className="text-xs font-semibold text-[#1b1c1e] truncate max-w-[180px] sm:max-w-xs">
                              {otpEmail}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setError(null);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#9c7449] hover:text-[#1b1c1e] px-2 py-1 rounded-lg hover:bg-[#e7ded3]/50 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>

                      {/* 6 OTP Input Boxes */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#554b42] mb-2 text-center">
                          Enter 6-Digit Verification Code
                        </label>

                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          {otpDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                digitRefs.current[idx] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={digit}
                              onChange={(e) =>
                                handleDigitChange(idx, e.target.value)
                              }
                              onKeyDown={(e) =>
                                handleDigitKeyDown(idx, e)
                              }
                              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold text-[#1b1c1e] bg-[#fffdf9] border-2 border-[#e7ded3] focus:border-[#b08e67] focus:ring-2 focus:ring-[#b08e67]/20 rounded-xl outline-none transition-all"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Resend & Demo OTP Helpers */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-[#8c857d] pt-1">
                        <div>
                          {otpTimer > 0 ? (
                            <span>
                              Resend OTP in{' '}
                              <strong className="text-[#1b1c1e]">
                                {otpTimer}s
                              </strong>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendOtp()}
                              disabled={otpLoading}
                              className="flex items-center gap-1 font-semibold text-[#9c7449] hover:text-[#1b1c1e] cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Resend OTP Code</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Verify Button */}
                      <button
                        type="submit"
                        disabled={
                          loading || otpDigits.join('').length !== 6
                        }
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#faf7f2] bg-[#1b1c1e] hover:bg-[#242527] active:scale-[0.99] shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Verifying OTP...</span>
                          </div>
                        ) : (
                          <>
                            <span>Verify OTP &amp; Sign In</span>
                            <ArrowRight className="w-4 h-4 text-[#b08e67]" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Google sign-in and its divider have been removed. */}

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#e7ded3] bg-[#fffdf9] px-4 sm:px-8 py-4 text-center text-xs text-[#8c857d]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 font-serif font-bold text-[#1b1c1e]">
            <img src="/logo.png" alt="DudeX Logo" className="w-4 h-4 object-contain inline-block" />
            <span>Dudex Smart Academy</span>
          </div>

          <p>
            © {new Date().getFullYear()} Dudex Smart Academy. Faculty
            Management and Academic Assessment Platform.
          </p>

          <div className="flex items-center gap-4 text-[11px] text-[#8c857d]">
            <span>Faculty Security Policy</span>
            <span>•</span>
            <span>Academic Support</span>
            <span>•</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>

      {/* Forgot Password / Provisioned Faculty Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fffdf9] border border-[#e7ded3] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8c857d] hover:text-[#1b1c1e] hover:bg-[#f3ece3] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-5 pb-3 border-b border-[#e7ded3]">
              <div className="w-11 h-11 rounded-xl bg-[#f3ece3] text-[#9c7449] flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1b1c1e] font-serif leading-tight">
                  Faculty Account &amp; Password Recovery
                </h3>
                <p className="text-xs text-[#8c857d] mt-0.5">
                  Direct credential recovery and password configuration for faculty accounts.
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-[#f8ebe7] border border-[#f2ded8] rounded-xl flex items-center gap-2 text-xs text-[#a75b52]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Step 1: Email Check */}
            {forgotStep === 'input' && (
              <form onSubmit={handleCheckForgotAccount} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#554b42] mb-1.5">
                    Faculty Email Address
                  </label>

                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8c857d]">
                      <Mail className="h-4 w-4" />
                    </div>

                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. absolutionchennai@gmail.com"
                      className="block w-full pl-9 pr-3.5 py-2.5 bg-[#fffdf9] border border-[#e7ded3] rounded-xl text-xs sm:text-sm text-[#1b1c1e] placeholder-[#8c857d] focus:outline-none focus:border-[#b08e67] focus:ring-2 focus:ring-[#b08e67]/20 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-[#8c857d] mt-1.5 leading-relaxed">
                    Enter the email registered by your Academy Administrator.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#554b42] hover:bg-[#f3ece3] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={forgotSent}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#faf7f2] bg-[#1b1c1e] hover:bg-[#242527] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {forgotSent ? 'Sending Instructions...' : 'Send Reset Instructions'}
                    <ArrowRight className="w-3.5 h-3.5 text-[#b08e67]" />
                  </button>
                </div>
              </form>
            )}

            {/* Reset link requested */}
            {forgotStep === 'success' && (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1b1c1e]">
                    Instructions Dispatched
                  </h4>
                  <p className="text-xs text-[#8c857d]">
                    If an account is registered with this email, password reset instructions will arrive shortly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-[#faf7f2] bg-[#1b1c1e] hover:bg-[#242527] cursor-pointer transition-all"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}