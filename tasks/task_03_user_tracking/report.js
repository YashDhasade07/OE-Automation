// tasks/task_03_user_tracking/report.js

export function buildReport(region, results, orgIds, ignoreEmails) {
    const runTime     = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const todayStr    = new Date().toISOString().slice(0, 10);
    const divider     = '='.repeat(60);
  
    const totalActivity = results.reduce((sum, r) => sum + r.totalActivity, 0);
    const totalSignIns  = results.reduce((sum, r) => sum + r.signInCount, 0);
    const totalUniqueSignInUsers = results.reduce((sum, r) => sum + r.uniqueSignInUsers, 0);
  
    const lines = [
      divider,
      `  TASK: task_03_user_tracking`,
      `  REGION: ${region.toUpperCase()}  |  Run at: ${runTime}`,
      `  Date: ${todayStr}`,
      `  Monitoring: ${orgIds.length} org(s)`,
      `  Ignored Emails: ${ignoreEmails.length > 0 ? ignoreEmails.join(', ') : 'none'}`,
      divider,
      ``,
      `  OVERALL SUMMARY (Today)`,
      `  📊  Total Activity        : ${totalActivity}`,
      `  🔐  Total Sign-ins        : ${totalSignIns}`,
      `  👥  Unique Users Signed In: ${totalUniqueSignInUsers}`,
      `  🏢  Active Orgs Today     : ${results.length} / ${orgIds.length}`,
      ``,
    ];
  
    if (results.length === 0) {
      lines.push(`  No activity found today.`);
      lines.push(``);
      lines.push(divider);
      return lines.join('\n');
    }
  
    lines.push(`  ── PER ORGANIZATION ──────────────────────────────`);
    lines.push(``);
  
    for (const r of results) {
      lines.push(`  🏢  ${r.organizationName ?? 'Unknown Org'}`);
      lines.push(`      Org ID              : ${r.organizationId}`);
      lines.push(`      Total Activity Today: ${r.totalActivity}`);
      lines.push(`      Sign-ins Today      : ${r.signInCount}`);
      lines.push(`      Unique Users Signed In: ${r.uniqueSignInUsers}`);
  
      if (r.signInUsers && r.signInUsers.length > 0) {
        lines.push(`      Signed-in Users:`);
        for (const email of r.signInUsers.sort()) {
          lines.push(`        - ${email}`);
        }
      }
  
      lines.push(``);
    }
  
    // Flag orgs with zero activity
    const activeOrgIds = results.map(r => r.organizationId);
    const inactiveOrgIds = orgIds.filter(id => !activeOrgIds.includes(id));
    if (inactiveOrgIds.length > 0) {
      lines.push(`  ── NO ACTIVITY TODAY ─────────────────────────────`);
      for (const id of inactiveOrgIds) {
        lines.push(`  • Org ID: ${id}`);
      }
      lines.push(``);
    }
  
    lines.push(divider);
    return lines.join('\n');
  }
  