import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <main className="max-w-3xl mx-auto py-20 px-6 min-h-[80vh]">
            <div className="mb-12 border-b border-white/10 pb-8">
                <h1 className="text-4xl font-black tracking-tight text-white mb-4">Privacy Policy</h1>
                <p className="text-sm text-gray-500 font-mono">
                    Last Updated: <span className="text-white">January 31, 2026</span>
                </p>
            </div>

            <article className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-gray-400 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">

                <section className="mb-16">
                    <h3 className="text-xl mb-4 text-white/80 uppercase tracking-widest text-sm font-bold">1. Data Collection</h3>
                    <p>
                        We believe in minimal data collection. We only store what is absolutely necessary to provide
                        you with your personal "Listening Room" experience.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6 mt-6 not-prose">
                        <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                            <h4 className="text-white font-bold mb-2">Account Data</h4>
                            <p className="text-sm text-gray-500">
                                Your name and email address provided via Supabase Authentication. We strictly do not sell this data.
                            </p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                            <h4 className="text-white font-bold mb-2">Usage Data</h4>
                            <p className="text-sm text-gray-500">
                                The moments you curate and your interactions with the platform to improve personalization.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mb-16">
                    <h3 className="text-xl mb-4 text-white/80 uppercase tracking-widest text-sm font-bold">2. Third-Party Services</h3>
                    <div className="bg-blue-900/10 border border-blue-500/20 p-8 rounded-2xl">
                        <h4 className="text-blue-200 font-bold mb-4 mt-0">Google & YouTube API Compliance</h4>
                        <p className="text-sm text-blue-200/70 mb-6">
                            MyMoment uses YouTube API Services to play content. Because we rely on these services,
                            your use of the App is also governed by their policies.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium transition-colors border border-blue-500/20 flex items-center justify-center">
                                Google Privacy Policy ↗
                            </a>
                            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium transition-colors border border-blue-500/20 flex items-center justify-center">
                                YouTube Terms of Service ↗
                            </a>
                        </div>
                    </div>
                </section>

                <section className="mb-16">
                    <h3 className="text-xl mb-4 text-white/80 uppercase tracking-widest text-sm font-bold">3. Cookies</h3>
                    <p>
                        We use cookies primarily for authentication (keeping you logged in). We may also use
                        basic analytics cookies to understand site performance. You can manage these settings
                        in our <Link href="/cookies">Cookie Policy</Link>.
                    </p>
                </section>

                <section>
                    <h3 className="text-xl mb-4 text-white/80 uppercase tracking-widest text-sm font-bold">4. Your Rights</h3>
                    <p>
                        You own your data. You may request a full export or deletion of your account at any time.
                        Simply contact support or use the delete account function in your profile settings.
                    </p>
                </section>

            </article>
        </main>
    );
}
