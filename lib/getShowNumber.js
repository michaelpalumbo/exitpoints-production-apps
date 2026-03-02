function getLastFridayOfMonthFormatted() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Find the last Friday
    const dayOfWeek = lastDay.getDay();
    const offset = (dayOfWeek >= 5) ? dayOfWeek - 5 : dayOfWeek + 2;
    const lastFriday = new Date(lastDay);
    lastFriday.setDate(lastDay.getDate() - offset);

    // Format: "Month DD"
    const options = { month: 'long' };
    const monthName = lastFriday.toLocaleString('default', options);
    const day = lastFriday.getDate();

    return `${monthName} ${day}`;
}

function getShowNumber(currentShow = 60, baseYear = 2025, baseMonth = 4) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = Jan, 11 = Dec

    let monthsSinceBase = 0;

    for (
        let year = baseYear;
        year <= currentYear;
        year++
    ) {
        const startMonth = (year === baseYear) ? baseMonth : 0;
        const endMonth = (year === currentYear) ? currentMonth : 11;

        for (let m = startMonth; m < endMonth; m++) {
            if (m !== 11) { // skip December
                monthsSinceBase++;
            }
        }
    }

    return currentShow + monthsSinceBase;
}

// Utility: timestamp for backup filenames → YYYYMMDD-HHMMSS
function getTimestampForFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}


// export for other scripts
module.exports = {
  getLastFridayOfMonthFormatted,
  getShowNumber,
  getTimestampForFilename
};