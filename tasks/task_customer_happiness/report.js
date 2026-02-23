// tasks/task_customer_happiness/report.js

function fmt(value) {
    if (value === null || value === undefined) return 'N/A';
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  function statusIcon(status) {
    if (status === 'Pass') return '✅';
    if (status === 'Fail') return '❌';
    if (status === 'ERR')  return '⚠️ ';
    return '➖ '; // N/A
  }
  
  function pad(str, len) {
    return String(str).padEnd(len);
  }
  
  export function buildReport(region, orgReports) {
    const runTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const dateStr = new Date().toISOString().slice(0, 10);
    const D       = '═'.repeat(64);
    const d       = '─'.repeat(64);
  
    const lines = [
      D,
      `  CUSTOMER HAPPINESS REPORT`,
      `  Region : ${region.toUpperCase()}`,
      `  Date   : ${dateStr}  |  Run at: ${runTime}`,
      `  Orgs   : ${orgReports.length}`,
      D,
      ``,
    ];
  
    for (const org of orgReports) {
      const name = org.organizationName ?? org.organizationId;
  
      lines.push(`╔${D}`);
      lines.push(`║  ${name}`);
      lines.push(`║  Org ID : ${org.organizationId}`);
      lines.push(`╠${D}`);
  
      // ── Failed to fetch entirely ──────────────────────────
      if (org.fatalError) {
        lines.push(`║  ⚠️  COULD NOT FETCH DATA: ${org.fatalError}`);
        lines.push(`╚${D}`);
        lines.push(``);
        continue;
      }
  
      // ── SECTION 1: Sheet-ready values ─────────────────────
      lines.push(`║  📋 SHEET VALUES  (copy directly into Customer Happiness sheet)`);
      lines.push(`║  ${d}`);
      lines.push(`║  ${statusIcon(org.awsCUR)}  ${pad('AWS CUR Ingest', 28)} │  ${org.awsCUR}`);
      lines.push(`║  ${statusIcon(org.azureCUR)}  ${pad('Azure CUR Ingest', 28)} │  ${org.azureCUR}`);
      lines.push(`║  ${statusIcon(org.gcpCUR)}  ${pad('GCP CUR Ingest', 28)} │  ${org.gcpCUR}`);
      lines.push(`║  ${statusIcon(org.anomalyRun)}  ${pad('Anomaly Run', 28)} │  ${org.anomalyRun}`);
      lines.push(`║  ${statusIcon(org.insights)}  ${pad('Insights', 28)} │  ${org.insights}`);
      lines.push(`║  ${statusIcon(org.accountRefresh)}  ${pad('Account Refresh', 28)} │  ${org.accountRefresh}`);
      lines.push(`║  💰  ${pad('Current YTD', 28)} │  ${fmt(org.ytdCost)}`);
      lines.push(`║  💡  ${pad('Annualised Insight Found', 28)} │  ${fmt(org.annualisedInsightSavings)}`);
      lines.push(`║  ⚡  ${pad('Elasticity Agent Savings', 28)} │  ${fmt(org.elasticityMonthlySavings)}`);
      lines.push(`║  👥  ${pad('Number of Users Logged In', 28)} │  ${org.uniqueSignInUsers}`);
      lines.push(`║  📊  ${pad('Number of Activities', 28)} │  ${org.totalActivity}`);
  
      // ── SECTION 2: Detail breakdown ────────────────────────
      lines.push(`║`);
      lines.push(`╠${D}`);
      lines.push(`║  🔍 DETAIL  (review if any field shows Fail or ⚠️)`);
      lines.push(`║  ${d}`);
  
      // CUR + Account Refresh detail
      if (org.curError) {
        lines.push(`║  [CUR / Account Refresh]  ⚠️  Fetch failed: ${org.curError}`);
      } else {
        lines.push(`║  [CUR / Account Refresh]`);
        const allAccounts = [
          ...(org.providerDetail?.aws   ?? []).map(p => ({ ...p, type: 'AWS'   })),
          ...(org.providerDetail?.azure ?? []).map(p => ({ ...p, type: 'AZURE' })),
          ...(org.providerDetail?.gcp   ?? []).map(p => ({ ...p, type: 'GCP'   })),
        ];
        if (allAccounts.length === 0) {
          lines.push(`║    No provider accounts found`);
        } else {
          for (const p of allAccounts) {
            const icon = p._staleness.status === 'OK' ? '✅' : '❌';
            lines.push(`║    ${icon} [${p.type}] ${p.accountName} — ${p._staleness.label}`);
          }
        }
      }
  
      lines.push(`║`);
  
      // Anomaly + Insights detail
      if (org.anomalyError) {
        lines.push(`║  [Anomaly / Insights]  ⚠️  Fetch failed: ${org.anomalyError}`);
      } else {
        lines.push(`║  [Anomaly Job]`);
        lines.push(`║    ${org.anomalyDetail}`);
        lines.push(`║  [Insights]`);
        lines.push(`║    Count in last 7 days: ${org.insightCount}`);
      }
  
      lines.push(`║`);
  
      // Financial detail
      if (org.financialsError) {
        lines.push(`║  [Financials]  ⚠️  Fetch failed: ${org.financialsError}`);
      } else {
        lines.push(`║  [Financials]`);
        lines.push(`║    YTD period : ${org.ytdStartDate} → ${org.ytdEndDate}`);
        lines.push(`║    YTD as of  : ${org.ytdAsOf ?? 'N/A'}`);
        if (org.insightsBreakdown?.length > 0) {
          for (const i of org.insightsBreakdown) {
            lines.push(`║    Insights ${pad(i.priority, 8)}: ${i.count} item(s) — ${fmt(i.savings)}`);
          }
        }
        lines.push(`║    Elasticity scheduled instances: ${org.elasticityInstanceCount}`);
      }
  
      lines.push(`║`);
  
      // User activity detail
      if (org.userActivityError) {
        lines.push(`║  [User Activity]  ⚠️  Fetch failed: ${org.userActivityError}`);
      } else {
        lines.push(`║  [User Activity — Today]`);
        lines.push(`║    Unique users signed in : ${org.uniqueSignInUsers}`);
        lines.push(`║    Total sign-in events   : ${org.signInCount}`);
        lines.push(`║    Total activities       : ${org.totalActivity}`);
      }
  
      lines.push(`╚${D}`);
      lines.push(``);
    }
  
    return lines.join('\n');
  }
  