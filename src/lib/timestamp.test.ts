
import { describe, it, expect } from 'vitest';

describe('Timestamp Logic', () => {
    it('Start time cannot be greater than End time', () => {
        const start = 10;
        const end = 5;
        const isValid = start <= end;
        expect(isValid).toBe(false);
    });

    it('Start time can be equal to End time (instant)', () => {
        const start = 10;
        const end = 10;
        const isValid = start <= end;
        expect(isValid).toBe(true);
    });
});
