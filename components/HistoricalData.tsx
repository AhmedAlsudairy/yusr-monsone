'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TimeScale,
  Filler
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { MonitoringRecord, MetricType, TimeRange } from '@/types/monitoring'

// Register the components we need for the chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface HistoricalDataProps {
  timeRange?: TimeRange
}

export function HistoricalData({ timeRange = 'day' }: HistoricalDataProps) {
  const [historicalData, setHistoricalData] = useState<MonitoringRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('all')
  const [showForecast, setShowForecast] = useState<boolean>(false)
  const [forecastSteps, setForecastSteps] = useState<number>(5)
  const supabase = createClientComponentClient<Database>()

  // Use useCallback to memoize fetchHistoricalData function to avoid recreating it on every render
  const fetchHistoricalData = useCallback(async (range: TimeRange) => {
    setLoading(true)
    
    // Calculate start date based on range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setDate(startDate.getDate() - 30)
        break
      default: // day
        startDate.setDate(startDate.getDate() - 1)
    }

    try {
      const { data, error } = await supabase
        .from('flood_monitoring')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      setHistoricalData(data as MonitoringRecord[] || [])
    } catch (error) {
      console.error('Error fetching historical data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase]) // Add supabase as a dependency

  // Use the memoized fetchHistoricalData in useEffect
  useEffect(() => {
    fetchHistoricalData(timeRange)
  }, [timeRange, fetchHistoricalData]) // Include fetchHistoricalData in dependencies

  // Function to generate forecast data points using linear regression
  const generateForecast = (dataPoints: {x: Date, y: number}[], steps: number) => {
    if (dataPoints.length < 2) return [];
    
    // Extract x values as milliseconds and y values
    const xValues = dataPoints.map(point => point.x.getTime());
    const yValues = dataPoints.map(point => point.y);
    
    // Calculate the mean of x and y
    const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
    const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    
    // Calculate the slope (m) and y-intercept (b) for the line of best fit
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < xValues.length; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += (xValues[i] - xMean) * (xValues[i] - xMean);
    }
    
    const m = denominator !== 0 ? numerator / denominator : 0;
    const b = yMean - m * xMean;
    
    // Calculate the time interval for predictions
    // Use the average interval between the last few points
    const timeIntervals: number[] = [];
    for (let i = Math.max(0, dataPoints.length - 5); i < dataPoints.length - 1; i++) {
      timeIntervals.push(dataPoints[i + 1].x.getTime() - dataPoints[i].x.getTime());
    }
    
    const avgTimeInterval = timeIntervals.length > 0 
      ? timeIntervals.reduce((sum, val) => sum + val, 0) / timeIntervals.length
      : 3600000; // default to 1 hour if we can't determine
    
    // Generate forecast points
    const lastPoint = dataPoints[dataPoints.length - 1];
    const forecast = [];
    
    for (let i = 1; i <= steps; i++) {
      const nextTime = new Date(lastPoint.x.getTime() + i * avgTimeInterval);
      const predictedValue = m * nextTime.getTime() + b;
      forecast.push({
        x: nextTime,
        y: predictedValue
      });
    }
    
    return forecast;
  }

  // Add exponential smoothing forecast method
  const generateExponentialForecast = (dataPoints: {x: Date, y: number}[], steps: number) => {
    if (dataPoints.length < 2) return [];
    
    const alpha = 0.3; // Smoothing factor between 0 and 1
    const yValues = dataPoints.map(point => point.y);
    
    // Initialize with the first actual value
    let lastSmoothed = yValues[0];
    
    // Single exponential smoothing on historical data
    for (let i = 1; i < yValues.length; i++) {
      lastSmoothed = alpha * yValues[i] + (1 - alpha) * lastSmoothed;
    }
    
    // Calculate time interval (same as in linear regression method)
    const timeIntervals: number[] = [];
    for (let i = Math.max(0, dataPoints.length - 5); i < dataPoints.length - 1; i++) {
      timeIntervals.push(dataPoints[i + 1].x.getTime() - dataPoints[i].x.getTime());
    }
    
    const avgTimeInterval = timeIntervals.length > 0 
      ? timeIntervals.reduce((sum, val) => sum + val, 0) / timeIntervals.length
      : 3600000;
    
    // Generate forecast points
    const lastPoint = dataPoints[dataPoints.length - 1];
    const forecast = [];
    
    // For exponential smoothing, all future predictions are the same value
    for (let i = 1; i <= steps; i++) {
      const nextTime = new Date(lastPoint.x.getTime() + i * avgTimeInterval);
      forecast.push({
        x: nextTime,
        y: lastSmoothed
      });
    }
    
    return forecast;
  }

  // Function that combines multiple forecasting methods
  const getForecastData = (dataPoints: {x: Date, y: number}[], steps: number) => {
    if (dataPoints.length === 0) return [];
    
    const linearForecast = generateForecast(dataPoints, steps);
    const exponentialForecast = generateExponentialForecast(dataPoints, steps);
    
    // Weighted average of both methods
    return linearForecast.map((point, i) => ({
      x: point.x,
      y: (point.y * 0.7) + (exponentialForecast[i].y * 0.3)  // 70% linear, 30% exponential
    }));
  }

  // Prepare datasets based on selected metrics
  const getDatasets = () => {
    const datasets = [];
    
    if (selectedMetric === 'all' || selectedMetric === 'water_level') {
      // Historical water level data
      const waterLevelData = historicalData.map(record => ({
        x: new Date(record.created_at),
        y: record.water_level
      }));
      
      datasets.push({
        label: 'Water Level',
        data: waterLevelData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        tension: 0.3,
        fill: true,
      });
      
      // Add forecast if enabled
      if (showForecast) {
        const waterLevelForecast = getForecastData(waterLevelData, forecastSteps);
        
        datasets.push({
          label: 'Water Level Forecast',
          data: waterLevelForecast,
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 2,
          pointStyle: 'circle',
          pointBackgroundColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          fill: true,
          tension: 0.3,
        });
      }
    }
    
    if (selectedMetric === 'all' || selectedMetric === 'temperature') {
      // Historical temperature data
      const temperatureData = historicalData.map(record => ({
        x: new Date(record.created_at),
        y: record.temperature
      }));
      
      datasets.push({
        label: 'Temperature (°C)',
        data: temperatureData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y1',
      });
      
      // Add forecast if enabled
      if (showForecast) {
        const temperatureForecast = getForecastData(temperatureData, forecastSteps);
        
        datasets.push({
          label: 'Temperature Forecast',
          data: temperatureForecast,
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 2,
          pointStyle: 'circle',
          pointBackgroundColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y1',
        });
      }
    }
    
    if (selectedMetric === 'all' || selectedMetric === 'humidity') {
      // Historical humidity data
      const humidityData = historicalData.map(record => ({
        x: new Date(record.created_at),
        y: record.humidity
      }));
      
      datasets.push({
        label: 'Humidity (%)',
        data: humidityData,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        tension: 0.3,
        fill: true,
        yAxisID: selectedMetric === 'all' ? 'y2' : 'y',
      });
      
      // Add forecast if enabled
      if (showForecast) {
        const humidityForecast = getForecastData(humidityData, forecastSteps);
        
        datasets.push({
          label: 'Humidity Forecast',
          data: humidityForecast,
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 2,
          pointStyle: 'circle',
          pointBackgroundColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          fill: true,
          tension: 0.3,
          yAxisID: selectedMetric === 'all' ? 'y2' : 'y',
        });
      }
    }
    
    return datasets;
  };

  const chartData = {
    datasets: getDatasets()
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeRange === 'day' ? 'hour' : timeRange === 'week' ? 'day' : 'week',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d',
            week: 'MMM d'
          }
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)'
        }
      },
      y: {
        title: {
          display: true,
          text: selectedMetric === 'temperature' ? 'Temperature (°C)' : 
                selectedMetric === 'humidity' ? 'Humidity (%)' : 'Water Level',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)'
        },
        beginAtZero: true,
      },
      // Only show these scales when needed
      ...(selectedMetric === 'all' && {
        y1: {
          position: 'right',
          title: {
            display: true,
            text: 'Temperature (°C)',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            display: false,
          },
          beginAtZero: true,
        },
        y2: {
          position: 'right',
          title: {
            display: true,
            text: 'Humidity (%)',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            display: false,
          },
          beginAtZero: true,
        },
      })
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14,
          },
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: `Historical Data${showForecast ? ' with Forecast' : ''} (Last ${timeRange})`,
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        cornerRadius: 8,
        usePointStyle: true,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString();
          },
          label: (context) => {
            const isForecast = context.dataset.label?.includes('Forecast');
            const valueText = `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
            return isForecast ? `${valueText} (Predicted)` : valueText;
          }
        }
      }
    },
  }

  const timeRangeOptions = [
    { label: 'Last 24 Hours', value: 'day' as TimeRange },
    { label: 'Last Week', value: 'week' as TimeRange },
    { label: 'Last Month', value: 'month' as TimeRange }
  ]
  
  const metricOptions = [
    { label: 'All Metrics', value: 'all' as MetricType },
    { label: 'Water Level', value: 'water_level' as MetricType },
    { label: 'Temperature', value: 'temperature' as MetricType },
    { label: 'Humidity', value: 'humidity' as MetricType }
  ]
  
  const forecastStepOptions = [
    { label: '3 Steps', value: 3 },
    { label: '5 Steps', value: 5 },
    { label: '10 Steps', value: 10 },
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-t-4 border-t-blue-500">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {showForecast ? '🔮 Predictive Analytics' : '📈 Historical Data'}
          </h2>
          
          <div className="flex flex-wrap gap-4">
            {/* Forecast toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 mr-1">
                Show Forecast:
              </label>
              <div 
                className={`w-12 h-6 rounded-full cursor-pointer transition-colors flex items-center px-1 ${showForecast ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}
                onClick={() => setShowForecast(!showForecast)}
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Forecast steps (only show when forecast is enabled) */}
            {showForecast && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  Forecast Steps:
                </label>
                <div className="flex gap-1">
                  {forecastStepOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setForecastSteps(option.value)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        forecastSteps === option.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Metric selector */}
            <div className="flex flex-wrap gap-2">
              {metricOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedMetric(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedMetric === option.value
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* Time range selector */}
            <div className="flex flex-wrap gap-2">
              {timeRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => fetchHistoricalData(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeRange === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Info box when forecast is enabled */}
        {showForecast && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Forecast Information:</span> Predictions are based on historical trends using multiple forecasting models. 
              Dashed lines show predicted future values. Accuracy may vary based on data quality and external factors.
            </p>
          </div>
        )}
        
        {historicalData.length > 0 ? (
          <div className="h-[500px] pt-4"> {/* Increased height for larger graph */}
            <Line options={options} data={chartData} />
          </div>
        ) : (
          <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center p-8">
              <p className="text-slate-500 text-lg font-medium">No historical data available for the selected time range</p>
              <p className="text-slate-400 mt-2">Try selecting a different time range or check your data source</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}