'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function uploadAvatar(formData: FormData) {
    const supabase = await createClient();

    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
        return { error: 'Missing file or user ID' };
    }

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Upload error:', uploadError);
        return { error: 'Failed to upload image' };
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    // 3. Update User Metadata
    const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
    });

    if (updateError) {
        console.error('Update user error:', updateError);
        return { error: 'Failed to update user profile' };
    }

    revalidatePath('/', 'layout');
    return { success: true, url: publicUrl };
}
