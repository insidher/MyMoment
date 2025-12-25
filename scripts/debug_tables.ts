import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database tables...');
    try {
        // Query system catalog for table names
        const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
        console.log('Tables found:', tables);
    } catch (error) {
        console.error('Database query failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
