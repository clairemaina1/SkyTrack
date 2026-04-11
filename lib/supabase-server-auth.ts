import { getSupabaseServer } from './supabase-server';

export function getAuthTokenFromRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/sb-access-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAuthUserFromRequest(request: Request) {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return { user: null, error: new Error('No auth token provided.') };
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.auth.getUser(token);
  return { user: data?.user ?? null, error };
}
