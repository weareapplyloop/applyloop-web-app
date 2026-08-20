import { createAdminClient } from '../supabase/server';
import { ApiError } from './requireAdmin';

function getAccessToken(req) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Authentication is required.');
  }

  return token;
}

export async function requireClient(req) {
  const accessToken = getAccessToken(req);
  const supabase = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new ApiError(401, 'Your session is invalid or has expired.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, account_status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new ApiError(403, 'Your profile could not be verified.');
  }

  if (
    profile.role !== 'user_client' ||
    profile.account_status !== 'active'
  ) {
    throw new ApiError(
      403,
      'You do not have permission to access the Client workspace.'
    );
  }

  return {
    accessToken,
    profile,
    supabase,
    user,
  };
}
