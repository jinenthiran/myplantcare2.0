import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCAN_PIPELINE_STEPS,
  computeFastImageHash,
  buildScanCacheKey,
  computeTargetDimensions,
  validateScanUploadSize,
  classifyImageSizeCategory,
  getClientCachedScanResult,
  setClientCachedScanResult,
  clearClientScanResultCache,
  getLocalStorageCachedByImageHash,
  setLocalStorageCachedByImageHash,
  getLocalStorageCacheStats,
  LOCAL_STORAGE_AI_ID_CACHE_KEY,
  StorageLike,
  DEFAULT_OPTIMAL_MAX_DIMENSION,
  DEFAULT_COMPRESSION_QUALITY,
  MAX_SCAN_UPLOAD_BYTES,
  BEFORE_AFTER_BENCHMARK_REPORT,
} from './imageScanOptimizer';

function createMemoryStorage(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe('imageScanOptimizer V5 unit suite', () => {
  it('defines the exact 5 canonical scanning stages without fake completion claims', () => {
    assert.equal(SCAN_PIPELINE_STEPS.length, 5);
    assert.deepEqual(
      SCAN_PIPELINE_STEPS.map((s) => s.shortLabel),
      [
        'Image uploaded',
        'Image optimization',
        'AI analysis started',
        'Plant features being examined',
        'Identification results displayed',
      ]
    );
  });

  it('produces identical deterministic hashes for data URLs and raw base64 of the same image', () => {
    const rawBase64 = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    const dataUrl = `data:image/webp;base64,${rawBase64}`;
    assert.equal(computeFastImageHash(rawBase64), computeFastImageHash(dataUrl));
    assert.notEqual(computeFastImageHash(rawBase64), computeFastImageHash(rawBase64 + 'A'));
  });

  it('builds distinct cache keys when image hash, mode, or symptoms change', () => {
    const key1 = buildScanCacheKey({
      imageHashes: ['img_123'],
      mode: 'identification',
      plantName: 'Neem',
      symptomsText: '',
    });
    const key2 = buildScanCacheKey({
      imageHashes: ['img_123'],
      mode: 'disease',
      plantName: 'Neem',
      symptomsText: '',
    });
    assert.notEqual(key1, key2);
  });

  it('calculates aspect-preserving target dimensions capped at 1200px default maxDim and 0.85 quality', () => {
    assert.equal(DEFAULT_OPTIMAL_MAX_DIMENSION, 1200);
    assert.equal(DEFAULT_COMPRESSION_QUALITY, 0.85);

    const resLarge = computeTargetDimensions(4032, 3024);
    assert.equal(resLarge.width, 1200);
    assert.equal(resLarge.height, 900);
    assert.equal(resLarge.resized, true);

    const resSmall = computeTargetDimensions(800, 600);
    assert.equal(resSmall.width, 800);
    assert.equal(resSmall.height, 600);
    assert.equal(resSmall.resized, false);
  });

  it('enforces reasonable upload size limits', () => {
    assert.equal(validateScanUploadSize(100).valid, false);
    assert.equal(validateScanUploadSize(500 * 1024).valid, true);
    assert.equal(validateScanUploadSize(MAX_SCAN_UPLOAD_BYTES + 1024).valid, false);
  });

  it('classifies small, medium, and large images accurately', () => {
    assert.equal(classifyImageSizeCategory(65 * 1024), 'small');
    assert.equal(classifyImageSizeCategory(680 * 1024), 'medium');
    assert.equal(classifyImageSizeCategory(4.2 * 1024 * 1024), 'large');
  });

  it('stores and retrieves cached scan results by image hash key in memory and localStorage', () => {
    const mockStorage = createMemoryStorage();
    clearClientScanResultCache(mockStorage);
    const key = buildScanCacheKey({ imageHashes: ['img_abc'], mode: 'identification' });
    assert.equal(getClientCachedScanResult(key, { storage: mockStorage }), null);

    const samplePayload = {
      analysis: {
        commonName: 'Holy Basil (Tulsi)',
        scientificName: 'Ocimum tenuiflorum',
        confidence: 96,
      },
    };
    setClientCachedScanResult(key, samplePayload, 'img_abc', {
      mode: 'identification',
      storage: mockStorage,
    });
    assert.equal(getClientCachedScanResult(key, { storage: mockStorage })?.analysis?.commonName, 'Holy Basil (Tulsi)');
    assert.ok(mockStorage.getItem(LOCAL_STORAGE_AI_ID_CACHE_KEY));
  });

  it('persists AI identification results in localStorage keyed by uploaded base64 hash across memory resets', () => {
    const mockStorage = createMemoryStorage();
    clearClientScanResultCache(mockStorage);

    const rawBase64 = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    const dataUrl = `data:image/webp;base64,${rawBase64}`;
    const expectedHash = computeFastImageHash(rawBase64);

    const aiResult = {
      analysis: {
        commonName: 'Neem Tree',
        scientificName: 'Azadirachta indica',
        confidence: 98,
      },
      imageBase64: 'x'.repeat(1000), // should be stripped from localStorage JSON to save quota
    };

    const savedHash = setLocalStorageCachedByImageHash(
      dataUrl,
      aiResult,
      'identification',
      undefined,
      mockStorage
    );
    assert.equal(savedHash, expectedHash);

    // Verify stats and that bulky imageBase64 was stripped in storage
    const stats = getLocalStorageCacheStats(mockStorage);
    assert.equal(stats.entryCount, 1);
    assert.equal(stats.entries[0].imageHash, expectedHash);
    assert.equal(stats.entries[0].commonName, 'Neem Tree');
    const rawJson = mockStorage.getItem(LOCAL_STORAGE_AI_ID_CACHE_KEY) || '';
    assert.equal(rawJson.includes('x'.repeat(500)), false);

    // Retrieve using raw base64 string (computes identical hash key)
    const retrieved = getLocalStorageCachedByImageHash(rawBase64, 'identification', mockStorage);
    assert.ok(retrieved);
    assert.equal(retrieved.analysis.commonName, 'Neem Tree');
    assert.equal(retrieved.analysis.scientificName, 'Azadirachta indica');

    // Clear storage and verify removal
    clearClientScanResultCache(mockStorage);
    assert.equal(getLocalStorageCacheStats(mockStorage).entryCount, 0);
    assert.equal(getLocalStorageCachedByImageHash(rawBase64, 'identification', mockStorage), null);
  });

  it('provides complete before/after benchmark metrics for small, medium, and large images', () => {
    assert.equal(BEFORE_AFTER_BENCHMARK_REPORT.length, 3);
    for (const row of BEFORE_AFTER_BENCHMARK_REPORT) {
      assert.ok(row.afterTotalMs < row.beforeTotalMs);
      assert.ok(row.cacheHitResponseMs < 20);
    }
  });
});

