import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const ROLE_LABEL = { employee: 'Employee', manager: 'Manager (L1)', admin: 'Admin / HR' };
const SEEN_KEY = 'aq_tour_seen_v1';

// A portal account signs in through Microsoft Entra ID and gets the extensive,
// page-by-page guided tour. Local quick-login accounts get the short tour.
export const isPortalAccount = (user) => user?.auth_provider === 'entra';

/* ---------------------------------------------------------------------------
 * Short tour — single page (dashboard), used for local quick-login accounts.
 * ------------------------------------------------------------------------- */
const SHORT_COPY = {
  employee: {
    hero: 'Your weighted progress ring for the latest open quarter, plus the active performance cycle.',
    stats: 'At a glance — your goal sheet status, how many goals you have defined (max 8), and this quarter’s progress.',
    action: 'Open your goal sheet to create goals, set targets and weightages totalling 100%, then submit for manager approval.',
    actionTitle: 'Manage your goal sheet',
  },
  manager: {
    hero: 'Your team’s average weighted progress for the latest open quarter.',
    stats: 'Team size, sheets awaiting your approval, how many are approved, and the team’s average progress.',
    action: 'Open My Team to review and approve submitted goal sheets, edit targets inline, and run quarterly check-ins.',
    actionTitle: 'Your team',
  },
  admin: {
    hero: 'Org-wide goal-setting completion — the share of sheets that are approved and locked.',
    stats: 'Total goal sheets, how many await approval, how many are locked, and how many are still draft or returned.',
    action: 'From here manage the performance cycle, export achievement reports, and run rule-based escalation checks.',
    actionTitle: 'Admin tools',
  },
};

function shortSteps(role) {
  const c = SHORT_COPY[role] || SHORT_COPY.employee;
  return [
    {
      popover: {
        title: 'Welcome to the Atomberg Goal Portal',
        description: `You’re signed in as <b>${ROLE_LABEL[role] || 'Employee'}</b>. This quick tour walks through the key parts of your workspace. Use Next to step through, or press Esc to skip.`,
      },
    },
    {
      element: '[data-tour="sidebar"]',
      popover: { title: 'Navigation', description: 'Jump between sections from here. Your menu is scoped to your role.', side: 'right', align: 'start' },
    },
    {
      element: '[data-tour="hero"]',
      popover: { title: 'Your snapshot', description: c.hero, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="stats"]',
      popover: { title: 'Key metrics', description: c.stats, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="primary-action"]',
      popover: { title: c.actionTitle, description: c.action, side: 'top', align: 'start' },
    },
    {
      popover: {
        title: 'You’re all set',
        description: 'Explore at your own pace. Replay this tour any time from the <b>Take a tour</b> button in the header.',
      },
    },
  ];
}

/* ---------------------------------------------------------------------------
 * Extensive tour — walks every page for the role. Used for portal accounts.
 * ------------------------------------------------------------------------- */
const PAGE_TOUR = {
  employee: [
    { path: '/my-goals', title: 'My Goal Sheet', description: 'Your goal sheet. Create goals across thrust areas, pick a Unit of Measurement — Numeric ↑/↓, %, Timeline, or Zero — and set targets and weightages totalling 100%. Once approved, log your quarterly actual achievement here; the portal computes the progress score for every UoM formula automatically.' },
    { path: '/audit', title: 'Activity Log', description: 'Every change to your goals, with who made it and when. Edits applied after the sheet is locked are flagged for transparency.' },
  ],
  manager: [
    { path: '/my-goals', title: 'My Goal Sheet', description: 'Managers set goals too — your own goal sheet works exactly like an employee’s and is approved by your skip-level.' },
    { path: '/team', title: 'My Team', description: 'Review and approve submitted goal sheets, edit targets and weightages inline during approval, run quarterly check-ins with a structured comment, and track every direct report’s progress.' },
    { path: '/shared-goals', title: 'Shared Goals', description: 'Push a departmental KPI to multiple employees at once. Recipients can adjust only their weightage — the title and target stay locked — and achievement syncs from the origin goal.' },
    { path: '/reports', title: 'Reports & Governance', description: 'Export the Achievement Report (Planned vs Actual) as CSV, and view the Completion Dashboard showing who has finished each quarterly check-in.' },
    { path: '/analytics', title: 'Analytics', description: 'Quarter-on-Quarter achievement trends, goal distribution by thrust area / UoM / status, and a manager-effectiveness comparison of check-in completion rates.' },
    { path: '/audit', title: 'Audit Trail', description: 'The full change history across your team, with any post-lock edits clearly flagged.' },
  ],
  admin: [
    { path: '/team', title: 'Goal Sheets', description: 'Every employee’s goal sheet org-wide. Admins can unlock a locked sheet for correction — the exception-handling path.' },
    { path: '/shared-goals', title: 'Shared Goals', description: 'Push organisation-wide KPIs to any group of employees, with weightage-only edits for recipients.' },
    { path: '/reports', title: 'Reports & Governance', description: 'Export the org-wide Achievement Report as CSV and monitor the Completion Dashboard across every team.' },
    { path: '/analytics', title: 'Analytics', description: 'Quarter-on-Quarter trends by individual, team and department, goal distribution breakdowns, and manager-effectiveness comparisons.' },
    { path: '/escalations', title: 'Escalations', description: 'Rule-based checks for overdue goal submission, pending approvals, and missed check-ins. Run the rules to raise L1/L2/L3 escalations and resolve them.' },
    { path: '/notifications', title: 'Notifications', description: 'Every email and Microsoft Teams notification dispatched by the portal, with delivery status — submissions, approvals, returns and check-in reminders.' },
    { path: '/cycle', title: 'Cycle Administration', description: 'Configure the performance cycle: financial year, the goal-setting window, and the four quarterly check-in windows.' },
    { path: '/settings', title: 'Integrations', description: 'Configure the Microsoft Teams webhook in-app, and view Entra ID SSO and SMTP email connection status.' },
    { path: '/audit', title: 'Audit Trail', description: 'The complete org-wide change log — the audit-ready record for compliance.' },
  ],
};

