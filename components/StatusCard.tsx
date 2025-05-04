import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BadgeVariant } from '@/types/monitoring'

interface StatusCardProps {
  title: string
  value: string
  subtitle: string
  status?: string
  statusColor?: BadgeVariant
}

export function StatusCard({ title, value, subtitle, status, statusColor = 'default' }: StatusCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-600">{title}</h3>
          {status && <Badge variant={statusColor}>{status}</Badge>}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}