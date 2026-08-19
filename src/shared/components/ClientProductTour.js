import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiX,
} from 'react-icons/fi';

const TOUR_STEPS = [
  {
    target: '[data-tour="home-nav"]',
    title: 'Your Home',
    description:
      'This is your main dashboard. You can track applications, responses, interviews, offers, and important updates from here.',
  },
  {
    target: '[data-tour="application-search"]',
    title: 'Search Applications',
    description:
      'Search for an application by company, position, application number, status, location, or other application information.',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    description:
      'Important application updates and feedback appear here. The badge shows how many unread notifications you have.',
  },
  {
    target: '[data-tour="growth-nav"]',
    title: 'Career Growth',
    description:
      'Your Growth workspace contains assigned courses, skill-gap recommendations, certifications, and your learning progress.',
  },
  {
    target: '[data-tour="settings-nav"]',
    title: 'Settings',
    description:
      'Manage your personal information, work preferences, authorization details, password, and other account settings here.',
  },
  {
    target: '[data-tour="support-nav"]',
    title: 'Help & Support',
    description:
      'Need assistance? Create a support request, read previous conversations, and send follow-up messages from here.',
  },
  {
    target: '[data-tour="profile-menu"]',
    title: 'Your Account',
    description:
      'Use your account menu when you need to sign out. You will also be able to replay this tutorial from your Settings page.',
  },
];

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 380;
const TOOLTIP_GAP = 18;

function isUsableElement(element) {
  if (!element) {
    return false;
  }

  const rect =
    element.getBoundingClientRect();

  const style =
    window.getComputedStyle(
      element
    );

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  );
}

function findAvailableStep(
  startIndex,
  direction
) {
  let index = startIndex;

  while (
    index >= 0 &&
    index < TOUR_STEPS.length
  ) {
    const element =
      document.querySelector(
        TOUR_STEPS[index].target
      );

    if (isUsableElement(element)) {
      return {
        index,
        element,
      };
    }

    index += direction;
  }

  return null;
}

function getTooltipPosition(rect) {
  const viewportWidth =
    window.innerWidth;
  const viewportHeight =
    window.innerHeight;

  const width = Math.min(
    TOOLTIP_WIDTH,
    viewportWidth - 32
  );

  let left =
    rect.left +
    rect.width / 2 -
    width / 2;

  left = Math.max(
    16,
    Math.min(
      left,
      viewportWidth -
        width -
        16
    )
  );

  const estimatedHeight = 245;

  if (
    rect.bottom +
      TOOLTIP_GAP +
      estimatedHeight <
    viewportHeight
  ) {
    return {
      width,
      left,
      top:
        rect.bottom +
        TOOLTIP_GAP,
    };
  }

  if (
    rect.top -
      TOOLTIP_GAP -
      estimatedHeight >
    0
  ) {
    return {
      width,
      left,
      bottom:
        viewportHeight -
        rect.top +
        TOOLTIP_GAP,
    };
  }

  return {
    width,
    left,
    top: Math.max(
      16,
      viewportHeight -
        estimatedHeight -
        24
    ),
  };
}

