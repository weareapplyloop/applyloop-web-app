import { ApiError } from '../../../../../lib/auth/requireAdmin';
import { requireClient } from '../../../../../lib/auth/requireClient';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateApplicationId(value) {
  if (
    typeof value !== 'string' ||
    !UUID_PATTERN.test(value)
  ) {
    throw new ApiError(
      400,
      'The application ID is invalid.'
    );
  }

  return value;
}

function validateMessage(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new ApiError(
      400,
      'A feedback message is required.'
    );
  }

  const trimmed = value.trim();

  if (trimmed.length > 5000) {
    throw new ApiError(
      400,
      'Feedback cannot exceed 5000 characters.'
    );
  }

  return trimmed;
}

export default async function handler(
  req,
  res
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed.',
    });
  }

  try {
    const applicationId =
      validateApplicationId(
        req.query.id
      );

    const message = validateMessage(
      req.body?.message
    );

    const {
      profile,
      supabase,
    } = await requireClient(req);

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
      data: application,
      error: applicationError,
    } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('client_id', client.id)
      .maybeSingle();

    if (applicationError) {
      throw new ApiError(
        500,
        'The application could not be verified.'
      );
    }

    if (!application) {
      throw new ApiError(
        404,
        'Application not found.'
      );
    }

    const {
      data: feedback,
      error: feedbackError,
    } = await supabase
      .from('application_messages')
      .insert({
        application_id:
          application.id,
        sender_user_id:
          profile.id,
        subject: 'Client Feedback',
        message,
        visibility: 'client',
      })
      .select(`
        id,
        sender_user_id,
        subject,
        message,
        created_at
      `)
      .single();

    if (feedbackError || !feedback) {
      throw new ApiError(
        500,
        'Your feedback could not be sent.'
      );
    }

    return res.status(201).json({
      message: {
        id: feedback.id,
        subject: feedback.subject,
        message: feedback.message,
        createdAt:
          feedback.created_at,
        sender: {
          id: profile.id,
          name:
            profile.full_name ||
            'Client',
          role: profile.role,
        },
      },
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client feedback API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to send your feedback right now.'
          : error.message,
    });
  }
}
