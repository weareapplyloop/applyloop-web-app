import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  FiRefreshCw,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiStar,
  FiLink,
  FiX,
  FiMessageSquare,
  FiFileText,
  FiCheck,
} from 'react-icons/fi';

import DashboardLayout from '../../shared/components/DashboardLayout';
import ApproveModal from '../../shared/components/ApproveModal';
import { createClient } from '../../lib/supabase/client';

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

  if (error || !session?.access_token) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  return session.access_token;
}

function formatDate(value) {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusStyle(status) {
  switch (status) {
    case 'Interview Scheduled':
      return 'bg-blue-50 text-blue-600 border-blue-100';

    case 'Offer Received':
      return 'bg-green-50 text-green-600 border-green-100';

    case 'Rejected':
      return 'bg-red-50 text-red-600 border-red-100';

    case 'Waiting':
      return 'bg-amber-50 text-amber-600 border-amber-100';

    case 'Submitted':
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function normalizePreference(preference) {
  if (
    preference &&
    typeof preference === 'object'
  ) {
    return (
      preference.label ||
      preference.name ||
      preference.value ||
      ''
    );
  }

  return String(preference || '');
}

function FeedbackPanel({
  messages,
  onClose,
  onSend,
  readOnly = false,
}) {
  const [message, setMessage] =
    useState('');
  const [isSending, setIsSending] =
    useState(false);
  const [error, setError] =
    useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = message.trim();

    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setError('');

    try {
      await onSend(trimmed);
      setMessage('');
    } catch (sendError) {
      setError(
        sendError.message ||
          'Unable to send feedback.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-slideInRight"
      style={{
        width: '320px',
        minHeight: '400px',
      }}
    >
      <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Feedback History
        </h3>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-label="Close feedback history"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center">
            <FiMessageSquare className="w-7 h-7 text-gray-300 mb-3" />

            <p className="text-sm text-gray-400 dark:text-gray-500">
              No feedback yet.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0"
              >
                {message.subject && (
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    {message.subject}
                  </p>
                )}

                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {message.message}
                </p>

                <div className="flex items-center justify-between mt-3 gap-3">
                  <span className="text-xs text-gray-400">
                    {message.sender?.name ||
                      'ApplyLoop'}
                  </span>

                  <span className="text-xs text-gray-400">
                    {formatDate(
                      message.createdAt
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-100 dark:border-gray-700"
      >
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            disabled={isSending}
            maxLength={5000}
            placeholder="Type a message..."
            className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1E50C3] focus:border-transparent disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              !message.trim() ||
              isSending
            }
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1E50C3] hover:bg-[#1A45A7] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending
              ? 'Sending...'
              : 'Send'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

function DocumentCard({
  name,
  label,
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-[110px] h-[135px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex flex-col items-center justify-center">
        <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">
          PDF
        </div>

        <FiFileText className="w-8 h-8 text-gray-300 mt-4" />
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 text-center max-w-[130px] break-words">
        {name || label}
      </p>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const router = useRouter();

  const applicationId =
    router.isReady
      ? Array.isArray(router.query.id)
        ? router.query.id[0]
        : router.query.id || ''
      : '';

  const previewClientId =
    router.isReady
      ? Array.isArray(
          router.query.previewClientId
        )
        ? router.query.previewClientId[0]
        : router.query.previewClientId || ''
      : '';

  const isClientPreview =
    Boolean(previewClientId);

  const dashboardHref =
    isClientPreview
      ? {
          pathname: '/dashboard',
          query: {
            previewClientId,
          },
        }
      : '/dashboard';

  const [application, setApplication] =
    useState(null);
  const [messages, setMessages] =
    useState([]);
  const [
    isLoadingApplication,
    setIsLoadingApplication,
  ] = useState(true);
  const [
    applicationError,
    setApplicationError,
  ] = useState('');
  const [showFeedback, setShowFeedback] =
    useState(false);
  const [
    isApproveModalOpen,
    setIsApproveModalOpen,
  ] = useState(false);
  const [isApproving, setIsApproving] =
    useState(false);
  const [approvalError, setApprovalError] =
    useState('');

  useEffect(() => {
    if (
      !router.isReady ||
      !applicationId
    ) {
      return undefined;
    }

    let mounted = true;

    const loadApplication = async () => {
      setIsLoadingApplication(true);
      setApplicationError('');

      try {
        const accessToken =
          await getAccessToken();

        const endpoint =
          isClientPreview
            ? `/api/applications/${encodeURIComponent(
                applicationId
              )}?previewClientId=${encodeURIComponent(
                previewClientId
              )}`
            : `/api/client/applications/${encodeURIComponent(
                applicationId
              )}`;

        const response = await fetch(
          endpoint,
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
              'Unable to load this application.'
          );
        }

        if (!mounted) {
          return;
        }

        const loadedApplication =
          data.application || null;

        const normalizedApplication =
          loadedApplication
            ? {
                ...loadedApplication,
                number:
                  loadedApplication.number ||
                  `#${String(
                    loadedApplication.id ||
                      applicationId
                  )
                    .slice(0, 8)
                    .toUpperCase()}`,
                jobUrl:
                  loadedApplication.jobUrl ||
                  loadedApplication.jobLink ||
                  '',
              }
            : null;

        setApplication(
          normalizedApplication
        );

        if (
          Array.isArray(data.messages)
        ) {
          setMessages(data.messages);
        } else if (
          loadedApplication?.feedback
        ) {
          setMessages([
            {
              id:
                `preview-feedback-${applicationId}`,
              message:
                loadedApplication.feedback,
              sender: {
                name: 'ApplyLoop',
              },
              createdAt:
                loadedApplication.updatedAt ||
                loadedApplication.createdAt ||
                loadedApplication.appliedAt ||
                null,
            },
          ]);
        } else {
          setMessages([]);
        }
      } catch (error) {
        if (mounted) {
          setApplication(null);
          setMessages([]);

          setApplicationError(
            error.message ||
              'Unable to load this application.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoadingApplication(false);
        }
      }
    };

    loadApplication();

    return () => {
      mounted = false;
    };
  }, [
    applicationId,
    isClientPreview,
    previewClientId,
    router.isReady,
  ]);

  const handleSendFeedback =
    async (message) => {
      if (isClientPreview) {
        throw new Error(
          'Feedback cannot be sent while previewing a client.'
        );
      }

      const accessToken =
        await getAccessToken();

      const response = await fetch(
        `/api/client/applications/${application.id}/feedback`,
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            message,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to send feedback.'
        );
      }

      if (data.message) {
        setMessages((current) => [
          ...current,
          data.message,
        ]);
      }
    };

  const handleApproveApplication =
    async () => {
      if (
        !application ||
        isApproving ||
        isClientPreview
      ) {
        return;
      }

      setIsApproving(true);
      setApprovalError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          `/api/client/applications/${application.id}/approve`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to approve this application.'
          );
        }

        setApplication((current) => ({
          ...current,
          clientApprovalStatus:
            data.approval?.status ||
            'approved',
          clientApprovedAt:
            data.approval?.approvedAt ||
            new Date().toISOString(),
        }));

        setIsApproveModalOpen(false);
      } catch (error) {
        setApprovalError(
          error.message ||
            'Unable to approve this application.'
        );
      } finally {
        setIsApproving(false);
      }
    };

  if (isLoadingApplication) {
    return (
      <DashboardLayout>
        <div className="min-h-[420px] flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-blue-100 border-t-[#1E50C3] animate-spin" />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading application...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (
    applicationError ||
    !application
  ) {
    return (
      <DashboardLayout>
        <div className="min-h-[420px] flex items-center justify-center">
          <div className="max-w-md text-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Application unavailable
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {applicationError ||
                'Application not found.'}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(dashboardHref)
              }
              className="mt-6 px-5 py-2.5 bg-[#1E50C3] text-white text-sm font-semibold rounded-xl hover:bg-[#1A45A7] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const preferences = Array.isArray(
    application.preferences
  )
    ? application.preferences
        .map(normalizePreference)
        .filter(Boolean)
    : [];

  const hasDocuments =
    Boolean(application.resumeName) ||
    Boolean(application.coverLetterName);

  return (
    <>
      <Head>
        <title>
          {application.position} at{' '}
          {application.company} | ApplyLoop
        </title>

        <meta
          name="description"
          content={`Application for ${application.position} at ${application.company}`}
        />
      </Head>

      <DashboardLayout>
        <div className="max-w-5xl">
          <div className="mb-6">
            <button
              type="button"
              onClick={() =>
                router.push(dashboardHref)
              }
              className="text-sm font-semibold text-[#1E50C3] hover:text-[#1A45A7] transition-colors"
            >
              Back to applications
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-6 sm:px-8 py-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {application.number}
                </p>

                <h1 className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-white mt-1">
                  {application.company}
                </h1>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {application.position}
                </p>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <div className="flex items-center py-3 gap-6">
                  <div className="flex items-center gap-2 w-44 text-sm text-gray-500 shrink-0">
                    <FiRefreshCw />
                    Status
                  </div>

                  <span
                    className={`px-3 py-1 rounded-md text-xs font-semibold border ${getStatusStyle(
                      application.status
                    )}`}
                  >
                    {application.status}
                  </span>
                </div>

                <div className="flex items-center py-3 gap-6">
                  <div className="flex items-center gap-2 w-44 text-sm text-gray-500 shrink-0">
                    <FiBriefcase />
                    Role
                  </div>

                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {application.role ||
                      application.position}
                  </span>
                </div>

                <div className="flex items-center py-3 gap-6">
                  <div className="flex items-center gap-2 w-44 text-sm text-gray-500 shrink-0">
                    <FiCalendar />
                    Date
                  </div>

                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {formatDate(
                      application.appliedAt
                    )}
                  </span>
                </div>

                <div className="flex items-center py-3 gap-6">
                  <div className="flex items-center gap-2 w-44 text-sm text-gray-500 shrink-0">
                    <FiClock />
                    Application Time
                  </div>

                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {formatTime(
                      application.appliedAt
                    )}
                  </span>
                </div>

                <div className="flex items-start py-3 gap-6">
                  <div className="flex items-center gap-2 w-44 text-sm text-gray-500 shrink-0">
                    <FiStar />
                    Preferences
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {preferences.length > 0 ? (
                      preferences.map(
                        (preference) => (
                          <span
                            key={preference}
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100"
                          >
                            {preference}
                          </span>
                        )
                      )
                    ) : (
                      <span className="text-sm text-gray-400">
                        N/A
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start py-3 gap-6">
                  <div className="flex items-center gap-2 w-44 text-sm text-gray-500 shrink-0">
                    <FiLink />
                    Job Link
                  </div>

                  {application.jobUrl ? (
                    <a
                      href={
                        application.jobUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1E50C3] hover:underline break-all"
                    >
                      {application.jobUrl}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">
                      N/A
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 mt-6">
                {isClientPreview ? (
                  <button
                    type="button"
                    onClick={() =>
                      setShowFeedback(true)
                    }
                    className="px-5 py-2.5 rounded-xl border border-[#1E50C3] text-[#1E50C3] text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    View Feedback
                  </button>
                ) : (
                  <>
                    {application.clientApprovalStatus ===
                    'approved' ? (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-100 text-sm font-semibold cursor-default"
                      >
                        <FiCheck className="w-4 h-4" />
                        Approved
                      </button>
                    ) : [
                        'pending',
                        'changes_requested',
                      ].includes(
                        application.clientApprovalStatus
                      ) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setApprovalError('');
                          setIsApproveModalOpen(
                            true
                          );
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#1E50C3] text-white text-sm font-semibold hover:bg-[#1A45A7] transition-all active:scale-[0.98]"
                      >
                        Approve Application
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        setShowFeedback(true)
                      }
                      className="px-5 py-2.5 rounded-xl border border-[#1E50C3] text-[#1E50C3] text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      Send Feedback
                    </button>
                  </>
                )}
              </div>

              <hr className="border-gray-100 dark:border-gray-700 my-6" />

              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                  Documents
                </h2>

                {hasDocuments ? (
                  <div className="flex gap-5 flex-wrap">
                    {application.resumeName && (
                      <DocumentCard
                        name={
                          application.resumeName
                        }
                        label="Submitted Resume.pdf"
                      />
                    )}

                    {application.coverLetterName && (
                      <DocumentCard
                        name={
                          application.coverLetterName
                        }
                        label="Submitted Cover Letter.pdf"
                      />
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-10 text-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No documents available.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {showFeedback && (
              <FeedbackPanel
                messages={messages}
                onClose={() =>
                  setShowFeedback(false)
                }
                onSend={
                  handleSendFeedback
                }
                readOnly={
                  isClientPreview
                }
              />
            )}
          </div>
        </div>
      </DashboardLayout>

      <ApproveModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          if (!isApproving) {
            setApprovalError('');
            setIsApproveModalOpen(false);
          }
        }}
        onConfirm={
          handleApproveApplication
        }
        isSubmitting={isApproving}
        error={approvalError}
      />
    </>
  );
}
