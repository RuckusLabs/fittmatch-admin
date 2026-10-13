'use client'

import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PublicProfileLink } from '@/lib/public-profile-url'

export function PublicProfileLinkPanel({ url, message }: PublicProfileLink) {
  const [status, setStatus] = useState('')
  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setStatus('Profile link copied')
    } catch {
      setStatus('Could not copy. Select the URL and copy it manually.')
    }
  }
  return (
    <div className="mt-4 rounded-lg border p-3 space-y-2">
      <p className="text-sm font-medium">Public profile URL</p>
      {url
        ? <p className="text-sm text-muted-foreground break-all select-all">{url}</p>
        : <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!url} onClick={copyLink}>
          <Copy /> Copy link
        </Button>
        {url ? (
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open profile</a>
          </Button>
        ) : <Button type="button" variant="outline" size="sm" disabled><ExternalLink /> Open profile</Button>}
      </div>
      <p role="status" className="text-xs text-muted-foreground">{status}</p>
    </div>
  )
}
