'use server';

import { createClient } from '@/lib/supabase/server';

export async function checkIsAdmin() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
            return { isAdmin: false };
        }

        const { data, error } = await supabase
            .from('admin_users' as any)
            .select('user_email')
            .eq('user_email', user.email)
            .single();

        if (error || !data) {
            return { isAdmin: false };
        }

        return { isAdmin: true, email: user.email };
    } catch (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false };
    }
}

export async function getAllFeedback() {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('user_feedback' as any)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return { success: false, error };
    }
}

export async function deleteFeedback(id: string) {
    try {
        const supabase = await createClient();

        // Verify admin status
        const { isAdmin } = await checkIsAdmin();
        if (!isAdmin) {
            throw new Error('Unauthorized');
        }

        const { error } = await supabase
            .from('user_feedback' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting feedback:', error);
        return { success: false, error };
    }
}

export async function grantAdminAccess(email: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
            throw new Error('Not authenticated');
        }

        const { error } = await supabase
            .from('admin_users' as any)
            .insert({
                user_email: email,
                granted_by: user.email,
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error granting admin access:', error);
        return { success: false, error };
    }
}
