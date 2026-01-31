export default function CookiesPage() {
    return (
        <main className="max-w-4xl mx-auto py-16 px-6 min-h-[80vh]">
            <article className="prose prose-invert prose-sm max-w-none text-gray-400">
                <h1 className="text-3xl font-bold text-white mb-8">Cookie Policy</h1>
                <p className="font-mono text-xs text-gray-500 mb-8">Last Updated: January 2026</p>

                <h3>1. What Are Cookies?</h3>
                <p>
                    Cookies are small text files stored on your device when you visit websites. They help us
                    recognize you and remember your preferences.
                </p>

                <h3>2. How We Use Cookies</h3>
                <p>
                    We use cookies for the following purposes:
                </p>
                <ul>
                    <li>
                        <strong>Essential Cookies:</strong> Required for the operation of the Service,
                        specifically for Authentication (keeping you logged in via Supabase).
                    </li>
                    <li>
                        <strong>Analytics Cookies:</strong> To understand how users interact with our platform
                        so we can improve the experience.
                    </li>
                </ul>

                <h3>3. Third-Party Cookies</h3>
                <p>
                    Our Service embeds content from YouTube and Spotify. These third-party providers may
                    set their own cookies to track playback and user interaction according to their own policies.
                </p>

                <h3>4. Managing Preferences</h3>
                <p>
                    You can control and/or delete cookies as you wish using your browser settings.
                    <br />
                    <a href="#" className="text-blue-400 hover:underline cursor-not-allowed opacity-50">
                        Manage Cookie Preferences (Coming Soon)
                    </a>
                </p>
            </article>
        </main>
    );
}
