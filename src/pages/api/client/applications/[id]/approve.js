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
        client_approval_status,
        client_approved_at
      `)
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

    if (
      application.client_approval_status ===
      'approved'
    ) {
      return res.status(200).json({
        message:
          'Application is already approved.',
        approval: {
          status: 'approved',
          approvedAt:
            application.client_approved_at,
        },
      });
    }

    if (
      ![
        'pending',
        'changes_requested',
      ].includes(
        application.client_approval_status
      )
    ) {
      throw new ApiError(
        400,
        'This application does not require client approval.'
      );
    }

    const approvedAt =
      new Date().toISOString();

    const {
      data: updatedApplication,
      error: updateError,
    } = await supabase
      .from('applications')
      .update({
        client_approval_status:
          'approved',
        client_approved_at:
          approvedAt,
      })
      .eq('id', application.id)
      .eq('client_id', client.id)
      .select(`
        client_approval_status,
        client_approved_at
      `)
      .single();

    if (
      updateError ||
      !updatedApplication
    ) {
      throw new ApiError(
        500,
        'The application could not be approved.'
      );
    }

    return res.status(200).json({
      message:
        'Application approved successfully.',
      approval: {
        status:
          updatedApplication.client_approval_status,
        approvedAt:
          updatedApplication.client_approved_at,
      },
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client application approval API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to approve this application right now.'
          : error.message,
    });
  }
}