export default function ClientProductTour({
  open,
  onComplete,
  onDismiss,
}) {
  const [stepIndex, setStepIndex] =
    useState(0);
  const [targetRect, setTargetRect] =
    useState(null);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState('');

  const step =
    TOUR_STEPS[stepIndex];

  const updateTargetRect =
    useCallback(() => {
      if (!open || !step) {
        return;
      }

      const element =
        document.querySelector(
          step.target
        );

      if (!isUsableElement(element)) {
        return;
      }

      const rect =
        element.getBoundingClientRect();

      setTargetRect({
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }, [open, step]);

  const moveToStep =
    useCallback(
      (requestedIndex, direction) => {
        const result =
          findAvailableStep(
            requestedIndex,
            direction
          );

        if (!result) {
          return false;
        }

        setStepIndex(
          result.index
        );

        result.element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });

        window.setTimeout(() => {
          const rect =
            result.element
              .getBoundingClientRect();

          setTargetRect({
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }, 350);

        return true;
      },
      []
    );

  useEffect(() => {
    if (!open) {
      setTargetRect(null);
      setStepIndex(0);
      setError('');
      return undefined;
    }

    const first =
      findAvailableStep(
        0,
        1
      );

    if (!first) {
      return undefined;
    }

    setStepIndex(first.index);

    first.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    const timer =
      window.setTimeout(() => {
        if (
          !isUsableElement(
            first.element
          )
        ) {
          return;
        }

        const rect =
          first.element
            .getBoundingClientRect();

        setTargetRect({
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }, 400);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleUpdate = () => {
      updateTargetRect();
    };

    window.addEventListener(
      'resize',
      handleUpdate
    );

    window.addEventListener(
      'scroll',
      handleUpdate,
      true
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleUpdate
      );

      window.removeEventListener(
        'scroll',
        handleUpdate,
        true
      );
    };
  }, [
    open,
    updateTargetRect,
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === 'Escape' &&
        !isSaving
      ) {
        onDismiss();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    isSaving,
    onDismiss,
    open,
  ]);

  const tooltipStyle =
    useMemo(() => {
      if (!targetRect) {
        return null;
      }

      return getTooltipPosition(
        targetRect
      );
    }, [targetRect]);

  if (
    !open ||
    !step ||
    !targetRect ||
    !tooltipStyle
  ) {
    return null;
  }

  const topHeight =
    Math.max(
      targetRect.top -
        SPOTLIGHT_PADDING,
      0
    );

  const spotlightTop =
    Math.max(
      targetRect.top -
        SPOTLIGHT_PADDING,
      0
    );

  const spotlightLeft =
    Math.max(
      targetRect.left -
        SPOTLIGHT_PADDING,
      0
    );

  const spotlightRight =
    Math.min(
      targetRect.right +
        SPOTLIGHT_PADDING,
      window.innerWidth
    );

  const spotlightBottom =
    Math.min(
      targetRect.bottom +
        SPOTLIGHT_PADDING,
      window.innerHeight
    );

  const handleBack = () => {
    moveToStep(
      stepIndex - 1,
      -1
    );
  };

  const handleNext = async () => {
    setError('');

    const moved =
      moveToStep(
        stepIndex + 1,
        1
      );

    if (moved) {
      return;
    }

    setIsSaving(true);

    try {
      await onComplete();
    } catch (saveError) {
      setError(
        saveError.message ||
          'Tutorial progress could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (isSaving) {
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onDismiss();
    } catch (saveError) {
      setError(
        saveError.message ||
          'Tutorial progress could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasPrevious =
    Boolean(
      findAvailableStep(
        stepIndex - 1,
        -1
      )
    );

  const hasNext =
    Boolean(
      findAvailableStep(
        stepIndex + 1,
        1
      )
    );

  return (
    <>
      <div
        className="fixed left-0 top-0 z-[80] bg-slate-950/75 backdrop-blur-[1px]"
        style={{
          width: '100vw',
          height: topHeight,
        }}
      />

      <div
        className="fixed bottom-0 left-0 z-[80] bg-slate-950/75 backdrop-blur-[1px]"
        style={{
          width: '100vw',
          top: spotlightBottom,
        }}
      />

      <div
        className="fixed left-0 z-[80] bg-slate-950/75 backdrop-blur-[1px]"
        style={{
          top: spotlightTop,
          width: spotlightLeft,
          height:
            spotlightBottom -
            spotlightTop,
        }}
      />

      <div
        className="fixed right-0 z-[80] bg-slate-950/75 backdrop-blur-[1px]"
        style={{
          top: spotlightTop,
          left: spotlightRight,
          height:
            spotlightBottom -
            spotlightTop,
        }}
      />

      <div
        className="pointer-events-none fixed z-[90] rounded-2xl border-2 border-white shadow-[0_0_0_4px_rgba(59,130,246,0.5),0_20px_60px_rgba(15,23,42,0.25)] transition-all duration-300"
        style={{
          top: spotlightTop,
          left: spotlightLeft,
          width:
            spotlightRight -
            spotlightLeft,
          height:
            spotlightBottom -
            spotlightTop,
        }}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="ApplyLoop tutorial"
        className="fixed z-[100] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        style={tooltipStyle}
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                ApplyLoop Tour
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950">
                {step.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={
                handleSkip
              }
              disabled={
                isSaving
              }
              aria-label="Skip tutorial"
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {step.description}
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map(
              (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === stepIndex
                      ? 'w-6 bg-blue-600'
                      : index <
                          stepIndex
                        ? 'w-2 bg-blue-300'
                        : 'w-2 bg-slate-200'
                  }`}
                />
              )
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={
                handleSkip
              }
              disabled={
                isSaving
              }
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {hasPrevious && (
                <button
                  type="button"
                  onClick={
                    handleBack
                  }
                  disabled={
                    isSaving
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <FiArrowLeft />
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={
                  handleNext
                }
                disabled={
                  isSaving
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  'Saving...'
                ) : hasNext ? (
                  <>
                    Next
                    <FiArrowRight />
                  </>
                ) : (
                  <>
                    Finish
                    <FiCheck />
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-600">
                {error}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
