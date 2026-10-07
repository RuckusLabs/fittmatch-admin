'use client'

import { useEffect, useState } from 'react'

type Place = { city: string; lat: number; lng: number }
type Props = { city?: string | null; location_text?: string | null; location_lat?: number | null; location_lng?: number | null }
const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function ListingLocationFields(props: Props) {
  const [city, setCity] = useState(props.city ?? '')
  const [selected, setSelected] = useState<Place | null>(props.city && props.location_lat != null && props.location_lng != null
    ? { city: props.city, lat: props.location_lat, lng: props.location_lng } : null)
  const [places, setPlaces] = useState<Place[]>([])
  const [error, setError] = useState(false)
  useEffect(() => {
    if (city.length < 2 || selected?.city === city) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=10&lang=en&osm_tag=place:city&osm_tag=place:town`, { signal: controller.signal })
        if (!response.ok) throw new Error('Search unavailable')
        const data = await response.json()
        const results: Place[] = (data.features ?? []).filter((f: any) => ['US', 'CA'].includes(f.properties.countrycode) && f.properties.state)
          .map((f: any) => ({ city: `${f.properties.name}, ${f.properties.state}`, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }))
        if (!controller.signal.aborted) { setPlaces(results); setError(false) }
      } catch { if (!controller.signal.aborted) setError(true) }
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [city, selected, props.city])
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5 text-sm font-medium">City
        <input name="city" value={city} className={inputClass} placeholder="Search for a city"
          onChange={(e) => { setCity(e.target.value); setSelected(null); setPlaces([]) }} />
      </label>
      <input type="hidden" name="location_lat" value={selected?.lat ?? ''} />
      <input type="hidden" name="location_lng" value={selected?.lng ?? ''} />
      {places.map((p) => <button key={`${p.city}:${p.lat}`} type="button" className="block w-full rounded border p-2 text-left text-sm hover:bg-muted"
        onClick={() => { setCity(p.city); setSelected(p); setPlaces([]) }}>{p.city}</button>)}
      {city && !selected && <p className="text-xs text-muted-foreground">{error ? 'City search is unavailable. Try again before saving a new city.' : 'Select a city result to include this job in radius searches.'}</p>}
      <label className="block space-y-1.5 text-sm font-medium">Location details
        <input name="location_text" defaultValue={props.location_text ?? ''} className={inputClass} placeholder="e.g. Downtown studio" />
      </label>
    </div>
  )
}
