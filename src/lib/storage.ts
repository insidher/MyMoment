import fs from 'fs';
import path from 'path';
import { Moment } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'moments.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

export async function getMoments(): Promise<Moment[]> {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading moments:', error);
        return [];
    }
}

export async function saveMoment(moment: Moment): Promise<void> {
    try {
        const moments = await getMoments();
        moments.push(moment);
        fs.writeFileSync(DATA_FILE, JSON.stringify(moments, null, 2));
    } catch (error) {
        console.error('Error saving moment:', error);
        throw error;
    }
}
