/**
 * Settings Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Contains 4 tabs for user profile configuration:
 *   1. Basic Information   — Personal details & links
 *   2. Work Preferences    — Job titles, expertise, availability
 *   3. Location & Work Auth — Sponsorship, excluded/priority companies
 *   4. Password & Security — Password change, account deletion
 *
 * All forms use controlled React state. Every interactive element is functional.
 * TODO(Backend) comments mark where API calls should be wired.
 *
 * API Endpoints (for backend team reference):
 *   PUT    /api/users/profile         — Update basic info
 *   PUT    /api/users/preferences     — Update work preferences
 *   PUT    /api/users/authorization   — Update location & work auth
 *   PUT    /api/auth/update-password  — Change password
 *   DELETE /api/users/account         — Delete user account
 *   POST   /api/users/profile-image   — Upload profile image (multipart/form-data)
 *
 * Security Notes:
 *   - All inputs must be sanitized server-side to prevent XSS/SQL injection.
 *   - CSRF tokens must be included in all mutation requests.
 *   - Passwords must never be logged or stored in plain text.
 *   - File uploads must be validated for type & size.
 *   - Account deletion requires confirmation + optional password re-entry.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useRef } from 'react';
import { FiPlus, FiX, FiChevronDown, FiEye, FiEyeOff } from 'react-icons/fi';
import SEO from '../shared/components/SEO';
import DashboardLayout from '../shared/components/DashboardLayout';
import { createClient } from '../lib/supabase/client';

async function getAccessToken() {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('The Supabase connection is unavailable.');
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return session.access_token;
}

// ─── Centralized mock data (replace with API calls when backend is ready) ────
// Backend: GET /api/users/profile, GET /api/users/preferences, etc.
import { DROPDOWN_OPTIONS } from '../data/mockData';

// ─── Reusable: Tag list with removable chips ─────────────────────────────────
function TagList({
  items,
  onRemove,
  placeholder = 'Type and press Enter...',
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (
      !disabled &&
      e.key === 'Enter' &&
      inputValue.trim()
    ) {
      e.preventDefault();

      if (!items.includes(inputValue.trim())) {
        onRemove([...items, inputValue.trim()], 'add');
      }

      setInputValue('');
    }
  };

  return (
    <div
      className={`w-full px-4 py-2.5 rounded-xl border flex items-center gap-2 flex-wrap min-h-[44px] transition-all ${
        disabled
          ? 'border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-900'
          : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
      }`}
    >
      {items.map((item, idx) => (
        <span key={`${item}-${idx}`} className="inline-flex items-center">
          {idx > 0 && (
            <span className="text-gray-300 mr-2">|</span>
          )}

          <span className="text-sm text-gray-900 dark:text-white flex items-center gap-1">
            {item}

            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  const updated = items.filter(
                    (_, i) => i !== idx
                  );

                  onRemove(updated, 'remove');
                }}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`Remove ${item}`}
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        </span>
      ))}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          !disabled && items.length === 0
            ? placeholder
            : ''
        }
        className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 disabled:cursor-not-allowed"
      />

      {!disabled && (
        <FiChevronDown className="text-gray-400 flex-shrink-0" />
      )}
    </div>
  );
}

// ─── Reusable: Styled select wrapper ─────────────────────────────────────────
function StyledSelect({
  value,
  onChange,
  options,
  className = '',
  disabled = false,
}) {
  const selectOptions =
    value && !options.includes(value)
      ? [value, ...options]
      : options;

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none appearance-none pr-10 transition-all ${
          disabled
            ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500'
            : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#1E50C3] focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white'
        }`}
      >
        <option value="">Select an option</option>

        {selectOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {!disabled && (
        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      )}
    </div>
  );
}

// ─── Reusable: Text input with label ─────────────────────────────────────────
function FormInput({
  label,
  id,
  type = 'text',
  value,
  onChange,
  colSpan,
  disabled = false,
  ...rest
}) {
  return (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all placeholder-gray-400 ${
          disabled
            ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500'
            : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#1E50C3] focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white'
        }`}
        autoComplete="off"
        {...rest}
      />
    </div>
  );
}

// ─── Main Settings Component ─────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState('Basic Information');

  // ── Tab 1: Basic Information State ──
  // TODO(Backend): Replace with useEffect + applyLoopApi.users.getProfile()
  const [profile, setProfile] = useState({
    fullName: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    nationality: '',
    state: '',
    disability: '',
    veteran: '',
    portfolioLink: '',
    linkedinUrl: '',
  });
  const [extraLinks, setExtraLinks] = useState([]); // Additional link rows beyond the 2 defaults
  const [savedProfile, setSavedProfile] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const fileInputRef = useRef(null);

  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    let mounted = true;

    const loadClientSettings = async () => {
      setIsLoadingSettings(true);
      setSettingsError('');

      try {
        const accessToken = await getAccessToken();

        const response = await fetch('/api/client/settings', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'Unable to load your settings.'
          );
        }

        if (!mounted) return;

        const loadedProfile = {
          fullName: data.fullName || '',
          gender: data.gender || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          nationality: data.country || '',
          state: data.state || '',
          disability: data.disability || '',
          veteran: data.veteran || '',
          portfolioLink: data.portfolioLink || '',
          linkedinUrl: data.linkedinUrl || '',
        };

        setProfile(loadedProfile);
        setSavedProfile(loadedProfile);

        const loadedWorkPreferences = {
          jobs: Array.isArray(data.workPreferences?.jobs)
            ? data.workPreferences.jobs.map((job) => ({ ...job }))
            : [],
          industry: data.workPreferences?.industry || '',
          specialization:
            data.workPreferences?.specialization || '',
          workType: data.workPreferences?.workType || '',
          schedule: data.workPreferences?.schedule || '',
          duration: data.workPreferences?.duration || '',
          locations: Array.isArray(data.workPreferences?.locations)
            ? [...data.workPreferences.locations]
            : [],
        };

        setJobs(loadedWorkPreferences.jobs);
        setIndustry(loadedWorkPreferences.industry);
        setSpecialization(loadedWorkPreferences.specialization);
        setWorkType(loadedWorkPreferences.workType);
        setSchedule(loadedWorkPreferences.schedule);
        setDuration(loadedWorkPreferences.duration);
        setLocations(loadedWorkPreferences.locations);
        setSavedWorkPreferences(loadedWorkPreferences);

        const loadedWorkAuthorization = {
          requireSponsorship:
            data.workAuthorization?.requireSponsorship || '',
          authorizedToWork:
            data.workAuthorization?.authorizedToWork || '',
          excludedCompanies:
            Array.isArray(
              data.workAuthorization?.excludedCompanies
            )
              ? [...data.workAuthorization.excludedCompanies]
              : [],
          priorityCompanies:
            Array.isArray(
              data.workAuthorization?.priorityCompanies
            )
              ? [...data.workAuthorization.priorityCompanies]
              : [],
        };

        setRequireSponsorship(
          loadedWorkAuthorization.requireSponsorship
        );
        setAuthorizedToWork(
          loadedWorkAuthorization.authorizedToWork
        );
        setExcludedCompanies(
          loadedWorkAuthorization.excludedCompanies
        );
        setPriorityCompanies(
          loadedWorkAuthorization.priorityCompanies
        );
        setSavedWorkAuthorization(loadedWorkAuthorization);
      } catch (error) {
        if (mounted) {
          setSettingsError(
            error.message || 'Unable to load your settings.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    loadClientSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const [jobs, setJobs] = useState([]);
  const [industry, setIndustry] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [workType, setWorkType] = useState('');
  const [schedule, setSchedule] = useState('');
  const [duration, setDuration] = useState('');
  const [locations, setLocations] = useState([]);
  const [savedWorkPreferences, setSavedWorkPreferences] =
    useState(null);
  const [isEditingWorkPreferences, setIsEditingWorkPreferences] =
    useState(false);
  const [isSavingWorkPreferences, setIsSavingWorkPreferences] =
    useState(false);
  const [workPreferencesError, setWorkPreferencesError] =
    useState('');
  const [workPreferencesMessage, setWorkPreferencesMessage] =
    useState('');

  const [requireSponsorship, setRequireSponsorship] =
    useState('');
  const [authorizedToWork, setAuthorizedToWork] =
    useState('');
  const [excludedCompanies, setExcludedCompanies] =
    useState([]);
  const [priorityCompanies, setPriorityCompanies] =
    useState([]);
  const [savedWorkAuthorization, setSavedWorkAuthorization] =
    useState(null);
  const [isEditingWorkAuthorization, setIsEditingWorkAuthorization] =
    useState(false);
  const [isSavingWorkAuthorization, setIsSavingWorkAuthorization] =
    useState(false);
  const [workAuthorizationError, setWorkAuthorizationError] =
    useState('');
  const [workAuthorizationMessage, setWorkAuthorizationMessage] =
    useState('');

  // ── Tab 4: Password & Security State ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // ── Tab list ──
  const tabs = [
    'Basic Information',
    'Work Preferences',
    'Location & Work Authorization',
    'Password & Security',
  ];

  // ── Shared input class ──
  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1E50C3] focus:border-transparent outline-none transition-all placeholder-gray-400';

  return (
    <DashboardLayout>
      <SEO title="Settings" />

      {isLoadingSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <div className="flex flex-col items-center gap-4">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-[#1E50C3]" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Loading your settings...
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input for profile image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          // Security: Validate file type and size on client before upload
          const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
          const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

          if (!ALLOWED_TYPES.includes(file.type)) {
            alert('Please upload a PNG, JPEG, or WebP image.');
            return;
          }
          if (file.size > MAX_SIZE) {
            alert('Image must be under 5 MB.');
            return;
          }

          // TODO(Backend): Upload to POST /api/users/profile-image (multipart/form-data)
          console.log('Profile image selected:', file.name);
        }}
      />

      {/* ── Settings Container ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">

        {/* ── Tab Navigation ── */}
        <div className="flex px-8 border-b border-gray-100 dark:border-gray-700 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 mr-8 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#1E50C3] text-[#1E50C3]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="p-8">

          {/* ═══════════════════════════════════════════════════════════════
           *  TAB 1: BASIC INFORMATION
           *  API: PUT /api/users/profile
           * ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'Basic Information' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                if (!isEditingProfile) return;

                setIsSavingProfile(true);
                setSettingsError('');
                setSettingsMessage('');

                try {
                  const accessToken = await getAccessToken();

                  const response = await fetch('/api/client/settings', {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      fullName: profile.fullName,
                      phone: profile.phone,
                      country: profile.nationality,
                      gender: profile.gender,
                      address: profile.address,
                      state: profile.state,
                      disability: profile.disability,
                      veteran: profile.veteran,
                      portfolioLink: profile.portfolioLink,
                      linkedinUrl: profile.linkedinUrl,
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data.error || 'Unable to save your settings.'
                    );
                  }

                  const updatedProfile = {
                    ...profile,
                    fullName: data.fullName || '',
                    gender: data.gender || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    nationality: data.country || '',
                    state: data.state || '',
                    disability: data.disability || '',
                    veteran: data.veteran || '',
                    portfolioLink: data.portfolioLink || '',
                    linkedinUrl: data.linkedinUrl || '',
                  };

                  setProfile(updatedProfile);
                  setSavedProfile(updatedProfile);
                  setIsEditingProfile(false);
                  setSettingsMessage(
                    'Settings updated successfully.'
                  );
                } catch (error) {
                  setSettingsError(
                    error.message || 'Unable to save your settings.'
                  );
                } finally {
                  setIsSavingProfile(false);
                }
              }}
              className="max-w-4xl space-y-8 animate-fadeIn"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Basic Information
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Your information is locked until you choose to edit it.
                  </p>
                </div>

                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setSettingsError('');
                      setSettingsMessage('');
                    }}
                    className="px-5 py-2.5 text-sm font-semibold text-[#1E50C3] border border-[#1E50C3] rounded-xl hover:bg-blue-50 transition-all"
                  >
                    Edit
                  </button>
                )}
              </div>

              {settingsError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {settingsError}
                </div>
              )}

              {settingsMessage && (
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {settingsMessage}
                </div>
              )}

              {/* Profile Image */}
              <div className="flex items-center gap-6">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isEditingProfile}
                  className={`px-5 py-2.5 text-sm font-semibold border rounded-xl transition-all ${
                    isEditingProfile
                      ? 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                      : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed dark:bg-gray-900 dark:text-gray-600 dark:border-gray-700'
                  }`}
                >
                  Update Profile Image
                </button>
              </div>

              {/* Personal Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Full Name" id="fullName" value={profile.fullName} onChange={(v) => updateProfile('fullName', v)} disabled={!isEditingProfile} />
                <FormInput label="Gender" id="gender" value={profile.gender} onChange={(v) => updateProfile('gender', v)} disabled={!isEditingProfile} />
                <FormInput label="Email Address" id="email" type="email" value={profile.email} onChange={(v) => updateProfile('email', v)} disabled />
                <FormInput label="Phone Number" id="phone" type="tel" value={profile.phone} onChange={(v) => updateProfile('phone', v)} disabled={!isEditingProfile} />
                <FormInput label="Physical Address" id="address" value={profile.address} onChange={(v) => updateProfile('address', v)} colSpan disabled={!isEditingProfile} />
                <FormInput label="Nationality" id="nationality" value={profile.nationality} onChange={(v) => updateProfile('nationality', v)} disabled={!isEditingProfile} />
                <FormInput label="State/Province" id="state" value={profile.state} onChange={(v) => updateProfile('state', v)} disabled={!isEditingProfile} />
                <FormInput label="Disability" id="disability" value={profile.disability} onChange={(v) => updateProfile('disability', v)} disabled={!isEditingProfile} />
                <FormInput label="Veteran" id="veteran" value={profile.veteran} onChange={(v) => updateProfile('veteran', v)} disabled={!isEditingProfile} />
              </div>

              {/* Links and Portfolio */}
              <div className="pt-6">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Links and Portfolio</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <FormInput label="Portfolio Link" id="portfolioLink" type="url" value={profile.portfolioLink} onChange={(v) => updateProfile('portfolioLink', v)} disabled={!isEditingProfile} />
                  <FormInput label="LinkedIn URL" id="linkedinUrl" type="url" value={profile.linkedinUrl} onChange={(v) => updateProfile('linkedinUrl', v)} disabled={!isEditingProfile} />

                  {/* Dynamic extra link rows */}
                  {extraLinks.map((link, idx) => (
                    <div key={idx} className="relative">
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                        Link {idx + 1}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => {
                            const updated = [...extraLinks];
                            updated[idx] = e.target.value;
                            setExtraLinks(updated);
                          }}
                          placeholder="https://example.com"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setExtraLinks(extraLinks.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove link"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setExtraLinks([...extraLinks, ''])}
                  className="flex items-center gap-2 text-sm font-semibold text-[#1E50C3] hover:text-[#1A45A7] transition-colors"
                >
                  <FiPlus className="text-lg" />
                  <span>Add New Link</span>
                </button>
              </div>

              {isEditingProfile && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    disabled={isSavingProfile}
                    onClick={() => {
                      if (savedProfile) {
                        setProfile(savedProfile);
                      }

                      setIsEditingProfile(false);
                      setSettingsError('');
                      setSettingsMessage('');
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex min-w-[145px] items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#1E50C3] hover:bg-[#1A45A7] rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingProfile ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════
           *  TAB 2: WORK PREFERENCES
           *  API: PUT /api/users/preferences
           * ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'Work Preferences' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                if (!isEditingWorkPreferences) return;

                const totalSpread = jobs.reduce(
                  (sum, job) =>
                    sum +
                    (parseInt(job.spread, 10) || 0),
                  0
                );

                if (jobs.length > 0 && totalSpread !== 100) {
                  setWorkPreferencesError(
                    `Application spread must total 100%. Currently: ${totalSpread}%`
                  );
                  return;
                }

                setIsSavingWorkPreferences(true);
                setWorkPreferencesError('');
                setWorkPreferencesMessage('');

                try {
                  const accessToken =
                    await getAccessToken();

                  const response = await fetch(
                    '/api/client/settings',
                    {
                      method: 'PATCH',
                      headers: {
                        Authorization:
                          `Bearer ${accessToken}`,
                        'Content-Type':
                          'application/json',
                      },
                      body: JSON.stringify({
                        workPreferences: {
                          jobs,
                          industry,
                          specialization,
                          workType,
                          schedule,
                          duration,
                          locations,
                        },
                      }),
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data.error ||
                        'Unable to save your work preferences.'
                    );
                  }

                  const saved = {
                    jobs: Array.isArray(
                      data.workPreferences?.jobs
                    )
                      ? data.workPreferences.jobs.map(
                          (job) => ({ ...job })
                        )
                      : [],
                    industry:
                      data.workPreferences?.industry || '',
                    specialization:
                      data.workPreferences?.specialization || '',
                    workType:
                      data.workPreferences?.workType || '',
                    schedule:
                      data.workPreferences?.schedule || '',
                    duration:
                      data.workPreferences?.duration || '',
                    locations:
                      Array.isArray(
                        data.workPreferences?.locations
                      )
                        ? [
                            ...data.workPreferences.locations,
                          ]
                        : [],
                  };

                  setJobs(saved.jobs);
                  setIndustry(saved.industry);
                  setSpecialization(saved.specialization);
                  setWorkType(saved.workType);
                  setSchedule(saved.schedule);
                  setDuration(saved.duration);
                  setLocations(saved.locations);
                  setSavedWorkPreferences(saved);
                  setIsEditingWorkPreferences(false);
                  setWorkPreferencesMessage(
                    'Work preferences updated successfully.'
                  );
                } catch (error) {
                  setWorkPreferencesError(
                    error.message ||
                      'Unable to save your work preferences.'
                  );
                } finally {
                  setIsSavingWorkPreferences(false);
                }
              }}
              className="max-w-4xl space-y-8 animate-fadeIn"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Work Preferences
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    These preferences are based on your onboarding answers.
                  </p>
                </div>

                {!isEditingWorkPreferences && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingWorkPreferences(true);
                      setWorkPreferencesError('');
                      setWorkPreferencesMessage('');
                    }}
                    className="px-5 py-2.5 text-sm font-semibold text-[#1E50C3] border border-[#1E50C3] rounded-xl hover:bg-blue-50 transition-all"
                  >
                    Edit
                  </button>
                )}
              </div>

              {workPreferencesError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {workPreferencesError}
                </div>
              )}

              {workPreferencesMessage && (
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {workPreferencesMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    Job Title
                  </label>

                  {jobs.map((job, idx) => (
                    <div
                      key={idx}
                      className={`w-full px-4 py-3 rounded-xl border text-sm flex items-center justify-between ${
                        idx > 0 ? 'mt-3' : ''
                      } ${
                        isEditingWorkPreferences
                          ? 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                          : 'border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900'
                      }`}
                    >
                      <input
                        type="text"
                        value={job.title}
                        disabled={!isEditingWorkPreferences}
                        onChange={(e) => {
                          const updated = [...jobs];

                          updated[idx] = {
                            ...updated[idx],
                            title: e.target.value,
                          };

                          setJobs(updated);
                        }}
                        className="bg-transparent text-gray-900 dark:text-white outline-none flex-1 mr-2 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />

                      {isEditingWorkPreferences &&
                        jobs.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setJobs(
                                jobs.filter(
                                  (_, i) => i !== idx
                                )
                              )
                            }
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            aria-label={`Remove ${job.title}`}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  ))}

                  {jobs.length === 0 &&
                    !isEditingWorkPreferences && (
                      <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-400">
                        No job titles provided
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    Expertise Level
                  </label>

                  {jobs.map((job, idx) => (
                    <StyledSelect
                      key={idx}
                      value={job.level}
                      disabled={!isEditingWorkPreferences}
                      onChange={(value) => {
                        const updated = [...jobs];

                        updated[idx] = {
                          ...updated[idx],
                          level: value,
                        };

                        setJobs(updated);
                      }}
                      options={
                        DROPDOWN_OPTIONS.expertiseLevels
                      }
                      className={
                        idx > 0 ? 'mt-3' : ''
                      }
                    />
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    Application Spread %
                  </label>

                  {jobs.map((job, idx) => (
                    <StyledSelect
                      key={idx}
                      value={job.spread}
                      disabled={!isEditingWorkPreferences}
                      onChange={(value) => {
                        const updated = [...jobs];

                        updated[idx] = {
                          ...updated[idx],
                          spread: value,
                        };

                        setJobs(updated);
                      }}
                      options={
                        DROPDOWN_OPTIONS.spreadOptions
                      }
                      className={
                        idx > 0 ? 'mt-3' : ''
                      }
                    />
                  ))}
                </div>
              </div>

              {isEditingWorkPreferences && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setJobs([
                        ...jobs,
                        {
                          title: '',
                          level: 'Intermediate Level',
                          spread: '10%',
                        },
                      ])
                    }
                    className="flex items-center gap-2 text-sm font-semibold text-[#1E50C3] hover:text-[#1A45A7] transition-colors mb-1"
                  >
                    <FiPlus className="text-lg" />
                    <span>Add New Job</span>
                  </button>

                  <p className="text-[10px] text-gray-500">
                    * application spread must total 100%
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    Industry
                  </label>

                  <StyledSelect
                    value={industry}
                    onChange={setIndustry}
                    options={DROPDOWN_OPTIONS.industries}
                    disabled={!isEditingWorkPreferences}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    Specialization
                  </label>

                  <StyledSelect
                    value={specialization}
                    onChange={setSpecialization}
                    options={
                      DROPDOWN_OPTIONS.specializations
                    }
                    disabled={!isEditingWorkPreferences}
                  />
                </div>
              </div>

              <div className="pt-6">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">
                  Work Availability
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                      Work Type
                    </label>

                    <StyledSelect
                      value={workType}
                      onChange={setWorkType}
                      options={DROPDOWN_OPTIONS.workTypes}
                      disabled={
                        !isEditingWorkPreferences
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                      Work Schedule Preference
                    </label>

                    <StyledSelect
                      value={schedule}
                      onChange={setSchedule}
                      options={
                        DROPDOWN_OPTIONS.schedulePrefs
                      }
                      disabled={
                        !isEditingWorkPreferences
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                      Duration of Contract
                    </label>

                    <StyledSelect
                      value={duration}
                      onChange={setDuration}
                      options={
                        DROPDOWN_OPTIONS.durations
                      }
                      disabled={
                        !isEditingWorkPreferences
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                      Location Preferences
                    </label>

                    <TagList
                      items={locations}
                      onRemove={setLocations}
                      placeholder="Add a location..."
                      disabled={
                        !isEditingWorkPreferences
                      }
                    />
                  </div>
                </div>
              </div>

              {isEditingWorkPreferences && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    disabled={isSavingWorkPreferences}
                    onClick={() => {
                      if (savedWorkPreferences) {
                        setJobs(
                          savedWorkPreferences.jobs.map(
                            (job) => ({ ...job })
                          )
                        );
                        setIndustry(
                          savedWorkPreferences.industry
                        );
                        setSpecialization(
                          savedWorkPreferences.specialization
                        );
                        setWorkType(
                          savedWorkPreferences.workType
                        );
                        setSchedule(
                          savedWorkPreferences.schedule
                        );
                        setDuration(
                          savedWorkPreferences.duration
                        );
                        setLocations([
                          ...savedWorkPreferences.locations,
                        ]);
                      }

                      setIsEditingWorkPreferences(false);
                      setWorkPreferencesError('');
                      setWorkPreferencesMessage('');
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingWorkPreferences}
                    className="inline-flex min-w-[160px] items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#1E50C3] hover:bg-[#1A45A7] rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingWorkPreferences ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════
           *  TAB 3: LOCATION & WORK AUTHORIZATION
           *  API: PUT /api/users/authorization
           * ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'Location & Work Authorization' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                if (!isEditingWorkAuthorization) return;

                setIsSavingWorkAuthorization(true);
                setWorkAuthorizationError('');
                setWorkAuthorizationMessage('');

                try {
                  const accessToken =
                    await getAccessToken();

                  const response = await fetch(
                    '/api/client/settings',
                    {
                      method: 'PATCH',
                      headers: {
                        Authorization:
                          `Bearer ${accessToken}`,
                        'Content-Type':
                          'application/json',
                      },
                      body: JSON.stringify({
                        workAuthorization: {
                          requireSponsorship,
                          authorizedToWork,
                          excludedCompanies,
                          priorityCompanies,
                        },
                      }),
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data.error ||
                        'Unable to save your work authorization settings.'
                    );
                  }

                  const saved = {
                    requireSponsorship:
                      data.workAuthorization
                        ?.requireSponsorship || '',
                    authorizedToWork:
                      data.workAuthorization
                        ?.authorizedToWork || '',
                    excludedCompanies:
                      Array.isArray(
                        data.workAuthorization
                          ?.excludedCompanies
                      )
                        ? [
                            ...data.workAuthorization
                              .excludedCompanies,
                          ]
                        : [],
                    priorityCompanies:
                      Array.isArray(
                        data.workAuthorization
                          ?.priorityCompanies
                      )
                        ? [
                            ...data.workAuthorization
                              .priorityCompanies,
                          ]
                        : [],
                  };

                  setRequireSponsorship(
                    saved.requireSponsorship
                  );
                  setAuthorizedToWork(
                    saved.authorizedToWork
                  );
                  setExcludedCompanies(
                    saved.excludedCompanies
                  );
                  setPriorityCompanies(
                    saved.priorityCompanies
                  );
                  setSavedWorkAuthorization(saved);
                  setIsEditingWorkAuthorization(false);
                  setWorkAuthorizationMessage(
                    'Work authorization settings updated successfully.'
                  );
                } catch (error) {
                  setWorkAuthorizationError(
                    error.message ||
                      'Unable to save your work authorization settings.'
                  );
                } finally {
                  setIsSavingWorkAuthorization(false);
                }
              }}
              className="max-w-4xl space-y-8 animate-fadeIn"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Location & Work Authorization
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    These details are based on your onboarding answers.
                  </p>
                </div>

                {!isEditingWorkAuthorization && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingWorkAuthorization(true);
                      setWorkAuthorizationError('');
                      setWorkAuthorizationMessage('');
                    }}
                    className="px-5 py-2.5 text-sm font-semibold text-[#1E50C3] border border-[#1E50C3] rounded-xl hover:bg-blue-50 transition-all"
                  >
                    Edit
                  </button>
                )}
              </div>

              {workAuthorizationError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {workAuthorizationError}
                </div>
              )}

              {workAuthorizationMessage && (
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {workAuthorizationMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                  Will you now or in the future require sponsorship?
                </label>

                <StyledSelect
                  value={requireSponsorship}
                  onChange={setRequireSponsorship}
                  options={[
                    'No',
                    'Yes',
                    'Not currently, but may require it in the future',
                    'Not sure',
                  ]}
                  className="max-w-md"
                  disabled={
                    !isEditingWorkAuthorization
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="authorizedToWork"
                  className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2"
                >
                  What is your current work authorization status?
                </label>

                <textarea
                  id="authorizedToWork"
                  value={authorizedToWork}
                  disabled={!isEditingWorkAuthorization}
                  onChange={(e) =>
                    setAuthorizedToWork(e.target.value)
                  }
                  rows={3}
                  className={`w-full max-w-2xl resize-none px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                    !isEditingWorkAuthorization
                      ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500'
                      : 'border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#1E50C3] focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                  Companies you <strong>DO NOT</strong> want us to apply to
                </label>

                <div className="max-w-md">
                  <TagList
                    items={excludedCompanies}
                    onRemove={setExcludedCompanies}
                    placeholder="Add a company..."
                    disabled={
                      !isEditingWorkAuthorization
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                  Priority Company(s) of Interests (e.g. Apple, Microsoft)
                </label>

                <div className="max-w-md">
                  <TagList
                    items={priorityCompanies}
                    onRemove={setPriorityCompanies}
                    placeholder="Add a company..."
                    disabled={
                      !isEditingWorkAuthorization
                    }
                  />
                </div>
              </div>

              {isEditingWorkAuthorization && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    disabled={isSavingWorkAuthorization}
                    onClick={() => {
                      if (savedWorkAuthorization) {
                        setRequireSponsorship(
                          savedWorkAuthorization
                            .requireSponsorship
                        );
                        setAuthorizedToWork(
                          savedWorkAuthorization
                            .authorizedToWork
                        );
                        setExcludedCompanies([
                          ...savedWorkAuthorization
                            .excludedCompanies,
                        ]);
                        setPriorityCompanies([
                          ...savedWorkAuthorization
                            .priorityCompanies,
                        ]);
                      }

                      setIsEditingWorkAuthorization(false);
                      setWorkAuthorizationError('');
                      setWorkAuthorizationMessage('');
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingWorkAuthorization}
                    className="inline-flex min-w-[170px] items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#1E50C3] hover:bg-[#1A45A7] rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingWorkAuthorization ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      'Save Authorization'
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════
           *  TAB 4: PASSWORD & SECURITY
           *  API: PUT /api/auth/update-password
           *  API: DELETE /api/users/account
           * ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'Password & Security' && (
            <div className="max-w-4xl space-y-12 animate-fadeIn">

              {/* Update Password Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPasswordError('');
                  setPasswordMessage('');

                  if (!currentPassword) {
                    setPasswordError(
                      'Please enter your current password.'
                    );
                    return;
                  }

                  if (newPassword.length < 8) {
                    setPasswordError(
                      'New password must be at least 8 characters.'
                    );
                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    setPasswordError(
                      'New passwords do not match.'
                    );
                    return;
                  }

                  if (currentPassword === newPassword) {
                    setPasswordError(
                      'New password must differ from current password.'
                    );
                    return;
                  }

                  setIsUpdatingPassword(true);

                  try {
                    const supabase = createClient();

                    const { error } =
                      await supabase.auth.updateUser({
                        password: newPassword,
                        current_password: currentPassword,
                      });

                    if (error) {
                      throw error;
                    }

                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setPasswordMessage(
                      'Password updated successfully.'
                    );
                  } catch (error) {
                    const message =
                      error?.message ||
                      'Unable to update your password.';

                    if (
                      /current.*password|password.*incorrect|invalid.*password/i.test(
                        message
                      )
                    ) {
                      setPasswordError(
                        'Your current password is incorrect.'
                      );
                    } else {
                      setPasswordError(message);
                    }
                  } finally {
                    setIsUpdatingPassword(false);
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    Enter Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </div>

                {passwordError && (
                  <div className="col-span-1 md:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-600 font-medium">
                      {passwordError}
                    </p>
                  </div>
                )}

                {passwordMessage && (
                  <div className="col-span-1 md:col-span-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                    <p className="text-sm text-green-700 font-medium">
                      {passwordMessage}
                    </p>
                  </div>
                )}

                <div className="col-span-1 md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="inline-flex min-w-[165px] items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#1E50C3] hover:bg-[#1A45A7] rounded-xl hover:shadow-lg hover:shadow-blue-500/10 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>

              {/* ── Delete Account Section ── */}
              <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Delete Account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-3xl">
                  We&apos;re sorry to see you go. Deleting your account will permanently remove your profile,
                  applications, and stored data from our system. You can reactivate your account within 14 days.
                </p>

                <div className="flex items-center gap-3 mb-6">
                  <input
                    id="deleteConfirm"
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    className="w-4 h-4 text-[#1E50C3] border-gray-300 rounded focus:ring-[#1E50C3]"
                  />
                  <label htmlFor="deleteConfirm" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    I confirm that I want to delete my account
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={!deleteConfirmed}
                    onClick={() => {
                      if (!deleteConfirmed) return;

                      // TODO(Backend): DELETE /api/users/account
                      // Security: Require password re-entry or 2FA before deletion.
                      // Security: Soft-delete first, hard-delete after 14-day grace period.
                      // Security: Revoke all active sessions upon deletion.
                      const confirmed = window.confirm(
                        'This action cannot be undone. Are you sure you want to delete your account?'
                      );
                      if (confirmed) {
                        console.log('Account deletion confirmed by user');
                      }
                    }}
                    className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all ${
                      deleteConfirmed
                        ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                        : 'bg-red-300 cursor-not-allowed'
                    }`}
                  >
                    Delete Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // TODO(Backend): Open support channel or navigate to /support
                      window.open('mailto:support@applyloop.com', '_blank');
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}