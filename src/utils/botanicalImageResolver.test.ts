import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BOTANICAL_IMAGES,
  BOTANICAL_IMAGE_FILES,
  getSpeciesFallbackImage,
  resolveBotanicalImageUrl,
} from './botanicalImageResolver';

test('all botanical catalog image files exist as optimized WebP assets in public/images', () => {
  for (const file of BOTANICAL_IMAGE_FILES) {
    const abs = path.join(process.cwd(), 'public', 'images', file);
    assert.equal(fs.existsSync(abs), true, `Missing public/images/${file}`);
    const stat = fs.statSync(abs);
    assert.ok(stat.size > 1000 && stat.size < 400000, `Unexpected file size for ${file}: ${stat.size}`);
  }
});

test('resolveBotanicalImageUrl maps legacy /src/assets/images/*.jpg paths to /images/*.webp', () => {
  assert.equal(
    resolveBotanicalImageUrl('/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg'),
    BOTANICAL_IMAGES.monsteraDeliciosa
  );
  assert.equal(
    resolveBotanicalImageUrl('/src/assets/images/hero_botanical_sanctuary_1794482113239.jpg'),
    BOTANICAL_IMAGES.heroSanctuary
  );
  assert.equal(
    resolveBotanicalImageUrl('/src/assets/images/plant_fiddle_leaf_fig_1794482114191.jpg'),
    BOTANICAL_IMAGES.fiddleLeafFig
  );
});

test('resolveBotanicalImageUrl preserves data/blob/https URLs and upgrades http to https', () => {
  const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ';
  assert.equal(resolveBotanicalImageUrl(dataUrl), dataUrl);
  assert.equal(resolveBotanicalImageUrl('blob:https://example.com/123'), 'blob:https://example.com/123');
  assert.equal(resolveBotanicalImageUrl('http://cdn.example.com/plant.jpg'), 'https://cdn.example.com/plant.jpg');
});

test('getSpeciesFallbackImage picks species-appropriate local WebP fallbacks and never substitutes unrelated species', () => {
  assert.equal(getSpeciesFallbackImage('Krishna Tulsi'), BOTANICAL_IMAGES.tulsiHolyBasil);
  assert.equal(getSpeciesFallbackImage('Ficus lyrata'), BOTANICAL_IMAGES.fiddleLeafFig);
  assert.equal(getSpeciesFallbackImage('Sansevieria'), BOTANICAL_IMAGES.snakePlant);
  assert.equal(resolveBotanicalImageUrl('', 'Areca Palm'), BOTANICAL_IMAGES.arecaPalm);
  assert.equal(getSpeciesFallbackImage('Mango'), '');
  assert.equal(resolveBotanicalImageUrl('', 'Unrecognized Rare Fern'), '');
});
