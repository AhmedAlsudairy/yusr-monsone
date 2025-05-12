'use client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { MonitoringData } from '@/types/monitoring'

interface GateControlProps {
  data: MonitoringData | null;
}

export function GateControl({ data }: GateControlProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClientComponentClient()

  const updateGateStatus = async (shouldClose: boolean) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase.rpc('override_gate_status', {
        new_state: shouldClose,
        override_reason: shouldClose ? 'Manual close via UI' : 'Manual open via UI'
      })
      if (error) throw error
    } catch (error) {
      console.error('Error updating gate status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getCurrentGateStatus = () => {
    // Since gate status comes from database, we need to query it
    // For now, showing based on water status
    if (!data?.water_status) return 'UNKNOWN';
    return ['WARNING', 'DANGER'].includes(data.water_status) ? 'CLOSED' : 'OPEN';
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            🚪 Gate Control
          </h2>
          
          <div className="text-lg font-medium">
            Current: {getCurrentGateStatus()}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => updateGateStatus(false)}
              disabled={isUpdating}
              variant="outline"
            >
              Open Gate
            </Button>
            
            <Button
              onClick={() => updateGateStatus(true)}
              disabled={isUpdating}
            >
              Close Gate
            </Button>
          </div>
          
          {data?.created_at && (
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(data.created_at).toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
