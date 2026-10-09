export type EventPassDTO = {
  id: string;
  registrationId: string;
  eventId: string;
  status: 'active';
  issuedAt: string;
  expiresAt: string | null;
  formatVersion: 1;
  barcode: { value: string; formatVersion: 1 };
};
export type PassRecord = {
  id: string; registrationId: string; eventId: string;
  status: 'active' | 'revoked' | 'expired'; issuedAt: string;
  expiresAt: string | null; revokedAt: string | null; revokedReason: string | null;
  formatVersion: number; tokenKeyId: string | null; tokenHash: string;
};
export type PassResolution = { passId: string; registrationId: string; eventId: string; accountId: string; formatVersion: 1 };
