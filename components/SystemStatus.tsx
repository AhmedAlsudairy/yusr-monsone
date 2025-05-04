import { Card, CardContent } from '@/components/ui/card'
import { Droplets, Thermometer, MapPin } from 'lucide-react'
import { MonitoringData } from '@/types/monitoring'

interface SystemStatusProps {
  data: MonitoringData | null;
}

export function SystemStatus({ data }: SystemStatusProps) {
  const sensorStatus = [
    {
      name: 'Water Level Sensor',
      status: data?.water_level ? 'Online' : 'Offline',
      detail: data?.water_level ? `Reading: ${data.water_level}` : 'No data',
      icon: Droplets,
      color: data?.water_level ? 'text-blue-600' : 'text-red-600',
      bgColor: data?.water_level ? 'bg-blue-100' : 'bg-red-100'
    },
    {
      name: 'Climate Sensor',
      status: data?.temperature !== null ? 'Online' : 'Offline',
      detail: (data?.temperature !== null && data?.humidity !== null) 
        ? `${data?.temperature}°C, ${data?.humidity}%` 
        : 'No data',
      icon: Thermometer,
      color: data?.temperature !== null ? 'text-green-600' : 'text-red-600',
      bgColor: data?.temperature !== null ? 'bg-green-100' : 'bg-red-100'
    },
    {
      name: 'GPS Module',
      status: data?.gps_status === 'CONNECTED' ? 'Connected' : 'Default Mode',
      detail: data?.gps_status === 'CONNECTED' ? 'Live location' : 'Using default coordinates',
      icon: MapPin,
      color: data?.gps_status === 'CONNECTED' ? 'text-yellow-600' : 'text-orange-600',
      bgColor: data?.gps_status === 'CONNECTED' ? 'bg-yellow-100' : 'bg-orange-100'
    }
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">📊 System Status</h2>
        <div className="space-y-4">
          {sensorStatus.map((sensor, index) => {
            const Icon = sensor.icon
            return (
              <div key={index} className="flex items-center">
                <div className={`w-16 h-16 ${sensor.bgColor} rounded-lg flex items-center justify-center mr-4`}>
                  <Icon className={`w-8 h-8 ${sensor.color}`} />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{sensor.name}</p>
                  <p className="text-sm text-slate-600">{sensor.status} - {sensor.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}