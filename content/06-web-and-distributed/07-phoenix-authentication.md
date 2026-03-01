---
title: "Phoenix Authentication"
description: "Implement secure authentication in Phoenix with sessions, password hashing, login/logout flows, authorization boundaries, and common production hardening steps."
weight: 7
phase: 6
lesson: 34
difficulty: "advanced"
estimatedMinutes: 35
draft: false
date: 2025-03-01
prerequisites:
  - "/06-web-and-distributed/01-phoenix"
  - "/06-web-and-distributed/03-ecto"
  - "/04-practical-development/02-testing"
hexdocsLinks:
  - title: "Phoenix Authentication Generator"
    url: "https://hexdocs.pm/phoenix/mix_phx_gen_auth.html"
  - title: "Plug.Conn"
    url: "https://hexdocs.pm/plug/Plug.Conn.html"
  - title: "Bcrypt Elixir"
    url: "https://hexdocs.pm/bcrypt_elixir/readme.html"
tags:
  - phoenix
  - authentication
  - authorization
  - sessions
  - security
keyTakeaways:
  - "Authentication and authorization should be explicit boundaries in Phoenix pipelines and contexts"
  - "Session handling, password hashing, and token lifecycle controls are core security requirements"
  - "Secure defaults, tests, and audits prevent common auth regressions"
---

Authentication is one of the highest-risk parts of any web application. In Phoenix, a robust auth design starts with clear boundaries:

- **Authentication**: who is this user?
- **Authorization**: is this user allowed to perform this action?

Treating these as separate concerns keeps controllers, contexts, and policies maintainable.

## Baseline Flow

A production-ready baseline typically includes:

1. User registration with validated credentials.
2. Password hashing (`bcrypt` or `argon2`) before persistence.
3. Login that issues a server-side session.
4. Logout that renews and clears session state.
5. Route protection via pipelines/plugs.

Phoenix provides `phx.gen.auth` as a strong starting point.

## Secure Password Storage

Never store plaintext passwords. Hash and verify with a dedicated library.

```elixir
def create_user(attrs) do
  %User{}
  |> User.registration_changeset(attrs)
  |> put_password_hash()
  |> Repo.insert()
end

defp put_password_hash(changeset) do
  if password = Ecto.Changeset.get_change(changeset, :password) do
    Ecto.Changeset.put_change(changeset, :hashed_password, Bcrypt.hash_pwd_salt(password))
  else
    changeset
  end
end
```

## Session and Current User Plug

A common pattern is loading the current user from session in a browser pipeline:

```elixir
pipeline :browser do
  plug :accepts, ["html"]
  plug :fetch_session
  plug :fetch_current_user
end

defp fetch_current_user(conn, _opts) do
  user_id = get_session(conn, :user_id)
  assign(conn, :current_user, user_id && Accounts.get_user(user_id))
end
```

Pair this with route-level plugs for authorization checks.

## Authorization Strategy

Authorization should live close to business logic, not only in templates.

Pragmatic options:

- role checks (`admin`, `editor`, `member`) for simple apps,
- policy modules for resource-scoped rules,
- explicit checks in context functions for critical operations.

## Common Hardening Steps

- Renew session on login to prevent fixation.
- Set secure cookies and proper `SameSite` policy.
- Use CSRF protections for browser forms.
- Rate-limit login/reset endpoints.
- Implement account lockout/backoff for repeated failures.
- Add audit logs for auth-critical events.

{{% compare %}}
```python
# Django
# Authentication and sessions are built-in middleware + auth backend.
# You still need explicit permission checks in views/services.
```

```javascript
// Express
// Common stack: passport/jwt + custom middleware.
// Security quality depends heavily on implementation discipline.
```

```elixir
# Phoenix
# phx.gen.auth provides a secure baseline,
# then you enforce authorization through plugs + context checks.
```
{{% /compare %}}

## Testing Authentication

Add targeted tests for:

- successful/failed login,
- session renewal and logout behavior,
- protected route redirects,
- authorization denial for forbidden actions.

Auth code often appears correct in happy paths, so negative tests are essential.

## Exercise

{{< exercise title="Add Role-Based Authorization to a Phoenix App" >}}
Starting from an authenticated app:

1. Add a `role` field to users (`member`, `admin`).
2. Create an `:ensure_admin` plug.
3. Restrict an admin-only route group.
4. Add policy checks in one context function (not only controller).
5. Write tests for allowed and denied requests.
{{< /exercise >}}

## FAQ and Troubleshooting

### Why does a logged-in user still look unauthenticated?
Usually the session was not fetched or `:current_user` was not assigned in the correct pipeline. Verify plug order (`fetch_session` before `fetch_current_user`) and confirm the right browser pipeline is applied to your routes.

### Why do users get logged out unexpectedly?
Check cookie settings, session renewal logic, and deployment environment config. Mismatched secrets, proxy headers, or invalid cookie flags across environments are common causes.

### Where should authorization checks live?
Use multiple layers: route-level guards for coarse access and context-level checks for critical data mutations. Relying only on UI/controller checks creates easy bypass paths.
