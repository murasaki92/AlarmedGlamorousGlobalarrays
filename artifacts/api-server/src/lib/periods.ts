const DAY = 86400000;
export function jakartaDay(date: Date) {
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function periodStarts(now = new Date()) {
  const today = new Date(`${jakartaDay(now)}T00:00:00+07:00`);
  const weekday = new Date(today.getTime() + 7 * 3600000).getUTCDay();
  const week = new Date(today.getTime() - ((weekday + 6) % 7) * DAY);
  const month = new Date(`${jakartaDay(now).slice(0, 7)}-01T00:00:00+07:00`);
  return { today, week, month, tomorrow: new Date(today.getTime() + DAY) };
}
export function daysBetween(start: Date, end: Date) {
  const dates: string[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += DAY) dates.push(jakartaDay(new Date(t)));
  return dates;
}