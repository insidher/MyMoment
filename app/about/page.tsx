export default function AboutPage() {
    return (
        <main className="max-w-4xl mx-auto py-16 px-6 min-h-[80vh]">
            <article className="prose prose-invert prose-lg max-w-none">
                <h1 className="text-4xl font-black tracking-tight text-white mb-4">
                    The Digital Listening Room
                </h1>
                <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                    MyMoment is a dedicated tool for curators to discover, trim, and share specific moments
                    from long-form content. We believe the best stories are often hidden in the details.
                </p>

                <div className="grid md:grid-cols-3 gap-8 my-16 not-prose">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-green-400 mb-2">Focus</h3>
                        <p className="text-sm text-gray-400">
                            Cut through the noise. We build tools that help you isolate exactly what matters.
                        </p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-orange-400 mb-2">Curation</h3>
                        <p className="text-sm text-gray-400">
                            Curation is a form of creation. Your taste defines your library.
                        </p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-blue-400 mb-2">Respect</h3>
                        <p className="text-sm text-gray-400">
                            We honor the original creators by driving engagement back to their source material.
                        </p>
                    </div>
                </div>

                <h2>Our Mission</h2>
                <p>
                    In an age of infinite content, finding the signal is harder than ever. MyMoment exists to give
                    you a personal "Listening Room"—a space where you can keep a text-based library of your
                    favorite content, annotated with your thoughts and ready to share.
                </p>
                <p>
                    Whether you are a music enthusiast, a podcast junkie, or a researcher, MyMoment gives you
                    the power to capture knowledge and inspiration as it happens.
                </p>
            </article>
        </main>
    );
}
