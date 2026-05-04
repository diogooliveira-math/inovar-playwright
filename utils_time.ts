const today = new Date();

const debug = (...args: any[]) => {
  if (process.env.DEBUG === "1") {
    console.error("[debug]", ...args);
  }
};

class DateManagment {
  today_date: Date;
  tomorrow_date: Date;

  constructor() {
    this.today_date = new Date();
    this.tomorrow_date = new Date(this.today_date);
    this.tomorrow_date.setDate(this.today_date.getDate() + 1);
  }

  isWeekend(day: Date): boolean {
    const dayOfWeek = day.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
}

export { DateManagment };
