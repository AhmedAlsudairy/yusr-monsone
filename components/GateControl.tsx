'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { MonitoringData } from '@/types/monitoring'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GateControlProps {
  data: MonitoringData | null;
}

// Define types for the debug information
interface DebugInfo {
  componentData?: MonitoringData | null;
  lastAction?: {
    type: string;
    timestamp: Date;
    requestParams: {
      new_state: boolean;
      override_reason: string;
    };
  };
  lastError?: {
    message: string;
    code?: string;
    details?: string;
    timestamp: Date;
  };
  lastSuccess?: {
    data: unknown;
    timestamp: Date;
    duration: string;
  };
  requestDuration?: number;
  operationCompleted?: boolean;
  totalDuration?: string;
}

export function GateControl({ data }: GateControlProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const [error, setError] = useState<string | null>(null)
  const [lastRequestTime, setLastRequestTime] = useState<Date | null>(null)
  const [requestCount, setRequestCount] = useState(0)
  const [showDebug, setShowDebug] = useState(true)
  const supabase = createClientComponentClient()

  // Log component props on mount and when data changes
  useEffect(() => {
    console.log('GateControl component data:', data)
    setDebugInfo((prev: DebugInfo) => ({ ...prev, componentData: data }))
  }, [data])

  const updateGateStatus = async (shouldClose: boolean) => {
    const startTime = new Date()
    setLastRequestTime(startTime)
    setRequestCount((prev: number) => prev + 1)
    setIsUpdating(true)
    setError(null)
    
    console.log(`[GateControl] Attempting to ${shouldClose ? 'close' : 'open'} gate`)
    setDebugInfo((prev: DebugInfo) => ({ 
      ...prev, 
      lastAction: { 
        type: shouldClose ? 'close' : 'open', 
        timestamp: startTime,
        requestParams: {
          new_state: shouldClose,
          override_reason: shouldClose ? 'Manual close via UI' : 'Manual open via UI'
        }
      } 
    }))
    
    try {
      console.log('[GateControl] Calling override_gate_status RPC')
      const { data, error } = await supabase.rpc('override_gate_status', {
        new_state: shouldClose,
        override_reason: shouldClose ? 'Manual close via UI' : 'Manual open via UI'
      })
      
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      
      if (error) {
        console.error('[GateControl] RPC error:', error)
        setError(`Error: ${error.message || 'Unknown error'}`)
        setDebugInfo((prev: DebugInfo) => ({ 
          ...prev, 
          lastError: { 
            message: error.message, 
            code: error.code, 
            details: error.details,
            timestamp: new Date()
          },
          requestDuration: duration
        }))
        throw error
      }
      
      console.log('[GateControl] RPC success:', data)
      setDebugInfo((prev: DebugInfo) => ({ 
        ...prev, 
        lastSuccess: { 
          data, 
          timestamp: new Date(),
          duration: `${duration}ms`
        } 
      }))
      
    } catch (error: unknown) {
      console.error('[GateControl] Caught error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Error: ${errorMessage}`)
    } finally {
      const finalTime = new Date()
      const totalDuration = finalTime.getTime() - startTime.getTime()
      console.log(`[GateControl] Operation completed in ${totalDuration}ms`)
      setDebugInfo((prev: DebugInfo) => ({ 
        ...prev, 
        operationCompleted: true,
        totalDuration: `${totalDuration}ms` 
      }))
      setIsUpdating(false)
    }
  }

  const getCurrentGateStatus = () => {
    // Since gate status comes from database, we need to query it
    // For now, showing based on water status
    if (!data?.water_status) return 'UNKNOWN';
    const status = ['WARNING', 'DANGER'].includes(data.water_status) ? 'CLOSED' : 'OPEN';
    console.log(`[GateControl] Current gate status determined as: ${status}`, {
      water_status: data.water_status,
      data: data
    });
    return status;
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🚪 Gate Control
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </Button>
          </div>
          
          <div className="text-lg font-medium">
            Current: <span className={`font-bold ${getCurrentGateStatus() === 'CLOSED' ? 'text-red-500' : 'text-green-500'}`}>
              {getCurrentGateStatus()}
            </span>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => updateGateStatus(false)}
              disabled={isUpdating}
              variant="outline"
              className="relative"
            >
              {isUpdating ? 'Processing...' : 'Open Gate'}
              {isUpdating && <span className="absolute inset-0 flex items-center justify-center">⏳</span>}
            </Button>
            
            <Button
              onClick={() => updateGateStatus(true)}
              disabled={isUpdating}
              className="relative"
            >
              {isUpdating ? 'Processing...' : 'Close Gate'}
              {isUpdating && <span className="absolute inset-0 flex items-center justify-center">⏳</span>}
            </Button>
          </div>
          
          {data?.created_at && (
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(data.created_at).toLocaleTimeString()}
            </div>
          )}

          {showDebug && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-md border text-xs font-mono overflow-auto max-h-[300px]">
              <h3 className="font-bold mb-2">Debug Information</h3>
              <div>
                <p>⏱️ Requests: {requestCount}</p>
                <p>⏰ Last Request: {lastRequestTime?.toLocaleTimeString() || 'N/A'}</p>
                <p>🔄 Gate Status Logic: {data?.water_status ? `Water status is "${data.water_status}" => Gate should be "${getCurrentGateStatus()}"` : 'No water data'}</p>
                <p>🔌 Updating: {isUpdating ? 'YES' : 'NO'}</p>
                {error && <p className="text-red-500">🚨 Error: {error}</p>}
                <p>📦 Data received: {data ? 'YES' : 'NO'}</p>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer">Full Debug Object</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
