
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
    const moments = await prisma.moment.findMany();
    console.log(`Total moments: ${moments.length}`);

    const groups = {};
    moments.forEach(m => {
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
}

checkDuplicates()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
