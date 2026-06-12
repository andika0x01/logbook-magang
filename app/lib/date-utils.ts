import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const WIB_TIMEZONE = "Asia/Jakarta";

/**
 * Returns the current time in WIB.
 */
export function nowInWIB() {
  return dayjs().tz(WIB_TIMEZONE);
}

/**
 * Formats a date string or object into WIB format.
 */
export function formatToWIB(date: string | Date | number, format = "YYYY-MM-DD HH:mm:ss") {
  return dayjs(date).tz(WIB_TIMEZONE).format(format);
}

/**
 * Converts a date to WIB dayjs object.
 */
export function toWIB(date?: string | Date | number) {
  return dayjs(date).tz(WIB_TIMEZONE);
}

export { dayjs };
