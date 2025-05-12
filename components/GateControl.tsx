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
  gateStatus?: {
    should_close: boolean;
    reason: string;
    updated_by: string;
    updated_at: string;
  };
}

interface GateStatus {
  should_close: boolean;
  reason: string;
  updated_by: string;
  updated_at: string;
}

export function GateControl({ data }: GateControlProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const [error, setError] = useState<string | null>(null)
  const [lastRequestTime, setLastRequestTime] = useState<Date | null>(null)
  const [requestCount, setRequestCount] = useState(0)
  const [showDebug, setShowDebug] = useState(true)
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null)
  const supabase = createClientComponentClient()

  // Fetch actual gate status from database
  const fetchGateStatus = async () => {
    try {
      console.log('[GateControl] Fetching current gate status from database')
      const { data: gateData, error } = await supabase.rpc('get_current_gate_status')
      
      if (error) {
        console.error('[GateControl] Error fetching gate status:', error)
        return null
      }
      
      if (gateData && gateData.length > 0) {
        console.log('[GateControl] Gate status fetched:', gateData[0])
        setGateStatus(gateData[0])
        setDebugInfo((prev: DebugInfo) => ({ 
          ...prev, 
          gateStatus: gateData[0] 
        }))
        return gateData[0]
      }
      
      return null
    } catch (error) {
      console.error('[GateControl] Error in fetchGateStatus:', error)
      return null
    }
  }

  // Log component props on mount and when data changes
  useEffect(() => {
    console.log('GateControl component data:', data)
    setDebugInfo((prev: DebugInfo) => ({ ...prev, componentData: data }))
    
    // Fetch gate status on mount
    fetchGateStatus()
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
      
      // Update local gate status after successful update
      if (data) {
        setGateStatus(data)
      }
      
      // Fetch the latest status from the database to ensure UI is in sync
      await fetchGateStatus()
      
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
    // First check if we have actual gate status from database
    if (gateStatus) {
      const actualStatus = gateStatus.should_close ? 'CLOSED' : 'OPEN'
      console.log(`[GateControl] Using actual gate status from database: ${actualStatus}`, gateStatus)
      return actualStatus
    }
    
    // Fallback to inferring from water status if no gate status available
    if (!data?.water_status) return 'UNKNOWN';
    const inferredStatus = ['WARNING', 'DANGER'].includes(data.water_status) ? 'CLOSED' : 'OPEN';
    console.log(`[GateControl] Using inferred gate status: ${inferredStatus}`, {
      water_status: data.water_status,
      data: data
    });
    return inferredStatus;
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
            {gateStatus && (
              <div className="text-sm text-muted-foreground mt-1">
                Reason: {gateStatus.reason}
              </div>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => updateGateStatus(false)}
              disabled={isUpdating || (!!gateStatus && !gateStatus.should_close)}
              variant="outline"
              className="relative"
            >
              {isUpdating ? 'Processing...' : 'Open Gate'}
              {isUpdating && <span className="absolute inset-0 flex items-center justify-center">⏳</span>}
            </Button>
            
            <Button
              onClick={() => updateGateStatus(true)}
              disabled={isUpdating || (!!gateStatus && gateStatus.should_close)}
              className="relative"
            >
              {isUpdating ? 'Processing...' : 'Close Gate'}
              {isUpdating && <span className="absolute inset-0 flex items-center justify-center">⏳</span>}
            </Button>
            
            <Button
              onClick={fetchGateStatus}
              variant="secondary"
              size="icon"
              className="ml-2"
              title="Refresh gate status"
            >
              🔄
            </Button>
          </div>
          
          {data?.created_at && (
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(data.created_at).toLocaleTimeString()}
            </div>
          )}
          
          {gateStatus?.updated_at && (
            <div className="text-sm text-muted-foreground">
              Gate status last updated: {new Date(gateStatus.updated_at).toLocaleTimeString()}
              {gateStatus.updated_by && ` by ${gateStatus.updated_by}`}
            </div>
          )}

          {showDebug && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-md border text-xs font-mono overflow-auto max-h-[300px]">
              <h3 className="font-bold mb-2">Debug Information</h3>
              <div>
                <p>⏱️ Requests: {requestCount}</p>
                <p>⏰ Last Request: {lastRequestTime?.toLocaleTimeString() || 'N/A'}</p>
                <p>🔄 Gate Status from DB: {gateStatus ? (gateStatus.should_close ? 'CLOSED' : 'OPEN') : 'Not fetched'}</p>
                <p>🚪 Gate Should Be: {data?.water_status ? `Water status is "${data.water_status}" => Gate should be "${['WARNING', 'DANGER'].includes(data.water_status) ? 'CLOSED' : 'OPEN'}"` : 'No water data'}</p>
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
