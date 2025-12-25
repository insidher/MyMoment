const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMoments() {
    const moments = await prisma.moment.findMany({
        select: { id: true, title: true, artist: true, service: true },
        take: 10
    });

    console.log('Recent moments:');
    moments.forEach(m => {
        console.log(`- ${m.title} | Artist: "${m.artist}" | Service: ${m.service}`);
    });

    await prisma.$disconnect();
}

checkMoments().catch(console.error);
