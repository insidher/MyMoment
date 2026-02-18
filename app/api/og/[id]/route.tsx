import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const BRAND_TURQUOISE = '#2DD4BF';
const DIM_TURQUOISE = 'rgba(45, 212, 191, 0.4)';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log('[OG API] Incoming Request for ID:', id);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[OG API] Missing Supabase env vars');
            return new Response('Server config error', { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: targetMoment, error: momentError } = await supabase
            .from('moments')
            .select(`
                *,
                track_sources (
                    id,
                    title,
                    youtube_video_id,
                    duration_sec
                )
            `)
            .eq('id', id)
            .single();

        if (momentError) {
            console.error('[OG API] DB Error:', momentError.message);
        }

        const trackSource = targetMoment?.track_sources || {};
        const videoId = trackSource.youtube_video_id;
        const thumbnailUrl = videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : null;
        const title = trackSource.title || 'MyMoment Content';
        const note = targetMoment?.note || 'Check out this moment!';
        const totalDuration = trackSource.duration_sec || 600;

        let groupMoments: { start_time: number; end_time: number; id: string }[] = [];
        if (trackSource.id) {
            const { data: moments } = await supabase
                .from('moments')
                .select('start_time, end_time, id')
                .eq('track_source_id', trackSource.id);
            groupMoments = moments || [];
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const logoUrl = `${baseUrl}/images/MyMomentSmalllogoV1.2.png`;
        const bigLogoUrl = `${baseUrl}/images/MyMomentlogoV1.2.png`;

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#ffffff',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {/* === TOP: THUMBNAIL (65%) === */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            height: '65%',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Thumbnail OR Turquoise Fallback */}
                        {thumbnailUrl ? (
                            <img
                                src={thumbnailUrl}
                                width={1200}
                                height={630}
                                alt="Thumbnail"
                                style={{
                                    display: 'flex',
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: BRAND_TURQUOISE,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 48,
                                    fontWeight: 700,
                                    color: 'white',
                                }}
                            >
                                MyMoment
                            </div>
                        )}

                        {/* Gradient Scrim */}
                        <div
                            style={{
                                display: 'flex',
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '60%',
                                background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                            }}
                        />

                        {/* Title */}
                        <div
                            style={{
                                display: 'flex',
                                position: 'absolute',
                                bottom: 24,
                                left: 32,
                                right: 32,
                                color: 'white',
                                fontSize: 26,
                                fontWeight: 700,
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            }}
                        >
                            {title}
                        </div>

                        {/* === THE SHISHKABOB TRACK === */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                width: '100%',
                                height: 16,
                                backgroundColor: '#333333',
                            }}
                        >
                            {groupMoments.map((m) => {
                                const isTarget = m.id === id;
                                const startPct = (m.start_time / totalDuration) * 100;
                                const endT = m.end_time || m.start_time + 30;
                                const widthPct = Math.max(
                                    ((endT - m.start_time) / totalDuration) * 100,
                                    1
                                );
                                return (
                                    <div
                                        key={m.id}
                                        style={{
                                            display: 'flex',
                                            position: 'absolute',
                                            left: `${startPct}%`,
                                            width: `${widthPct}%`,
                                            height: '100%',
                                            backgroundColor: isTarget ? BRAND_TURQUOISE : DIM_TURQUOISE,
                                            zIndex: isTarget ? 10 : 1,
                                            boxShadow: isTarget ? `0 0 15px ${DIM_TURQUOISE}` : 'none',
                                            borderRight: '1px solid #111',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* === BOTTOM: INFO (35%) === */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            width: '100%',
                            height: '35%',
                            padding: 0,
                        }}
                    >
                        {/* Left Column: Play CTA + Note */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '70%',
                                padding: '16px 32px',
                                gap: 8,
                                justifyContent: 'center',
                            }}
                        >
                            {/* Play Moment — thin circle + SVG triangle + text */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                            >
                                {/* Circle with play triangle */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 38,
                                        height: 38,
                                        borderRadius: 999,
                                        border: `2px solid #222222`,
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg width="14" height="16" viewBox="0 0 14 16" style={{ display: 'flex', marginLeft: 2 }}>
                                        <path d="M0 0L14 8L0 16Z" fill={BRAND_TURQUOISE} />
                                    </svg>
                                </div>
                                {/* Text */}
                                <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#111111' }}>Play Moment</div>
                            </div>

                            {/* Curator Note */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: '#222222',
                                        textTransform: 'uppercase',
                                        letterSpacing: 2,
                                    }}
                                >
                                    Curator Note
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: 24,
                                        color: '#333333',
                                        lineHeight: 1.3,
                                        fontFamily: 'serif',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxHeight: 64,
                                    }}
                                >
                                    &quot;{note}&quot;
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Branding Stack */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30%',
                                paddingRight: 28,
                                gap: 6,
                            }}
                        >
                            {/* M Icon */}
                            <img
                                src={logoUrl}
                                width={64}
                                height={64}
                                alt="M"
                                style={{ display: 'flex', objectFit: 'contain' }}
                            />
                            {/* Brand Name */}
                            <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: '#111111' }}>MyMoment.io</div>
                            {/* Powered by YouTube */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginTop: 2,
                                }}
                            >
                                <svg width="32" height="22" viewBox="0 0 24 17" style={{ display: 'flex' }}>
                                    <path d="M23.5 2.5C23.2 1.4 22.3.5 21.2.2 19.3 0 12 0 12 0S4.7 0 2.8.2C1.7.5.8 1.4.5 2.5.2 4.4 0 6.5 0 8.5s.2 4.1.5 6c.3 1.1 1.2 2 2.3 2.3C4.7 17 12 17 12 17s7.3 0 9.2-.2c1.1-.3 2-.9 2.3-2.3.3-1.9.5-4 .5-6s-.2-4.1-.5-6z" fill="#FF0000" />
                                    <path d="M9.6 12.1V4.9l6.2 3.6-6.2 3.6z" fill="#FFFFFF" />
                                </svg>
                                <div style={{ display: 'flex', fontSize: 15, color: '#555555', fontWeight: 600 }}>Powered by YouTube</div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            { width: 1200, height: 630 }
        );
    } catch (e) {
        console.error('[OG API] Critical Error:', e);
        return new Response('Failed to generate image', { status: 500 });
    }
}
