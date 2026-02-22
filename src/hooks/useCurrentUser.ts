import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function useCurrentUser() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  return email;
}
