import { Check } from 'lucide-react';

export default function PricingPage() {
    return (
        <main className="max-w-6xl mx-auto py-16 px-6 min-h-[80vh]">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-black tracking-tight text-white mb-4">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-gray-400">
                    Start curating for free. Upgrade for professional power.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Free Tier */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all">
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-white/60 mb-2">Curator</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white">$0</span>
                            <span className="text-sm text-gray-500">/month</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">
                            Perfect for casual listeners and personal collections.
                        </p>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-sm text-gray-300">
                            <Check size={16} className="text-green-500" />
                            Unlimited Listening Rooms
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-300">
                            <Check size={16} className="text-green-500" />
                            Public Profile
                        </li>
                    </ul>

                    <button className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                        Get Started
                    </button>
                </div>

                {/* Pro Tier */}
                <div className="bg-gradient-to-b from-[#1a2332] to-black border border-orange-500/20 rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:border-orange-500/40 transition-all shadow-2xl">
                    <div className="absolute top-0 right-0 bg-orange-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl text-white">
                        POPULAR
                    </div>

                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-orange-400 mb-2">Pro Curator</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white">$9</span>
                            <span className="text-sm text-gray-500">/month</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">
                            For creators, teachers, and power users who need more control.
                        </p>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-sm text-white">
                            <Check size={16} className="text-orange-500" />
                            <strong>Unlimited Drafts</strong>
                        </li>
                        <li className="flex items-center gap-3 text-sm text-white">
                            <Check size={16} className="text-orange-500" />
                            Private Rooms & Collections
                        </li>
                        <li className="flex items-center gap-3 text-sm text-white">
                            <Check size={16} className="text-orange-500" />
                            Advanced Analytics
                        </li>
                        <li className="flex items-center gap-3 text-sm text-white">
                            <Check size={16} className="text-orange-500" />
                            Creator Mode (Annotations)
                        </li>
                    </ul>

                    <button className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors shadow-lg shadow-orange-900/20">
                        Upgrade Now
                    </button>
                </div>
            </div>

            <p className="text-center text-xs text-white/20 mt-12 font-mono">
                * Prices subject to change during Beta.
            </p>
        </main>
    );
}
