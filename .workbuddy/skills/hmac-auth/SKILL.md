---
name: hmac-auth
description: This skill enforces a single-source-of-truth pattern for HMAC-SHA256 request signing and verification in the Wannianli project. It should be used whenever implementing, modifying, or reviewing any API authentication, request signature, or nonce logic on either the server (server/lib/hmac.js) or browser (web/js/hmac-spec.js) side. Triggers include "add auth", "sign request", "generate nonce", "HMAC", "401 signature invalid", or any code touching the x-machine-id / x-timestamp / x-nonce / x-signature headers.
agent_created: true
---

# HMAC Auth (统一签名/验签 · 单一事实源)

## Purpose

Keep the HMAC-SHA256 signing/verification logic in exactly **one** place per runtime so the browser and server never drift apart. This project previously had three copy-pasted implementations (auth.js, smoke_test_api.js, api.js) that silently diverged — including a `Math.random()` nonce that was a real replay vulnerability.

## Single source of truth

| Runtime | File | Role |
|---------|------|------|
| Server (Node) | `server/lib/hmac.js` | Authoritative `sign`, `verify`, `HEADER_NAMES`, `genNonce` (crypto.randomBytes) |
| Browser (ESM) | `web/js/hmac-spec.js` | `HEADER_NAMES`, `HMAC_KEY`, `buildMessage`, `genNonce` (crypto.getRandomValues) |

Both MUST compute `buildMessage = mid + ts + nonce + path` identically. If one changes, the other must change in the same commit.

## When to use this skill

- Adding or editing any authenticated API endpoint.
- Touching the four auth headers: `x-machine-id`, `x-timestamp`, `x-nonce`, `x-signature`.
- Reviewing a PR that introduces signing/nonce code — reject any new copy of the algorithm; point it at the shared module.
- Investigating `401 signature invalid`.

## Hard rules (CR-gate items)

- **No third copy.** Never re-implement the algorithm inline. Import from `server/lib/hmac.js` (server) or `web/js/hmac-spec.js` (browser).
- **Nonce MUST be crypto-secure.** Server: `crypto.randomBytes(4).toString('hex')`. Browser: `crypto.getRandomValues`. `Math.random()` is a security bug — reject it.
- **Key single source.** Server secret lives in `server/lib/hmac.js` (env `HMAC_SECRET` override). Browser key lives only in `web/js/hmac-spec.js`. Do not hardcode the literal in any other file.
- **Path must match.** The signed `path` is the request path including query string; server reads `req.originalUrl`, browser must pass the same.

## Reference

- `references/hmac.md` — full algorithm spec, header constants, and the smoke-test contract.
