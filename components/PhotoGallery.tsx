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
    <div className="flex flex-wrap gap-3 mt-2">
      {allPhotos.map((photo, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <a href={photo.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${i + 1}`}
              className="h-24 w-24 rounded object-cover border"
            />
          </a>
          {photo.caption && photo.caption !== primaryLabel && (
            <p className="text-xs text-muted-foreground max-w-[96px] truncate text-center">
              {photo.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
