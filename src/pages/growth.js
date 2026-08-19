import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Head from 'next/head';
import {
  FiAward,
  FiBookmark,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiRefreshCw,
  FiStar,
  FiTrendingUp,
} from 'react-icons/fi';

import DashboardLayout from '../shared/components/DashboardLayout';
import { createClient } from '../lib/supabase/client';

const FILTER_TABS = [
  'All',
  'Free',
  'Paid',
  'Saved',
  'Completed',
];

async function getAccessToken() {
  const supabase = createClient();

  if (!supabase) {
    throw new Error(
      'The Supabase connection is unavailable.'
    );
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (
    error ||
    !session?.access_token
  ) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  return session.access_token;
}

function calculateStats(courses) {
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

function StatCard({
  label,
  value,
  sub,
  progress,
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </span>

      <span className="text-3xl font-bold leading-tight text-gray-900">
        {value}
      </span>

      <span className="text-xs text-gray-500">
        {sub}
      </span>

      {typeof progress ===
        'number' && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#1E50C3] transition-all duration-500"
            style={{
              width: `${Math.min(
                Math.max(
                  progress,
                  0
                ),
                100
              )}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function getPriorityStyle(priority) {
  switch (priority) {
    case 'high':
      return 'bg-red-50 text-red-600';

    case 'low':
      return 'bg-green-50 text-green-600';

    case 'medium':
    default:
      return 'bg-amber-50 text-amber-600';
  }
}

function SkillBar({
  skill,
  priority,
  current,
  target,
}) {
  const filledWidth =
    Math.min(
      Math.max(current, 0),
      100
    );

  const gapWidth =
    Math.max(
      Math.min(
        target - current,
        100 - filledWidth
      ),
      0
    );

  return (
    <div className="border-b border-gray-100 py-4 last:border-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-800">
          {skill}
        </span>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${getPriorityStyle(
            priority
          )}`}
        >
          {priority}
        </span>

        <span className="ml-auto text-xs font-medium text-gray-500">
          {current}% → {target}%
        </span>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-l-full bg-[#1E50C3] transition-all duration-500"
          style={{
            width:
              `${filledWidth}%`,
          }}
        />

        <div
          className="h-full bg-blue-200 transition-all duration-500"
          style={{
            width: `${gapWidth}%`,
          }}
        />
      </div>
    </div>
  );
}

function CourseCard({
  course,
  updatingAction,
  onToggleSaved,
  onToggleComplete,
}) {
  const isUpdating =
    Boolean(updatingAction);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {course.title}
          </p>

          <p className="mt-0.5 text-xs text-gray-500">
            {course.provider}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onToggleSaved(course)
          }
          disabled={isUpdating}
          aria-label={
            course.isSaved
              ? 'Remove saved course'
              : 'Save course'
          }
          title={
            course.isSaved
              ? 'Remove saved course'
              : 'Save course'
          }
          className={`flex-shrink-0 rounded-lg p-2 transition ${
            course.isSaved
              ? 'bg-blue-50 text-[#1E50C3]'
              : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FiBookmark
            className="h-4 w-4"
            fill={
              course.isSaved
                ? 'currentColor'
                : 'none'
            }
          />
        </button>
      </div>

      {course.description && (
        <p className="text-xs leading-relaxed text-gray-500">
          {course.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        {course.hours !==
          null &&
          course.hours !==
            undefined && (
            <span className="flex items-center gap-1">
              <FiClock className="h-3 w-3" />
              {course.hours} hours
            </span>
          )}

        {course.rating !==
          null &&
          course.rating !==
            undefined && (
            <span className="flex items-center gap-1">
              <FiStar className="h-3 w-3 text-yellow-400" />
              {course.rating}
            </span>
          )}

        {course.level && (
          <span>
            {course.level}
          </span>
        )}

        <span className="capitalize">
          {course.type}
        </span>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>
            Relevance Score
          </span>

          <span>
            {course.relevance}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-800 transition-all duration-500"
            style={{
              width:
                `${course.relevance}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
        <a
          href={course.courseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-700"
        >
          <FiExternalLink className="h-3.5 w-3.5" />
          View Course
        </a>

        <button
          type="button"
          onClick={() =>
            onToggleComplete(
              course
            )
          }
          disabled={isUpdating}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
            course.isCompleted
              ? 'border-green-200 bg-green-50 text-green-600'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {updatingAction ===
          'complete' ? (
            <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FiCheckCircle className="h-3.5 w-3.5" />
          )}

          {course.isCompleted
            ? 'Completed'
            : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
}

export default function GrowthPage() {
  const [courses, setCourses] =
    useState([]);
  const [skillGaps, setSkillGaps] =
    useState([]);
  const [
    certifications,
    setCertifications,
  ] = useState([]);
  const [
    activeFilter,
    setActiveFilter,
  ] = useState('All');
  const [
    isLoading,
    setIsLoading,
  ] = useState(true);
  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);
  const [error, setError] =
    useState('');
  const [
    updatingCourses,
    setUpdatingCourses,
  ] = useState({});

  const stats = useMemo(
    () =>
      calculateStats(courses),
    [courses]
  );

  const filteredCourses =
    useMemo(() => {
      return courses.filter(
        (course) => {
          switch (activeFilter) {
            case 'Free':
              return (
                course.type ===
                'free'
              );

            case 'Paid':
              return (
                course.type ===
                'paid'
              );

            case 'Saved':
              return course.isSaved;

            case 'Completed':
              return (
                course.isCompleted
              );

            case 'All':
            default:
              return true;
          }
        }
      );
    }, [
      courses,
      activeFilter,
    ]);

  const loadGrowthData =
    async ({
      refresh = false,
    } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          '/api/client/growth',
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Growth recommendations could not be loaded.'
          );
        }

        setCourses(
          Array.isArray(data.courses)
            ? data.courses
            : []
        );

        setSkillGaps(
          Array.isArray(
            data.skillGaps
          )
            ? data.skillGaps
            : []
        );

        setCertifications(
          Array.isArray(
            data.certifications
          )
            ? data.certifications
            : []
        );
      } catch (loadError) {
        setError(
          loadError.message ||
            'Growth recommendations could not be loaded.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

  useEffect(() => {
    loadGrowthData();
  }, []);

  const updateCourse =
    async (
      course,
      updates,
      action
    ) => {
      if (
        updatingCourses[
          course.assignmentId
        ]
      ) {
        return;
      }

      setUpdatingCourses(
        (current) => ({
          ...current,
          [course.assignmentId]:
            action,
        })
      );

      setError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          '/api/client/growth',
          {
            method: 'PATCH',
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              assignmentId:
                course.assignmentId,
              ...updates,
            }),
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Course progress could not be updated.'
          );
        }

        const assignment =
          data.assignment;

        if (assignment) {
          setCourses(
            (current) =>
              current.map(
                (item) =>
                  item.assignmentId ===
                  assignment.assignmentId
                    ? {
                        ...item,
                        isSaved:
                          assignment.isSaved,
                        isCompleted:
                          assignment.isCompleted,
                        completedAt:
                          assignment.completedAt,
                        updatedAt:
                          assignment.updatedAt,
                      }
                    : item
              )
          );
        }
      } catch (updateError) {
        setError(
          updateError.message ||
            'Course progress could not be updated.'
        );
      } finally {
        setUpdatingCourses(
          (current) => {
            const next = {
              ...current,
            };

            delete next[
              course.assignmentId
            ];

            return next;
          }
        );
      }
    };

  const handleToggleSaved =
    (course) => {
      updateCourse(
        course,
        {
          isSaved:
            !course.isSaved,
        },
        'save'
      );
    };

  const handleToggleComplete =
    (course) => {
      updateCourse(
        course,
        {
          isCompleted:
            !course.isCompleted,
        },
        'complete'
      );
    };

  return (
    <>
      <Head>
        <title>
          Career Growth | ApplyLoop
        </title>

        <meta
          name="description"
          content="Track your ApplyLoop career growth recommendations and progress."
        />
      </Head>

      <DashboardLayout>
        <div className="max-w-5xl space-y-6">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-100 border-t-[#1E50C3]" />

              <p className="text-sm text-gray-400">
                Loading your growth recommendations...
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Recommendations"
                  value={
                    stats.totalCourses
                  }
                  sub="Courses assigned"
                />

                <StatCard
                  label="Completed"
                  value={
                    stats.completedCourses
                  }
                  sub="Courses completed"
                />

                <StatCard
                  label="Saved"
                  value={
                    stats.savedCourses
                  }
                  sub="Saved for later"
                />

                <StatCard
                  label="Progress"
                  value={
                    `${stats.completionRate}%`
                  }
                  sub="Overall completion"
                  progress={
                    stats.completionRate
                  }
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <FiTrendingUp className="h-4 w-4 text-[#1E50C3]" />

                  <h2 className="text-base font-semibold text-gray-900">
                    Skill Gap Analysis
                  </h2>
                </div>

                {skillGaps.length ===
                0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-gray-600">
                      No skill gaps assigned yet.
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Skill recommendations will appear here when they are added to your growth plan.
                    </p>
                  </div>
                ) : (
                  <div>
                    {skillGaps.map(
                      (skillGap) => (
                        <SkillBar
                          key={
                            skillGap.id
                          }
                          {...skillGap}
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Recommended Courses
                    </h2>

                    <p className="mt-1 text-xs text-gray-400">
                      Courses selected for your career goals.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1">
                      {FILTER_TABS.map(
                        (tab) => (
                          <button
                            type="button"
                            key={tab}
                            onClick={() =>
                              setActiveFilter(
                                tab
                              )
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              activeFilter ===
                              tab
                                ? 'border border-gray-100 bg-white text-[#1E50C3] shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {tab}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        loadGrowthData({
                          refresh: true,
                        })
                      }
                      disabled={
                        isRefreshing
                      }
                      aria-label="Refresh growth recommendations"
                      title="Refresh"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiRefreshCw
                        className={`h-4 w-4 ${
                          isRefreshing
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {courses.length === 0 ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1E50C3]">
                      <FiTrendingUp className="h-5 w-5" />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-gray-700">
                      No course recommendations yet.
                    </p>

                    <p className="mt-1 max-w-md text-xs leading-5 text-gray-400">
                      Courses selected for your career goals will appear here.
                    </p>
                  </div>
                ) : filteredCourses.length ===
                  0 ? (
                  <div className="flex min-h-[180px] items-center justify-center text-center">
                    <p className="text-sm text-gray-400">
                      No courses match the {activeFilter.toLowerCase()} filter.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredCourses.map(
                      (course) => (
                        <CourseCard
                          key={
                            course.assignmentId
                          }
                          course={
                            course
                          }
                          updatingAction={
                            updatingCourses[
                              course
                                .assignmentId
                            ]
                          }
                          onToggleSaved={
                            handleToggleSaved
                          }
                          onToggleComplete={
                            handleToggleComplete
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <FiAward className="h-5 w-5 text-[#1E50C3]" />

                  <h2 className="text-sm font-semibold text-gray-900">
                    Recommended Certifications
                  </h2>
                </div>

                <p className="mb-4 text-sm text-gray-500">
                  Certifications selected to support your career goals.
                </p>

                {certifications.length ===
                0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">
                      No certification recommendations yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {certifications.map(
                      (
                        certification
                      ) => (
                        <div
                          key={
                            certification.id
                          }
                          className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 transition hover:bg-gray-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {
                                certification.name
                              }
                            </p>

                            {certification.provider && (
                              <p className="mt-0.5 text-xs text-gray-400">
                                {
                                  certification.provider
                                }
                              </p>
                            )}
                          </div>

                          {certification.url && (
                            <a
                              href={
                                certification.url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${certification.name}`}
                              className="shrink-0 rounded-lg p-2 text-[#1E50C3] transition hover:bg-blue-50"
                            >
                              <FiExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
