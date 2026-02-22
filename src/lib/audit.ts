import { supabase } from './supabase';

export async function logActivity(
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string | number,
  userEmail: string,
  details?: Record<string, any>
) {
  const { error } = await supabase
    .from('audit_log')
    .insert([
      {
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        user_email: userEmail,
        details,
      },
    ]);
  if (error) console.error('Failed to log activity:', error);
}

export async function getRecentActivity(limit = 50) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data, error };
}
