'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function FooterWrapper() {
    const pathname = usePathname();

    // Don't render global footer on room pages as they have their own specific layout requirements
    if (pathname?.startsWith('/room/')) {
        return null;
    }

    return <Footer />;
}
