require('dotenv').config();
if (process.env.NEXTAUTH_SECRET) {
    console.log('NEXTAUTH_SECRET is set.');
} else {
    console.log('NEXTAUTH_SECRET is NOT set.');
}
