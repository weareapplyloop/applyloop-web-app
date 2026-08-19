import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  FiBell,
  FiCheck,
} from 'react-icons/fi';

import DashboardLayout from '../shared/components/DashboardLayout';
import { createClient } from '../lib/supabase/client';

const TABS = [
  'All',
  'Unread',
  'Read',
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

function formatNotificationDate(value) {
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

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState([]);
  const [unreadCount, setUnreadCount] =
    useState(0);
  const [activeTab, setActiveTab] =
    useState('All');
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      setIsLoading(true);
      setError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          '/api/client/notifications',
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
              'Notifications could not be loaded.'
          );
        }

        if (!mounted) return;

        setNotifications(
          Array.isArray(data.notifications)
            ? data.notifications
            : []
        );

        setUnreadCount(
          Number(data.unreadCount) || 0
        );
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError.message ||
              'Notifications could not be loaded.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredNotifications =
    notifications.filter(
      (notification) => {
        if (activeTab === 'Unread') {
          return !notification.read;
        }

        if (activeTab === 'Read') {
          return notification.read;
        }

        return true;
      }
    );

  const handleNotificationClick =
    async (notification) => {
      try {
        if (!notification.read) {
          const accessToken =
            await getAccessToken();

          const response = await fetch(
            '/api/client/notifications',
            {
              method: 'PATCH',
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                notificationId:
                  notification.id,
              }),
            }
          );

          const data = await response
            .json()
            .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              data.error ||
                'Notification could not be updated.'
            );
          }

          const readAt =
            new Date().toISOString();

          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    read: true,
                    readAt,
                  }
                : item
            )
          );

          setUnreadCount(
            Number(data.unreadCount) || 0
          );
        }

        if (notification.href) {
          await router.push(
            notification.href
          );
        }
      } catch (clickError) {
        setError(
          clickError.message ||
            'Notification could not be opened.'
        );
      }
    };

  const handleMarkAllRead =
    async () => {
      if (
        unreadCount === 0 ||
        isMarkingAllRead
      ) {
        return;
      }

      setIsMarkingAllRead(true);
      setError('');

      try {
        const accessToken =
          await getAccessToken();

        const response = await fetch(
          '/api/client/notifications',
          {
            method: 'PATCH',
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              markAllRead: true,
            }),
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Notifications could not be updated.'
          );
        }

        const readAt =
          new Date().toISOString();

        setNotifications((current) =>
          current.map(
            (notification) => ({
              ...notification,
              read: true,
              readAt,
            })
          )
        );

        setUnreadCount(0);
      } catch (markError) {
        setError(
          markError.message ||
            'Notifications could not be updated.'
        );
      } finally {
        setIsMarkingAllRead(false);
      }
    };

  return (
    <>
      <Head>
        <title>
          Notifications | ApplyLoop
        </title>

        <meta
          name="description"
          content="View your ApplyLoop notifications."
        />
      </Head>

      <DashboardLayout>
        <div className="max-w-5xl">
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${
                        unreadCount === 1
                          ? ''
                          : 's'
                      }`
                    : 'You are all caught up.'}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={
                    handleMarkAllRead
                  }
                  disabled={
                    isMarkingAllRead
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#1E50C3] transition hover:bg-blue-100 disabled:opacity-50"
                >
                  <FiCheck />

                  {isMarkingAllRead
                    ? 'Marking...'
                    : 'Mark all as read'}
                </button>
              )}
            </div>

            <div className="flex border-b border-gray-100 px-6">
              {TABS.map((tab) => {
                const isActive =
                  activeTab === tab;

                const count =
                  tab === 'Unread'
                    ? notifications.filter(
                        (item) =>
                          !item.read
                      ).length
                    : tab === 'Read'
                    ? notifications.filter(
                        (item) =>
                          item.read
                      ).length
                    : notifications.length;

                return (
                  <button
                    type="button"
                    key={tab}
                    onClick={() =>
                      setActiveTab(tab)
                    }
                    className={`relative px-4 py-4 text-sm font-semibold transition ${
                      isActive
                        ? 'text-[#1E50C3]'
                        : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {tab}

                    <span className="ml-2 text-xs">
                      {count}
                    </span>

                    {isActive && (
                      <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#1E50C3]" />
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mx-6 mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            <div className="min-h-[320px]">
              {isLoading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-[#1E50C3]" />

                  <p className="text-sm text-gray-400">
                    Loading notifications...
                  </p>
                </div>
              ) : filteredNotifications.length ===
                0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1E50C3]">
                    <FiBell className="h-5 w-5" />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-gray-700">
                    No notifications.
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    New application updates
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map(
                    (notification) => (
                      <button
                        type="button"
                        key={
                          notification.id
                        }
                        onClick={() =>
                          handleNotificationClick(
                            notification
                          )
                        }
                        className={`flex w-full gap-4 px-6 py-5 text-left transition hover:bg-gray-50 ${
                          notification.read
                            ? 'bg-white'
                            : 'bg-blue-50/40'
                        }`}
                      >
                        <div className="pt-1">
                          <span
                            className={`block h-2.5 w-2.5 rounded-full ${
                              notification.read
                                ? 'bg-gray-200'
                                : 'bg-[#1E50C3]'
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <p
                              className={`text-sm ${
                                notification.read
                                  ? 'font-medium text-gray-700'
                                  : 'font-bold text-gray-900'
                              }`}
                            >
                              {
                                notification.title
                              }
                            </p>

                            <p className="shrink-0 text-xs text-gray-400">
                              {formatNotificationDate(
                                notification.createdAt
                              )}
                            </p>
                          </div>

                          <p className="mt-1 text-sm leading-6 text-gray-500">
                            {
                              notification.message
                            }
                          </p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
