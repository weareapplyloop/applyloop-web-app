import {
  FiHome,
  FiUsers,
  FiFileText,
  FiClipboard,
  FiCheckSquare,
  FiBarChart2,
  FiSettings,
  FiDollarSign,
  FiLayers,
  FiAlertTriangle,
  FiBriefcase,
  FiCreditCard,
  FiActivity,
  FiMessageSquare,
} from 'react-icons/fi';

export const USER_ROLES = {
  USER_CLIENT: 'user_client',
  APPLICANT: 'applicant',
  CHIEF_APPLICANT: 'chief_applicant',
  PROMPT_ENGINEER: 'prompt_engineer',
  TEAM_AUDITOR: 'team_auditor',
  CHIEF_AUDITOR: 'chief_auditor',
  OWNER: 'owner',
  OPERATIONS: 'operations',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [USER_ROLES.USER_CLIENT]: 'User/Client',
  [USER_ROLES.APPLICANT]: 'Applicant',
  [USER_ROLES.CHIEF_APPLICANT]: 'Chief Applicant',
  [USER_ROLES.PROMPT_ENGINEER]: 'Prompt Engineer',
  [USER_ROLES.TEAM_AUDITOR]: 'Team Auditor',
  [USER_ROLES.CHIEF_AUDITOR]: 'Chief Auditor',
  [USER_ROLES.OWNER]: 'Owner',
  [USER_ROLES.OPERATIONS]: 'Operations',
  [USER_ROLES.ADMIN]: 'Administrator',
};

export const ROLE_SLUGS = {
  [USER_ROLES.APPLICANT]: 'applicant',
  [USER_ROLES.CHIEF_APPLICANT]: 'chief-applicant',
  [USER_ROLES.PROMPT_ENGINEER]: 'prompt-engineer',
  [USER_ROLES.TEAM_AUDITOR]: 'team-auditor',
  [USER_ROLES.CHIEF_AUDITOR]: 'chief-auditor',
  [USER_ROLES.OWNER]: 'owner',
  [USER_ROLES.OPERATIONS]: 'operations',
  [USER_ROLES.ADMIN]: 'admin',
};

export const ROLE_FROM_SLUG = Object.fromEntries(
  Object.entries(ROLE_SLUGS).map(([role, slug]) => [slug, role])
);

export const getRoleHome = (role) => {
  if (role === USER_ROLES.USER_CLIENT) return '/onboarding';
  if (!role) return '/dashboard';
  return `/${ROLE_SLUGS[role] || 'dashboard'}`;
};

const withBase = (base, items) => items.map((item) => ({
  ...item,
  href: item.href ? `/${base}/${item.href}` : `/${base}`,
}));

