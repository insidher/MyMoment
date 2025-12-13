
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
    try {
        const moments = await prisma.moment.findMany();
        console.log(`Total moments: ${moments.length}`);

        const groups: Record<string, string[]> = {};
        moments.forEach(m => {
            // Use the grouping key logic from the frontend
            const key = `${m.startSec}-${m.endSec}-${m.sourceUrl}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m.id);
        });

        const duplicates = Object.entries(groups).filter(([key, ids]) => ids.length > 1);

        if (duplicates.length > 0) {
            console.log('Found duplicates groups:');
            duplicates.forEach(([key, ids]) => {
                console.log(`Key: ${key} -> ${ids.length} moments`);
                console.log(`IDs: ${ids.join(', ')}`);
            });
        } else {
            console.log('No duplicates found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDuplicates();
