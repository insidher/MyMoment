require('dotenv').config();
const { execSync } = require('child_process');

console.log('Deploying to Supabase...');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

try {
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
    console.log('Success!');
} catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
}