export const ROLE_NAVIGATION = {
  [USER_ROLES.APPLICANT]: withBase('applicant', [
    { label: 'Dashboard', href: '', icon: FiHome },
    { label: 'My Clients', href: 'clients', icon: FiUsers },
    { label: 'Workshop', href: 'workshop', icon: FiClipboard },
    { label: 'Feedback and Messages', href: 'feedback', icon: FiMessageSquare },
    { label: 'Performance', href: 'performance', icon: FiBarChart2 },
    { label: 'Settings', href: 'settings', icon: FiSettings },
  ]),
  [USER_ROLES.CHIEF_APPLICANT]: withBase('chief-applicant', [
    { label: 'Dashboard', href: '', icon: FiHome },
    { label: 'Team Overview', href: 'team', icon: FiUsers },
    { label: 'Clients Assignment', href: 'clients', icon: FiBriefcase },
    { label: 'Workshop', href: 'workshop', icon: FiMessageSquare },
    { label: 'Application Review', href: 'review', icon: FiClipboard },
    { label: 'Deadlines & Escalations', href: 'deadlines', icon: FiAlertTriangle },
    { label: 'Feedbacks & Approvals', href: 'feedback', icon: FiMessageSquare },
    { label: 'Performance Analytics', href: 'performance', icon: FiBarChart2 },
    { label: 'Profile and Settings', href: 'settings', icon: FiSettings },
  ]),
  [USER_ROLES.PROMPT_ENGINEER]: withBase('prompt-engineer', [
    { label: 'Dashboard', href: '', icon: FiHome },
    { label: 'My Tasks', href: 'tasks', icon: FiClipboard },
    { label: 'Task History', href: 'history', icon: FiCheckSquare },
    { label: 'Quality Insights', href: 'insights', icon: FiBarChart2 },
    { label: 'Messages', href: 'messages', icon: FiMessageSquare },
  ]),
  [USER_ROLES.TEAM_AUDITOR]: withBase('team-auditor', [
    { label: 'Dashboard', href: '', icon: FiHome },
    { label: 'Audit Queue', href: 'queue', icon: FiClipboard },
    { label: 'My Reviews', href: 'reviews', icon: FiCheckSquare },
    { label: 'Escalations', href: 'escalations', icon: FiAlertTriangle },
    { label: 'Team Quality', href: 'quality', icon: FiBarChart2 },
    { label: 'Activity Log', href: 'activity', icon: FiActivity },
  ]),
  [USER_ROLES.CHIEF_AUDITOR]: withBase('chief-auditor', [
    { label: 'Dashboard', href: '', icon: FiHome },
    { label: 'Audit Operations', href: 'audits', icon: FiClipboard },
    { label: 'Auditors', href: 'auditors', icon: FiUsers },
    { label: 'Escalations', href: 'escalations', icon: FiAlertTriangle },
    { label: 'Quality Analytics', href: 'quality', icon: FiBarChart2 },
    { label: 'Reports', href: 'reports', icon: FiFileText },
  ]),
    [USER_ROLES.ADMIN]: withBase('admin', [
    { label: 'Client Management', href: '', icon: FiUsers },
  ]),
  [USER_ROLES.OWNER]: withBase('owner', [
    { label: 'Overview', href: '', icon: FiHome },
    { label: 'User Management', href: 'users', icon: FiUsers },
    { label: 'Applications', href: 'applications', icon: FiBriefcase },
    { label: 'Operations', href: 'operations', icon: FiLayers },
    { label: 'Subscriptions', href: 'subscriptions', icon: FiCreditCard },
    { label: 'Revenue', href: 'revenue', icon: FiDollarSign },
    { label: 'Audit & Quality', href: 'quality', icon: FiCheckSquare },
    { label: 'Reports', href: 'reports', icon: FiFileText },
    { label: 'Settings', href: 'settings', icon: FiSettings },
  ]),
  [USER_ROLES.OPERATIONS]: withBase('operations', [
    { label: 'Client Management', href: 'client-management', icon: FiUsers },
    { label: 'Applicants Management', href: 'applicants-management', icon: FiBriefcase },
    { label: 'Chief Applicants', href: 'chief-applicants', icon: FiUsers },
    { label: 'Application Operations', href: 'application-operations', icon: FiFileText },
  ]),
};

export const ROLE_DEMO_USERS = {
  [USER_ROLES.USER_CLIENT]: {
    name: 'Olabanji David T.',
    email: 'banjidhevid216@gmail.com',
    role: USER_ROLES.USER_CLIENT,
  },
  [USER_ROLES.APPLICANT]: {
    name: 'Olabanji David T.',
    email: 'banjidhevid216@gmail.com',
    role: USER_ROLES.APPLICANT,
  },
  [USER_ROLES.CHIEF_APPLICANT]: {
    name: 'Team Lead',
    email: 'administrator@applyloop.com',
    role: USER_ROLES.CHIEF_APPLICANT,
  },
  [USER_ROLES.PROMPT_ENGINEER]: {
    name: 'Daniel Okafor',
    email: 'daniel@applyloop.com',
    role: USER_ROLES.PROMPT_ENGINEER,
  },
  [USER_ROLES.TEAM_AUDITOR]: {
    name: 'Sophia Martins',
    email: 'sophia@applyloop.com',
    role: USER_ROLES.TEAM_AUDITOR,
  },
  [USER_ROLES.CHIEF_AUDITOR]: {
    name: 'Michael Adeyemi',
    email: 'michael@applyloop.com',
    role: USER_ROLES.CHIEF_AUDITOR,
  },
  [USER_ROLES.OWNER]: {
    name: 'ApplyLoop Owner',
    email: 'owner@applyloop.com',
    role: USER_ROLES.OWNER,
  },
  [USER_ROLES.OPERATIONS]: {
    name: 'Operations Manager',
    email: 'operations@applyloop.com',
    role: USER_ROLES.OPERATIONS,
  },
};

