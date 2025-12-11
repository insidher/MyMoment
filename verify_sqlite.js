const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    console.log('Opening DB at:', dbPath);
    const db = new Database(dbPath, { readonly: true });

    const moments = db.prepare('SELECT * FROM Moment').all();
    console.log('Moments:', moments);

    const users = db.prepare('SELECT * FROM User').all();
    console.log('Users:', users);

    db.close();
} catch (error) {
    console.error('Error:', error);
}
