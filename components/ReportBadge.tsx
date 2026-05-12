import { cn } from '@/lib/utils'

interface ReportBadgeProps {
  type: 'priority' | 'status'
  value: string | null
}

const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const statusStyles: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  reviewing: 'bg-orange-100 text-orange-700 border-orange-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  dismissed: 'bg-gray-100 text-gray-500 border-gray-200',
}

export function ReportBadge({ type, value }: ReportBadgeProps) {
  const normalized = value?.toLowerCase() ?? 'unknown'
  const styles =
    type === 'priority'
      ? (priorityStyles[normalized] ?? priorityStyles.low)
      : (statusStyles[normalized] ?? statusStyles.dismissed)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize',
        styles
      )}
    >
      {value ?? 'unknown'}
    </span>
  )
}
