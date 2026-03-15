import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function useCurrentUser() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      setEmail(data.user?.email ?? '');
    });
  }, []);

  return email;
}
