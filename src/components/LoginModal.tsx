import React, { useState } from 'react';
import { useAuth } from '../context/useAppContext';
import { X, Lock, Key, Mail } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithCreds, loginWithKey } = useAuth();
  const [tab, setTab] = useState<'creds' | 'key'>('creds');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authKey, setAuthKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmitCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    const res = await loginWithCreds(email, password);
    setIsLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Authentication failed');
    }
  };

  const handleSubmitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    const res = await loginWithKey(authKey.trim());
    setIsLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Invalid AuthKey');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#151824] border border-white/10 rounded-2xl shadow-2xl z-10 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Fixed at top of modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-[#151824] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Lock size={16} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Sign in with Stremio</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer touch-manipulation min-w-8 min-h-8 flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          {/* Why Account is Required Banner */}
          <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-200 text-xs leading-relaxed flex items-start gap-2.5">
            <span className="text-base shrink-0 mt-0.5">💡</span>
            <div>
              <strong className="block text-white font-semibold mb-0.5">
                Why connect your Stremio account?
              </strong>
              <span>
                Stremio addons are read-only inside the player. Connecting your account links this website to your Stremio library so you can search and add cinema movies here. Our 24/7 cloud scanner will automatically push 1080p FHD &amp; 4K UHD releases straight to your TV!
              </span>
            </div>
          </div>

          {/* Tab switch */}
          <div className="grid grid-cols-2 gap-1.5 mb-4 p-1 rounded-xl bg-white/5 border border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTab('creds');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center truncate touch-manipulation ${
                tab === 'creds'
                  ? 'bg-[#7b42f6] text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mail size={13} className="shrink-0" />
              <span className="truncate">Email & Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('key');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center truncate touch-manipulation ${
                tab === 'key'
                  ? 'bg-[#7b42f6] text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Key size={13} className="shrink-0" />
              <span className="truncate">Access Key (AuthKey)</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 break-words">
              {errorMsg}
            </div>
          )}

          {/* Form: Credentials */}
          {tab === 'creds' && (
            <form onSubmit={handleSubmitCreds} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Stremio Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="email"
                  className="w-full bg-[#1f2438] border border-white/10 rounded-xl px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Stremio Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="w-full bg-[#1f2438] border border-white/10 rounded-xl px-3.5 py-2.5 sm:py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-11 py-3 sm:py-2.5 mt-2 rounded-xl bg-[#7b42f6] hover:bg-[#6a34e0] active:scale-[0.99] text-white text-sm sm:text-xs font-bold tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50 touch-manipulation flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign in with Stremio'
                )}
              </button>
            </form>
          )}

          {/* Form: AuthKey */}
          {tab === 'key' && (
            <form onSubmit={handleSubmitKey} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  AuthKey (Session Key)
                </label>
                <input
                  type="text"
                  required
                  value={authKey}
                  onChange={(e) => setAuthKeyInput(e.target.value)}
                  placeholder="Paste your AuthKey here..."
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full bg-[#1f2438] border border-white/10 rounded-xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono transition-colors"
                />
                <div className="text-[11px] text-gray-400 mt-2 leading-relaxed bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
                  <p>
                    Useful if you sign in with Google or Facebook. On{' '}
                    <a
                      href="https://web.stremio.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 underline font-medium hover:text-purple-300"
                    >
                      web.stremio.com
                    </a>
                    :
                  </p>
                  <p className="mt-1">
                    Open the browser console and run:{' '}
                    <code className="block mt-1 font-mono text-[10px] sm:text-[11px] bg-black/50 p-1.5 rounded border border-white/10 break-all select-all text-purple-200">
                      localStorage.getItem('authKey')
                    </code>
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-11 py-3 sm:py-2.5 mt-2 rounded-xl bg-[#7b42f6] hover:bg-[#6a34e0] active:scale-[0.99] text-white text-sm sm:text-xs font-bold tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50 touch-manipulation flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  'Validate AuthKey'
                )}
              </button>
            </form>
          )}

          {/* Registration Helper Link */}
          <div className="mt-3 text-center text-xs text-gray-400">
            <span>Don't have a Stremio account yet? </span>
            <a
              href="https://www.stremio.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 font-semibold underline"
            >
              Sign up free on Stremio.com
            </a>
          </div>

          {/* Notice */}
          <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-gray-400 leading-relaxed flex items-start gap-2">
            <span className="text-sm shrink-0">🔒</span>
            <span>
              <strong>Security:</strong> Authentication connects directly with the official Stremio API (<code>api.strem.io</code>) over encrypted TLS.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
