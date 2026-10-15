import 'server-only';
import { RoleError } from './role-errors';
import { MANAGED_ELEVATED_ROLES, type RoleMutation } from './role-types';

function bad(): never { throw new RoleError('ROLE_INVALID_INPUT'); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return bad();
  let encoded = '';
  try { encoded = JSON.stringify(value); } catch { return bad(); }
  if (Buffer.byteLength(encoded) > 2048) return bad();
  const allowed = ['id','role','expectedVersion','reason'];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return bad();
  return value as Record<string, unknown>;
}
function uuid(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return bad();
  return value.toLowerCase();
}
function reason(value: unknown) {
  if (typeof value !== 'string') return bad();
  const normalized = value.trim();
  if (normalized.length < 5 || normalized.length > 500 || /[<>\u0000-\u001f\u007f]/.test(normalized)) return bad();
  return normalized;
}

export function roleMutation(value: unknown): RoleMutation {
  const input = object(value);
  if (!MANAGED_ELEVATED_ROLES.includes(input.role as RoleMutation['role'])) return bad();
  if (!Number.isSafeInteger(input.expectedVersion) || Number(input.expectedVersion) < 1 || Number(input.expectedVersion) > 2147483646) return bad();
  return {
    id: uuid(input.id),
    role: input.role as RoleMutation['role'],
    expectedVersion: Number(input.expectedVersion),
    reason: reason(input.reason),
  };
}
