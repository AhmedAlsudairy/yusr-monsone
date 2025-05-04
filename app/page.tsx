'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Dashboard } from '@/components/Dashboard'
import { Database } from '@/types/supabase'
import { MonitoringData } from '@/types/monitoring'

export default function Home() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    // Fetch initial data
    fetchLatestData()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('flood_monitoring_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flood_monitoring',
        },
        (payload) => {
          setMonitoringData(payload.new as MonitoringData)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // ^ The deps are intentionally empty as we only want to run this once on mount

  const fetchLatestData = async () => {
    try {
      const { data, error } = await supabase
        .from('flood_monitoring')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      setMonitoringData(data as MonitoringData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return <Dashboard data={monitoringData} />
}
