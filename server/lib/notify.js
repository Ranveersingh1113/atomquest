// Event-driven notifications for key goal lifecycle events (problem statement 5.2).
// Each event fans out to email (employee/manager/HR) and a Teams card with a
// deep link straight to the relevant goal sheet. Fire-and-forget — a failed
// notification never blocks the underlying API request.
import db from '../db.js';
import { config } from './config.js';
import { sendEmail, sendTeams } from './integrations.js';

const userById = id => db.prepare('SELECT * FROM users WHERE id=?').get(id);
const deepLink = sheetId => `${config.appBaseUrl}/sheet/${sheetId}`;

function dispatch({ event, emailTo, subject, body, teamsTitle, link }) {
  for (const to of emailTo.filter(Boolean))
    sendEmail({ to, subject, text: body, event, link }).catch(() => {});
  sendTeams({ title: teamsTitle || subject, text: body, event, link }).catch(() => {});
}

// Employee submits a goal sheet → notify the reporting manager.
export function onGoalSubmitted(sheetId) {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(sheetId);
  if (!sheet) return;
  const emp = userById(sheet.employee_id);
  const mgr = emp.manager_id ? userById(emp.manager_id) : null;
  dispatch({
    event: 'goal_submitted',
    emailTo: [mgr?.email],
    subject: `Goal sheet submitted for review — ${emp.name}`,
    teamsTitle: `${emp.name} submitted their goal sheet`,
    body: `${emp.name} (${emp.department}) has submitted their goal sheet for the active cycle and is awaiting your approval.`,
    link: deepLink(sheetId),
  });
}

// Manager approves a sheet → notify the employee.
export function onGoalApproved(sheetId) {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(sheetId);
  if (!sheet) return;
  const emp = userById(sheet.employee_id);
  dispatch({
    event: 'goal_approved',
    emailTo: [emp.email],
    subject: 'Your goal sheet has been approved',
    teamsTitle: `${emp.name}'s goal sheet was approved`,
    body: `Your goal sheet has been approved and locked for the active cycle. You can now log quarterly achievement against each goal.`,
    link: deepLink(sheetId),
  });
}

// Manager returns a sheet for rework → notify the employee with the comment.
export function onGoalReturned(sheetId, comment) {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(sheetId);
  if (!sheet) return;
  const emp = userById(sheet.employee_id);
  dispatch({
    event: 'goal_returned',
    emailTo: [emp.email],
    subject: 'Your goal sheet was returned for rework',
    teamsTitle: `${emp.name}'s goal sheet needs rework`,
    body: `Your manager returned your goal sheet for rework.\n\nComment: ${comment}`,
    link: deepLink(sheetId),
  });
}

// Check-in reminder for a quarter → notify employee + manager.
export function onCheckinReminder(sheetId, quarter) {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(sheetId);
  if (!sheet) return;
  const emp = userById(sheet.employee_id);
  const mgr = emp.manager_id ? userById(emp.manager_id) : null;
  dispatch({
    event: 'checkin_reminder',
    emailTo: [emp.email, mgr?.email],
    subject: `${quarter} check-in reminder — ${emp.name}`,
    teamsTitle: `${quarter} check-in due — ${emp.name}`,
    body: `The ${quarter} check-in window is open. Please record ${quarter} achievement and complete the manager check-in.`,
    link: deepLink(sheetId),
  });
}
