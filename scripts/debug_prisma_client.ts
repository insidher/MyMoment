import { prisma } from '@/lib/prisma';

async function main() {
    console.log('Prisma Client Keys:', Object.keys(prisma));
    console.log('prisma.profile exists:', !!prisma['profile']);
    console.log('prisma.user exists:', !!prisma['user']);

    if (prisma['profile']) {
        const count = await prisma['profile'].count();
        console.log('Profile count:', count);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
