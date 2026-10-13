// Must match the database ownership rule; legacy invalid proofs are never signed.
export function validCertificatePath(path: unknown, coachId: string): path is string {
  return typeof path === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(coachId)
    && path.startsWith(`${coachId}/`) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path.slice(coachId.length + 1))
    && !path.includes('..')
}
