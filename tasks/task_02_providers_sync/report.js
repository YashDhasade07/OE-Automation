// tasks/task_02_providers_sync/report.js

const WARNING_DAYS  = 2;
const CRITICAL_DAYS = 3;

export function checkStaleness(lastProcessedTime) {
  if (!lastProcessedTime) {
    return { status: 'UNKNOWN', daysSince: null, label: 'Never processed' };
  }
  const diffMs    = Date.now() - new Date(lastProcessedTime).getTime();
  const daysSince = diffMs / (1000 * 60 * 60 * 24);

  if (daysSince >= CRITICAL_DAYS) {
    return { status: 'CRITICAL', daysSince: daysSince.toFixed(1), label: `${daysSince.toFixed(1)} days ago` };
  }
  if (daysSince >= WARNING_DAYS) {
    return { status: 'WARNING', daysSince: daysSince.toFixed(1), label: `${daysSince.toFixed(1)} days ago` };
  }
  return { status: 'OK', daysSince: daysSince.toFixed(1), label: `${daysSince.toFixed(1)} days ago` };
}

export function enrichProviders(providers) {
  return providers.map(p => ({
    ...p,
    _staleness: checkStaleness(p.lastProcessedTime),
  }));
}

export function buildReport(region, enrichedProviders, ignoredOrgIds) {
  const runTime   = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const divider   = '='.repeat(60);
  const total     = enrichedProviders.length;
  const ok        = enrichedProviders.filter(p => p._staleness.status === 'OK');
  const warnings  = enrichedProviders.filter(p => p._staleness.status === 'WARNING');
  const criticals = enrichedProviders.filter(p => p._staleness.status === 'CRITICAL');
  const unknowns  = enrichedProviders.filter(p => p._staleness.status === 'UNKNOWN');

  const lines = [
    divider,
    `  TASK: task_02_providers_sync`,
    `  REGION: ${region.toUpperCase()}  |  Run at: ${runTime}`,
    `  Filter: lastProcessedTime within last 7 days, syncFlagForReportConnection = true`,
    `  Ignored Org IDs: ${ignoredOrgIds.length > 0 ? ignoredOrgIds.join(', ') : 'none'}`,
    divider,
    ``,
    `  TOTAL PROVIDERS FETCHED: ${total}`,
    ``,
    `  SUMMARY`,
    `  ✅  OK       (< ${WARNING_DAYS} days)  : ${ok.length} provider(s)`,
    `  ⚠️   WARNING  (${WARNING_DAYS}-${CRITICAL_DAYS} days) : ${warnings.length} provider(s)`,
    `  🚨  CRITICAL (${CRITICAL_DAYS}+ days)  : ${criticals.length} provider(s)`,
    `  ❓  UNKNOWN  (no date)  : ${unknowns.length} provider(s)`,
    ``,
  ];

  if (criticals.length > 0) {
    lines.push(`  ── CRITICAL ──────────────────────────────────────`);
    for (const p of criticals) {
      lines.push(`  • [${p.organizationName ?? 'Unknown Org'}] ${p.accountName} (${p.cloudProvider})`);
      lines.push(`    Org ID        : ${p.organizationId}`);
      lines.push(`    Account No.   : ${p.accountNumber}`);
      lines.push(`    Last Processed: ${p.lastProcessedTime ?? 'N/A'}  ← ${p._staleness.label}`);
      lines.push(``);
    }
  }

  if (warnings.length > 0) {
    lines.push(`  ── WARNING ───────────────────────────────────────`);
    for (const p of warnings) {
      lines.push(`  • [${p.organizationName ?? 'Unknown Org'}] ${p.accountName} (${p.cloudProvider})`);
      lines.push(`    Org ID        : ${p.organizationId}`);
      lines.push(`    Account No.   : ${p.accountNumber}`);
      lines.push(`    Last Processed: ${p.lastProcessedTime ?? 'N/A'}  ← ${p._staleness.label}`);
      lines.push(``);
    }
  }

  if (ok.length > 0) {
    lines.push(`  ── OK ────────────────────────────────────────────`);
    for (const p of ok) {
      lines.push(`  • [${p.organizationName ?? 'Unknown Org'}] ${p.accountName} (${p.cloudProvider}) — ${p._staleness.label}`);
    }
    lines.push(``);
  }

  lines.push(divider);
  return lines.join('\n');
}
