import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// The landing route just decides where a signed-in member belongs: their group
// dashboard if they have one, otherwise the group-creation flow.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  redirect(membership ? `/groups/${membership.group_id}` : '/groups/new');
}
