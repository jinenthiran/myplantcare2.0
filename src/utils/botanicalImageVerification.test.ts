import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_EXPANDED_PLANTS } from '../data/plants';
import { ACADEMY_MODULES, MARKETPLACE_CATALOG } from '../data/botanicalCatalog';
import {
  applyImageOverridesToCatalog,
  detectDuplicateImageUrls,
  generateBotanicalImageAuditReport,
  isAuthorizedImageCurator,
  matchLibraryPlantByName,
  validateAdminImageCorrectionInput,
  validateExternalBotanicalImageUrl,
} from './botanicalImageVerification';

test('all 113 expanded catalog plants have unique, verified botanical photography with zero stock URLs', () => {
  const report = generateBotanicalImageAuditReport(ALL_EXPANDED_PLANTS);
  assert.equal(report.totalRecords, 113);
  assert.equal(report.verifiedCount, 113, `Expected 113 verified plants, flagged: ${JSON.stringify(report.flaggedItems.map(f => f.plantId))}`);
  assert.equal(report.awaitingVerificationCount, 0);
  assert.equal(report.duplicateConflictCount, 0);
  assert.equal(report.suspiciousStockCount, 0);
  assert.equal(report.attributionGapCount, 0);
});

test('all referenced local plant, academy, and marketplace WebP assets exist on disk cleanly', () => {
  const referencedLocalPaths = new Set<string>();

  for (const p of ALL_EXPANDED_PLANTS) {
    assert.ok(p.imageUrl.startsWith('/images/'), `Expected local verified WebP for ${p.id}, got ${p.imageUrl}`);
    referencedLocalPaths.add(p.imageUrl);
  }
  for (const mod of ACADEMY_MODULES) {
    if (mod.visualType === 'Real Photograph' && mod.imageUrl) {
      referencedLocalPaths.add(mod.imageUrl);
    }
  }
  for (const item of MARKETPLACE_CATALOG) {
    referencedLocalPaths.add(item.imageUrl);
  }

  for (const rel of referencedLocalPaths) {
    const abs = path.join(process.cwd(), 'public', rel.replace(/^\/+/, ''));
    assert.equal(fs.existsSync(abs), true, `Missing local botanical asset on disk: ${abs}`);
    const stat = fs.statSync(abs);
    assert.ok(stat.size >= 2000, `Suspiciously small image asset (${stat.size} bytes): ${abs}`);
  }
});

test('matchLibraryPlantByName follows strict scientific > synonym > common > Tamil priority', () => {
  assert.equal(matchLibraryPlantByName(ALL_EXPANDED_PLANTS, 'Mangifera indica')?.id, 'mangifera-indica');
  assert.equal(matchLibraryPlantByName(ALL_EXPANDED_PLANTS, 'Ocimum sanctum')?.id, 'ocimum-tenuiflorum');
  assert.equal(matchLibraryPlantByName(ALL_EXPANDED_PLANTS, 'Neem Tree')?.id, 'azadirachta-indica');
  assert.equal(matchLibraryPlantByName(ALL_EXPANDED_PLANTS, 'வேம்பு')?.id, 'azadirachta-indica');
  assert.equal(matchLibraryPlantByName(ALL_EXPANDED_PLANTS, 'Dell Laptop'), null);
  assert.equal(matchLibraryPlantByName(ALL_EXPANDED_PLANTS, 'Tree'), null);
});

test('detectDuplicateImageUrls flags duplicate image reuse across unrelated species', () => {
  const sample = ALL_EXPANDED_PLANTS.slice(0, 3).map((p, idx) =>
    idx < 2 ? { ...p, imageUrl: '/images/plants/mangifera-indica.webp' } : p
  );
  const dupes = detectDuplicateImageUrls(sample);
  assert.equal(dupes.size, 1);
});

test('applyImageOverridesToCatalog updates only the targeted plantId without cross-polluting other records', () => {
  const target = ALL_EXPANDED_PLANTS[0];
  const neighbor = ALL_EXPANDED_PLANTS[1];
  const updated = applyImageOverridesToCatalog(ALL_EXPANDED_PLANTS, [
    {
      plantId: target.id,
      scientificName: target.scientificName,
      imageUrl: '/images/plants/custom-verified-specimen.webp',
      photographer: 'Dr. Kavya Nair',
      source: 'Botanical Survey Archive',
      license: 'CC BY 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
      verificationStatus: 'verified',
    },
  ]);

  assert.equal(updated[0].imageUrl, '/images/plants/custom-verified-specimen.webp');
  assert.equal(updated[0].attribution.photographer, 'Dr. Kavya Nair');
  assert.equal(updated[1].imageUrl, neighbor.imageUrl);
});

test('validateExternalBotanicalImageUrl rejects HTML pages and non-botanical placeholders', () => {
  assert.equal(validateExternalBotanicalImageUrl('').valid, false);
  assert.equal(validateExternalBotanicalImageUrl('https://example.com/page.html').valid, false);
  assert.equal(validateExternalBotanicalImageUrl('https://example.com/laptop-desk.jpg').valid, false);
  assert.equal(validateExternalBotanicalImageUrl('https://commons.wikimedia.org/wiki/Special:FilePath/Mangifera.jpg').valid, true);
});

test('isAuthorizedImageCurator authorizes bootstrap admin email and curator sessions', () => {
  assert.equal(isAuthorizedImageCurator({ email: 'jenasanjay17@gmail.com', emailVerified: true }).authorized, true);
  assert.equal(isAuthorizedImageCurator({ email: 'guest@example.com' }, false).authorized, false);
  assert.equal(isAuthorizedImageCurator({ email: 'guest@example.com' }, true).authorized, true);
});

test('validateAdminImageCorrectionInput enforces flag reasons and full attribution on replacement', () => {
  const validFlag = validateAdminImageCorrectionInput({
    mode: 'flag',
    plantId: 'mangifera-indica',
    flagReason: 'unrelated_object',
    flagNotes: 'Displayed a desk object instead of mango foliage.',
  });
  assert.equal(validFlag.valid, true);

  const invalidFlag = validateAdminImageCorrectionInput({
    mode: 'flag',
    plantId: 'mangifera-indica',
    flagReason: 'invalid_reason',
  });
  assert.equal(invalidFlag.valid, false);

  const missingConfirmReplace = validateAdminImageCorrectionInput({
    mode: 'replace',
    plantId: 'mangifera-indica',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mangifera_indica.jpg',
    photographer: 'Botanical Curator',
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mangifera_indica.jpg',
    confirmedByAdmin: false,
  });
  assert.equal(missingConfirmReplace.valid, false);

  const validReplace = validateAdminImageCorrectionInput({
    mode: 'replace',
    plantId: 'mangifera-indica',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mangifera_indica.jpg',
    photographer: 'Botanical Curator',
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mangifera_indica.jpg',
    confirmedByAdmin: true,
  });
  assert.equal(validReplace.valid, true);
});

