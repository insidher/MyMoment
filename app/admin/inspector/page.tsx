'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, AlertTriangle, CheckCircle, XCircle, Music, Tag, Loader2, ArrowLeft, Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { syncTrackSource } from '../../actions/admin';
import CategoryBadge from '@/components/CategoryBadge';
import { mapYouTubeCategory } from '@/lib/youtube';
import { CATEGORY_LABELS } from '@/lib/categories';

interface DiagnosticsData {
    categoryId: string | null;
    categoryName: string | null;
    topicCategories: string[];
    tags: string[];
    hasMusicTopic: boolean;
}

interface ParsedData {
    title: string;
    channelTitle: string;
    description: string;
    thumbnails: Record<string, string | undefined>;
    durationSec: number;
}

interface InspectorResult {
    parsed: ParsedData;
    raw: Record<string, unknown>;
    diagnostics: DiagnosticsData;
}

// YouTube → internal category map (mirrors youtube.ts)
// INTERNAL_LABELS imported from @/lib/categories

export default function InspectorPage() {
    const [inputUrl, setInputUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<InspectorResult | null>(null);
    const [overrideCategoryId, setOverrideCategoryId] = useState<number | null>(null);
    const searchParams = useSearchParams();
    const autoLoadedRef = useRef(false);

    // Auto-load from ?url= query param
    useEffect(() => {
        const urlParam = searchParams.get('url');
        if (urlParam && !autoLoadedRef.current) {
            autoLoadedRef.current = true;
            setInputUrl(urlParam);
            setTimeout(() => doInspect(urlParam), 100);
        }
    }, [searchParams]);

    const doInspect = async (url?: string) => {
        const targetUrl = url || inputUrl.trim();
        if (!targetUrl) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setSyncStatus('idle');
        setOverrideCategoryId(null);

        try {
            const res = await fetch(`/api/metadata?url=${encodeURIComponent(targetUrl)}&debug=true`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            const data: InspectorResult = await res.json();
            setResult(data);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch metadata');
        } finally {
            setLoading(false);
        }
    };

    const handleInspect = () => doInspect();
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleInspect(); };

    const handleSync = async () => {
        if (!result || !inputUrl.trim()) return;
        setSyncing(true);
        setSyncStatus('idle');
        try {
            const res = await syncTrackSource({
                videoUrl: inputUrl.trim(),
                categoryId: result.diagnostics.categoryId,
                overrideCategoryId: overrideCategoryId,
                tags: result.diagnostics.tags,
                topics: result.diagnostics.topicCategories,
                description: result.parsed.description,
                title: result.parsed.title,
                channelTitle: result.parsed.channelTitle,
                durationSec: result.parsed.durationSec,
                thumbnailUrl: result.parsed.thumbnails?.high || result.parsed.thumbnails?.medium || null,
            });
            if (res.success) {
                setSyncStatus('success');
                // Auto-clear success toast after 4s
                setTimeout(() => setSyncStatus('idle'), 4000);
            } else {
                setError(res.error || 'Sync failed');
                setSyncStatus('error');
            }
        } catch (e: any) {
            setError(e.message);
            setSyncStatus('error');
        } finally {
            setSyncing(false);
        }
    };

    const formatDuration = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Compute internal category using smart mapping
    const smartCatId = result ? mapYouTubeCategory({
        youtubeCategoryId: result.diagnostics.categoryId,
        topics: result.diagnostics.topicCategories,
        title: result.parsed.title,
        tags: result.diagnostics.tags,
    }) : null;
    // Use override if set, otherwise use smart mapping
    const effectiveCatId = overrideCategoryId ?? smartCatId;
    const internalCatLabel = effectiveCatId ? CATEGORY_LABELS[effectiveCatId] : null;

    // Clean topic labels
    const cleanTopics = (result?.diagnostics.topicCategories || []).map(
        (t) => t.split('/').pop()?.replace(/_/g, ' ') || t
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/" className="text-white/50 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold tracking-tight">
                            <span className="text-cyan-400">🔍</span> Metadata Inspector
                        </h1>
                        <p className="text-xs text-white/40">Debug YouTube API responses · Admin Tool</p>
                    </div>

                    {/* Sync Button — visible when results are loaded */}
                    {result && (
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${syncStatus === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                } disabled:opacity-50`}
                        >
                            {syncing ? (
                                <><Loader2 size={16} className="animate-spin" /> Syncing...</>
                            ) : syncStatus === 'success' ? (
                                <><CheckCircle size={16} /> Synced!</>
                            ) : (
                                <><Save size={16} /> 💾 Sync to Database</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Search Bar */}
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="YouTube URL or Video ID (e.g. dQw4w9WgXcQ)"
                            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all text-sm"
                        />
                    </div>
                    <button
                        onClick={handleInspect}
                        disabled={loading || !inputUrl.trim()}
                        className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-neutral-700 disabled:text-white/30 text-white font-bold px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 text-sm"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Inspect
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                        <XCircle size={20} className="text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {/* Success Toast */}
                {syncStatus === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <CheckCircle size={20} className="text-green-400 shrink-0" />
                        <p className="text-green-300 text-sm font-medium">✅ Track source updated successfully! Category, tags, and topics have been synced.</p>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-6">
                        {/* RED FLAG SECTION */}
                        <div className={`rounded-xl border p-5 space-y-4 ${result.diagnostics.hasMusicTopic && result.diagnostics.categoryId !== '10'
                            ? 'bg-red-500/5 border-red-500/30'
                            : !result.diagnostics.categoryId
                                ? 'bg-yellow-500/5 border-yellow-500/30'
                                : 'bg-green-500/5 border-green-500/30'
                            }`}>
                            <div className="flex items-center gap-2">
                                {result.diagnostics.hasMusicTopic && result.diagnostics.categoryId !== '10' ? (
                                    <AlertTriangle size={20} className="text-red-400" />
                                ) : !result.diagnostics.categoryId ? (
                                    <AlertTriangle size={20} className="text-yellow-400" />
                                ) : (
                                    <CheckCircle size={20} className="text-green-400" />
                                )}
                                <h2 className="font-bold text-lg">Diagnostic Flags</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Category ID */}
                                <div className="bg-black/30 rounded-lg p-3 space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">snippet.categoryId</p>
                                    <p className="text-2xl font-mono font-bold">
                                        {result.diagnostics.categoryId || <span className="text-yellow-400">NULL</span>}
                                    </p>
                                    <p className="text-sm text-white/60">
                                        → {result.diagnostics.categoryName || <span className="text-yellow-400 italic">No category</span>}
                                    </p>
                                </div>

                                {/* Music Topic Flag */}
                                <div className="bg-black/30 rounded-lg p-3 space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Has Music Topic?</p>
                                    <div className="flex items-center gap-2">
                                        {result.diagnostics.hasMusicTopic ? (
                                            <>
                                                <Music size={24} className="text-red-400" />
                                                <span className="text-2xl font-bold text-red-400">YES</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={24} className="text-green-400" />
                                                <span className="text-2xl font-bold text-green-400">NO</span>
                                            </>
                                        )}
                                    </div>
                                    {result.diagnostics.hasMusicTopic && result.diagnostics.categoryId !== '10' && (
                                        <p className="text-xs text-red-300 mt-1">
                                            ⚠ PHANTOM MUSIC: Topic says &quot;Music&quot; but Category is &quot;{result.diagnostics.categoryName}&quot;
                                        </p>
                                    )}
                                </div>

                                {/* Topic Categories */}
                                <div className="bg-black/30 rounded-lg p-3 space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">topicDetails.topicCategories</p>
                                    {result.diagnostics.topicCategories.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {result.diagnostics.topicCategories.map((topic, i) => {
                                                const label = topic.split('/').pop() || topic;
                                                const isMusic = label.toLowerCase().includes('music');
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${isMusic
                                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                            : 'bg-white/10 text-white/70'
                                                            }`}
                                                    >
                                                        {label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-yellow-400 text-sm italic mt-1">No topics</p>
                                    )}
                                </div>
                            </div>

                            {/* Tags Row */}
                            {result.diagnostics.tags.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-1">
                                        <Tag size={10} /> snippet.tags ({result.diagnostics.tags.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.diagnostics.tags.slice(0, 30).map((tag, i) => (
                                            <span
                                                key={i}
                                                className={`text-[10px] px-2 py-0.5 rounded-full ${tag.toLowerCase().includes('music')
                                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                    : 'bg-white/5 text-white/50'
                                                    }`}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {result.diagnostics.tags.length > 30 && (
                                            <span className="text-[10px] text-white/30 px-2 py-0.5">
                                                +{result.diagnostics.tags.length - 30} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SPLIT VIEW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* LEFT: Parsed (Current Reality) */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">
                                    Current Reality <span className="text-cyan-400">(What Our App Sees)</span>
                                </h3>
                                <div className="bg-neutral-900 border border-white/10 rounded-xl p-5 space-y-4">
                                    {result.parsed.thumbnails?.high && (
                                        <img
                                            src={result.parsed.thumbnails.high}
                                            alt={result.parsed.title}
                                            className="w-full rounded-lg aspect-video object-cover"
                                        />
                                    )}
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Title</p>
                                            <p className="text-white font-medium">{result.parsed.title}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Channel</p>
                                            <p className="text-white/80">{result.parsed.channelTitle}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Duration</p>
                                            <p className="text-white/80 font-mono">{formatDuration(result.parsed.durationSec)} ({result.parsed.durationSec}s)</p>
                                        </div>

                                        {/* Category with Override Dropdown */}
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Internal Category</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {effectiveCatId && <CategoryBadge categoryId={effectiveCatId} />}
                                                <span className="text-white/50 text-xs font-mono">
                                                    ID: {effectiveCatId ?? 'N/A'} (YT: {result.diagnostics.categoryId || 'NULL'})
                                                </span>
                                            </div>
                                            {/* Manual Override Dropdown */}
                                            <div className="mt-2 flex items-center gap-2">
                                                <select
                                                    value={overrideCategoryId ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setOverrideCategoryId(val ? Number(val) : null);
                                                        setSyncStatus('idle');
                                                    }}
                                                    className="bg-neutral-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                                >
                                                    <option value="">— Auto (Smart Map) —</option>
                                                    {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                                                        <option key={id} value={id}>{label} ({id})</option>
                                                    ))}
                                                </select>
                                                {overrideCategoryId !== null && (
                                                    <span className="text-[10px] text-cyan-400 font-bold uppercase">⚠ Manual Override</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tags (NEW) */}
                                        {result.diagnostics.tags.length > 0 && (
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">
                                                    Tags ({result.diagnostics.tags.length})
                                                </p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {result.diagnostics.tags.slice(0, 10).map((tag, i) => (
                                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {result.diagnostics.tags.length > 10 && (
                                                        <span className="text-[10px] text-white/30">+{result.diagnostics.tags.length - 10} more</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Topics (NEW) */}
                                        {cleanTopics.length > 0 && (
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Topics</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {cleanTopics.map((topic, i) => (
                                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Description</p>
                                            <p className="text-white/50 text-xs max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                                {result.parsed.description?.slice(0, 500) || <span className="italic">No description</span>}
                                                {(result.parsed.description?.length || 0) > 500 && '...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Raw (Source of Truth) */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">
                                    Source of Truth <span className="text-blue-400">(Raw YouTube API)</span>
                                </h3>
                                <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
                                    <div className="p-3 bg-neutral-800/50 border-b border-white/5 flex items-center justify-between">
                                        <p className="text-xs text-white/40 font-mono">youtube.v3.videos.list</p>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(JSON.stringify(result.raw, null, 2))}
                                            className="text-[10px] text-white/40 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            Copy JSON
                                        </button>
                                    </div>
                                    <pre className="p-4 text-xs text-green-300/80 font-mono overflow-auto max-h-[600px] whitespace-pre-wrap leading-relaxed">
                                        {JSON.stringify(result.raw, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!result && !error && !loading && (
                    <div className="text-center py-20 space-y-4">
                        <div className="text-6xl">🔍</div>
                        <p className="text-white/40 text-sm max-w-md mx-auto">
                            Paste a YouTube URL or video ID to inspect its metadata.
                            This tool reveals the raw API response to help diagnose &quot;Phantom Music&quot; and &quot;Ghost Category&quot; bugs.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
