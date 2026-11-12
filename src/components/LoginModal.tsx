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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#151824] border border-white/10 rounded-2xl shadow-2xl p-6 z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-purple-400" />
            <h3 className="text-base font-bold text-white">Sign in with Stremio</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 my-4 p-1 rounded-xl bg-white/5 border border-white/5">
          <button
            type="button"
            onClick={() => setTab('creds')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'creds'
                ? 'bg-[#7b42f6] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail size={13} /> Email & Password
          </button>
          <button
            type="button"
            onClick={() => setTab('key')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'key'
                ? 'bg-[#7b42f6] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Key size={13} /> Access Key (AuthKey)
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
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
                className="w-full bg-[#1f2438] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
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
                className="w-full bg-[#1f2438] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-2 rounded-lg bg-[#7b42f6] hover:bg-[#6a34e0] text-white text-xs font-bold tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in with Stremio'}
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
                className="w-full bg-[#1f2438] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-xs"
              />
              <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                Useful if you sign in with Google or Facebook. In{' '}
                <a
                  href="https://web.stremio.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 underline"
                >
                  web.stremio.com
                </a>
                , open the browser console and run <code>localStorage.getItem('authKey')</code>.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-2 rounded-lg bg-[#7b42f6] hover:bg-[#6a34e0] text-white text-xs font-bold tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Validating...' : 'Validate AuthKey'}
            </button>
          </form>
        )}

        {/* Notice */}
        <div className="mt-5 p-3 rounded-lg bg-black/30 border border-white/5 text-[11px] text-gray-400 leading-relaxed">
          🔒 <strong>Security:</strong> Authentication connects directly with the official Stremio API (<code>api.strem.io</code>) over encrypted TLS.
        </div>
      </div>
    </div>
  );
};
