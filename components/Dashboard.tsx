import { StatusCard } from '@/components/StatusCard'
import { FloodMap } from '@/components/FloodMap'
import { GateControl } from '@/components/GateControl'
import { SystemStatus } from '@/components/SystemStatus'
import { AlertPanel } from '@/components/AlertPanel'
import { HistoricalData } from '@/components/HistoricalData'
import { FloodPrediction } from '@/components/FloodPrediction'
import { MonitoringData, BadgeVariant } from '@/types/monitoring'

interface DashboardProps {
  data: MonitoringData | null
}

export function Dashboard({ data }: DashboardProps) {
  const getWaterStatusColor = (status: string): BadgeVariant => {
    switch (status) {
      case 'DANGER': return 'destructive'
      case 'WARNING': return 'destructive' // Changed from 'warning' to 'destructive'
      case 'NORMAL': return 'default'
      default: return 'secondary'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">🌊 Flood Monitoring Dashboard</h1>
          <p className="text-slate-600">Real-time monitoring and control system</p>
        </header>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatusCard 
            title="Water Level" 
            value={data?.water_level?.toString() || 'N/A'}
            subtitle="Raw Value"
            status={data?.water_status}
            statusColor={data?.water_status ? getWaterStatusColor(data.water_status) : undefined}
          />
          <StatusCard 
            title="Temperature" 
            value={data?.temperature ? `${data.temperature}°C` : 'N/A'}
            subtitle="Current"
            status={data?.temperature ? (data.temperature > 35 ? 'HIGH' : data.temperature < 0 ? 'LOW' : 'NORMAL') : undefined}
            statusColor={data?.temperature ? (data.temperature > 35 ? 'destructive' : data.temperature < 0 ? 'destructive' : 'default') : undefined}
          />
          <StatusCard 
            title="Humidity" 
            value={data?.humidity ? `${data.humidity}%` : 'N/A'}
            subtitle="Current"
            status={data?.humidity ? (data.humidity < 30 ? 'LOW' : data.humidity > 60 ? 'HIGH' : 'NORMAL') : undefined}
            statusColor={data?.humidity ? (data.humidity < 30 ? 'secondary' : data.humidity > 60 ? 'secondary' : 'default') : undefined}
          />
          <StatusCard 
            title="GPS Status" 
            value={data?.gps_status === 'CONNECTED' ? 'Live Location' : 'Default Location'}
            subtitle={data ? `${data.latitude?.toFixed(2)}°N ${data.longitude?.toFixed(2)}°E` : 'N/A'}
            status={data?.gps_status}
            statusColor={data?.gps_status === 'CONNECTED' ? 'default' : 'secondary'}
          />
        </div>
        
        {/* Historical Data */}
        <div className="mb-8">
          <HistoricalData timeRange="day" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Map and Controls */}
          <div className="lg:col-span-2 space-y-6">
            <FloodMap 
              lat={data?.latitude || 24.2945} 
              lng={data?.longitude || 56.7826}
              waterStatus={data?.water_status}
            />
            <GateControl data={data} />
          </div>

          {/* Right Column: Alerts, Prediction and Status */}
          <div className="space-y-6">
            <AlertPanel 
              alert={data?.alert_message || ''}
              waterStatus={data?.water_status || ''}
              riskLevel={data?.risk_level || ''}
              gateStatus={data?.gate_status || ''}
            />
            <FloodPrediction 
              latitude={data?.latitude || 24.2945}
              longitude={data?.longitude || 56.7826}
              currentData={data}
            />
            <SystemStatus data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}