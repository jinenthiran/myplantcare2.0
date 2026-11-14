import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Phase 0 & Phase 5 Security Audit Runner verifying all Dirty Dozen invariants in firestore.rules
const rulesText = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('Firestore Rules enforce global default-deny catch-all and rules_version 2', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
});

test('Firestore Rules reject Dirty Dozen: unverified email, ID poisoning, shadow fields, and timestamp forgery', () => {
  // 1 & 2. Verified user guard
  assert.match(rulesText, /request\.auth\.token\.email_verified\s*==\s*true/);
  // 3. Identity integrity
  assert.match(rulesText, /data\.userId\s*==\s*request\.auth\.uid/);
  // 4. Strict key allowlist on create (blocks shadow fields)
  assert.match(rulesText, /data\.keys\(\)\.hasAll\(/);
  assert.match(rulesText, /data\.keys\(\)\.hasOnly\(/);
  // 5. Action-based update with affectedKeys().hasOnly()
  assert.match(rulesText, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(/);
  // 6. Path variable ID regex hardening
  assert.match(rulesText, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  // 7. Volumetric boundary limits
  assert.match(rulesText, /data\.noteText\.size\(\)\s*<=\s*1000/);
  // 8 & 9. Immutable fields & server timestamps
  assert.match(rulesText, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt\s*==\s*request\.time/);
  assert.match(rulesText, /incoming\(\)\.createdAt\s*==\s*existing\(\)\.createdAt/);
  assert.match(rulesText, /incoming\(\)\.userId\s*==\s*existing\(\)\.userId/);
  // 10 & 11 & 12. Relational existence & secure list query enforcement
  assert.match(rulesText, /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)/);
  assert.match(rulesText, /allow\s+list:\s*if\s+isSignedIn\(\)\s*&&\s*\(resource\.data\.userId\s*==\s*request\.auth\.uid\s*\|\|\s*isAdmin\(\)\)/);
  assert.match(rulesText, /isValidImageCorrectionAudit\(incoming\(\)\)/);
  assert.match(rulesText, /match\s+\/imageCorrectionAudits\/\{auditId\}/);
});

