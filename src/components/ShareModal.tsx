'use client';

import { useState, useEffect } from 'react';
import { X, Link2, Check, MessageCircle, Twitter, Linkedin, MessageSquare } from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    momentId: string;
    title: string;
    note?: string;
}

export default function ShareModal({ isOpen, onClose, momentId, title, note }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [caption, setCaption] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${baseUrl}/moment/${momentId}`;
    const timestamp = Date.now(); // Cache busting
    const ogImageUrl = momentId ? `${baseUrl}/api/og/${momentId}?t=${timestamp}` : ''; // Live Preview URL with timestamp

    // DEBUG: Log the exact ID to verify
    console.log('[ShareModal] Rendering with momentId:', momentId, '| OG URL:', ogImageUrl);

    // Construct the text to share
    const finalCaption = caption.trim() ? caption.trim() : (note ? `"${note}"` : 'Check out this moment!');
    const fullShareText = `${finalCaption} — ${title}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareOptions = [
        {
            name: 'X (Twitter)',
            icon: (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            color: '#fff',
            bg: 'bg-black',
            onClick: () => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
            },
        },
        {
            name: 'WhatsApp',
            icon: <MessageCircle size={20} />,
            color: '#fff',
            bg: 'bg-[#25D366]',
            onClick: () => {
                window.open(`https://wa.me/?text=${encodeURIComponent(`${fullShareText}\n${shareUrl}`)}`, '_blank');
            },
        },
        {
            name: 'Reddit',
            icon: (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 .108-.001zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
            ),
            color: '#fff',
            bg: 'bg-[#FF4500]',
            onClick: () => {
                window.open(`https://www.reddit.com/submit?title=${encodeURIComponent(fullShareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
            },
        },
        {
            name: 'LinkedIn',
            icon: <Linkedin size={20} />,
            color: '#fff',
            bg: 'bg-[#0077b5]',
            onClick: () => {
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
            },
        },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full sm:max-w-md bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Share Moment</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-5">

                    {/* 1. Live Preview Card */}
                    {momentId && ogImageUrl ? (
                        <div className="relative aspect-[1.91/1] w-full rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-inner group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={ogImageUrl}
                                alt="Social Preview"
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-white/80 uppercase tracking-widest border border-white/10">
                                Preview
                            </div>
                        </div>
                    ) : (
                        <div className="aspect-[1.91/1] w-full rounded-xl border border-white/10 bg-black/30 flex items-center justify-center">
                            <span className="text-white/30 text-sm">No preview available</span>
                        </div>
                    )}

                    {/* 2. Custom Caption Input */}
                    <div className="relative">
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder={note ? `"${note}"` : "Add a caption..."}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none h-20"
                        />
                        <div className="absolute bottom-2 right-2">
                            <MessageSquare size={14} className="text-white/20" />
                        </div>
                    </div>

                    {/* 3. Platform Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        {shareOptions.map((option) => (
                            <button
                                key={option.name}
                                onClick={option.onClick}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] ${option.bg}`}
                                    style={{ color: option.color }}
                                >
                                    {option.icon}
                                </div>
                                <span className="text-[10px] text-white/50 font-medium group-hover:text-white/80 transition-colors">
                                    {option.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* 4. Copy Link (Pulse Style) */}
                    <button
                        onClick={handleCopyLink}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        className={`w-full py-3 rounded-xl border font-bold text-sm tracking-wide uppercase transition-all duration-300 relative overflow-hidden ${copied
                            ? 'bg-green-500 text-white border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                            }`}
                    >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                            {copied ? <Check size={18} /> : <Link2 size={18} />}
                            {copied ? 'Link Copied!' : 'Copy Link to Clipboard'}
                        </div>
                        {/* Pulse Effect Background */}
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full ${!copied && 'group-hover:animate-shimmer'}`} />
                    </button>

                </div>
            </div>
        </div>
    );
}
