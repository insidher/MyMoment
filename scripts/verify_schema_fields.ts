import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Verifying Schema Fields...');

    // Create a dummy user if needed, or just use existing
    // We'll try to create a dummy TrackSource and Moment with the new fields
    // If this compiles and runs, the fields exist.

    try {
        const ts = await prisma.trackSource.create({
            data: {
                service: 'test_service',
                sourceUrl: 'http://test.com/' + Date.now(),
                canonicalTrackId: 'can_test_123',
                title: 'Test Title',
                artist: 'Test Artist'
            }
        });
        console.log('TrackSource created with canonicalTrackId:', ts.canonicalTrackId);

        if (ts.canonicalTrackId !== 'can_test_123') {
            console.error('FAIL: canonicalTrackId not saved properly');
        }

        const user = await prisma.user.findFirst();
        if (!user) {
            console.warn('No user found, skipping Moment creation check (requires user)');
            return;
        }

        const moment = await prisma.moment.create({
            data: {
                userId: user.id,
                trackSourceId: ts.id,
                service: 'test_service',
                sourceUrl: ts.sourceUrl,
                startSec: 0,
                endSec: 10,
                savedByCount: 5,
                canonicalTrackId: 'can_test_123'
            }
        });
        console.log('Moment created with savedByCount:', moment.savedByCount);

        if (moment.savedByCount !== 5) {
            console.error('FAIL: savedByCount not saved properly');
        } else {
            console.log('SUCCESS: Schema fields are working correctly.');
        }

        // Cleanup
        await prisma.moment.delete({ where: { id: moment.id } });
        await prisma.trackSource.delete({ where: { id: ts.id } });

    } catch (e) {
        console.error('Error during verification:', e);
        process.exit(1);
    }
}

main();
