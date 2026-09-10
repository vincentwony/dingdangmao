# HMAC-SHA256 Auth — Algorithm Spec (single source of truth)

## Constants (identical on both runtimes)

```
HEADER_NAMES = {
  MID:   'x-machine-id',
  TS:    'x-timestamp',
  NONCE: 'x-nonce',
  SIG:   'x-signature'
}
SIGN_PREFIX_LEN = 8   // signature = first 8 hex chars of HMAC digest (= 4 bytes)
HMAC_SECRET = process.env.HMAC_SECRET || '381cb51f0923fc771bf7e81547c485f7'
```

Frontend mirror: `web/js/hmac-spec.js` exports `HEADER_NAMES`, `HMAC_KEY` (same literal),
`SIGN_PREFIX_LEN`, `buildMessage`, `genNonce`.

## Message to sign

```
message = String(mid) + String(ts) + String(nonce) + String(path)
```

- `path` = full request path **including query string**.
- Server reads it from `req.originalUrl`.
- Browser must pass the exact same string.

## Sign (server, `server/lib/hmac.js`)

```js
const full = crypto.createHmac('sha256', HMAC_SECRET)
  .update(buildMessage(mid, ts, nonce, path), 'utf8')
  .digest('hex');
return full.substring(0, SIGN_PREFIX_LEN);   // 8 hex chars
```

Browser mirror uses Web Crypto `subtle.sign` then slices 8 hex chars — result MUST equal.

## Verify (server)

1. Read `mid, ts, nonce, sig` from `HEADER_NAMES`.
2. Reject (401) if any missing.
3. `expected = sign(mid, ts, nonce, req.originalUrl)`.
4. Compare case-insensitively: `expected !== String(sig).toLowerCase()` → 401.
5. Time-window (±5 min) and nonce-dedup are enforced by the caller (`server/middleware/auth.js`).

## Nonce generation (security-critical)

| Runtime | Correct | Wrong (reject in CR) |
|---------|---------|----------------------|
| Server  | `crypto.randomBytes(4).toString('hex')` | `Math.random()` (predictable → replay) |
| Browser | `crypto.getRandomValues(new Uint8Array(4))` → hex | `Math.random()` |

## Smoke-test contract

`server/smoke_test_api.js` signs with the shared lib and posts to `http://127.0.0.1:3000`.
A green run (all PASS) proves server `verify` accepts client-shaped signatures and that
the shared lib is the single source. Any new auth code must pass this before merge.
