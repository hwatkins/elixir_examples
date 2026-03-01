---
title: "Security Hardening in Phoenix"
description: "Harden Phoenix applications beyond baseline auth. Covers headers, CSP, CSRF, SSRF/XSS defenses, dependency hygiene, and security-focused testing."
weight: 6
phase: 7
lesson: 41
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/06-web-and-distributed/07-phoenix-authentication"
  - "/04-practical-development/02-testing"
  - "/06-web-and-distributed/06-deployment"
hexdocsLinks:
  - title: "Phoenix Security Guide"
    url: "https://hexdocs.pm/phoenix/security.html"
  - title: "Plug.CSRFProtection"
    url: "https://hexdocs.pm/plug/Plug.CSRFProtection.html"
  - title: "Plug.SSL"
    url: "https://hexdocs.pm/plug/Plug.SSL.html"
tags:
  - security
  - phoenix
  - csp
  - csrf
  - hardening
keyTakeaways:
  - "Security hardening requires layered controls across HTTP, app logic, and operations"
  - "Default protections are necessary but not sufficient for production exposure"
  - "Security test coverage and dependency hygiene prevent common regressions"
---

Authentication is only part of application security. Hardening Phoenix means reducing attack surface and adding layered safeguards across request handling, rendering, external calls, and runtime operations.

## Core Hardening Areas

- secure headers (CSP, X-Frame-Options, X-Content-Type-Options),
- strict TLS and cookie settings,
- CSRF protection in browser workflows,
- input validation and output escaping,
- dependency scanning and patch cadence.

## Security Headers Example

Use a plug or endpoint configuration to set strong defaults:

```elixir
plug :put_secure_browser_headers, %{
  "content-security-policy" => "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
  "x-frame-options" => "DENY",
  "x-content-type-options" => "nosniff",
  "referrer-policy" => "strict-origin-when-cross-origin"
}
```

Tune CSP incrementally to avoid breaking legitimate assets.

## CSRF, XSS, SSRF Basics

- CSRF: keep token protections enabled for browser forms.
- XSS: rely on Phoenix escaping defaults and avoid raw HTML interpolation.
- SSRF: restrict outbound destinations and validate URL targets in server-side fetchers.

## Session and Cookie Controls

- `secure: true` in production,
- `http_only: true` for session cookies,
- appropriate `same_site` policy,
- session renewal after privilege changes.

## Operational Security Practices

- rotate secrets and keys with procedure,
- enforce least privilege for service accounts,
- audit auth/admin actions,
- run dependency audits in CI.

{{% compare %}}
```python
# Django/Flask hardening
# Similar layers: headers, csrf/xss protections, secret and dependency hygiene.
```

```javascript
// Express/Nest hardening
// Helmet/CSP + input validation + secure cookie/session configuration.
```

```elixir
# Phoenix hardening
# Strong defaults + explicit layered controls for production threat models.
```
{{% /compare %}}

## Exercise

{{< exercise title="Harden a Phoenix Endpoint Group" >}}
Apply a hardening pass to one route group:

1. Add explicit security headers and CSP baseline.
2. Audit session cookie flags.
3. Add SSRF-safe URL validation for one outbound call path.
4. Add request-size and rate limits for sensitive endpoints.
5. Write tests for denied/malicious input scenarios.
{{< /exercise >}}

## FAQ and Troubleshooting

### CSP broke my frontend assets. What now?
Start with report-only mode, collect violations, then tighten progressively. Avoid broad `unsafe-inline` exceptions unless absolutely required.

### Are Phoenix defaults enough?
They are a strong base, but production risk profile usually requires additional controls and audits.

### What should security testing cover first?
Auth boundaries, admin actions, input validation, and outbound request paths.
