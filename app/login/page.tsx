'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
    const router = useRouter();
    const supabase = createClient();

    // State - Simplified as requested
    const [view, setView] = useState<'sign-in' | 'sign-up'>('sign-in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // UI State for UX improvements (from existing UI)
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (view === 'sign-up') {
                // Validate password confirmation
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                // Simplified Sign Up (No Metadata) as requested
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        // IMPORTANT: Send NO metadata so DB trigger defaults to safe values.
                        emailRedirectTo: `${location.origin}/auth/callback`
                    }
                });

                if (error) {
                    setError(error.message);
                } else {
                    // Success UX
                    setSuccessMessage('Account created! Please check your email to confirm.');
                    setView('sign-in'); // Switch back to login view automatically
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                }
            } else {
                // Standard Sign In
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    setError('Invalid email or password');
                } else {
                    // Get redirect parameter from URL
                    const searchParams = new URLSearchParams(window.location.search);
                    const redirectTo = searchParams.get('redirect') || '/';

                    // Use window.location for hard redirect to ensure auth state updates
                    window.location.href = redirectTo;
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background - Preserved */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] -z-10" />

            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 mb-4">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <h1 className="text-3xl font-bold">{view === 'sign-in' ? 'Welcome Back' : 'Create Account'}</h1>
                    <p className="text-white/60">
                        {view === 'sign-in' ? 'Enter your details to access your moments.' : 'Start saving your favorite parts today.'}
                    </p>
                </div>

                <div className="glass-panel p-8">
                    <form onSubmit={handleAuth} className="space-y-4">

                        {/* Email Field - Preserved Classes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field w-full"
                                placeholder="hello@example.com"
                                required
                                suppressHydrationWarning
                            />
                        </div>

                        {/* Password Field - Preserved Classes & Toggle */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field w-full pr-10"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    suppressHydrationWarning
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                    suppressHydrationWarning
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field - Only for Sign Up */}
                        {view === 'sign-up' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Confirm Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    suppressHydrationWarning
                                />
                            </div>
                        )}

                        {/* Error Banner - Preserved */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Success Banner - Preserved */}
                        {successMessage && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400 text-sm">
                                <Sparkles size={16} />
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-2"
                        >
                            {loading ? 'Processing...' : (view === 'sign-in' ? 'Sign In' : 'Sign Up')}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    {/* Toggle Switch - Preserved Logic with updated View State */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-white/60">
                            {view === 'sign-in' ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => {
                                    setView(view === 'sign-in' ? 'sign-up' : 'sign-in');
                                    setError(null);
                                    setSuccessMessage(null);
                                    setShowPassword(false);
                                }}
                                className="text-white hover:underline transition-colors font-medium"
                            >
                                {view === 'sign-in' ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
