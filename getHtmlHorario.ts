import { DateManagment } from './utils_time.ts';
import { getHtmlThisWeekHorario } from './getHtmlThisWeekHorario.js';
import { getHtmlNextWeekHorario } from './getHtmlNextWeekHorario.js';

// INFO  — always printed; shows the normal course of events.
// DEBUG — printed only when DEBUG=1.
const log = (level: 'info' | 'debug', ...args: any[]) => {
  if (level === 'debug' && process.env.DEBUG !== '1') return;
  const prefix = level === 'debug' ? '[debug]' : '[info] ';
  console.error(prefix, ...args);
};

async function main() {
  try {
    const dateManager = new DateManagment();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = dateManager.today_date.getDay(); // 0=Sunday … 6=Saturday
    const todayName = dayNames[today];

    log('info', `Today is ${todayName} (day index ${today}), date: ${dateManager.today_date.toISOString().slice(0, 10)}.`);

    // Which week to fetch:
    //   Mon–Thu → next weekday is still within the current week  → THIS week
    //   Sun     → Inovar's Sumários already opens on the upcoming Mon–Fri week
    //             (it never shows a past/completed week on Sunday) → THIS week
    //             (no navigation click needed — fetching "this week" is correct)
    //   Fri/Sat → Inovar shows the current week; need one "next week" click    → NEXT week
    if (today === 5 || today === 6) {
      log('info', `${todayName}: Inovar shows current week — fetching NEXT week's schedule.`);
      return await getHtmlNextWeekHorario();
    } else {
      // Mon(1) Tue(2) Wed(3) Thu(4) Sun(0): Inovar already shows the correct target week.
      log('info', `${todayName}: Inovar already shows the target week — fetching THIS week's schedule.`);
      return await getHtmlThisWeekHorario();
    }

  } catch (error) {
    log('info', 'Fatal error in getHtmlHorario:', error);
    const errorOutput = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(errorOutput, null, 2));
    process.exit(1);
  }
}

main();
