import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiBell,
  FiChevronDown,
  FiCpu,
  FiCreditCard,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiSettings,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getRoleHome, USER_ROLES } from '../config/roles';
import { createClient } from '../../lib/supabase/client';
import { Avatar } from './PortalUI';
import ClientProductTour from './ClientProductTour';

async function getClientAccessToken() {
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
      'Your session has expired.'
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
    hour: 'numeric',
    minute: '2-digit',
  });
}

const pageMeta = {
  '/dashboard': ['Dashboard', 'Track applications, monitor progress, and stay in control of your job search.'],
  '/growth': ['Career Growth', 'Build job-ready skills with a personalized learning plan.'],
  '/loop-lab': ['Loop Lab', 'Prepare for interviews with role-specific practice sessions.'],
  '/billing': ['Billing & Subscription', 'Manage your plan, billing history, and application volume.'],
  '/settings': ['Settings', 'Update your profile, work preferences, and account details.'],
  '/notifications': ['Notifications', 'Review important application and interview updates.'],
  '/support': ['Help & Support', 'Get help with your account, applications, or technical issues.'],
  '/applications/[id]': ['Job Application', 'Review the full application, documents, status, and feedback.'],
};

export default function DashboardLayout({
  children,
  logout: logoutProp,
  searchValue = '',
  onSearchChange,
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [previewClient, setPreviewClient] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [headerSearchValue, setHeaderSearchValue] = useState('');
  const [tourOpen, setTourOpen] = useState(false);
  const [tourChecked, setTourChecked] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [
    isLoadingNotifications,
    setIsLoadingNotifications,
  ] = useState(false);
  const [
    notificationsError,
    setNotificationsError,
  ] = useState('');
  const previewClientId =
    router.isReady
      ? Array.isArray(
          router.query.previewClientId
        )
        ? router.query.previewClientId[0]
        : router.query.previewClientId || ''
      : '';

  const isClientPreview =
    [
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
    ].includes(user?.role) &&
    Boolean(previewClientId);

  const previewRoleLabel =
    user?.role === USER_ROLES.ADMIN
      ? 'Admin'
      : 'Owner';

  const previewExitHref =
    user?.role === USER_ROLES.ADMIN
      ? '/admin'
      : '/owner/client-management';

  const displayUser =
    isClientPreview && previewClient
      ? {
          name: previewClient.fullName,
          email: previewClient.email,
        }
      : user;

  const [title, subtitle] =
    pageMeta[router.pathname] ||
    ['ApplyLoop', ''];

  const navItems = [
    {
      icon: FiHome,
      label: 'Home',
      href: '/dashboard',
      tour: 'home-nav',
    },
    {
      icon: FiCpu,
      label: 'Loop Lab',
      href: '/loop-lab',
    },
    {
      icon: FiCreditCard,
      label: 'Billing & Subscription',
      href: '/billing',
    },
    {
      icon: FiTrendingUp,
      label: 'Growth',
      href: '/growth',
      tour: 'growth-nav',
    },
    {
      icon: FiSettings,
      label: 'Settings',
      href: '/settings',
      tour: 'settings-nav',
    },
  ];

  const handleLogout = () => typeof logoutProp === 'function' ? logoutProp() : logout();

  const displayedSearchValue =
    typeof onSearchChange === 'function'
      ? searchValue
      : headerSearchValue;

  const handleHeaderSearchChange = (value) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(value);
      return;
    }

    setHeaderSearchValue(value);
  };

  const handleHeaderSearchSubmit = (event) => {
    event.preventDefault();

    const query =
      displayedSearchValue.trim();

    if (!query) {
      if (router.pathname !== '/dashboard') {
        router.push(
          isClientPreview
            ? {
                pathname: '/dashboard',
                query: {
                  previewClientId,
                },
              }
            : '/dashboard'
        );
      }

      return;
    }

    if (router.pathname === '/dashboard') {
      return;
    }

    router.push({
      pathname: '/dashboard',
      query: {
        ...(isClientPreview
          ? {
              previewClientId,
            }
          : {}),
        search: query,
      },
    });
  };

  useEffect(() => {
    if (
      !router.isReady ||
      !isClientPreview
    ) {
      setPreviewClient(null);
      setPreviewError('');

      return undefined;
    }

    let cancelled = false;

    const loadPreviewClient = async () => {
      setPreviewError('');

      try {
        const accessToken =
          await getClientAccessToken();

        const response = await fetch(
          '/api/admin/clients',
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              'The client could not be loaded.'
          );
        }

        const selectedClient =
          (result.clients || []).find(
            (client) =>
              String(client.id) ===
              String(previewClientId)
          );

        if (!selectedClient) {
          throw new Error(
            'The selected client could not be found.'
          );
        }

        if (!cancelled) {
          setPreviewClient(
            selectedClient
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(
            error.message ||
              'The client preview could not be loaded.'
          );
        }
      }
    };

    loadPreviewClient();

    return () => {
      cancelled = true;
    };
  }, [
    isClientPreview,
    previewClientId,
    router.isReady,
  ]);

  useEffect(() => {
    if (
      user?.role &&
      user.role !== USER_ROLES.USER_CLIENT &&
      !isClientPreview
    ) {
      router.replace(
        getRoleHome(user.role)
      );
    }
  }, [
    isClientPreview,
    router,
    user?.role,
  ]);

  useEffect(() => {
    if (
      !router.isReady ||
      router.pathname !== '/dashboard' ||
      user?.role !== USER_ROLES.USER_CLIENT ||
      process.env.NODE_ENV === 'production'
    ) {
      return;
    }

    const tourQuery =
      Array.isArray(router.query.tour)
        ? router.query.tour[0]
        : router.query.tour;

    if (tourQuery === '1') {
      setTourChecked(true);

      window.setTimeout(() => {
        setTourOpen(true);
      }, 300);
    }
  }, [
    router.isReady,
    router.pathname,
    router.query.tour,
    user?.role,
  ]);

  useEffect(() => {
    if (
      !router.isReady ||
      router.pathname !== '/dashboard' ||
      user?.role !== USER_ROLES.USER_CLIENT ||
      tourChecked
    ) {
      return undefined;
    }

    let cancelled = false;

    const loadTutorialProgress = async () => {
      try {
        const accessToken =
          await getClientAccessToken();

        const response = await fetch(
          '/api/client/tutorial',
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
              'Tutorial progress could not be loaded.'
          );
        }

        if (!cancelled) {
          setTourChecked(true);

          if (data.shouldAutoStart) {
            window.setTimeout(() => {
              if (!cancelled) {
                setTourOpen(true);
              }
            }, 700);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setTourChecked(true);

          console.error(
            'Client tutorial load error:',
            error
          );
        }
      }
    };

    loadTutorialProgress();

    return () => {
      cancelled = true;
    };
  }, [
    router.isReady,
    router.pathname,
    tourChecked,
    user?.role,
  ]);

  const saveTutorialProgress =
    async (action) => {
      const accessToken =
        await getClientAccessToken();

      const response = await fetch(
        '/api/client/tutorial',
        {
          method: 'PATCH',
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Tutorial progress could not be saved.'
        );
      }

      setTourOpen(false);

      return data;
    };

  useEffect(() => {
    if (
      !router.isReady ||
      user?.role !== USER_ROLES.USER_CLIENT
    ) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      setIsLoadingNotifications(true);
      setNotificationsError('');

      try {
        const accessToken =
          await getClientAccessToken();

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

        if (!cancelled) {
          setNotifications(
            Array.isArray(data.notifications)
              ? data.notifications
              : []
          );

          setUnreadCount(
            Number(data.unreadCount) || 0
          );
        }
      } catch (error) {
        if (!cancelled) {
          setNotificationsError(
            error.message ||
              'Notifications could not be loaded.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingNotifications(false);
        }
      }
    };

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [
    router.isReady,
    user?.role,
  ]);

  const markNotificationRead =
    async (notification) => {
      try {
        if (!notification.read) {
          const accessToken =
            await getClientAccessToken();

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

          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    read: true,
                    readAt:
                      new Date().toISOString(),
                  }
                : item
            )
          );

          setUnreadCount(
            Number(data.unreadCount) || 0
          );
        }
      } catch (error) {
        setNotificationsError(
          error.message ||
            'Notification could not be updated.'
        );
      }

      setNotificationsOpen(false);

      if (notification.href) {
        router.push(notification.href);
      }
    };

  const markAllNotificationsRead =
    async () => {
      try {
        const accessToken =
          await getClientAccessToken();

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
          current.map((notification) => ({
            ...notification,
            read: true,
            readAt,
          }))
        );

        setUnreadCount(0);
        setNotificationsError('');
      } catch (error) {
        setNotificationsError(
          error.message ||
            'Notifications could not be updated.'
        );
      }
    };

  return (
    <div className="user-client-compact min-h-screen bg-slate-50 text-slate-900">
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/35 md:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-slate-200/80 bg-white shadow-[0_0_30px_rgba(15,23,42,0.04)] transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex h-[88px] items-center justify-between border-b border-slate-100 px-6">
          <Link
            href={
              isClientPreview
                ? {
                    pathname: '/dashboard',
                    query: {
                      previewClientId,
                    },
                  }
                : '/dashboard'
            }
            className="flex items-center gap-3"
          >
            <img
              src="/logo.svg"
              alt="ApplyLoop"
              className="h-8 w-8"
            />
            <span className="text-base font-bold tracking-tight text-slate-950">
              ApplyLoop
            </span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-500 md:hidden"><FiX /></button>
        </div>
        
        <nav className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-4 py-2">
          {navItems.map(({ icon: Icon, label, href, tour }) => {
            const active =
              router.pathname === href ||
              (
                href === '/dashboard' &&
                router.pathname ===
                  '/applications/[id]'
              );

            const targetHref =
              isClientPreview
                ? {
                    pathname: href,
                    query: {
                      previewClientId,
                    },
                  }
                : href;

            return <Link
                key={href}
                href={targetHref}
                data-tour={tour}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-blue-50 font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100/70'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}><Icon className="h-4 w-4" />{label}</Link>;
          })}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <Link
            href={
              isClientPreview
                ? {
                    pathname: '/support',
                    query: {
                      previewClientId,
                    },
                  }
                : '/support'
            }
            data-tour="support-nav"
            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
              router.pathname === '/support'
                ? 'bg-blue-50 font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100/70'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <FiHelpCircle />
            Help & Support
          </Link>
          <div className="relative">
            <button
              data-tour="profile-menu"
              onClick={() =>
                setProfileOpen(
                  (value) => !value
                )
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
            >
              <Avatar
                name={displayUser?.name}
                size="sm"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {displayUser?.name ||
                    'Client'}
                </span>

                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {displayUser?.email ||
                    'client@applyloop.com'}
                </span>
              </span>

              <FiChevronDown className="text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {isClientPreview ? (
                  <Link
                    href={previewExitHref}
                    className="flex w-full items-center px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Back to Client Management
                  </Link>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <FiLogOut />
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="md:pl-[264px]">
        <header className="user-client-compact-header sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-[88px] items-center justify-between gap-4 px-5 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 md:hidden"><FiMenu className="h-[18px] w-[18px]" /></button><div className="min-w-0"><h1 className="truncate text-xl font-bold tracking-[-0.025em] text-slate-950 lg:text-2xl">{title}</h1><p className="mt-1 hidden truncate text-sm text-slate-500 sm:block">{subtitle}</p></div></div>
            <div className="flex items-center gap-2">
              <form
                onSubmit={handleHeaderSearchSubmit}
                className="hidden xl:block"
              >
                <label
                  data-tour="application-search"
                  className="relative block"
                >
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={displayedSearchValue}
                    onChange={(event) =>
                      handleHeaderSearchChange(
                        event.target.value
                      )
                    }
                    placeholder="Search applications"
                    aria-label="Search applications"
                    className="h-11 w-[300px] rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </form>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setNotificationsOpen(
                      (value) => !value
                    )
                  }
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  aria-label="Notifications"
                  data-tour="notifications"
                >
                  <FiBell className="h-[18px] w-[18px]" />

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                      {unreadCount > 9
                        ? '9+'
                        : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <p className="text-[12px] font-semibold text-slate-900">
                        Notifications
                      </p>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={
                            markAllNotificationsRead
                          }
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto">
                      {isLoadingNotifications ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-xs text-slate-400">
                            Loading notifications...
                          </p>
                        </div>
                      ) : notificationsError ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs text-rose-500">
                            {notificationsError}
                          </p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-xs text-slate-400">
                            No notifications.
                          </p>
                        </div>
                      ) : (
                        notifications
                          .slice(0, 5)
                          .map((notification) => (
                            <button
                              type="button"
                              key={notification.id}
                              onClick={() =>
                                markNotificationRead(
                                  notification
                                )
                              }
                              className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                                notification.read
                                  ? 'bg-white'
                                  : 'bg-blue-50/60'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {!notification.read && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                )}

                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold text-slate-900">
                                    {notification.title}
                                  </p>

                                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                    {notification.message}
                                  </p>

                                  <p className="mt-1.5 text-[9px] text-slate-400">
                                    {formatNotificationDate(
                                      notification.createdAt
                                    )}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                      )}
                    </div>

                    <Link
                      href={
                        isClientPreview
                          ? {
                              pathname:
                                '/notifications',
                              query: {
                                previewClientId,
                              },
                            }
                          : '/notifications'
                      }
                      onClick={() =>
                        setNotificationsOpen(false)
                      }
                      className="block border-t border-slate-100 px-4 py-3 text-center text-[11px] font-semibold text-blue-600 hover:bg-slate-50"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="user-client-compact-main mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {isClientPreview && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-600">
                  {previewRoleLabel} Preview
                </p>

                <p className="mt-1 text-sm font-semibold text-blue-950">
                  {previewClient
                    ? `Viewing as ${previewClient.fullName}`
                    : 'Loading client preview...'}
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  You are still signed in as{' '}
                  {previewRoleLabel}.
                </p>
              </div>

              <Link
                href={previewExitHref}
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Back to Client Management
              </Link>
            </div>
          )}

          {previewError && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
            >
              {previewError}
            </div>
          )}

          <div className="user-client-page-surface">
            {children}
          </div>
        </main>
      </div>
      <ClientProductTour
        open={tourOpen}
        onComplete={() =>
          saveTutorialProgress(
            'complete'
          )
        }
        onDismiss={() =>
          saveTutorialProgress(
            'dismiss'
          )
        }
      />
    </div>
  );
}
