'use client';

import { useState, useRef, useEffect } from 'react';
import { Moment } from '@/types';
import { Heart, MessageSquare, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toggleLike } from '../../app/actions/moments';

interface MomentFeedCardProps {
    moment: Moment;
    isActive?: boolean;
    onPlay?: () => void;
    onComment?: (momentId: string) => void;
}

export default function MomentFeedCard({ moment, isActive = false, onPlay, onComment }: MomentFeedCardProps) {
    const router = useRouter();
    const playerRef = useRef<any>(null);

    // State
    // Removed showPlayer - now controlled by isActive prop
    const [isMuted, setIsMuted] = useState(false); // Start unmuted
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLiked, setIsLiked] = useState(moment.isLiked || false);
    const [likeCount, setLikeCount] = useState(moment.likeCount || 0);
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState(moment.startSec);

    // Extract YouTube video ID
    const getYouTubeId = (url: string) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    };

    const videoId = getYouTubeId(moment.sourceUrl);
    const duration = moment.trackDurationSec || moment.trackSource?.durationSec || 180;
    const startPercent = (moment.startSec / duration) * 100;
    const widthPercent = ((moment.endSec - moment.startSec) / duration) * 100;

    // Load YouTube IFrame API
    useEffect(() => {
        if (!isActive || !videoId) return;

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        (window as any).onYouTubeIframeAPIReady = () => {
            playerRef.current = new (window as any).YT.Player(`player-${moment.id}`, {
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    start: Math.floor(moment.startSec),
                    end: Math.floor(moment.endSec),
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                },
                events: {
                    onReady: (event: any) => {
                        event.target.unMute(); // Start unmuted
                        event.target.playVideo();
                        setIsPlaying(true);
                    },
                    onStateChange: (event: any) => {
                        if (event.data === (window as any).YT.PlayerState.ENDED) {
                            setIsPlaying(false);
                            // Player will be cleaned up when parent sets another moment as active
                        }
                    },
                },
            });
        };
    }, [isActive, videoId, moment.id, moment.startSec, moment.endSec]);

    // Monitor playback time and pause at end
    useEffect(() => {
        if (!isActive || !playerRef.current) return;

        const interval = setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const currentTime = playerRef.current.getCurrentTime();
                setCurrentPlaybackTime(currentTime); // Update progress

                if (currentTime >= moment.endSec) {
                    playerRef.current.pauseVideo();
                    setIsPlaying(false);
                }
            }
        }, 100); // Check every 100ms for precision

        return () => clearInterval(interval);
    }, [isActive, moment.endSec]);

    const handleThumbnailClick = () => {
        if (onPlay) {
            onPlay(); // Notify parent to set this as active player
        }
    };

    const handleVideoClick = () => {
        if (!playerRef.current) return;

        // Toggle play/pause
        const playerState = playerRef.current.getPlayerState();
        if (playerState === (window as any).YT.PlayerState.PLAYING) {
            playerRef.current.pauseVideo();
            setIsPlaying(false);
        } else {
            playerRef.current.playVideo();
            setIsPlaying(true);
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Optimistic UI
        const wasLiked = isLiked;
        const prevCount = likeCount;

        setIsLiked(!wasLiked);
        setLikeCount(wasLiked ? prevCount - 1 : prevCount + 1);

        try {
            await toggleLike(moment.id, moment.userId || '');
        } catch (error) {
            // Revert on error
            setIsLiked(wasLiked);
            setLikeCount(prevCount);
            console.error('Failed to toggle like:', error);
        }
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onComment) {
            onComment(moment.id);
        }
    };

    return (
        <div className="max-w-xl mx-auto w-full space-y-3">
            {/* Header */}
            <Link
                href={`/profile/${moment.user?.name || 'user'}`}
                className="flex items-center gap-3 group"
            >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                    {moment.user?.image ? (
                        <img
                            src={moment.user.image}
                            alt={moment.user.name || 'User'}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        (moment.user?.name?.[0]?.toUpperCase() || 'U')
                    )}
                </div>
                <span className="text-white/90 font-medium group-hover:text-white transition-colors">
                    {moment.user?.name || 'Anonymous'}
                </span>
            </Link>

            {/* Video Stage */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                {!isActive ? (
                    <div
                        className="relative w-full h-full cursor-pointer group"
                        onClick={handleThumbnailClick}
                    >
                        <img
                            src={moment.artwork || '/placeholder-artwork.jpg'}
                            alt={moment.title || 'Video thumbnail'}
                            className="w-full h-full object-cover"
                        />
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                                <Play size={32} className="text-black ml-1" fill="currentColor" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        id={`player-${moment.id}`}
                        className="w-full h-full cursor-pointer"
                        onClick={handleVideoClick}
                    />
                )}
            </div>

            {/* DNA Controller (Orange Pill) */}
            <div className="relative h-8 w-full bg-neutral-900/50 rounded flex items-center">
                <div
                    className="absolute h-2 bg-orange-500/30 rounded-full cursor-pointer hover:h-3 transition-all overflow-hidden"
                    style={{
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                    }}
                    onClick={handleThumbnailClick}
                >
                    {/* Progress Fill */}
                    <div
                        className="absolute inset-0 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-100"
                        style={{
                            width: currentPlaybackTime >= moment.startSec
                                ? `${Math.min(100, ((currentPlaybackTime - moment.startSec) / (moment.endSec - moment.startSec)) * 100)}%`
                                : '0%',
                        }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="space-y-2">
                {/* Title */}
                <Link
                    href={`/room/view?url=${encodeURIComponent(moment.sourceUrl)}`}
                    className="text-white/80 hover:text-white transition-colors font-medium block"
                >
                    {moment.title || 'Untitled'}
                </Link>

                {/* Quote */}
                {moment.note && (
                    <p className="font-serif italic text-lg text-gray-200 leading-relaxed">
                        "{moment.note}"
                    </p>
                )}

                {/* Social Actions */}
                <div className="flex items-center gap-6 pt-2">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-white/60 hover:text-red-500'
                            }`}
                    >
                        <Heart
                            size={20}
                            className={isLiked ? 'fill-current' : ''}
                        />
                        <span className="text-sm font-medium">{likeCount}</span>
                    </button>

                    <button
                        onClick={handleCommentClick}
                        className="flex items-center gap-2 text-white/60 hover:text-blue-400 transition-colors"
                    >
                        <MessageSquare size={20} />
                        <span className="text-sm font-medium">{moment.replyCount || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
