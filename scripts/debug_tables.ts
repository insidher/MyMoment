import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking recent moments...');
    try {
        const moments = await prisma.moment.findMany({
            take: 5,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                trackSource: true
            }
        });

        console.log('Recent Moments:');
        moments.forEach(m => {
            console.log('------------------------------------------------');
            console.log(`ID: ${m.id}`);
            console.log(`Title: ${m.title || m.trackSource?.title}`);
            console.log(`Resource: ${m.resourceId}`);
            console.log(`Start/End: ${m.startSec || m.startTime} - ${m.endSec || m.endTime}`); // Try both just in case, but lint said startSec
            console.log(`Duration (Calc): ${(m.endSec || 0) - (m.startSec || 0)}`);
            console.log(`Track Source ID: ${m.trackSourceId}`);
            console.log(`Track Source Duration: ${m.trackSource?.durationSec}`);
        });
    } catch (error) {
        console.error('Database query failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
