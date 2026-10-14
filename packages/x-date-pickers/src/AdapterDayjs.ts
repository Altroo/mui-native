import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezonePlugin);
export type PickerValue = Dayjs | null;
export class AdapterDayjs {
  locale?: string;
  constructor(options: { locale?: string } = {}) {
    this.locale = options.locale;
  }
  date(value?: string | Date | Dayjs | null, timezone = 'default'): PickerValue {
    if (value === null) return null;
    let result = dayjs(value);
    if (timezone === 'UTC') result = result.utc();
    else if (!['default', 'system'].includes(timezone)) result = result.tz(timezone);
    return this.locale ? result.locale(this.locale) : result;
  }
  parse(value: string, format: string, timezone = 'default'): PickerValue {
    if (value === '') return null;
    const parsed = dayjs(value, format, this.locale, true);
    if (!parsed.isValid()) return parsed;
    if (timezone === 'UTC') return parsed.utc(true);
    if (!['default', 'system'].includes(timezone)) {
      const zoned = dayjs.tz(value, format, timezone);
      return zoned.format(format) === value ? zoned : dayjs('invalid');
    }
    return parsed;
  }
  isValid(value: PickerValue): value is Dayjs {
    return value !== null && value.isValid();
  }
  formatByString(value: Dayjs, format: string) {
    return value.format(format);
  }
}
