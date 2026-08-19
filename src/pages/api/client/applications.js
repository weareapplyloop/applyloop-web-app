import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

function createReference(id) {
  return `#${String(id || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()}`;
}

function normalizeApplication(application) {
  return {
    id: application.id,
    number: createReference(application.id),
    company: application.company,
    position: application.position,
    location: application.location,
    status: application.status,
    linkSource: application.link_source,
    role: application.role,
    appliedAt: application.applied_at,
    preferences: application.preferences || [],
    jobUrl: application.job_url,
    resumeName: application.resume_name,
    coverLetterName: application.cover_letter_name,
    feedback: application.feedback,
    jobDetails: application.job_details || [],
    qualities: application.qualities || [],
    otherDetails: application.other_details || [],
    clientApprovalStatus:
      application.client_approval_status,
    clientApprovedAt:
      application.client_approved_at,
    resumePath: application.resume_path,
    coverLetterPath:
      application.cover_letter_path,
    createdAt: application.created_at,
    updatedAt: application.updated_at,
  };
}

function createStats(applications) {
  return applications.reduce(
    (stats, application) => {
      stats.total += 1;

      if (application.status === 'Submitted') {
        stats.submitted += 1;
      }

      if (application.status === 'Waiting') {
        stats.waiting += 1;
      }

      if (
        application.status ===
        'Interview Scheduled'
      ) {
        stats.interviewScheduled += 1;
      }

      if (
        application.status ===
        'Offer Received'
      ) {
        stats.offerReceived += 1;
      }

      if (application.status === 'Rejected') {
        stats.rejected += 1;
      }

      return stats;
    },
    {
      total: 0,
      submitted: 0,
      waiting: 0,
      interviewScheduled: 0,
      offerReceived: 0,
      rejected: 0,
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      error: 'Method not allowed.',
    });
  }

  try {
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
      data,
      error,
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
      .eq('client_id', client.id)
      .order('applied_at', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      throw new ApiError(
        500,
        'Your applications could not be loaded.'
      );
    }

    const applications = (data || []).map(
      normalizeApplication
    );

    return res.status(200).json({
      applications,
      stats: createStats(applications),
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client applications API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to load your applications right now.'
          : error.message,
    });
  }
}
