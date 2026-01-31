import { CheckCircle2, Circle, Clock } from 'lucide-react';

export default function RoadmapPage() {
    return (
        <main className="max-w-4xl mx-auto py-16 px-6 min-h-[80vh]">
            <div className="mb-12">
                <h1 className="text-4xl font-black tracking-tight text-white mb-4">
                    Product Roadmap
                </h1>
                <p className="text-xl text-gray-400">
                    Our journey to build the ultimate curation engine.
                </p>
            </div>

            <div className="space-y-12 relative border-l border-white/10 ml-3 pl-8 md:ml-6 md:pl-12">
                {/* Q1 2026 - Current */}
                <div className="relative">
                    <div className="absolute -left-[41px] md:-left-[57px] top-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ring-4 ring-black">
                        <CheckCircle2 size={14} className="text-black" />
                    </div>
                    <h3 className="text-lg font-bold text-green-400 mb-1">Q1 2026: The Foundation</h3>
                    <p className="text-sm text-white/40 font-mono mb-4">CURRENTLY LIVE</p>
                    <ul className="space-y-3 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span> Mobile-first Capture Flow
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span> "Listening Room" UI for focused playback
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span> Basic YouTube Integration
                        </li>
                    </ul>
                </div>

                {/* Q2 2026 */}
                <div className="relative">
                    <div className="absolute -left-[41px] md:-left-[57px] top-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center ring-4 ring-black">
                        <Clock size={14} className="text-black" />
                    </div>
                    <h3 className="text-lg font-bold text-orange-400 mb-1">Q2 2026: Audio Expansion</h3>
                    <p className="text-sm text-white/40 font-mono mb-4">IN DEVELOPMENT</p>
                    <ul className="space-y-3 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-1">•</span> Deep Spotify Integration (Audio-only mode)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-1">•</span> Collaborative Playlists
                        </li>
                    </ul>
                </div>

                {/* Q3 2026 */}
                <div className="relative">
                    <div className="absolute -left-[41px] md:-left-[57px] top-1 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center ring-4 ring-black">
                        <Circle size={14} className="text-white/40" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Q3 2026: Professional Tools</h3>
                    <p className="text-sm text-white/40 font-mono mb-4">PLANNED</p>
                    <ul className="space-y-3 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-white/40 mt-1">•</span> Creator Analytics Dashboard
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-white/40 mt-1">•</span> Private Collections & Team Sharing
                        </li>
                    </ul>
                </div>

                {/* Future */}
                <div className="relative">
                    <div className="absolute -left-[41px] md:-left-[57px] top-1 w-6 h-6 bg-white/5 rounded-full flex items-center justify-center ring-4 ring-black">
                        <Circle size={14} className="text-white/20" />
                    </div>
                    <h3 className="text-lg font-bold text-white/60 mb-1">Future Horizons</h3>
                    <p className="text-sm text-white/40 font-mono mb-4">RESEARCH</p>
                    <ul className="space-y-3 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-white/20 mt-1">•</span> Native iOS & Android Apps
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-white/20 mt-1">•</span> AI-Assisted Smart Trimming
                        </li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
