import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Group, GroupType, MemberRole } from '@/lib/types';

export type MemberWithProfile = {
  user_id: string;
  role: MemberRole;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
  streak_freezes_remaining: number;
};

export type GroupContext = {
  userId: string;
  group: Group;
  members: MemberWithProfile[];
  me: MemberWithProfile;
  isOwner: boolean;
};

function flatten(value: unknown) {
  return (Array.isArray(value) ? value[0] : value) as
    | {
        display_name: string;
        avatar_url: string | null;
        total_xp: number;
        level: number;
        current_streak: number;
        streak_freezes_remaining: number;
      }
    | null
    | undefined;
}

/**
 * Loads the group and its members for the signed-in viewer.
 *
 * RLS does the access check: a non-member's select simply returns nothing, so a
 * missing group here means "not yours" and 404s rather than leaking existence.
 */
export async function requireGroup(groupId: string): Promise<GroupContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: group }, { data: rows }] = await Promise.all([
    supabase
      .from('groups')
      .select(
        'id, name, type, max_members, daily_goal_minutes, timezone, invite_code, created_by, created_at',
      )
      .eq('id', groupId)
      .maybeSingle(),
    supabase
      .from('group_members')
      .select(
        'user_id, role, joined_at, users(display_name, avatar_url, total_xp, level, current_streak, streak_freezes_remaining)',
      )
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true }),
  ]);

  if (!group) notFound();

  const members: MemberWithProfile[] = (rows ?? []).flatMap((row) => {
    const profile = flatten(row.users);
    if (!profile) return [];
    return [
      {
        user_id: row.user_id,
        role: row.role as MemberRole,
        joined_at: row.joined_at,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        total_xp: profile.total_xp,
        level: profile.level,
        current_streak: profile.current_streak,
        streak_freezes_remaining: profile.streak_freezes_remaining,
      },
    ];
  });

  const me = members.find((m) => m.user_id === user.id);
  if (!me) notFound();

  return {
    userId: user.id,
    group: { ...group, type: group.type as GroupType } as Group,
    members,
    me,
    isOwner: me.role === 'owner',
  };
}
