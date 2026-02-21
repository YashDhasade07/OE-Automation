// tasks/task_05_org_summary/report.js

function fmt(value) {
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  export function buildReport(orgReports) {
    const runTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const divider = '='.repeat(60);
    const lines   = [
      divider,
      `  TASK: task_05_org_summary`,
      `  Run at: ${runTime}`,
      `  Organizations: ${orgReports.length}`,
      divider,
    ];
  
    for (const org of orgReports) {
      lines.push(``);
      lines.push(`  ┌─ ${org.organizationName ?? org.organizationId}`);
      lines.push(`  │  Org ID: ${org.organizationId}`);
      lines.push(`  │`);
  
      if (org.error) {
        lines.push(`  │  ❌ FAILED: ${org.error}`);
        lines.push(`  └${'─'.repeat(50)}`);
        continue;
      }
  
      // YTD Cost
      lines.push(`  │  💰 YTD Cost (${org.ytd.startDate} → ${org.ytd.endDate})`);
      lines.push(`  │     Total: ${fmt(org.ytd.totalCost)}`);
      if (org.ytd.asOf) {
        lines.push(`  │     As of: ${org.ytd.asOf}`);
      }
      lines.push(`  │`);
  
      // Insights
      lines.push(`  │  🔍 Insights Potential Savings`);
      for (const i of org.insights.breakdown) {
        lines.push(`  │     ${i.priority.padEnd(8)} — ${i.count} insight(s) — savings: ${fmt(i.savings)}`);
      }
      lines.push(`  │     Monthly Total  : ${fmt(org.insights.totalMonthlySavings)}`);
      lines.push(`  │     Annualised     : ${fmt(org.insights.annualisedSavings)}`);
      lines.push(`  │`);
  
      // Elasticity Agent
      lines.push(`  │  ⚡ Elasticity Agent Savings`);
      lines.push(`  │     Scheduled Instances: ${org.elasticity.instanceCount}`);
      lines.push(`  │     Monthly Savings    : ${fmt(org.elasticity.totalMonthlySavings)}`);
      lines.push(`  │     Annualised         : ${fmt(org.elasticity.annualisedSavings)}`);
  
      lines.push(`  └${'─'.repeat(50)}`);
    }
  
    lines.push(``);
    lines.push(divider);
    return lines.join('\n');
  }
  