import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import SessionProvider from "@/components/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Moments - Capture Your Favorite Part",
    description: "Save and share the best parts of songs and videos.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-black text-white antialiased`}>
                <SessionProvider>
                    <Navbar />
                    <div className="pt-28">
                        {children}
                    </div>
                </SessionProvider>
            </body>
        </html>
    );
}
