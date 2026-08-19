import { ApiError } from '../../../../lib/auth/requireAdmin';
import { requireClient } from '../../../../lib/auth/requireClient';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateId(value) {
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

function createReference(id) {
  return `#${String(id)
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()}`;
}

function formatMessage(message, profiles) {
  const sender =
    profiles.get(message.sender_user_id);

  return {
    id: message.id,
    subject: message.subject || '',
    message: message.message,
    createdAt: message.created_at,
    sender: sender
      ? {
          id: sender.id,
          name: sender.full_name || '',
          role: sender.role || '',
        }
      : null,
  };
}

export default async function handler(
  req,
  res
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      error: 'Method not allowed.',
    });
  }

  try {
    const applicationId =
      validateId(req.query.id);

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
      .select(`
        id,
        company,
        position,
        location,
        status,
        link_source,
        role,
        applied_at,
        preferences,
        job_url,
        resume_name,
        cover_letter_name,
        feedback,
        job_details,
        qualities,
        other_details,
        client_approval_status,
        client_approved_at,
        resume_path,
        cover_letter_path,
        created_at,
        updated_at
      `)
      .eq('id', applicationId)
      .eq('client_id', client.id)
      .maybeSingle();

    if (applicationError) {
      throw new ApiError(
        500,
        'The application could not be loaded.'
      );
    }

    if (!application) {
      throw new ApiError(
        404,
        'Application not found.'
      );
    }

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from('application_messages')
      .select(`
        id,
        sender_user_id,
        subject,
        message,
        created_at
      `)
      .eq('application_id', application.id)
      .eq('visibility', 'client')
      .order('created_at', {
        ascending: true,
      });

    if (messagesError) {
      throw new ApiError(
        500,
        'Application feedback could not be loaded.'
      );
    }

    const senderIds = [
      ...new Set(
        (messages || [])
          .map(
            (message) =>
              message.sender_user_id
          )
          .filter(Boolean)
      ),
    ];

    const profileMap = new Map();

    if (senderIds.length > 0) {
      const {
        data: senderProfiles,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select(
          'id, full_name, role'
        )
        .in('id', senderIds);

      if (profilesError) {
        throw new ApiError(
          500,
          'Feedback authors could not be loaded.'
        );
      }

      (senderProfiles || []).forEach(
        (sender) => {
          profileMap.set(
            sender.id,
            sender
          );
        }
      );
    }

    return res.status(200).json({
      application: {
        id: application.id,
        number: createReference(
          application.id
        ),
        company: application.company,
        position: application.position,
        role:
          application.role ||
          application.position,
        location: application.location,
        status: application.status,
        linkSource:
          application.link_source,
        appliedAt:
          application.applied_at,
        preferences:
          application.preferences || [],
        jobUrl: application.job_url,
        resumeName:
          application.resume_name,
        coverLetterName:
          application.cover_letter_name,
        feedback: application.feedback,
        jobDetails:
          application.job_details || [],
        qualities:
          application.qualities || [],
        otherDetails:
          application.other_details || [],
        clientApprovalStatus:
          application.client_approval_status,
        clientApprovedAt:
          application.client_approved_at,
        resumePath:
          application.resume_path,
        coverLetterPath:
          application.cover_letter_path,
        createdAt:
          application.created_at,
        updatedAt:
          application.updated_at,
      },

      messages: (messages || []).map(
        (message) =>
          formatMessage(
            message,
            profileMap
          )
      ),
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client application detail API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to load this application right now.'
          : error.message,
    });
  }
}
