import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  FiChevronRight,
  FiHelpCircle,
  FiPlus,
  FiSend,
  FiX,
} from 'react-icons/fi';

import DashboardLayout from '../shared/components/DashboardLayout';
import { createClient } from '../lib/supabase/client';

const CATEGORIES = [
  ['general', 'General'],
  ['account', 'Account'],
  ['applications', 'Applications'],
  ['technical', 'Technical'],
  ['other', 'Other'],
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

  if (error || !session?.access_token) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  return session.access_token;
}

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusStyle(status) {
  switch (status) {
    case 'in_progress':
      return 'bg-blue-50 text-blue-600 border-blue-100';

    case 'resolved':
      return 'bg-green-50 text-green-600 border-green-100';

    case 'closed':
      return 'bg-gray-100 text-gray-600 border-gray-200';

    case 'open':
    default:
      return 'bg-amber-50 text-amber-600 border-amber-100';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'in_progress':
      return 'In Progress';

    case 'resolved':
      return 'Resolved';

    case 'closed':
      return 'Closed';

    case 'open':
    default:
      return 'Open';
  }
}

export default function SupportPage() {
  const [tickets, setTickets] =
    useState([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [
    isCreateOpen,
    setIsCreateOpen,
  ] = useState(false);
  const [category, setCategory] =
    useState('general');
  const [subject, setSubject] =
    useState('');
  const [message, setMessage] =
    useState('');
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [submitError, setSubmitError] =
    useState('');
  const [
    selectedTicket,
    setSelectedTicket,
  ] = useState(null);
  const [
    ticketMessages,
    setTicketMessages,
  ] = useState([]);
  const [
    isLoadingTicket,
    setIsLoadingTicket,
  ] = useState(false);
  const [
    ticketError,
    setTicketError,
  ] = useState('');
  const [replyMessage, setReplyMessage] =
    useState('');
  const [
    isSendingReply,
    setIsSendingReply,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTickets = async () => {
      setIsLoading(true);
      setError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          '/api/client/support',
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
              'Support tickets could not be loaded.'
          );
        }

        if (mounted) {
          setTickets(
            Array.isArray(data.tickets)
              ? data.tickets
              : []
          );
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError.message ||
              'Support tickets could not be loaded.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadTickets();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateTicket =
    async (event) => {
      event.preventDefault();

      if (
        !subject.trim() ||
        !message.trim() ||
        isSubmitting
      ) {
        return;
      }

      setIsSubmitting(true);
      setSubmitError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          '/api/client/support',
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              category,
              subject,
              message,
            }),
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Your support ticket could not be created.'
          );
        }

        if (data.ticket) {
          setTickets((current) => [
            data.ticket,
            ...current,
          ]);
        }

        setCategory('general');
        setSubject('');
        setMessage('');
        setIsCreateOpen(false);
      } catch (createError) {
        setSubmitError(
          createError.message ||
            'Your support ticket could not be created.'
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  const handleOpenTicket =
    async (ticketId) => {
      setSelectedTicket({
        id: ticketId,
      });
      setTicketMessages([]);
      setTicketError('');
      setReplyMessage('');
      setIsLoadingTicket(true);

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          `/api/client/support/${ticketId}`,
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
              'Support ticket could not be loaded.'
          );
        }

        setSelectedTicket(
          data.ticket || null
        );

        setTicketMessages(
          Array.isArray(data.messages)
            ? data.messages
            : []
        );
      } catch (loadError) {
        setTicketError(
          loadError.message ||
            'Support ticket could not be loaded.'
        );
      } finally {
        setIsLoadingTicket(false);
      }
    };

  const handleCloseTicket = () => {
    if (isSendingReply) {
      return;
    }

    setSelectedTicket(null);
    setTicketMessages([]);
    setTicketError('');
    setReplyMessage('');
  };

  const handleSendReply =
    async (event) => {
      event.preventDefault();

      if (
        !selectedTicket?.id ||
        !replyMessage.trim() ||
        isSendingReply
      ) {
        return;
      }

      setIsSendingReply(true);
      setTicketError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          `/api/client/support/${selectedTicket.id}`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              message: replyMessage,
            }),
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Your support message could not be sent.'
          );
        }

        if (data.message) {
          setTicketMessages(
            (current) => [
              ...current,
              data.message,
            ]
          );
        }

        setReplyMessage('');

        if (data.updatedAt) {
          setSelectedTicket(
            (current) => ({
              ...current,
              updatedAt:
                data.updatedAt,
            })
          );

          setTickets((current) =>
            current.map((ticket) =>
              ticket.id ===
              selectedTicket.id
                ? {
                    ...ticket,
                    updatedAt:
                      data.updatedAt,
                  }
                : ticket
            )
          );
        }
      } catch (sendError) {
        setTicketError(
          sendError.message ||
            'Your support message could not be sent.'
        );
      } finally {
        setIsSendingReply(false);
      }
    };

  return (
    <>
      <Head>
        <title>
          Help & Support | ApplyLoop
        </title>

        <meta
          name="description"
          content="Get help from the ApplyLoop support team."
        />
      </Head>

      <DashboardLayout>
        <div className="max-w-5xl">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Help & Support
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Send a request to the ApplyLoop support team.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubmitError('');
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E50C3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A45A7] active:scale-[0.98]"
              >
                <FiPlus />
                New Support Request
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            <div className="min-h-[340px]">
              {isLoading ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-[#1E50C3]" />

                  <p className="text-sm text-gray-400">
                    Loading support requests...
                  </p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1E50C3]">
                    <FiHelpCircle className="h-5 w-5" />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-gray-700">
                    No support requests.
                  </p>

                  <p className="mt-1 max-w-sm text-xs leading-5 text-gray-400">
                    If you need help with your account,
                    applications, or a technical issue,
                    create a support request.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <button
                      type="button"
                      key={ticket.id}
                      onClick={() =>
                        handleOpenTicket(
                          ticket.id
                        )
                      }
                      className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-gray-50/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900">
                              {ticket.subject}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium capitalize text-gray-500">
                                {ticket.category}
                              </span>

                              <span
                                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                                  ticket.status
                                )}`}
                              >
                                {getStatusLabel(
                                  ticket.status
                                )}
                              </span>
                            </div>
                          </div>

                          <p className="shrink-0 text-xs text-gray-400">
                            {formatDate(
                              ticket.updatedAt ||
                                ticket.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      <FiChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-gray-900">
                    {selectedTicket.subject ||
                      'Support Request'}
                  </h3>

                  {selectedTicket.status && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium capitalize text-gray-500">
                        {selectedTicket.category}
                      </span>

                      <span
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                          selectedTicket.status
                        )}`}
                      >
                        {getStatusLabel(
                          selectedTicket.status
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    handleCloseTicket
                  }
                  disabled={
                    isSendingReply
                  }
                  className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                  aria-label="Close support conversation"
                >
                  <FiX />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {isLoadingTicket ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-[#1E50C3]" />

                    <p className="text-sm text-gray-400">
                      Loading conversation...
                    </p>
                  </div>
                ) : ticketMessages.length ===
                  0 ? (
                  <div className="flex min-h-[260px] items-center justify-center">
                    <p className="text-sm text-gray-400">
                      No messages found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketMessages.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-xs font-semibold text-gray-700">
                              {item.sender
                                ?.name ||
                                'ApplyLoop'}
                            </p>

                            <p className="shrink-0 text-[11px] text-gray-400">
                              {formatDate(
                                item.createdAt
                              )}
                            </p>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                            {item.message}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {ticketError && (
                <div className="mx-6 mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">
                    {ticketError}
                  </p>
                </div>
              )}

              {!isLoadingTicket &&
                selectedTicket.status !==
                  'closed' && (
                  <form
                    onSubmit={
                      handleSendReply
                    }
                    className="border-t border-gray-100 bg-white px-6 py-4"
                  >
                    <div className="flex items-end gap-3">
                      <textarea
                        value={
                          replyMessage
                        }
                        onChange={(event) =>
                          setReplyMessage(
                            event.target.value
                          )
                        }
                        disabled={
                          isSendingReply
                        }
                        maxLength={5000}
                        rows={3}
                        placeholder="Type your reply..."
                        className="min-h-[80px] flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                      />

                      <button
                        type="submit"
                        disabled={
                          !replyMessage.trim() ||
                          isSendingReply
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1E50C3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1A45A7] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiSend />

                        {isSendingReply
                          ? 'Sending...'
                          : 'Send'}
                      </button>
                    </div>
                  </form>
                )}

              {selectedTicket.status ===
                'closed' && (
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center">
                  <p className="text-sm text-gray-500">
                    This support request is closed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <form
              onSubmit={
                handleCreateTicket
              }
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    New Support Request
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    Tell us what you need help with.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isSubmitting) {
                      setSubmitError('');
                      setIsCreateOpen(false);
                    }
                  }}
                  disabled={
                    isSubmitting
                  }
                  className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                  aria-label="Close support request"
                >
                  <FiX />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div>
                  <label
                    htmlFor="support-category"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Category
                  </label>

                  <select
                    id="support-category"
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value
                      )
                    }
                    disabled={
                      isSubmitting
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  >
                    {CATEGORIES.map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="support-subject"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Subject
                  </label>

                  <input
                    id="support-subject"
                    type="text"
                    value={subject}
                    onChange={(event) =>
                      setSubject(
                        event.target.value
                      )
                    }
                    disabled={
                      isSubmitting
                    }
                    maxLength={200}
                    placeholder="What do you need help with?"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-message"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Message
                  </label>

                  <textarea
                    id="support-message"
                    value={message}
                    onChange={(event) =>
                      setMessage(
                        event.target.value
                      )
                    }
                    disabled={
                      isSubmitting
                    }
                    maxLength={5000}
                    rows={6}
                    placeholder="Describe the issue..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>

                {submitError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-600">
                      {submitError}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSubmitting) {
                      setSubmitError('');
                      setIsCreateOpen(false);
                    }
                  }}
                  disabled={
                    isSubmitting
                  }
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !subject.trim() ||
                    !message.trim() ||
                    isSubmitting
                  }
                  className="rounded-xl bg-[#1E50C3] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A45A7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}
      </DashboardLayout>
    </>
  );
}
