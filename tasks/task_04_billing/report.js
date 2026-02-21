// tasks/task_04_billing/report.js

/**
 * Formats a cost number to a clean dollar string.
 * e.g. 56.64979934692383 → "$56.6498"
 */
function formatCost(value) {
    return `$${Number(value).toFixed(4)}`;
  }
  
  /**
   * Groups billingItemResponse rows by date, summing costs per day.
   * Returns array of { date, cost } sorted by date ascending.
   */
  function groupByDate(items) {
    const map = {};
    for (const item of items) {
      const date = item.usagesStartDate;
      map[date] = (map[date] ?? 0) + item.unblendedCost;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }));
  }
  
  export function buildReport(serviceResults, totalResults, services, accountId, startDate, endDate) {
    const runTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const divider = '='.repeat(60);
  
    const lines = [
      divider,
      `  TASK: task_04_billing`,
      `  Run at: ${runTime}`,
      `  Billing Account: ${accountId}`,
      `  Period: ${startDate} → ${endDate}`,
      divider,
      ``,
      `  ── PER-SERVICE DAILY COST ──────────────────────────`,
      ``,
    ];
  
    for (const { serviceName, items } of serviceResults) {
      const grouped = groupByDate(items);
      lines.push(`  📦  ${serviceName}`);
  
      if (grouped.length === 0) {
        lines.push(`      No data found for this period`);
      } else {
        for (const { date, cost } of grouped) {
          lines.push(`      ${date}  │  Cost: ${formatCost(cost)}`);
        }
      }
      lines.push(``);
    }
  
    lines.push(`  ── TOTAL (Account excl. above services) ────────────`);
    lines.push(``);
  
    const totalGrouped = groupByDate(totalResults);
    if (totalGrouped.length === 0) {
      lines.push(`      No data found for this period`);
    } else {
      for (const { date, cost } of totalGrouped) {
        lines.push(`      ${date}  │  Cost: ${formatCost(cost)}`);
      }
    }
  
    lines.push(``);
    lines.push(divider);
    return lines.join('\n');
  }
  