'use client'

import { Card, CardContent } from '@/components/ui/card'
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api'

interface FloodMapProps {
  lat: number
  lng: number
  waterStatus?: string
}

export function FloodMap({ lat, lng, waterStatus }: FloodMapProps) {
  const mapContainerStyle = {
    width: '100%',
    height: '400px'
  }

  const center = {
    lat: lat,
    lng: lng
  }

  const getDangerCircleOptions = () => {
    switch (waterStatus) {
      case 'DANGER':
        return {
          fillColor: '#EF4444',
          fillOpacity: 0.2,
          strokeColor: '#EF4444',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          radius: 500
        }
      case 'WARNING':
        return {
          fillColor: '#F59E0B',
          fillOpacity: 0.1,
          strokeColor: '#F59E0B',
          strokeOpacity: 0.4,
          strokeWeight: 2,
          radius: 300
        }
      default:
        return {
          fillColor: '#3B82F6',
          fillOpacity: 0.05,
          strokeColor: '#3B82F6',
          strokeOpacity: 0.2,
          strokeWeight: 1,
          radius: 100
        }
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">📍 Location Map</h2>
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={14}
          >
            <Marker position={center} />
            <Circle
              center={center}
              options={getDangerCircleOptions()}
            />
          </GoogleMap>
        </LoadScript>
      </CardContent>
    </Card>
  )
}