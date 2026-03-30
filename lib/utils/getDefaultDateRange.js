/**
 * Returns a default date range for reports.
 * @param {number} daysBack - Number of days to go back from today (default: 30)
 * @returns {{ from: string, to: string }} ISO date strings (YYYY-MM-DD)
 */
export function getDefaultDateRange(daysBack = 30) {
  const today = new Date()
  const past = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000)
  return {
    from: past.toLocaleDateString('en-CA'),
    to: today.toLocaleDateString('en-CA'),
  }
}
