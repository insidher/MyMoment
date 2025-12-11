import { prisma } from '../src/lib/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

interface LegacyMoment {
    id: string;
    url: string;
    platform: string;
    startTime: string;
    endTime: string;
    note: string;
    title?: string;
    artist?: string;
    artwork?: string;
    createdAt: string;
}

function parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
    }
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
}

function detectService(url: string, platform?: string): string {
    if (url.includes('youtube')) return 'youtube';
    if (url.includes('spotify')) return 'spotify';
    if (url.includes('apple')) return 'apple-music';
    if (platform) return platform;
    return 'legacy';
}

async function main() {
    // Read legacy JSON file
    const jsonPath = join(process.cwd(), 'data', 'moments.json');
    const jsonData = readFileSync(jsonPath, 'utf-8');
    const legacyMoments: LegacyMoment[] = JSON.parse(jsonData);

    // Create or find a test user for legacy moments
    const testUser = await prisma.user.upsert({
        where: { email: 'legacy@moments.app' },
        update: {},
        create: {
            email: 'legacy@moments.app',
            password: 'not-used', // bcrypt placeholder
            name: 'Legacy User',
        },
    });

    console.log(`Migrating ${legacyMoments.length} moments to user: ${testUser.email}`);

    // Migrate each moment
    for (const legacy of legacyMoments) {
        const service = detectService(legacy.url, legacy.platform);
        const startSec = parseTimeToSeconds(legacy.startTime);
        const endSec = parseTimeToSeconds(legacy.endTime);

        await prisma.moment.create({
            data: {
                userId: testUser.id,
                service,
                sourceUrl: legacy.url,
                startSec,
                endSec,
                title: legacy.title,
                artist: legacy.artist,
                artwork: legacy.artwork,
                note: legacy.note,
                createdAt: new Date(legacy.createdAt),
            },
        });

        console.log(`✓ Migrated: ${legacy.note} (${legacy.startTime} → ${legacy.endTime})`);
    }

    console.log('Migration complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
