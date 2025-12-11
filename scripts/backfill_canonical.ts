import { prisma } from '../src/lib/prisma';
import { generateCanonicalId } from '../src/lib/canonical';

async function main() {
    console.log('Starting Canonical ID Backfill...');

    const trackSources = await prisma.trackSource.findMany({
        where: {
            canonicalTrackId: null
        }
    });

    console.log(`Found ${trackSources.length} TrackSources to backfill.`);

    let updated = 0;
    for (const ts of trackSources) {
        const canonicalId = generateCanonicalId(ts.artist || 'unknown', ts.title || 'unknown');

        await prisma.trackSource.update({
            where: { id: ts.id },
            data: { canonicalTrackId: canonicalId }
        });

        // Also update related moments if they don't have it (optional, but good for consistent state)
        // Actually, the plan says moments should have it too.
        await prisma.moment.updateMany({
            where: { trackSourceId: ts.id, canonicalTrackId: null },
            data: { canonicalTrackId: canonicalId }
        });

        updated++;
        if (updated % 10 === 0) process.stdout.write('.');
    }

    console.log(`\nBackfill complete. Updated ${updated} records.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
