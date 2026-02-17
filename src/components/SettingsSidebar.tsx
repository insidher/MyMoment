'use client';

import { useState } from 'react';
import { X, Lock, LogOut, Check, AlertCircle, Loader2, Music, Upload, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useFilter } from '@/context/FilterContext';
import { useTheme } from '@/context/ThemeContext';
import { uploadAvatar } from '../../app/profile/actions';

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
    const { showSpotify, toggleSpotify } = useFilter();
    const { theme, setTheme } = useTheme();
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Get user ID safely
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            formData.append('userId', user.id);

            const result = await uploadAvatar(formData);

            if (result.error) throw new Error(result.error);

            setMessage({ type: 'success', text: 'Avatar updated! Refresh to see changes.' });
            router.refresh();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to upload avatar' });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

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
                    <div className="space-y-4">
                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Account</label>

                        {/* Email Display */}
                        <div className="bg-white/5 rounded-lg p-3 text-sm text-white/80 border border-white/5 flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-full">
                                <User size={16} className="text-white/60" />
                            </div>
                            <span className="truncate">{userEmail}</span>
                        </div>

                        {/* Avatar Upload */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/60">Profile Picture</label>
                            <div className="flex items-center gap-3">
                                <label
                                    htmlFor="avatar-upload"
                                    className={`flex-1 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors group ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        {isUploadingAvatar ? (
                                            <Loader2 size={20} className="text-primary animate-spin" />
                                        ) : (
                                            <Upload size={20} className="text-white/40 group-hover:text-primary transition-colors" />
                                        )}
                                        <span className="text-xs text-white/40 group-hover:text-white transition-colors">
                                            {isUploadingAvatar ? 'Uploading...' : 'Upload Image'}
                                        </span>
                                    </div>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                        disabled={isUploadingAvatar}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Preferences</label>

                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${showSpotify ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                                    <Music size={18} />
                                </div>
                                <div className="text-sm">
                                    <div className="font-medium text-white">Spotify Moments</div>
                                    <div className="text-xs text-white/40">{showSpotify ? 'Visible' : 'Hidden'}</div>
                                </div>
                            </div>

                            <button
                                onClick={toggleSpotify}
                                className={`w-12 h-6 rounded-full relative transition-colors ${showSpotify ? 'bg-green-600' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showSpotify ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        {/* Theme Switcher */}
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block">Theme Color</label>
                            <div className="grid grid-cols-6 gap-2">
                                {(['cyan', 'purple', 'rose', 'amber', 'emerald', 'indigo'] as const).map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setTheme(color)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${theme === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                                        style={{ backgroundColor: `var(--theme-${color}-preview)` }} // We verify variable or use hardcode
                                    >
                                        <div className={`w-full h-full rounded-full ${color === 'cyan' ? 'bg-cyan-500' :
                                            color === 'purple' ? 'bg-purple-500' :
                                                color === 'rose' ? 'bg-rose-500' :
                                                    color === 'amber' ? 'bg-amber-500' :
                                                        color === 'emerald' ? 'bg-emerald-500' :
                                                            'bg-indigo-500'
                                            }`}>
                                            {theme === color && <Check size={14} className="text-white mx-auto mt-2" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
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
