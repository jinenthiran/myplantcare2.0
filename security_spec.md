# MYPLANTCARE — Firestore Zero-Trust Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth
1. **Default-Deny Catch-All**: All paths in `/databases/{database}/documents` default to `allow read, write: if false;`.
2. **Verified Identity**: Every write operation (`create`, `update`, `delete`) requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening (`isValidId`)**: Every document ID path variable (`{userId}`, `{noteId}`, `{layoutId}`) on single-document operations (`get`, `create`, `update`, `delete`) is validated against `^[a-zA-Z0-9_\-]+$` with `size() >= 1 && size() <= 128`.
4. **Strict Ownership & Query Enforcement**:
   - `/users/{userId}`: Only the user whose `request.auth.uid == userId` (or a verified admin) can `get`, `create`, or `update` their preference document. No blanket `list` is allowed on `/users`.
   - `/botanicalNotes/{noteId}`: `userId` in `incoming()` must equal `request.auth.uid`, and the parent `/users/$(request.auth.uid)` preference document must exist (`exists()`). `allow list` strictly enforces `resource.data.userId == request.auth.uid`.
   - `/gardenLayouts/{layoutId}`: `userId` in `incoming()` must equal `request.auth.uid`, and the parent `/users/$(request.auth.uid)` preference document must exist (`exists()`). `allow list` strictly enforces `resource.data.userId == request.auth.uid`.
   - `/imageCorrectionAudits/{auditId}`: `userId` in `incoming()` must equal `request.auth.uid`, `plantId` must match `^[a-zA-Z0-9_\-]+$`, `actionType` must be one of `['flagged', 'verified_override', 'reverted']`, and the parent `/users/$(request.auth.uid)` preference document must exist (`exists()`). `allow list` strictly enforces `resource.data.userId == request.auth.uid || isAdmin()`.
5. **Temporal Integrity & Immutability**:
   - `createdAt == request.time` and `updatedAt == request.time` on `create`.
   - `createdAt == resource.data.createdAt`, `userId == resource.data.userId`, and `updatedAt == request.time` on `update`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Creating `/botanicalNotes/note_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating `/users/user_1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: User `uid_A` creates `/botanicalNotes/note_1` with `userId: "uid_B"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Creating `/botanicalNotes/note_1` with extra key `isAdmin: true` -> `PERMISSION_DENIED` (blocked by `keys().hasOnly(...)`).
5. **Shadow Field Injection on Update**: Updating `/botanicalNotes/note_1` with an unauthorized field -> `PERMISSION_DENIED` (blocked by `affectedKeys().hasOnly(...)`).
6. **ID Poisoning Attack**: Creating `/botanicalNotes/invalid$id!@#` -> `PERMISSION_DENIED` (blocked by `isValidId()`).
7. **Denial-of-Wallet String Overflow**: Creating `/botanicalNotes/note_1` with `noteText` > 1000 chars -> `PERMISSION_DENIED`.
8. **Immutable Field Tampering (`userId` / `createdAt`)**: Updating `/botanicalNotes/note_1` with modified `createdAt` or `userId` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating `/gardenLayouts/layout_1` with a forged past/future `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Invalid Enum State Injection**: Setting `lightingPreset: "nuclear"` on `/gardenLayouts/layout_1` or `actionType: "hack"` on `/imageCorrectionAudits/audit_1` -> `PERMISSION_DENIED`.
11. **Orphaned Sub-Entity Creation**: Creating `/botanicalNotes/note_1` or `/imageCorrectionAudits/audit_1` when `/users/$(request.auth.uid)` does not exist -> `PERMISSION_DENIED`.
12. **Cross-Tenant Read/List**: User `uid_A` attempting `get` or `list` on `/botanicalNotes` or `/imageCorrectionAudits` owned by `uid_B` -> `PERMISSION_DENIED`.

