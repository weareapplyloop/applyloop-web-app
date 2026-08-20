import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiEdit2,
} from 'react-icons/fi';

import { createClient } from '../lib/supabase/client';
import {
  CLIENT_ONBOARDING_QUESTIONS,
  CLIENT_ONBOARDING_TOTAL,
} from '../shared/config/clientOnboardingQuestions';
import { USER_ROLES } from '../shared/config/roles';
import { useAuth } from '../shared/context/AuthContext';

async function getAccessToken() {
  const supabase = createClient();

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

async function onboardingRequest(
  method = 'GET',
  body
) {
  const token = await getAccessToken();

  const response = await fetch(
    '/api/client/onboarding',
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body
          ? {
              'Content-Type':
                'application/json',
            }
          : {}),
      },
      ...(body
        ? {
            body: JSON.stringify(body),
          }
        : {}),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        'Unable to process onboarding.'
    );
  }

  return data;
}

function LoadingScreen({
  message = 'Loading your onboarding...',
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-[#1E50C3]" />
        <p className="text-sm font-medium text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

export default function ClientOnboarding() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [phase, setPhase] =
    useState('loading');

  const [answers, setAnswers] =
    useState({});

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [
    editingFromReview,
    setEditingFromReview,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user
    ) {
      return;
    }

    if (
      user.role !== USER_ROLES.USER_CLIENT
    ) {
      router.replace('/dashboard');
      return;
    }

    let active = true;

    const loadOnboarding = async () => {
      try {
        const data =
          await onboardingRequest();

        if (!active) {
          return;
        }

        const onboarding =
          data.onboarding;

        setAnswers(
          onboarding.answers || {}
        );

        setCurrentIndex(
          Math.max(
            0,
            Math.min(
              CLIENT_ONBOARDING_TOTAL - 1,
              (onboarding.currentQuestion ||
                1) - 1
            )
          )
        );

        if (
          onboarding.status ===
          'submitted'
        ) {
          router.replace('/dashboard');
          return;
        }

        if (
          onboarding.status ===
          'in_progress'
        ) {
          setPhase('form');
          return;
        }

        setPhase('welcome');
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
          setPhase('error');
        }
      }
    };

    loadOnboarding();

    return () => {
      active = false;
    };
  }, [
    isAuthenticated,
    router,
    user,
  ]);

  const currentQuestion =
    CLIENT_ONBOARDING_QUESTIONS[
      currentIndex
    ];

  const currentValue =
    answers[currentQuestion?.id] || '';

  const progress =
    ((currentIndex + 1) /
      CLIENT_ONBOARDING_TOTAL) *
    100;

  const beginOnboarding = async () => {
    setIsSaving(true);
    setError('');

    try {
      await onboardingRequest(
        'PATCH',
        {
          currentQuestion: 1,
        }
      );

      setCurrentIndex(0);
      setPhase('form');
    } catch (beginError) {
      setError(beginError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateAnswer = (value) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));

    setError('');
  };

  const saveCurrentQuestion =
    async (nextQuestion) => {
      return onboardingRequest(
        'PATCH',
        {
          answers: {
            [currentQuestion.id]:
              currentValue,
          },
          currentQuestion:
            nextQuestion,
        }
      );
    };

  const handleNext = async () => {
    const trimmedValue =
      typeof currentValue === 'string'
        ? currentValue.trim()
        : currentValue;

    if (
      currentQuestion.required &&
      !trimmedValue
    ) {
      setError(
        'Please answer this question before continuing.'
      );
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const nextQuestionNumber =
        Math.min(
          currentIndex + 2,
          CLIENT_ONBOARDING_TOTAL
        );

      await saveCurrentQuestion(
        nextQuestionNumber
      );

      if (editingFromReview) {
        setEditingFromReview(false);
        setPhase('review');
        return;
      }

      if (
        currentIndex ===
        CLIENT_ONBOARDING_TOTAL - 1
      ) {
        setPhase('review');
        return;
      }

      setCurrentIndex(
        (previous) => previous + 1
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setError('');

    if (editingFromReview) {
      setEditingFromReview(false);
      setPhase('review');
      return;
    }

    if (currentIndex === 0) {
      setPhase('welcome');
      return;
    }

    setCurrentIndex(
      (previous) => previous - 1
    );
  };

  const editQuestion = (index) => {
    setCurrentIndex(index);
    setEditingFromReview(true);
    setError('');
    setPhase('form');
  };

  const submitOnboarding = async () => {
    const missingRequired =
      CLIENT_ONBOARDING_QUESTIONS.find(
        (question) =>
          question.required &&
          !String(
            answers[question.id] || ''
          ).trim()
      );

    if (missingRequired) {
      const index =
        CLIENT_ONBOARDING_QUESTIONS.findIndex(
          (question) =>
            question.id ===
            missingRequired.id
        );

      setCurrentIndex(index);
      setEditingFromReview(true);
      setError(
        'Please complete this required question before submitting.'
      );
      setPhase('form');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onboardingRequest(
        'POST',
        {
          answers,
        }
      );

      setPhase('submitted');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (phase === 'loading') {
    return <LoadingScreen />;
  }

  if (
    isSaving &&
    phase === 'submitted'
  ) {
    return (
      <LoadingScreen message="Finishing your onboarding..." />
    );
  }

  if (phase === 'error') {
    return (
      <>
        <Head>
          <title>
            Onboarding | ApplyLoop
          </title>
        </Head>

        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm animate-fadeIn">
            <Image
              src="/logo.svg"
              alt="ApplyLoop"
              width={150}
              height={44}
              className="mx-auto mb-8"
              priority
            />

            <h1 className="text-2xl font-bold text-slate-950 mb-3">
              We could not load your
              onboarding
            </h1>

            <p className="text-sm text-slate-500 leading-6 mb-6">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="w-full rounded-xl bg-[#1E50C3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1946AD]"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === 'welcome') {
    return (
      <>
        <Head>
          <title>
            Welcome | ApplyLoop
          </title>
        </Head>

        <div className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center px-6">
          <div className="absolute -top-36 -right-36 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="absolute -bottom-36 -left-36 h-96 w-96 rounded-full bg-blue-50 blur-3xl" />

          <div className="relative w-full max-w-xl text-center animate-fadeIn">
            <div className="mb-10 flex justify-center">
              <div className="rounded-3xl bg-white px-8 py-6 shadow-sm border border-slate-100">
                <Image
                  src="/logo.svg"
                  alt="ApplyLoop"
                  width={180}
                  height={52}
                  priority
                />
              </div>
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#1E50C3]">
              Client Workspace
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950">
              Welcome to ApplyLoop
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base md:text-lg leading-7 text-slate-500">
              Before we begin applying
              for opportunities, we need
              a few details to understand
              your goals and preferences.
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
              <FiCheck className="text-[#1E50C3]" />
              <span>
                15 short questions
              </span>
              <span>•</span>
              <span>
                Your progress is saved
              </span>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={beginOnboarding}
              disabled={isSaving}
              className="group mx-auto mt-9 inline-flex min-w-[220px] items-center justify-center gap-3 rounded-xl bg-[#1E50C3] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1946AD] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Starting...
                </>
              ) : (
                <>
                  Begin Onboarding
                  <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === 'submitted') {
    return (
      <>
        <Head>
          <title>
            Onboarding Complete |
            ApplyLoop
          </title>
        </Head>

        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-8 md:p-12 text-center shadow-sm animate-fadeIn">
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <FiCheck className="h-8 w-8 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Onboarding Complete
            </h1>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Your preferences have been
              submitted successfully.
              ApplyLoop can now use this
              information to support your
              job search.
            </p>

            <button
              type="button"
              onClick={() =>
                router.replace(
                  '/dashboard'
                )
              }
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E50C3] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#1946AD]"
            >
              Go to Dashboard
              <FiArrowRight />
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === 'review') {
    return (
      <>
        <Head>
          <title>
            Review Onboarding |
            ApplyLoop
          </title>
        </Head>

        <div className="min-h-screen bg-slate-50">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
              <Image
                src="/logo.svg"
                alt="ApplyLoop"
                width={140}
                height={40}
                priority
              />

              <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                15 / 15 Complete
              </span>
            </div>
          </header>

          <main className="mx-auto max-w-3xl px-6 py-10 md:py-14 animate-fadeIn">
            <div className="mb-8">
              <p className="text-sm font-semibold text-[#1E50C3]">
                Final Step
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Review your answers
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Check your information
                before submitting. You can
                edit any answer below.
              </p>
            </div>

            <div className="space-y-3">
              {CLIENT_ONBOARDING_QUESTIONS.map(
                (question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-400">
                          Question{' '}
                          {index + 1}
                        </p>

                        <h2 className="mt-1 text-sm font-semibold text-slate-900">
                          {question.title}
                        </h2>

                        <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                          {answers[
                            question.id
                          ] || (
                            <span className="italic text-slate-400">
                              Not provided
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          editQuestion(
                            index
                          )
                        }
                        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#1E50C3] hover:bg-blue-50"
                      >
                        <FiEdit2 />
                        Edit
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(
                    CLIENT_ONBOARDING_TOTAL -
                      1
                  );
                  setPhase('form');
                }}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FiArrowLeft />
                Back
              </button>

              <button
                type="button"
                onClick={submitOnboarding}
                disabled={isSaving}
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[#1E50C3] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1946AD] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Onboarding
                    <FiCheck />
                  </>
                )}
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>
          Client Onboarding | ApplyLoop
        </title>
      </Head>

      <div className="min-h-screen bg-slate-50 px-6 py-8 md:py-12">
        <main className="mx-auto max-w-3xl">
          <div
            key={currentQuestion.id}
            className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-fadeIn md:p-10"
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <Image
                src="/logo.svg"
                alt="ApplyLoop"
                width={140}
                height={40}
                priority
              />

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-[#1E50C3]">
                {currentIndex + 1} /{' '}
                {CLIENT_ONBOARDING_TOTAL}
              </span>
            </div>

            <div className="mb-10 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-[#1E50C3] transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
            <p className="mb-3 text-sm font-semibold text-[#1E50C3]">
              Question{' '}
              {currentIndex + 1} of{' '}
              {CLIENT_ONBOARDING_TOTAL}
            </p>

            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {currentQuestion.title}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              {
                currentQuestion.description
              }
            </p>

            <div className="mt-8">
              {currentQuestion.type ===
              'textarea' ? (
                <textarea
                  value={currentValue}
                  onChange={(event) =>
                    updateAnswer(
                      event.target.value
                    )
                  }
                  placeholder={
                    currentQuestion.placeholder
                  }
                  rows={6}
                  autoFocus
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1E50C3] focus:ring-4 focus:ring-blue-100"
                />
              ) : currentQuestion.type ===
                'select' ? (
                <select
                  value={currentValue}
                  onChange={(event) =>
                    updateAnswer(
                      event.target.value
                    )
                  }
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition-all focus:border-[#1E50C3] focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">
                    {
                      currentQuestion.placeholder
                    }
                  </option>

                  {currentQuestion.options.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <input
                  type={currentQuestion.type}
                  value={currentValue}
                  onChange={(event) =>
                    updateAnswer(
                      event.target.value
                    )
                  }
                  placeholder={
                    currentQuestion.placeholder
                  }
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1E50C3] focus:ring-4 focus:ring-blue-100"
                />
              )}

              {!currentQuestion.required && (
                <p className="mt-2 text-xs text-slate-400">
                  Optional
                </p>
              )}
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mt-9 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-50"
              >
                <FiArrowLeft />
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSaving}
                className="group inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-[#1E50C3] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1946AD] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving...
                  </>
                ) : editingFromReview ? (
                  <>
                    Save
                    <FiCheck />
                  </>
                ) : currentIndex ===
                  CLIENT_ONBOARDING_TOTAL -
                    1 ? (
                  <>
                    Review
                    <FiArrowRight />
                  </>
                ) : (
                  <>
                    Next
                    <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Your progress is saved as
              you continue.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
