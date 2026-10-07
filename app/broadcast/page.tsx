import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BroadcastForm } from '@/components/BroadcastControls'

export default function BroadcastPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Send an announcement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Appears in each recipient&apos;s notification centre and updates the home notification bell badge. Optionally also sent as a push
          notification. Banned users are excluded. Every broadcast is written to the audit log.
        </p>
        <BroadcastForm />
      </CardContent>
    </Card>
  )
}
