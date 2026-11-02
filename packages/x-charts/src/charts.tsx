import React from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Typography, Stack } from '@altroo/mui-native';
import { useTheme, type SxProps, useSx } from '@altroo/mui-native/styles';
export interface ChartSeries {
  id?: string | number;
  data: readonly (number | null)[];
  label?: string;
  color?: string;
  valueFormatter?: (value: number | null) => string;
}
export interface CartesianChartProps {
  series: readonly ChartSeries[];
  xAxis?: readonly { data: readonly (string | number)[]; scaleType?: 'band' | 'point' }[];
  yAxis?: readonly { min?: number; max?: number }[];
  width?: number;
  height?: number;
  skipAnimation?: boolean;
  sx?: SxProps;
  onItemClick?: (
    event: GestureResponderEvent,
    item: { seriesId: string | number; dataIndex: number },
  ) => void;
}
const colors = ['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#d32f2f'];
export function chartDomain(series: readonly ChartSeries[], minimum?: number, maximum?: number) {
  const values = series
    .flatMap((s) => s.data)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  let min = minimum ?? Math.min(0, ...values);
  let max = maximum ?? Math.max(0, ...values);
  if (min > max) throw new Error('Chart minimum exceeds maximum');
  if (min === max) max = min + 1;
  return { min, max };
}
function Cartesian({
  kind,
  series,
  xAxis,
  yAxis,
  width = 360,
  height = 260,
  sx,
  onItemClick,
}: CartesianChartProps & { kind: 'bar' | 'line' }) {
  const theme = useTheme();
  const style = useSx(sx);
  const left = 48,
    right = 16,
    top = 16,
    bottom = 36;
  const plotWidth = Math.max(1, width - left - right),
    plotHeight = Math.max(1, height - top - bottom);
  const { min, max } = chartDomain(series, yAxis?.[0]?.min, yAxis?.[0]?.max);
  const y = (value: number) => top + ((max - value) / (max - min)) * plotHeight;
  const count = Math.max(0, ...series.map((s) => s.data.length));
  const step = plotWidth / Math.max(count, 1);
  const x = (index: number) => left + step * (index + 0.5);
  const labels = xAxis?.[0]?.data;
  return (
    <View style={style}>
      <Svg
        width={width}
        height={height}
        accessibilityLabel={`${kind === 'bar' ? 'Bar' : 'Line'} chart with ${series.length} series`}
      >
        <Line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke={theme.palette.divider} />
        {[min, (min + max) / 2, max].map((value, index) => (
          <SvgText
            key={index}
            x={left - 6}
            y={y(value) + 4}
            fontSize={11}
            fill={theme.palette.text.secondary}
            textAnchor="end"
          >
            {Number(value.toFixed(2)).toString()}
          </SvgText>
        ))}
        {series.map((s, seriesIndex) => {
          const color = s.color ?? colors[seriesIndex % colors.length];
          let path = '';
          let connected = false;
          const nodes = s.data.map((value, index) => {
            if (value == null || !Number.isFinite(value)) {
              connected = false;
              return null;
            }
            path += `${connected ? 'L' : 'M'}${x(index)},${y(value)} `;
            connected = true;
            const onPress = onItemClick
              ? (event: GestureResponderEvent) =>
                  onItemClick(event, { seriesId: s.id ?? seriesIndex, dataIndex: index })
              : undefined;
            const label = `${s.label ?? s.id ?? `Series ${seriesIndex + 1}`}, ${labels?.[index] ?? index + 1}: ${s.valueFormatter?.(value) ?? value}`;
            const barWidth = (step * 0.8) / Math.max(series.length, 1);
            return kind === 'bar' ? (
              <Rect
                key={index}
                x={left + step * index + step * 0.1 + seriesIndex * barWidth}
                y={Math.min(y(value), y(0))}
                width={barWidth}
                height={Math.max(1, Math.abs(y(value) - y(0)))}
                fill={color}
                onPress={onPress}
                accessible
                accessibilityLabel={label}
              />
            ) : (
              <Circle
                key={index}
                cx={x(index)}
                cy={y(value)}
                r={4}
                fill={color}
                onPress={onPress}
                accessible
                accessibilityLabel={label}
              />
            );
          });
          return (
            <React.Fragment key={s.id ?? seriesIndex}>
              {kind === 'line' ? (
                <Path d={path} fill="none" stroke={color} strokeWidth={2} />
              ) : null}
              {nodes}
            </React.Fragment>
          );
        })}
        {Array.from({ length: count }, (_, index) => index)
          .filter((index) => count <= 12 || index % Math.ceil(count / 12) === 0)
          .map((index) => (
            <SvgText
              key={index}
              x={x(index)}
              y={height - 12}
              fontSize={11}
              fill={theme.palette.text.secondary}
              textAnchor="middle"
            >
              {String(labels?.[index] ?? index + 1)}
            </SvgText>
          ))}
      </Svg>
      <Stack direction="row" spacing={2}>
        {series.map((s, index) => (
          <Typography
            key={s.id ?? index}
            variant="caption"
            style={{ color: s.color ?? colors[index % colors.length] }}
          >
            {s.label ?? s.id ?? `Series ${index + 1}`}
          </Typography>
        ))}
      </Stack>
    </View>
  );
}
export function BarChart(props: CartesianChartProps) {
  return <Cartesian {...props} kind="bar" />;
}
export function LineChart(props: CartesianChartProps) {
  return <Cartesian {...props} kind="line" />;
}
