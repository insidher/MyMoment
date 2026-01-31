import Link from 'next/link';
import { Twitter, Github, Linkedin, Disc } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full bg-black border-t border-white/5 py-12 md:py-16 mt-auto">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">

                {/* Col 1: Brand */}
                <div className="space-y-4">
                    <div className="font-bold text-xl tracking-tight flex items-center">
                        <span className="text-green-500">My</span>
                        <span className="ml-[0.2em] text-green-500">M</span>
                        <span className="relative inline-block px-[1px]">
                            <span className="absolute inset-0 bg-orange-600/60 rounded ring-1 ring-inset ring-orange-400/80" />
                            <span className="relative z-10 text-black">ome</span>
                        </span>
                        <span className="text-green-500">nt</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                        Capture, curate, and share the best parts of your favorite content. The ultimate robust timeline for creators and consumers.
                    </p>
                    <div className="text-xs text-gray-600 font-mono">
                        © 2026 MyMoment Inc.
                    </div>
                </div>

                {/* Col 2: Product */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Product</h4>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li>
                            <Link href="/about" className="hover:text-white transition-colors">About</Link>
                        </li>
                        <li>
                            <Link href="/roadmap" className="hover:text-white transition-colors">Roadmap</Link>
                        </li>
                        <li>
                            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                        </li>
                        <li>
                            <span className="text-gray-700 cursor-not-allowed text-xs uppercase tracking-wider font-semibold">Changelog (Coming Soon)</span>
                        </li>
                    </ul>
                </div>

                {/* Col 3: Legal */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Legal</h4>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li>
                            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        </li>
                        <li>
                            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        </li>
                        <li>
                            <Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
                        </li>
                    </ul>
                </div>

                {/* Col 4: Compliance */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Compliance</h4>
                    <div className="space-y-3 text-xs text-gray-500 leading-relaxed">
                        <p>
                            By using MyMoment, users agree to be bound by the{' '}
                            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white decoration-gray-700 transition-colors">
                                YouTube Terms of Service
                            </a>.
                        </p>
                        <p>
                            Refer to the{' '}
                            <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white decoration-gray-700 transition-colors">
                                Google Privacy Policy
                            </a>.
                        </p>
                        <p className="opacity-70">
                            MyMoment is a third-party application not affiliated with YouTube or Spotify. All content is copyright of their respective owners.
                        </p>
                    </div>
                </div>

            </div>
        </footer>
    );
}
