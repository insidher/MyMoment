'use client';

import { useState } from 'react';
import { X, Sparkles, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SignupPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SignupPromptModal({ isOpen, onClose }: SignupPromptModalProps) {
    const supabase = createClient();
    const [view, setView] = useState<'sign-up' | 'sign-in'>('sign-up');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (view === 'sign-up') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        // DEBUG: Simplify to basic URL to test Supabase Allow List matching
                        emailRedirectTo: `${window.location.origin}/auth/callback`
                    }
                });

                if (error) {
                    setError(error.message);
                } else {
                    setSuccessMessage('Account created! Check your email to confirm and return to your moment.');
                    setTimeout(() => {
                        // Optional: close or keep open with success message
                    }, 4000);
                }
            } else {
                // Sign In
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    setError('Invalid email or password');
                } else {
                    // Refresh to sync auth state
                    window.location.reload();
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-purple-400" size={20} />
                            Save your Moment
                        </h2>
                        <p className="text-sm text-white/60 mt-1">
                            {view === 'sign-up'
                                ? "Create a free account to build your library."
                                : "Sign in to save this moment."}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {successMessage ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-400">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-white">Check your Email</h3>
                            <p className="text-white/60 text-sm">
                                {successMessage}
                            </p>
                            <button onClick={onClose} className="btn-secondary w-full mt-4">
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field w-full text-sm"
                                    placeholder="hello@example.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field w-full pr-10 text-sm"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {view === 'sign-up' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field w-full text-sm"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 mt-2"
                            >
                                {loading ? 'Processing...' : (view === 'sign-up' ? 'Create Account' : 'Sign In')}
                                {!loading && <ArrowRight size={16} />}
                            </button>

                            <div className="pt-2 text-center">
                                <p className="text-xs text-white/40">
                                    {view === 'sign-up' ? "Already have an account? " : "Don't have an account? "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setView(view === 'sign-up' ? 'sign-in' : 'sign-up');
                                            setError(null);
                                        }}
                                        className="text-white hover:underline transition-colors font-medium"
                                    >
                                        {view === 'sign-up' ? 'Sign In' : 'Sign Up'}
                                    </button>
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
