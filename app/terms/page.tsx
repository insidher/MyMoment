export default function TermsPage() {
    return (
        <main className="max-w-3xl mx-auto py-20 px-6 min-h-[80vh]">
            <div className="mb-12 border-b border-white/10 pb-8">
                <h1 className="text-4xl font-black tracking-tight text-white mb-4">Terms of Service</h1>
                <p className="text-sm text-gray-500 font-mono">
                    Last Updated: <span className="text-white">January 31, 2026</span>
                </p>
            </div>

            <article className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-gray-400 prose-li:text-gray-400 prose-strong:text-white">
                <p className="lead text-xl text-gray-300">
                    Welcome to MyMoment. Please read these terms carefully as they govern your use of our platform.
                </p>

                <div className="space-y-12 mt-12">
                    <section>
                        <h3 className="flex items-center gap-3 text-xl mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-sm font-mono text-white/60">1</span>
                            Acceptance of Terms
                        </h3>
                        <p>
                            By accessing and using MyMoment ("the Service"), you agree to be bound by these Terms of Service.
                            The Service acts as a tool for curating content via public APIs (YouTube, Spotify). We do not host
                            copyrighted video or audio files directly.
                        </p>
                    </section>

                    <section>
                        <h3 className="flex items-center gap-3 text-xl mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-sm font-mono text-white/60">2</span>
                            User Responsibilities
                        </h3>
                        <p>
                            You acknowledge that you are responsible for the content you curate and the context you add
                            (notes, tags). MyMoment is a tool for personal curation and discovery. You agree not to:
                        </p>
                        <ul className="list-disc pl-4 space-y-2 mt-4 ml-11 border-l-2 border-white/5">
                            <li>Use the Service for any illegal purpose.</li>
                            <li>Attempt to bypass API restrictions or standard playback controls.</li>
                            <li>Harass, abuse, or harm another person or group through your curated content.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="flex items-center gap-3 text-xl mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-sm font-mono text-white/60">3</span>
                            Beta Disclaimer
                        </h3>
                        <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-lg">
                            <p className="text-sm text-orange-200/80 m-0">
                                <strong>"As Is" Service:</strong> MyMoment is currently in Beta. We provide the Service "as is" and "as available".
                                We do not warrant that the Service will be uninterrupted or error-free. Features and pricing
                                are subject to change.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h3 className="flex items-center gap-3 text-xl mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-sm font-mono text-white/60">4</span>
                            Account Termination
                        </h3>
                        <p>
                            We reserve the right to suspend or terminate your access to the Service at any time, without notice,
                            for any reason, including but not limited to a breach of these Terms.
                        </p>
                    </section>
                </div>
            </article>
        </main>
    );
}
