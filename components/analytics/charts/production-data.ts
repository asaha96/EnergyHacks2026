import type { Plan } from '@/types/plan';

export interface MonthlyProductionData {
  month: string;
  shortMonth: string;
  production: number;
  average: number;
}

export interface HourlyProductionData {
  hour: number;
  hourLabel: string;
  production: number;
  peak: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SEASONAL_FACTORS = [
  0.55, 0.65, 0.85, 1.00, 1.15, 1.20,
  1.18, 1.10, 0.95, 0.75, 0.60, 0.52
];

export function generateMonthlyProductionData(plan: Plan | null): MonthlyProductionData[] {
  // HARDCODED DEMO DATA
  const monthlyValues = [
    40026, 46698, 60040, 66711, 73382, 80053,
    80053, 73382, 60040, 46698, 26684, 13341
  ];
  const average = 55592;

  return MONTHS.map((month, index) => {
    return {
      month,
      shortMonth: SHORT_MONTHS[index],
      production: monthlyValues[index],
      average: average,
    };
  });
}

const HOURLY_FACTORS = [
  0.00, 0.00, 0.00, 0.00, 0.00, 0.02,
  0.10, 0.25, 0.45, 0.65, 0.82, 0.95,
  1.00, 0.98, 0.90, 0.78, 0.60, 0.40,
  0.20, 0.05, 0.00, 0.00, 0.00, 0.00
];

export function generateHourlyProductionData(plan: Plan | null): HourlyProductionData[] {
  const systemSizeKw = plan?.analysis?.systemSizeKw ?? 45;
  const peakOutput = systemSizeKw * 0.85;

  return Array.from({ length: 24 }, (_, hour) => {
    const factor = HOURLY_FACTORS[hour];
    const baseProduction = peakOutput * factor;
    const variance = factor > 0 ? (0.92 + Math.random() * 0.16) : 1;

    return {
      hour,
      hourLabel: formatHourLabel(hour),
      production: Math.round(baseProduction * variance * 100) / 100,
      peak: peakOutput,
    };
  });
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}
