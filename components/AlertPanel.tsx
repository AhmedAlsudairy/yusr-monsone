import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface AlertPanelProps {
  alert: string
  waterStatus: string
  riskLevel: string
  gateStatus: string
}

export function AlertPanel({ alert, waterStatus, riskLevel, gateStatus }: AlertPanelProps) {
  const isEmergency = waterStatus === 'DANGER' || riskLevel === 'CRITICAL'

  return (
    <Card className={isEmergency ? 'border-red-500 bg-red-50' : ''}>
      <CardContent className="pt-6">
        <Alert variant={isEmergency ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{isEmergency ? 'CRITICAL ALERT' : 'System Alert'}</AlertTitle>
          <AlertDescription className="font-medium mb-4">
            {alert || 'No active alerts'}
          </AlertDescription>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <span className="w-32">Water Status:</span>
              <span className="font-medium">{waterStatus}</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="w-32">Risk Level:</span>
              <span className="font-medium">{riskLevel}</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="w-32">Gate Status:</span>
              <span className="font-medium">{gateStatus || 'N/A'}</span>
            </div>
          </div>
        </Alert>
      </CardContent>
    </Card>
  )
}