function startExtensiveTour(role, navigate) {
  const pages = PAGE_TOUR[role] || PAGE_TOUR.employee;
  let d;

  const advanceTo = (path) => {
    navigate(path);
    setTimeout(() => d.moveNext(), 600);
  };

  const steps = [
    {
      popover: {
        title: 'Guided product tour',
        description: `Welcome. You’re signed in as <b>${ROLE_LABEL[role] || 'Employee'}</b>. This guided tour visits every section available to your role and explains what each one does. Press Next to begin, or Esc to exit at any time.`,
      },
    },
    {
      element: '[data-tour="sidebar"]',
      popover: { title: 'Navigation', description: 'Your menu — scoped to your role. The tour will open each section in turn.', side: 'right', align: 'start' },
    },
    {
      element: '[data-tour="hero"]',
      popover: { title: 'Dashboard snapshot', description: 'The dashboard headlines your performance for the active cycle — a progress ring for the latest open quarter.', side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="stats"]',
      popover: {
        title: 'Key metrics',
        description: 'Headline numbers for your role. Next, the tour opens each working section.',
        side: 'bottom',
        align: 'start',
        onNextClick: () => advanceTo(pages[0].path),
      },
    },
    ...pages.map((p, i) => ({
      element: '[data-tour="page"]',
      popover: {
        title: p.title,
        description: p.description,
        side: 'top',
        align: 'start',
        onNextClick: () => {
          const next = pages[i + 1];
          if (next) advanceTo(next.path);
          else { navigate('/dashboard'); setTimeout(() => d.moveNext(), 500); }
        },
      },
    })),
    {
      popover: {
        title: 'Tour complete',
        description: 'You’ve seen every section for your role. Explore freely, switch roles from the sign-in screen, and replay this tour any time from <b>Take a tour</b> in the header.',
      },
    },
  ];

  d = driver({
    showProgress: true,
    showButtons: ['next', 'close'],
    overlayColor: '#0b0f19',
    nextBtnText: 'Next',
    doneBtnText: 'Finish',
    steps,
  });
  d.drive();
}

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------- */

// Starts the product tour. Portal accounts get the extensive page-by-page tour;
// pass { extensive: true, navigate } for it. Otherwise the short dashboard tour.
export function startTour(role, { extensive = false, navigate } = {}) {
  if (extensive && navigate) {
    navigate('/dashboard');
    setTimeout(() => startExtensiveTour(role, navigate), 500);
    return;
  }
  const steps = shortSteps(role).filter(
    (s) => !s.element || document.querySelector(s.element),
  );
  driver({
    showProgress: true,
    overlayColor: '#0b0f19',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Got it',
    steps,
  }).drive();
}

// Runs the tour once per browser on first visit.
export function maybeAutoStartTour(user, navigate) {
  if (!user || localStorage.getItem(SEEN_KEY)) return;
  localStorage.setItem(SEEN_KEY, '1');
  const extensive = isPortalAccount(user);
  setTimeout(() => startTour(user.role, { extensive, navigate }), 500);
}
