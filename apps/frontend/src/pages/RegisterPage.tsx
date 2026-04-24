import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, Eye, EyeOff, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../store';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strengths: PasswordStrength[] = [
    { score: 0, label: 'Weak', color: 'bg-red-600' },
    { score: 1, label: 'Weak', color: 'bg-red-600' },
    { score: 2, label: 'Fair', color: 'bg-yellow-600' },
    { score: 3, label: 'Strong', color: 'bg-blue-600' },
    { score: 4, label: 'Very Strong', color: 'bg-green-600' },
  ];

  return { ...strengths[score], score };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useStore((s) => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted && !isLoading) {
      const timer = setTimeout(() => navigate('/'), 2000);
      return () => clearTimeout(timer);
    }
  }, [submitted, isLoading, navigate]);

  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'name':
        return value.trim() ? '' : 'Name is required';
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? ''
          : 'Please enter a valid email';
      case 'password': {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        const strength = getPasswordStrength(value);
        if (strength.score < 2) return 'Password is too weak';
        return '';
      }
      case 'confirmPassword':
        return value === password
          ? ''
          : 'Passwords do not match';
      case 'terms':
        return value === 'true' ? '' : 'You must accept the terms';
      default:
        return '';
    }
  };

  const handleBlur = (fieldName: string, value: string) => {
    const error = validateField(fieldName, value);
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nameError = validateField('name', name);
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);
    const confirmPasswordError = validateField('confirmPassword', confirmPassword);
    const termsError = validateField('terms', termsAccepted ? 'true' : '');

    const newErrors = {
      ...(nameError && { name: nameError }),
      ...(emailError && { email: emailError }),
      ...(passwordError && { password: passwordError }),
      ...(confirmPasswordError && { confirmPassword: confirmPasswordError }),
      ...(termsError && { terms: termsError }),
    };

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await register({ name, email, password });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Account created!</h1>
          <p className="text-gray-400 text-sm mb-6">
            Welcome aboard, <span className="font-semibold">{name}</span>! Taking you to your workspace…
          </p>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <Layers className="w-7 h-7 text-blue-400" />
          <span className="text-xl font-semibold text-white">DeepArch</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
        <p className="text-gray-400 text-sm mb-6">Start mapping your architecture today</p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur('name', name)}
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors ${
                fieldErrors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-700 focus:border-blue-500'
              }`}
              placeholder="Your name"
              required
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email', email)}
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors ${
                fieldErrors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-700 focus:border-blue-500'
              }`}
              placeholder="you@example.com"
              required
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password', password)}
                className={`w-full bg-gray-800 border rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none transition-colors ${
                  fieldErrors.password
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-700 focus:border-blue-500'
                }`}
                placeholder="At least 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
              >
                {passwordVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full ${
                        i < passwordStrength.score
                          ? passwordStrength.color
                          : 'bg-gray-700'
                      } transition-colors`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  passwordStrength.score >= 3 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  Strength: <span className="font-semibold">{passwordStrength.label}</span>
                </p>
              </div>
            )}

            {fieldErrors.password && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={confirmVisible ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                className={`w-full bg-gray-800 border rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none transition-colors ${
                  fieldErrors.confirmPassword
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-700 focus:border-blue-500'
                }`}
                placeholder="Confirm password"
                required
              />
              <button
                type="button"
                onClick={() => setConfirmVisible(!confirmVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
              >
                {confirmVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (e.target.checked) {
                    setFieldErrors((prev) => {
                      const { terms, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                className={`mt-0.5 w-4 h-4 rounded border transition-colors cursor-pointer ${
                  fieldErrors.terms
                    ? 'border-red-500 accent-red-600'
                    : 'border-gray-600 accent-blue-600'
                }`}
              />
              <span className="text-sm text-gray-400">
                I agree to the{' '}
                <a
                  href="#"
                  className="text-blue-400 hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="#"
                  className="text-blue-400 hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Privacy Policy
                </a>
              </span>
            </label>
            {fieldErrors.terms && (
              <p className="text-red-400 text-xs">{fieldErrors.terms}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Security Trust Signal */}
        <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-6 mb-4">
          <Lock className="w-3 h-3 flex-shrink-0" />
          <span>Your data is encrypted and secure</span>
        </div>

        {/* Sign In Link */}
        <p className="text-gray-500 text-sm text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