export const ROLE_PAGE_META = {
  [USER_ROLES.APPLICANT]: {
    dashboard: ['Dashboard', 'Review clients, applications, and feedback.'],
    clients: ['My Clients', 'Review assigned client profiles and application progress.'],
    workshop: ['Workshop', 'Analyze job fit and create tailored application documents.'],
    feedback: ['Feedback and Messages', 'Review client and admin feedback.'],
    performance: ['Performance', 'Track application outcomes and client satisfaction.'],
    settings: ['Settings', 'Manage profile, security, and notifications.'],
  },
  [USER_ROLES.CHIEF_APPLICANT]: {
    dashboard: ['Dashboard', "Welcome back! Here's your team's overview"],
    team: ['Team Overview', "Monitor your team's performance and availability"],
    clients: ['Clients Assignments', 'Assign and manage client workload distribution'],
    workshop: ['Prompt Center', 'Analyze job fit, generate tailored resumes and cover letters'],
    review: ['Application Review', 'Review and approve submitted applications'],
    deadlines: ['Deadlines & Escalations', 'Monitor critical deadlines and manage escalated issues'],
    feedback: ['Feedback & Approvals', 'Review client feedback and approve applications'],
    performance: ['Performance Analytics', 'Track your team performance and quality metrics'],
    settings: ['Profile & Settings', 'manage your account setting and preference'],
  },
  [USER_ROLES.PROMPT_ENGINEER]: {
    dashboard: ['Prompt Workspace', 'Build and improve tailored job-application prompts.'],
    tasks: ['My Tasks', 'Work through assigned resume and cover-letter tasks.'],
    history: ['Task History', 'Review completed, returned, and approved tasks.'],
    insights: ['Quality Insights', 'Track prompt quality, acceptance, and turnaround time.'],
    messages: ['Messages', 'Communicate with applicants and auditors.'],
  },
  [USER_ROLES.TEAM_AUDITOR]: {
    dashboard: ['Audit Dashboard', 'Review application quality and keep your queue moving.'],
    queue: ['Audit Queue', 'Prioritize and review submissions awaiting an audit.'],
    reviews: ['My Reviews', 'Track completed reviews and quality decisions.'],
    escalations: ['Escalations', 'Resolve high-risk or disputed quality issues.'],
    quality: ['Team Quality', 'Monitor recurring issues and prompt-engineer quality.'],
    activity: ['Activity Log', 'Review decisions and changes across the audit team.'],
  },
  [USER_ROLES.CHIEF_AUDITOR]: {
    dashboard: ['Audit Control Center', 'Monitor quality, queues, auditors, and escalations.'],
    audits: ['Audit Operations', 'Manage audit workload and review progress.'],
    auditors: ['Auditor Management', 'Track capacity, performance, and assignments.'],
    escalations: ['Escalations', 'Review disputes and critical quality issues.'],
    quality: ['Quality Analytics', 'Analyze defect patterns and team-wide quality.'],
    reports: ['Audit Reports', 'Create and export audit performance reports.'],
  },

  [USER_ROLES.ADMIN]: {
    dashboard: [
      'Client Management',
      'Create and manage ApplyLoop client accounts.',
    ],
  },

  [USER_ROLES.OWNER]: {
    dashboard: ['Overview', 'Monitor ApplyLoop operations, growth, and service health.'],
    users: ['User Management', 'Manage staff, applicants, roles, and access.'],
    applications: ['Applications', 'Track application volume and outcomes across the platform.'],
    operations: ['Operations', 'Monitor team workload and process performance.'],
    subscriptions: ['Subscriptions', 'Manage plans, renewals, and account status.'],
    revenue: ['Revenue', 'Review revenue, plan mix, and billing performance.'],
    quality: ['Audit & Quality', 'Track review quality, defects, and escalations.'],
    reports: ['Reports', 'Generate operational and commercial reports.'],
    settings: ['Platform Settings', 'Manage global preferences and service rules.'],
  },
  [USER_ROLES.OPERATIONS]: {
    'client-management': ['Client Management', 'Manage client accounts, statuses, plans, and assignments.'],
    'applicants-management': ['Applicants Management', 'Manage applicants, workload, availability, and performance.'],
    'chief-applicants': ['Chief Applicants', 'Review chief applicant teams and operational performance.'],
    'application-operations': ['Application Operations', 'Manage assignments, priorities, deadlines, and application progress.'],
  },
};
