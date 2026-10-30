import type { AuthUser } from '../auth/AuthService';

export const certifications = {
  pmle: { id: 'pmle', title: 'Professional Machine Learning Engineer', label: 'PMLE', prefix: 'PMLE-', preview: false },
  'agentic-ai': { id: 'agentic-ai', title: 'Agentic AI', label: 'Agentic AI', prefix: 'PAA-', preview: true },
} as const;
export type CertificationId = keyof typeof certifications;
export type Certification = typeof certifications[CertificationId];
export function selectedCertification(search: string): Certification {
  const id = new URLSearchParams(search).get('cert') ?? 'pmle';
  if (!Object.hasOwn(certifications, id)) throw new Error('Unknown certification. Return home to choose a certification.');
  return certifications[id as CertificationId];
}
export function canAccessCertification(certification: Certification, user: AuthUser | null): boolean {
  return !certification.preview || (user?.email === 'ssanghani@gmail.com' && user.emailVerified === true);
}
export function progressPath(uid: string, id: CertificationId): string {
  return id === 'pmle' ? `userProgress/${uid}` : `userProgress/${uid}/certifications/${id}`;
}
export function scopedKey(key: string, id: CertificationId): string {
  return id === 'pmle' ? key : `${key}.${id}`;
}
