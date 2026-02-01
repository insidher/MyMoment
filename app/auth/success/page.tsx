'use client';

import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AuthSuccessPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px] -z-10" />

            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 text-green-400 mb-4 ring-1 ring-green-500/50 shadow-[0_0_40px_-10px_rgba(74,222,128,0.3)]">
                    <CheckCircle size={40} />
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">You're verified!</h1>
                    <p className="text-lg text-white/60">
                        You have successfully signed in.
                    </p>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80">
                        You can now close this tab and return to your previous tab to finish saving your moment.
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Link
                        href="/"
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    >
                        Go to Home
                        <ArrowRight size={18} />
                    </Link>
                    <button
                        onClick={() => window.close()}
                        className="text-white/40 hover:text-white transition-colors text-sm"
                    >
                        Close this tab
                    </button>
                </div>
            </div>
        </main>
    );
}
