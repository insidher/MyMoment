
import { z } from 'zod';

export const urlSchema = z.string().url();

export const validateUrl = (url: string) => {
    const result = urlSchema.safeParse(url);
    return result.success ? result.data : null;
};
