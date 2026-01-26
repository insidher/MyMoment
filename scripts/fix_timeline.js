const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/PlayerTimeline.tsx');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Index 1387 is Line 1388
    console.log(`Line 1388: ${lines[1387]}`);

    // Fix Line 1388
    lines[1387] = lines[1387].replace('})()}ips (Bi-directional)', '})()}');
    console.log(`Fixed Line 1388: ${lines[1387]}`);

    // Keep 0 to 1387 (inclusive) -> lines.slice(0, 1388)
    const part1 = lines.slice(0, 1388);

    // Skip 1388 to 1752 (inclusive). 
    // Line 1753 (index 1752) is the duplicate `})()}`.
    // We want to KEEP from Line 1754 (index 1753) onwards.
    const part2 = lines.slice(1753);

    console.log(`Line 1754 (kept): ${part2[0]}`);

    const newContent = [...part1, ...part2].join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');

    console.log('Fixed PlayerTimeline.tsx successfully');

} catch (err) {
    console.error('Error:', err);
}
