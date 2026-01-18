import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function ExploreLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="min-h-screen p-8 pb-24">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="space-y-2">
                        <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-6 w-96 bg-white/5 rounded-lg animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 bg-white/5 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        }>
            {children}
        </Suspense>
    );
}
