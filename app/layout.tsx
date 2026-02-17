import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { FilterProvider } from "@/context/FilterContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "sonner";
import FooterWrapper from "@/components/layout/FooterWrapper";

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
            <body className={`${inter.className} bg-black text-white antialiased`} suppressHydrationWarning>
                <AuthProvider>
                    <FilterProvider>
                        <ThemeProvider>
                            <Navbar />
                            <div className="pt-14 min-h-screen flex flex-col">
                                {children}
                                <FooterWrapper />
                            </div>
                            <Toaster position="bottom-right" />
                        </ThemeProvider>
                    </FilterProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
