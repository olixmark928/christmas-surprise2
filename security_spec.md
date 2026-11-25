# Security Specification: Shared Christmas Memory Leaderboard

## 1. Data Invariants
1. Every document in `/leaderboard/{entryId}` MUST have a valid ID matching `^[a-zA-Z0-9_\-]+$` with length `1..128`.
2. Every document MUST contain strictly the exact 5 fields: `name`, `score`, `totalQuestions`, `totalTime`, `createdAt` (no extra/shadow fields).
3. `name` MUST be a non-empty trimmed string with length `1..20`.
4. `score` MUST be an integer in `[0, 6]` and `score <= totalQuestions`.
5. `totalQuestions` MUST be an integer equal to `6`.
6. `totalTime` MUST be a number in `[0, 48]` (8 seconds max per question × 6 questions).
7. `createdAt` MUST equal `request.time` (server timestamp).
8. Existing leaderboard entries are immutable (`update` and `delete` are always denied).
9. No PII (`email`, `phone`, `address`) is stored in `/leaderboard/{entryId}`.

## 2. Adversarial "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Shadow Field Injection**: `{ "name": "Alice", "score": 6, "totalQuestions": 6, "totalTime": 10.5, "createdAt": "<request.time>", "isAdmin": true }`
2. **Oversized Name (Denial of Wallet)**: `{ "name": "<200 chars>", "score": 6, "totalQuestions": 6, "totalTime": 10.5, "createdAt": "<request.time>" }`
3. **Empty Name**: `{ "name": "", "score": 6, "totalQuestions": 6, "totalTime": 10.5, "createdAt": "<request.time>" }`
4. **Score Out of Bounds (>6)**: `{ "name": "Cheater", "score": 99, "totalQuestions": 6, "totalTime": 1.0, "createdAt": "<request.time>" }`
5. **Negative Score**: `{ "name": "Bob", "score": -1, "totalQuestions": 6, "totalTime": 5.0, "createdAt": "<request.time>" }`
6. **Float Score**: `{ "name": "Bob", "score": 5.5, "totalQuestions": 6, "totalTime": 5.0, "createdAt": "<request.time>" }`
7. **Forged totalQuestions**: `{ "name": "Bob", "score": 10, "totalQuestions": 10, "totalTime": 5.0, "createdAt": "<request.time>" }`
8. **Negative totalTime**: `{ "name": "Speed", "score": 6, "totalQuestions": 6, "totalTime": -5, "createdAt": "<request.time>" }`
9. **Client-Spoofed Timestamp**: `{ "name": "Bob", "score": 6, "totalQuestions": 6, "totalTime": 12.0, "createdAt": 1700000000000 }`
10. **Invalid Document ID Poisoning**: Creating `/leaderboard/bad$id!!` or 200-char ID.
11. **Score Tampering (Update)**: Updating any existing `/leaderboard/{entryId}` document to raise `score` or lower `totalTime`.
12. **Score Erasure (Delete)**: Deleting any existing `/leaderboard/{entryId}` document.
