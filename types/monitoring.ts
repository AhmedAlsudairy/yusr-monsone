/**
 * Shared types for the monitoring dashboard
 */

export interface MonitoringData {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  gps_status: string;
  temperature: number | null;
  humidity: number | null;
  water_level: number | null;
  water_status: string;
  risk_level: string;
  alert_message: string;
  created_at: string;
  gate_status?: string;
}

export interface TimeSeriesDataPoint {
  x: Date;
  y: number | null;
}

export interface WeatherData {
  list: {
    dt_txt: string;
    main: {
      temp: number;
      humidity: number;
    };
    weather: {
      main: string;
      description: string;
    }[];
    rain?: {
      '3h'?: number;
    };
  }[];
}

export interface ForecastResult {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  explanation: string;
  timeEstimate?: string;
  recommendedActions: string[];
}

export type MonitoringRecord = {
  id: string;
  created_at: string;
  water_level: number;
  temperature: number;
  humidity: number;
  water_status: string;
  latitude: number;
  longitude: number;
  alert_message?: string;
  risk_level?: string;
  gps_status?: string;
}

export type MetricType = 'all' | 'water_level' | 'temperature' | 'humidity';
export type TimeRange = 'day' | 'week' | 'month';
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';