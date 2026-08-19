import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

function validateJobUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'A job link is required.');
  }

  const trimmed = value.trim();

  if (trimmed.length > 2000) {
    throw new ApiError(400, 'The job link is too long.');
  }

  let url;

  try {
    url = new URL(trimmed);
  } catch {
    throw new ApiError(
      400,
      'Please enter a valid job link.'
    );
  }

  if (
    !['http:', 'https:'].includes(url.protocol)
  ) {
    throw new ApiError(
      400,
      'Please enter a valid HTTP or HTTPS job link.'
    );
  }

  return url.toString();
}

function validateComment(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError(
      400,
      'Comment must be text.'
    );
  }

  const trimmed = value.trim();

  if (trimmed.length > 2000) {
    throw new ApiError(
      400,
      'Comment is too long.'
    );
  }

  return trimmed || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed.',
    });
  }

  try {
    const {
      profile,
      supabase,
    } = await requireClient(req);

    const jobUrl = validateJobUrl(
      req.body?.jobLink
    );

    const comment = validateComment(
      req.body?.comment
    );

    const {
      data: client,
      error: clientError,
    } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (clientError || !client) {
      throw new ApiError(
        404,
        'Your client record could not be found.'
      );
    }

    const {
      data: request,
      error: requestError,
    } = await supabase
      .from('client_job_requests')
      .insert({
        client_id: client.id,
        submitted_by: profile.id,
        job_url: jobUrl,
        comment,
        status: 'new',
      })
      .select(`
        id,
        job_url,
        comment,
        status,
        created_at
      `)
      .single();

    if (requestError || !request) {
      throw new ApiError(
        500,
        'Your job link could not be submitted.'
      );
    }

    return res.status(201).json({
      message: 'Job link submitted successfully.',
      request: {
        id: request.id,
        jobLink: request.job_url,
        comment: request.comment,
        status: request.status,
        createdAt: request.created_at,
      },
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client job request API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to submit your job link right now.'
          : error.message,
    });
  }
}
