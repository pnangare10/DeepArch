import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, CheckCircle2, Loader2, Copy } from 'lucide-react';
import { useStore } from '../store';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const forgotPassword = useStore((s) => s.forgotPassword);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await forgotPassword(email);
      setSubmitted(true);
      if (result.devToken) {
        setDevToken(result.devToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToken = () => {
    if (devToken) {
      navigator.clipboard.writeText(devToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 text-sm mb-6">
            If an account exists for <span className="font-semibold">{email}</span>, we've sent a password reset link.
          </p>

          {devToken && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-gray-400 mb-2">Development Mode: Reset Token</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-gray-300 break-all">{devToken}</code>
                <button
                  onClick={copyToken}
                  className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                  title="Copy token"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <p className="text-xs text-green-400 mt-2">Copied!</p>}
              <p className="text-xs text-gray-500 mt-3">
                Use this token to reset your password: <br />
                <Link
                  to={`/reset-password?token=${devToken}`}
                  className="text-blue-400 hover:underline break-all"
                >
                  /reset-password?token={devToken}
                </Link>
              </p>
            </div>
          )}

          <Link to="/login" className="text-blue-400 hover:underline text-sm">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <Layers className="w-7 h-7 text-blue-400" />
          <span className="text-xl font-semibold text-white">DeepArch</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your email and we'll send you a link to reset your password.</p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <p className="text-gray-500 text-sm text-center mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
