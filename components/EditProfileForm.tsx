'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCoachProfile, updateClientProfile } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type CoachData = {
  title: string | null
  bio: string | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  experience_band: string | null
  specialties: string[] | null
}

type ClientData = {
  company_name: string | null
  company_type: string | null
  bio: string | null
  website: string | null
  team_size_band: string | null
}

type Props =
  | { userId: string; role: 'coach'; data: CoachData }
  | { userId: string; role: 'client'; data: ClientData }

export function EditProfileForm(props: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const fd = new FormData(e.currentTarget)
    let result: { error: string | null }

    if (props.role === 'coach') {
      const specialtiesRaw = (fd.get('specialties') as string) ?? ''
      const specialties = specialtiesRaw
        ? specialtiesRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : null

      const rateMinRaw = fd.get('hourly_rate_min') as string
      const rateMaxRaw = fd.get('hourly_rate_max') as string

      result = await updateCoachProfile(props.userId, {
        title: (fd.get('title') as string) || null,
        bio: (fd.get('bio') as string) || null,
        hourly_rate_min: rateMinRaw ? parseFloat(rateMinRaw) : null,
        hourly_rate_max: rateMaxRaw ? parseFloat(rateMaxRaw) : null,
        experience_band: (fd.get('experience_band') as string) || null,
        specialties,
      })
    } else {
      result = await updateClientProfile(props.userId, {
        company_name: (fd.get('company_name') as string) || null,
        company_type: (fd.get('company_type') as string) || null,
        bio: (fd.get('bio') as string) || null,
        website: (fd.get('website') as string) || null,
        team_size_band: (fd.get('team_size_band') as string) || null,
      })
    }

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      router.refresh()
    }
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {props.role === 'coach' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coach Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  defaultValue={props.data.title ?? ''}
                  placeholder="e.g. Certified Personal Trainer"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={5}
                  defaultValue={props.data.bio ?? ''}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="specialties">
                  Specialties{' '}
                  <span className="text-muted-foreground font-normal">(comma-separated)</span>
                </label>
                <input
                  id="specialties"
                  name="specialties"
                  defaultValue={(props.data.specialties ?? []).join(', ')}
                  placeholder="e.g. Weight Loss, Strength Training, HIIT"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="experience_band">
                  Experience Level
                </label>
                <select
                  id="experience_band"
                  name="experience_band"
                  defaultValue={props.data.experience_band ?? ''}
                  className={inputClass}
                >
                  <option value="">— Not set —</option>
                  <option value="entry">Entry (0–2 yrs)</option>
                  <option value="junior">Junior (2–4 yrs)</option>
                  <option value="mid">Mid (4–7 yrs)</option>
                  <option value="senior">Senior (7–12 yrs)</option>
                  <option value="expert">Expert (12+ yrs)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="hourly_rate_min">
                    Min rate ($/hr)
                  </label>
                  <input
                    id="hourly_rate_min"
                    name="hourly_rate_min"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={props.data.hourly_rate_min ?? ''}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="hourly_rate_max">
                    Max rate ($/hr)
                  </label>
                  <input
                    id="hourly_rate_max"
                    name="hourly_rate_max"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={props.data.hourly_rate_max ?? ''}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="company_name">
                Company Name
              </label>
              <input
                id="company_name"
                name="company_name"
                defaultValue={props.data.company_name ?? ''}
                placeholder="Acme Fitness"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="company_type">
                  Company Type
                </label>
                <select
                  id="company_type"
                  name="company_type"
                  defaultValue={props.data.company_type ?? ''}
                  className={inputClass}
                >
                  <option value="">— Not set —</option>
                  <option value="gym">Gym</option>
                  <option value="studio">Studio</option>
                  <option value="corporate">Corporate Wellness</option>
                  <option value="sports_team">Sports Team</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="team_size_band">
                  Team Size
                </label>
                <select
                  id="team_size_band"
                  name="team_size_band"
                  defaultValue={props.data.team_size_band ?? ''}
                  className={inputClass}
                >
                  <option value="">— Not set —</option>
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                defaultValue={props.data.bio ?? ''}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="website">
                Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                defaultValue={props.data.website ?? ''}
                placeholder="https://example.com"
                className={inputClass}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Saved successfully.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
