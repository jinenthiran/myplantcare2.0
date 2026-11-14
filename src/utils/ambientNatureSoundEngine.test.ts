import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AmbientNatureSoundEngine,
  SOUND_PROFILES,
  getEnvironmentSoundProfile,
} from './ambientNatureSoundEngine';

test('getEnvironmentSoundProfile maps all three 3D lighting presets to distinct nature soundscapes', () => {
  const golden = getEnvironmentSoundProfile('golden');
  const daylight = getEnvironmentSoundProfile('daylight');
  const bio = getEnvironmentSoundProfile('bioluminescent');

  assert.equal(golden.shortLabel, 'Leaves & Birds');
  assert.equal(daylight.shortLabel, 'Forest Birds');
  assert.equal(bio.shortLabel, 'Night Rain');

  assert.ok(bio.rainGain > golden.rainGain, 'Bioluminescent night mode should amplify rainfall');
  assert.ok(golden.windGain > bio.windGain, 'Golden preset should highlight rustling foliage wind');
  assert.ok(
    daylight.birdIntervalMs[0] < golden.birdIntervalMs[0],
    'Daylight preset should feature more frequent morning forest birdsong'
  );
  assert.equal(Object.keys(SOUND_PROFILES).length, 3);
});

test('AmbientNatureSoundEngine handles non-browser environment and lifecycle cleanly', async () => {
  const engine = new AmbientNatureSoundEngine();
  assert.equal(engine.isActive(), false);
  assert.equal(engine.getEnvironment(), 'golden');

  engine.setEnvironment('bioluminescent');
  assert.equal(engine.getEnvironment(), 'bioluminescent');

  engine.setVolume(1.5);
  assert.equal(engine.getVolume(), 1);
  engine.setVolume(-0.2);
  assert.equal(engine.getVolume(), 0);

  const started = await engine.start('daylight');
  assert.equal(started, false);
  assert.equal(engine.getEnvironment(), 'daylight');

  engine.stop();
  engine.dispose();
  assert.equal(engine.isActive(), false);
});
