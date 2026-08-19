import React, { useState } from 'react';
import { FiSend } from 'react-icons/fi';

const AddJobLinkModal = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [jobLink, setJobLink] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!jobLink || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      await onConfirm({
        jobLink,
        comment,
      });

      setJobLink('');
      setComment('');
      onClose();
    } catch (submitError) {
      setError(
        submitError.message ||
          'Unable to submit this job link.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-[500px] max-w-[calc(100vw-32px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all animate-scaleIn">
        <div className="px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Add your job link
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Send a job opportunity to the ApplyLoop team.
          </p>
        </div>

        <div className="px-8 pb-6 space-y-6">
          <div>
            <label
              htmlFor="job-link"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Job Link
            </label>

            <input
              id="job-link"
              type="url"
              value={jobLink}
              onChange={(e) =>
                setJobLink(e.target.value)
              }
              disabled={isSubmitting}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1E50C3] focus:border-transparent outline-none transition-all placeholder-gray-400 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="job-comment"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Comment (Optional)
            </label>

            <input
              id="job-comment"
              type="text"
              value={comment}
              onChange={(e) =>
                setComment(e.target.value)
              }
              disabled={isSubmitting}
              placeholder="Type your comment here..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1E50C3] focus:border-transparent outline-none transition-all placeholder-gray-400 disabled:opacity-60"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-900/40">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-gray-100 dark:border-gray-700/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !jobLink.trim() ||
              isSubmitting
            }
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#1E50C3] hover:bg-[#1A45A7] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:shadow-lg hover:shadow-blue-500/10 transition-all active:scale-[0.98]"
          >
            <span>
              {isSubmitting
                ? 'Sending...'
                : 'Send Job Link'}
            </span>

            <FiSend className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddJobLinkModal;
