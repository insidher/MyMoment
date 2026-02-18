import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();

    const { data: moment } = await supabase
        .from('moments')
        .select(`
            note,
            track_sources ( title )
        `)
        .eq('id', id)
        .single();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const ogImageUrl = `${baseUrl}/api/og/${id}`;

    if (!moment) {
        return { title: 'MyMoment' };
    }

    return {
        title: `Moment from ${moment.track_sources?.title || 'Video'}`,
        description: `Check out this highlight: "${moment.note}"`,
        openGraph: {
            title: `Moment from ${moment.track_sources?.title || 'Video'}`,
            description: moment.note || 'A curated moment on MyMoment',
            images: [{ url: ogImageUrl, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `Moment from ${moment.track_sources?.title || 'Video'}`,
            images: [ogImageUrl],
        },
    };
}

export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: moment } = await supabase
        .from('moments')
        .select('resource_id, start_time, end_time')
        .eq('id', id)
        .single();

    if (!moment || !moment.resource_id) {
        return redirect('/');
    }

    const targetUrl = `/room/view?url=${encodeURIComponent(moment.resource_id)}&start=${moment.start_time}&end=${moment.end_time}&moment=${id}`;
    redirect(targetUrl);
}
