'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface ProfilePhoto {
  url: string
  caption: string
}

interface PhotoGalleryProps {
  photos: ProfilePhoto[] | null
  primaryUrl?: string | null
  primaryLabel?: string
}

export function PhotoGallery({ photos, primaryUrl, primaryLabel = 'Primary' }: PhotoGalleryProps) {
  const [selected, setSelected] = useState<{ url: string; caption: string } | null>(null)

  const allPhotos: Array<{ url: string; caption: string }> = []

  if (primaryUrl) {
    allPhotos.push({ url: primaryUrl, caption: primaryLabel })
  }

  if (photos && photos.length > 0) {
    allPhotos.push(...photos)
  }

  if (allPhotos.length === 0) {
    return <p className="text-sm text-muted-foreground">No photos</p>
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 mt-2">
        {allPhotos.map((photo, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setSelected(photo)}
              className="focus:outline-none focus:ring-2 focus:ring-ring rounded"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || `Photo ${i + 1}`}
                className="h-24 w-24 rounded object-cover border hover:opacity-90 transition-opacity cursor-pointer"
              />
            </button>
            {photo.caption && photo.caption !== primaryLabel && (
              <p className="text-xs text-muted-foreground max-w-[96px] truncate text-center">
                {photo.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-2xl p-2">
          {selected && (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={selected.caption}
                className="max-h-[70vh] max-w-full rounded object-contain"
              />
              {selected.caption && (
                <p className="text-sm text-muted-foreground">{selected.caption}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
