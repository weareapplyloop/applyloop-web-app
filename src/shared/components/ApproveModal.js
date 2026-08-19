import React from 'react';
import { FiX } from 'react-icons/fi';

const ApproveModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  error = '',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-[500px] max-w-[calc(100vw-32px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all animate-scaleIn">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 dark:border-gray-700/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Approve Application
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 disabled:opacity-50"
            aria-label="Close approval dialog"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Are you sure you want to approve this application?
            Approving confirms that you have reviewed the
            application and want ApplyLoop to proceed with it.
          </p>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-900/40">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1E50C3] hover:bg-[#1A45A7] rounded-xl hover:shadow-lg hover:shadow-blue-500/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? 'Approving...'
              : 'Approve Application'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveModal;
