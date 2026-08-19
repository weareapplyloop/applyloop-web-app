import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

const VALID_ACTIONS =
  new Set([
    'complete',
    'dismiss',
  ]);

async function getClient(
  supabase,
  profileId
) {
  const {
    data: client,
    error,
  } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', profileId)
    .single();

  if (error || !client) {
    throw new ApiError(
      404,
      'Your client record could not be found.'
    );
  }

  return client;
}

function normalizeProgress(
  progress
) {
  return {
    completedAt:
      progress?.completed_at ||
      null,
    dismissedAt:
      progress?.dismissed_at ||
      null,
    shouldAutoStart:
      !progress?.completed_at &&
      !progress?.dismissed_at,
  };
}

export default async function handler(
  req,
  res
) {
  try {
    const {
      profile,
      supabase,
    } = await requireClient(req);

    const client =
      await getClient(
        supabase,
        profile.id
      );

    if (req.method === 'GET') {
      const {
        data: progress,
        error,
      } = await supabase
        .from(
          'client_product_tour_progress'
        )
        .select(`
          client_id,
          completed_at,
          dismissed_at,
          created_at,
          updated_at
        `)
        .eq(
          'client_id',
          client.id
        )
        .maybeSingle();

      if (error) {
        throw new ApiError(
          500,
          'Tutorial progress could not be loaded.'
        );
      }

      return res.status(200).json(
        normalizeProgress(
          progress
        )
      );
    }

    if (req.method === 'PATCH') {
      const action =
        req.body?.action;

      if (
        !VALID_ACTIONS.has(
          action
        )
      ) {
        throw new ApiError(
          400,
          'A valid tutorial action is required.'
        );
      }

      const now =
        new Date().toISOString();

      const values =
        action === 'complete'
          ? {
              client_id:
                client.id,
              completed_at:
                now,
              dismissed_at:
                null,
            }
          : {
              client_id:
                client.id,
              dismissed_at:
                now,
            };

      const {
        data: progress,
        error,
      } = await supabase
        .from(
          'client_product_tour_progress'
        )
        .upsert(
          values,
          {
            onConflict:
              'client_id',
          }
        )
        .select(`
          client_id,
          completed_at,
          dismissed_at,
          created_at,
          updated_at
        `)
        .single();

      if (
        error ||
        !progress
      ) {
        throw new ApiError(
          500,
          'Tutorial progress could not be saved.'
        );
      }

      return res.status(200).json(
        normalizeProgress(
          progress
        )
      );
    }

    res.setHeader(
      'Allow',
      'GET, PATCH'
    );

    return res.status(405).json({
      error: 'Method not allowed.',
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client tutorial API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to process tutorial progress right now.'
          : error.message,
    });
  }
}
