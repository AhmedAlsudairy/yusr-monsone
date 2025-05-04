export interface Database {
  public: {
    Tables: {
      flood_monitoring: {
        Row: {
          id: string
          timestamp: number
          latitude: number
          longitude: number
          gps_status: string
          temperature: number | null
          humidity: number | null
          water_level: number | null
          water_status: string
          risk_level: string
          alert_message: string
          created_at: string
        }
        Insert: {
          timestamp: number
          latitude: number
          longitude: number
          gps_status: string
          temperature?: number | null
          humidity?: number | null
          water_level?: number | null
          water_status: string
          risk_level: string
          alert_message: string
        }
        Update: {
          timestamp?: number
          latitude?: number
          longitude?: number
          gps_status?: string
          temperature?: number | null
          humidity?: number | null
          water_level?: number | null
          water_status?: string
          risk_level?: string
          alert_message?: string
        }
      }
      gate_control: {
        Row: {
          id: string
          should_close: boolean
          reason: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          should_close: boolean
          reason?: string | null
          updated_by?: string | null
        }
        Update: {
          should_close?: boolean
          reason?: string | null
          updated_by?: string | null
          updated_at?: string
        }
      }
    }
    Functions: {
      override_gate_status: {
        Args: {
          new_state: boolean
          override_reason: string
        }
        Returns: {
          id: string
          should_close: boolean
          reason: string
          updated_by: string
          created_at: string
          updated_at: string
        }
      }
    }
  }
}