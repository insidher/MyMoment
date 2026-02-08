'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPassword() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/login/update-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] -z-10" />

            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-4"
                    >
                        <ArrowLeft size={16} />
                        Back to Login
                    </button>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 mb-4">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <h1 className="text-3xl font-bold">Reset Password</h1>
                    <p className="text-white/60">
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                <div className="glass-panel p-8">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                                <Sparkles size={24} className="mx-auto mb-2" />
                                <p className="font-medium">Reset link sent!</p>
                                <p className="text-sm opacity-80">Check your inbox for further instructions.</p>
                            </div>
                            <button
                                onClick={() => router.push('/login')}
                                className="w-full btn-primary py-3"
                            >
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="hello@example.com"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-2"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
