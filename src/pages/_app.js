import '../styles/globals.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../shared/context/AuthContext';
import AppProvider from '../shared/context/AppProvider';
import { createClient } from '../lib/supabase/client';
import { getRoleHome, USER_ROLES } from '../shared/config/roles';

const AuthWrapper = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [clientWorkspaceReady, setClientWorkspaceReady] =
    useState(false);

  const shouldCheckClientOnboarding =
    !isLoading &&
    router.isReady &&
    isAuthenticated &&
    user?.role === USER_ROLES.USER_CLIENT &&
    router.pathname !== '/onboarding' &&
    router.pathname !== '/' &&
    !router.pathname.startsWith('/auth/');

  useEffect(() => {
    if (isLoading || !router.isReady) return;

    const path = router.pathname;
    const isAuthPage = path.startsWith('/auth/');
    const isPasswordResetPage = path === '/auth/reset-password';

    if (!isAuthenticated && !isAuthPage && path !== '/') {
      router.replace('/auth/login');
      return;
    }

    if (
      isAuthenticated &&
      ((isAuthPage && !isPasswordResetPage) || path === '/')
    ) {
      router.replace(getRoleHome(user?.role));
      return;
    }

    if (!isAuthenticated && path === '/') {
      router.replace('/auth/login');
    }
  }, [
    isAuthenticated,
    isLoading,
    router.isReady,
    router.pathname,
    user?.role,
  ]);

  useEffect(() => {
    if (!shouldCheckClientOnboarding) {
      setClientWorkspaceReady(false);
      return undefined;
    }

    let active = true;

    const checkClientOnboarding = async () => {
      setClientWorkspaceReady(false);

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('client_onboarding_forms')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!active) return;

        if (
          error ||
          data?.status !== 'submitted'
        ) {
          await router.replace('/onboarding');
          return;
        }

        setClientWorkspaceReady(true);
      } catch (checkError) {
        if (!active) return;

        console.error(
          'Unable to verify client onboarding:',
          checkError
        );

        await router.replace('/onboarding');
      }
    };

    checkClientOnboarding();

    return () => {
      active = false;
    };
  }, [
    router.pathname,
    shouldCheckClientOnboarding,
    user?.id,
  ]);

  if (
    isLoading ||
    (
      shouldCheckClientOnboarding &&
      !clientWorkspaceReady
    )
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
          <p className="text-sm font-medium text-slate-500">
            Loading ApplyLoop...
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default function MyApp({ Component, pageProps }) {
  return (
    <AppProvider>
      <AuthProvider>
        <AuthWrapper>
          <Component {...pageProps} />
        </AuthWrapper>
      </AuthProvider>
    </AppProvider>
  );
}
