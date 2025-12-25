const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    console.log('Opening DB at:', dbPath);
    const db = new Database(dbPath, { readonly: true });

    const moments = db.prepare("SELECT * FROM Moment WHERE note LIKE '%Final test moment%'").all();
    console.log('Found Moments:', moments);

    if (moments.length === 0) {
        console.log('No matching moments found. Listing all moments:');
        const allMoments = db.prepare("SELECT * FROM Moment").all();
        console.log(allMoments);
    }

    db.close();
} catch (error) {
    console.error('Error:', error);
}
