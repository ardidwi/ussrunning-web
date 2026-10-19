import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionEnv } from '../scripts/production/readiness.mjs';

function env(overrides = {}) {
  return {
    DATABASE_URL: 'postgresql://user:pass@db.example.test/app',
    DATABASE_URL_UNPOOLED: 'postgresql://user:pass@db.example.test/app',
    NEON_AUTH_BASE_URL: 'https://auth.example.test',
    NEON_AUTH_COOKIE_SECRET: 'x'.repeat(32),
    USS_SUPER_ADMIN_EMAIL: 'owner@example.test',
    RESEND_API_KEY: 're_test_value',
    EMAIL_FROM_ADDRESS: 'hello@example.test',
    APP_BASE_URL: 'https://www.example.test',
    EVENT_PASS_TOKEN_KEYS: JSON.stringify({ primary: 'a'.repeat(64) }),
    EVENT_PASS_TOKEN_KEY_ID: 'primary',
    AWS_ENDPOINT_URL_S3: 'https://storage.example.test',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'test_access_id',
    AWS_SECRET_ACCESS_KEY: 'test_secret_only',
    MEDIA_PUBLIC_BUCKET_NAME: 'uss-media',
    MEDIA_PRIVATE_BUCKET_NAME: 'uss-media-private',
    MEDIA_PRIVATE_URL_TTL_SECONDS: '300',
    ...overrides
  };
}

test('accepts a complete production configuration shape', () => {
  assert.deepEqual(validateProductionEnv(env()), []);
});

test('reports all missing required values without exposing secrets', () => {
  const input = env({ DATABASE_URL: '', RESEND_API_KEY: '', EVENT_PASS_TOKEN_KEYS: '' });
  const errors = validateProductionEnv(input);
  assert.ok(errors.some(value => value.includes('DATABASE_URL')));
  assert.ok(errors.some(value => value.includes('RESEND_API_KEY')));
  assert.ok(errors.some(value => value.includes('EVENT_PASS_TOKEN_KEYS')));
  assert.ok(!JSON.stringify(errors).includes('re_test_value'));
});

test('rejects non-https production origins and origin paths', () => {
  assert.ok(validateProductionEnv(env({ APP_BASE_URL: 'http://example.test' })).some(value => value.includes('APP_BASE_URL')));
  assert.ok(validateProductionEnv(env({ APP_BASE_URL: 'https://example.test/login' })).some(value => value.includes('origin only')));
  assert.ok(validateProductionEnv(env({ NEON_AUTH_BASE_URL: 'http://auth.example.test' })).some(value => value.includes('NEON_AUTH_BASE_URL')));
});

test('rejects malformed pass keyrings and unknown active key ids', () => {
  assert.ok(validateProductionEnv(env({ EVENT_PASS_TOKEN_KEYS: '{bad' })).some(value => value.includes('valid JSON')));
  assert.ok(validateProductionEnv(env({ EVENT_PASS_TOKEN_KEYS: JSON.stringify({ primary: 'short' }) })).some(value => value.includes('invalid key')));
  assert.ok(validateProductionEnv(env({ EVENT_PASS_TOKEN_KEY_ID: 'missing' })).some(value => value.includes('reference a configured key')));
});

test('rejects weak auth cookie secret and malformed operator email', () => {
  const errors = validateProductionEnv(env({ NEON_AUTH_COOKIE_SECRET: 'short', USS_SUPER_ADMIN_EMAIL: 'not-an-email' }));
  assert.ok(errors.some(value => value.includes('at least 32')));
  assert.ok(errors.some(value => value.includes('USS_SUPER_ADMIN_EMAIL')));
});


test('rejects invalid or insecure media storage configuration', () => {
  const cases = [
    [{ AWS_ENDPOINT_URL_S3: 'http://storage.example.test' }, 'AWS_ENDPOINT_URL_S3'],
    [{ AWS_ENDPOINT_URL_S3: 'https://storage.example.test/path' }, 'HTTPS origin only'],
    [{ AWS_REGION: 'INVALID REGION!' }, 'AWS_REGION'],
    [{ MEDIA_PUBLIC_BUCKET_NAME: 'Not_Valid' }, 'Media bucket names'],
    [{ MEDIA_PRIVATE_BUCKET_NAME: 'uss-media' }, 'must differ'],
    [{ MEDIA_PRIVATE_URL_TTL_SECONDS: '59' }, 'MEDIA_PRIVATE_URL_TTL_SECONDS'],
    [{ MEDIA_PRIVATE_URL_TTL_SECONDS: '901' }, 'MEDIA_PRIVATE_URL_TTL_SECONDS'],
    [{ MEDIA_PRIVATE_URL_TTL_SECONDS: 'not-a-number' }, 'MEDIA_PRIVATE_URL_TTL_SECONDS']
  ];
  for (const [overrides, expected] of cases) {
    assert.ok(validateProductionEnv(env(overrides)).some(message => message.includes(expected)), expected);
  }
});

test('reports missing storage settings without leaking storage credentials', () => {
  const invalid = env({ AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '' });
  const errors = validateProductionEnv(invalid);
  assert.ok(errors.some(message => message.includes('AWS_ACCESS_KEY_ID')));
  assert.ok(errors.some(message => message.includes('AWS_SECRET_ACCESS_KEY')));
  assert.ok(!JSON.stringify(errors).includes('test_secret_only'));
});
