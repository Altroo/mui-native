import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { View } from 'react-native';
import type { Dayjs } from 'dayjs';
import {
  TextField,
  Button,
  IconButton,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useControlled,
  type TextFieldProps,
} from '@altroo/mui-native';
import { AdapterDayjs, type PickerValue } from './AdapterDayjs';
const AdapterContext = createContext<AdapterDayjs | null>(null);
export function LocalizationProvider({
  dateAdapter = AdapterDayjs,
  adapterLocale,
  children,
}: {
  dateAdapter?: typeof AdapterDayjs;
  adapterLocale?: string;
  children?: React.ReactNode;
}) {
  const adapter = useMemo(
    () => new dateAdapter({ locale: adapterLocale }),
    [dateAdapter, adapterLocale],
  );
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}
function useAdapter() {
  const adapter = useContext(AdapterContext);
  if (!adapter) throw new Error('Wrap date components in LocalizationProvider.');
  return adapter;
}
export type DateValidationError =
  | 'invalidDate'
  | 'minDate'
  | 'maxDate'
  | 'disablePast'
  | 'disableFuture'
  | null;
export interface DateFieldProps {
  value?: PickerValue;
  defaultValue?: PickerValue;
  onChange?: (value: PickerValue, context: { validationError: DateValidationError }) => void;
  onError?: (error: DateValidationError, value: PickerValue) => void;
  label?: string;
  format?: string;
  disabled?: boolean;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  disablePast?: boolean;
  disableFuture?: boolean;
  timezone?: string;
  slotProps?: { textField?: Omit<TextFieldProps, 'value' | 'onChange'> };
}
export function validateDate(
  value: PickerValue,
  props: Pick<DateFieldProps, 'minDate' | 'maxDate' | 'disablePast' | 'disableFuture'>,
  today: Dayjs,
): DateValidationError {
  if (value === null) return null;
  if (!value.isValid()) return 'invalidDate';
  if (props.minDate && value.isBefore(props.minDate, 'day')) return 'minDate';
  if (props.maxDate && value.isAfter(props.maxDate, 'day')) return 'maxDate';
  if (props.disablePast && value.isBefore(today, 'day')) return 'disablePast';
  if (props.disableFuture && value.isAfter(today, 'day')) return 'disableFuture';
  return null;
}
export function DateField(props: DateFieldProps) {
  const adapter = useAdapter();
  const {
    value,
    defaultValue = null,
    onChange,
    onError,
    label,
    format = 'MM/DD/YYYY',
    disabled,
    timezone = 'default',
    slotProps,
  } = props;
  const [date, setDate] = useControlled(value, defaultValue);
  const formatted = adapter.isValid(date) ? adapter.formatByString(date, format) : '';
  const [text, setText] = useState(formatted);
  useEffect(() => {
    if (date === null || adapter.isValid(date)) setText(formatted);
  }, [date, formatted, adapter]);
  const error = validateDate(date, props, adapter.date(undefined, timezone)!);
  useEffect(() => {
    onError?.(error, date);
  }, [error, onError, date]);
  return (
    <TextField
      {...slotProps?.textField}
      label={label}
      disabled={disabled}
      value={text}
      placeholder={slotProps?.textField?.placeholder ?? format}
      error={error !== null}
      helperText={
        slotProps?.textField?.helperText ??
        (error === 'invalidDate' ? `Use ${format}` : (error ?? undefined))
      }
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        const next = adapter.parse(raw, format, timezone);
        setDate(next);
        onChange?.(next, {
          validationError: validateDate(next, props, adapter.date(undefined, timezone)!),
        });
      }}
    />
  );
}
export interface DateCalendarProps extends Omit<DateFieldProps, 'format' | 'slotProps'> {}
export function DateCalendar(props: DateCalendarProps) {
  const adapter = useAdapter();
  const [date, setDate] = useControlled(props.value, props.defaultValue ?? null);
  const normalizeMonth = useMemo(
    () => (current: Dayjs | undefined) =>
      adapter
        .date(current, props.timezone)!
        .locale(adapter.locale ?? 'en')
        .startOf('month'),
    [adapter, props.timezone],
  );
  const [month, setMonth] = useState(() =>
    normalizeMonth(adapter.isValid(date) ? date : undefined),
  );
  useEffect(() => {
    setMonth((previous) =>
      normalizeMonth(adapter.isValid(props.value ?? null) ? props.value! : previous),
    );
  }, [props.value, adapter, normalizeMonth]);
  const start = month.startOf('week');
  const days = Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
  const today = adapter.date(undefined, props.timezone)!;
  return (
    <Stack spacing={1}>
      <Stack direction="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton
          aria-label="Previous month"
          style={{ alignSelf: 'center' }}
          onClick={() => setMonth(month.subtract(1, 'month'))}
        >
          ‹
        </IconButton>
        <Typography>{month.format('MMMM YYYY')}</Typography>
        <IconButton
          aria-label="Next month"
          style={{ alignSelf: 'center' }}
          onClick={() => setMonth(month.add(1, 'month'))}
        >
          ›
        </IconButton>
      </Stack>
      <View style={{ flexDirection: 'row' }}>
        {days.slice(0, 7).map((day) => (
          <Typography
            key={day.day()}
            variant="caption"
            color="text.secondary"
            accessibilityLabel={day.format('dddd')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            {day.format('dd')}
          </Typography>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, week) => (
        <View key={week} style={{ flexDirection: 'row' }}>
          {days.slice(week * 7, week * 7 + 7).map((day) => (
            <View key={day.format('YYYY-MM-DD')} style={{ flex: 1, minWidth: 0 }}>
              <Button
                disabled={
                  props.disabled ||
                  day.month() !== month.month() ||
                  validateDate(day, props, today) !== null
                }
                aria-label={day.format('dddd, MMMM D, YYYY')}
                variant={adapter.isValid(date) && date.isSame(day, 'day') ? 'contained' : 'text'}
                style={{ minWidth: 0, width: '100%', paddingHorizontal: 0 }}
                onClick={() => {
                  setDate(day);
                  props.onChange?.(day, { validationError: null });
                }}
              >
                {day.date()}
              </Button>
            </View>
          ))}
        </View>
      ))}
    </Stack>
  );
}
export interface DatePickerProps extends DateFieldProps {
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onAccept?: (value: PickerValue, context: { validationError: DateValidationError }) => void;
  onCancel?: () => void;
}
export function DatePicker({
  open,
  onOpen,
  onClose,
  onAccept,
  onCancel,
  ...props
}: DatePickerProps) {
  const adapter = useAdapter();
  const [date, setDate] = useControlled(props.value, props.defaultValue ?? null);
  const [visible, setVisible] = useControlled(open, false);
  const [draft, setDraft] = useState(date);
  const close = () => {
    setVisible(false);
    onClose?.();
  };
  const change: DateFieldProps['onChange'] = (value, context) => {
    setDate(value);
    props.onChange?.(value, context);
  };
  return (
    <Stack spacing={1}>
      <DateField {...props} value={date} onChange={change} />
      <Button
        disabled={props.disabled}
        variant="outlined"
        aria-label={props.label ? `Choose ${props.label}` : 'Choose date'}
        onClick={() => {
          setDraft(date);
          setVisible(true);
          onOpen?.();
        }}
      >
        Choose date
      </Button>
      <Dialog
        open={visible}
        onClose={() => {
          onCancel?.();
          close();
        }}
        fullWidth
      >
        <DialogTitle>{props.label ?? 'Choose date'}</DialogTitle>
        <DialogContent>
          <DateCalendar {...props} value={draft} onChange={(value) => setDraft(value)} />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              onCancel?.();
              close();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              const context = {
                validationError: validateDate(
                  draft,
                  props,
                  adapter.date(undefined, props.timezone)!,
                ),
              };
              if (context.validationError) return;
              change(draft, context);
              onAccept?.(draft, context);
              close();
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
