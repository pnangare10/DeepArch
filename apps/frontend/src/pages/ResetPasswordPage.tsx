import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Layers, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
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

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetPassword = useStore((s) => s.resetPassword);

  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSubmitted(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Layers className="w-7 h-7 text-blue-400" />
            <span className="text-xl font-semibold text-white">DeepArch</span>
          </div>
          <p className="text-gray-400 text-sm mb-6">Invalid or missing reset token. Please request a new password reset.</p>
          <Link to="/forgot-password" className="text-blue-400 hover:underline text-sm">
            Request password reset
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Password reset!</h1>
          <p className="text-gray-400 text-sm">Your password has been successfully reset. Redirecting to your workspace…</p>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <Layers className="w-7 h-7 text-blue-400" />
          <span className="text-xl font-semibold text-white">DeepArch</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your new password below.</p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">New Password</label>
            <div className="relative">
              <input
                type={passwordVisible ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="At least 8 characters"
                required
                autoFocus
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

            {newPassword && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full ${
                        i < passwordStrength.score ? passwordStrength.color : 'bg-gray-700'
                      } transition-colors`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${passwordStrength.score >= 3 ? 'text-green-400' : 'text-gray-400'}`}>
                  Strength: <span className="font-semibold">{passwordStrength.label}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={confirmVisible ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-blue-500"
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting…
              </>
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        <p className="text-gray-500 text-sm text-center mt-6">
          <Link to="/login" className="text-blue-400 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
