'use client';

import { useState } from 'react';
import { X, Lock, LogOut, Check, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SettingsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

export default function SettingsSidebar({ isOpen, onClose, userEmail }: SettingsSidebarProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setIsUpdating(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update password' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/');
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-zinc-900 border-l border-white/10 p-6 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Account Info */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Account</label>
                        <div className="bg-white/5 rounded-lg p-3 text-sm text-white/80 border border-white/5">
                            {userEmail}
                        </div>
                    </div>

                    {/* Change Password */}
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                            <Lock size={12} />
                            Change Password
                        </label>

                        <div className="space-y-3">
                            <input
                                type="password"
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>

                        {message && (
                            <div className={`text-xs p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isUpdating || !password}
                            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
                        </button>
                    </form>

                    <hr className="border-white/10" />

                    {/* Danger Zone / Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}
