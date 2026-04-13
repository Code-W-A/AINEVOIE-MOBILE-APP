import { describe, expect, it } from '@jest/globals';
import { resolveStorageBucket } from '../../src/firebase';

describe('firebase admin config helpers', () => {
  it('prefers the storage bucket from FIREBASE_CONFIG when present', () => {
    const bucket = resolveStorageBucket(
      'ainevoie-ca861',
      JSON.stringify({
        projectId: 'ainevoie-ca861',
        storageBucket: 'custom-bucket.firebasestorage.app',
      }),
    );

    expect(bucket).toBe('custom-bucket.firebasestorage.app');
  });

  it('falls back to the project id heuristic when FIREBASE_CONFIG has no bucket', () => {
    const bucket = resolveStorageBucket('ainevoie-ca861', JSON.stringify({ projectId: 'ainevoie-ca861' }));
    expect(bucket).toBe('ainevoie-ca861.firebasestorage.app');
  });

  it('returns undefined when neither FIREBASE_CONFIG nor project id can resolve a bucket', () => {
    const bucket = resolveStorageBucket('', '');
    expect(bucket).toBeUndefined();
  });
});
