import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Starting SavedBy Count Backfill...');

    // 1. Reset all counts to 0 (optional, but safer)
    await prisma.moment.updateMany({
        data: { savedByCount: 0 }
    });

    // 2. Fetch all moments
    const moments = await prisma.moment.findMany({
        select: { id: true, startSec: true, endSec: true, canonicalTrackId: true, trackSourceId: true }
    });

    console.log(`Processing ${moments.length} moments...`);

    const TOLERANCE_SEC = 2;
    let processed = 0;

    for (const moment of moments) {
        // Find neighbors
        // We do this naively for every moment. 
        // Optimization: In a real large DB, we'd group by canonicalId first.

        const count = moments.filter(m => {
            // Check ID match
            const sameTrack = (moment.canonicalTrackId && m.canonicalTrackId === moment.canonicalTrackId) ||
                (!moment.canonicalTrackId && m.trackSourceId === moment.trackSourceId);

            if (!sameTrack) return false;

            // Check overlap
            const startOverlap = m.startSec >= moment.startSec - TOLERANCE_SEC && m.startSec <= moment.startSec + TOLERANCE_SEC;
            const endOverlap = m.endSec >= moment.endSec - TOLERANCE_SEC && m.endSec <= moment.endSec + TOLERANCE_SEC;

            return startOverlap && endOverlap;
        }).length;

        await prisma.moment.update({
            where: { id: moment.id },
            data: { savedByCount: count }
        });

        processed++;
        if (processed % 10 === 0) process.stdout.write('.');
    }

    console.log(`\nBackfill complete. Processed ${processed} moments.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
