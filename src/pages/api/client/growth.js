import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateAssignmentId(value) {
  if (
    typeof value !== 'string' ||
    !UUID_PATTERN.test(value)
  ) {
    throw new ApiError(
      400,
      'The course assignment ID is invalid.'
    );
  }

  return value;
}

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

function normalizeCourse(
  assignment,
  course
) {
  return {
    assignmentId:
      assignment.id,
    courseId:
      assignment.course_id,
    title:
      course.title,
    provider:
      course.provider,
    description:
      course.description || '',
    courseUrl:
      course.course_url,
    type:
      course.course_type,
    hours:
      course.hours,
    level:
      course.level,
    rating:
      course.rating,
    relevance:
      assignment.relevance_score,
    isSaved:
      assignment.is_saved,
    isCompleted:
      assignment.is_completed,
    completedAt:
      assignment.completed_at,
    createdAt:
      assignment.created_at,
    updatedAt:
      assignment.updated_at,
  };
}

function buildStats(courses) {
  const totalCourses =
    courses.length;

  const completedCourses =
    courses.filter(
      (course) =>
        course.isCompleted
    ).length;

  const savedCourses =
    courses.filter(
      (course) =>
        course.isSaved
    ).length;

  const completionRate =
    totalCourses > 0
      ? Math.round(
          (completedCourses /
            totalCourses) *
            100
        )
      : 0;

  return {
    totalCourses,
    completedCourses,
    savedCourses,
    completionRate,
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

    const client = await getClient(
      supabase,
      profile.id
    );

    if (req.method === 'GET') {
      const [
        assignmentsResult,
        skillGapsResult,
        certificationsResult,
      ] = await Promise.all([
        supabase
          .from(
            'client_growth_courses'
          )
          .select(`
            id,
            course_id,
            relevance_score,
            is_saved,
            is_completed,
            completed_at,
            created_at,
            updated_at
          `)
          .eq(
            'client_id',
            client.id
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            'client_skill_gaps'
          )
          .select(`
            id,
            skill,
            priority,
            current_score,
            target_score,
            created_at,
            updated_at
          `)
          .eq(
            'client_id',
            client.id
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          ),

        supabase
          .from(
            'client_certification_recommendations'
          )
          .select(`
            id,
            certification_name,
            provider,
            certification_url,
            sort_order,
            created_at,
            updated_at
          `)
          .eq(
            'client_id',
            client.id
          )
          .order(
            'sort_order',
            {
              ascending: true,
            }
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          ),
      ]);

      if (
        assignmentsResult.error ||
        skillGapsResult.error ||
        certificationsResult.error
      ) {
        console.error(
          'Growth data query error:',
          {
            assignments:
              assignmentsResult.error,
            skillGaps:
              skillGapsResult.error,
            certifications:
              certificationsResult.error,
          }
        );

        throw new ApiError(
          500,
          'Growth recommendations could not be loaded.'
        );
      }

      const assignments =
        assignmentsResult.data || [];

      const courseIds = [
        ...new Set(
          assignments
            .map(
              (item) =>
                item.course_id
            )
            .filter(Boolean)
        ),
      ];

      let coursesById =
        new Map();

      if (courseIds.length > 0) {
        const {
          data: courses,
          error: coursesError,
        } = await supabase
          .from('growth_courses')
          .select(`
            id,
            title,
            provider,
            description,
            course_url,
            course_type,
            hours,
            level,
            rating,
            is_active
          `)
          .in('id', courseIds)
          .eq(
            'is_active',
            true
          );

        if (coursesError) {
          throw new ApiError(
            500,
            'Growth courses could not be loaded.'
          );
        }

        coursesById = new Map(
          (courses || []).map(
            (course) => [
              course.id,
              course,
            ]
          )
        );
      }

      const courses =
        assignments
          .map((assignment) => {
            const course =
              coursesById.get(
                assignment.course_id
              );

            if (!course) {
              return null;
            }

            return normalizeCourse(
              assignment,
              course
            );
          })
          .filter(Boolean);

      const skillGaps =
        (
          skillGapsResult.data ||
          []
        ).map((item) => ({
          id: item.id,
          skill: item.skill,
          priority:
            item.priority,
          current:
            item.current_score,
          target:
            item.target_score,
          createdAt:
            item.created_at,
          updatedAt:
            item.updated_at,
        }));

      const certifications =
        (
          certificationsResult.data ||
          []
        ).map((item) => ({
          id: item.id,
          name:
            item.certification_name,
          provider:
            item.provider,
          url:
            item.certification_url,
          sortOrder:
            item.sort_order,
          createdAt:
            item.created_at,
          updatedAt:
            item.updated_at,
        }));

      return res.status(200).json({
        stats:
          buildStats(courses),
        courses,
        skillGaps,
        certifications,
      });
    }

    if (req.method === 'PATCH') {
      const assignmentId =
        validateAssignmentId(
          req.body?.assignmentId
        );

      const hasSaved =
        typeof req.body?.isSaved ===
        'boolean';

      const hasCompleted =
        typeof req.body
          ?.isCompleted ===
        'boolean';

      if (
        !hasSaved &&
        !hasCompleted
      ) {
        throw new ApiError(
          400,
          'No growth progress change was provided.'
        );
      }

      const {
        data: assignment,
        error: assignmentError,
      } = await supabase
        .from(
          'client_growth_courses'
        )
        .select(`
          id,
          course_id,
          relevance_score,
          is_saved,
          is_completed,
          completed_at,
          created_at,
          updated_at
        `)
        .eq(
          'id',
          assignmentId
        )
        .eq(
          'client_id',
          client.id
        )
        .maybeSingle();

      if (assignmentError) {
        throw new ApiError(
          500,
          'Course progress could not be loaded.'
        );
      }

      if (!assignment) {
        throw new ApiError(
          404,
          'Course recommendation not found.'
        );
      }

      const updates = {};

      if (hasSaved) {
        updates.is_saved =
          req.body.isSaved;
      }

      if (hasCompleted) {
        updates.is_completed =
          req.body.isCompleted;

        updates.completed_at =
          req.body.isCompleted
            ? new Date().toISOString()
            : null;
      }

      const {
        data: updated,
        error: updateError,
      } = await supabase
        .from(
          'client_growth_courses'
        )
        .update(updates)
        .eq(
          'id',
          assignment.id
        )
        .eq(
          'client_id',
          client.id
        )
        .select(`
          id,
          course_id,
          relevance_score,
          is_saved,
          is_completed,
          completed_at,
          created_at,
          updated_at
        `)
        .single();

      if (
        updateError ||
        !updated
      ) {
        throw new ApiError(
          500,
          'Course progress could not be updated.'
        );
      }

      return res.status(200).json({
        assignment: {
          assignmentId:
            updated.id,
          courseId:
            updated.course_id,
          relevance:
            updated.relevance_score,
          isSaved:
            updated.is_saved,
          isCompleted:
            updated.is_completed,
          completedAt:
            updated.completed_at,
          createdAt:
            updated.created_at,
          updatedAt:
            updated.updated_at,
        },
      });
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
        'Client growth API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to process your growth information right now.'
          : error.message,
    });
  }
}
