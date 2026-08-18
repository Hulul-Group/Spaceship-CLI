# Spaceship CLI

A typed, script-friendly command-line client covering every operation in the Spaceship.com OpenAPI specification.

## Install

Install globally with Bun:

```sh
bun add --global @hululgroup/spaceship-cli
```

To install from source, use [Bun](https://bun.sh/) 1.1 or newer:

```sh
bun install
bun run build
bun link
```

Tagged GitHub releases also contain standalone binaries that do not require Bun.

## 30-second quickstart

```sh
space auth login
space domain example.com get
space domain example.com records list --take 20 --skip 0
space -j domain example.com get | jq .expirationDate
```

Run `space --help`, then `space <group> --help`, for the complete command catalog generated from `openapi.json`.

The package installs `space` as the primary command and keeps `spaceship` as a compatibility name. To add another prefix in the same executable directory:

```sh
space prefix set ship
space prefix set my-company
space prefix remove my-company
```

Custom prefixes are validated and never overwrite an existing command. `space` and `ship` are already used by unrelated tools, so check your environment before choosing a shared name. The permanent `space` and compatibility `spaceship` entries can restore access if a custom alias is removed.

## Authentication

The API requires both `X-API-Key` and `X-API-Secret`. Interactive login stores the public API key in the selected config profile and the secret in macOS Keychain or Linux libsecret. If neither is available, the secret is stored in a warning-announced `0600` credentials file. In CI, avoid persistence:

```sh
export SPACESHIP_API_KEY='...'
export SPACESHIP_API_SECRET='...'
space -j async status OPERATION_ID
```

## Command reference

The main resource groups are:

```text
auth
async
contact
domain
nameserver
transfer
hyperlift
seller
```

Domain commands put the domain name first, followed by the resource and action. Query flags use kebab case. Changes support `-n` to preview; deletes require confirmation or `-y`. Previous group and operation names remain available as aliases.

```sh
space domain example.com records list
space domain example.com records set www 192.0.2.10 --type A --ttl 300
space domain example.com records set @ mail.example.com --type MX --priority 10
space domain example.com records save -d @records.json
space domain example.com nameservers set ns1.example.net ns2.example.net
space domain example.com nameservers use-basic
space seller update-domain example.com -d @update.json
space domain example.com delete -y
```

`records save` accepts either `{ "items": [...] }` or a bare JSON array for batch changes. `records set` and `records remove` build one-item batches. Supported types are A, AAAA, ALIAS, CAA, CNAME, HTTPS, MX, NS, PTR, SRV, SVCB, TLSA, and TXT. Type-specific flags are shown by `space domain example.com records -h`.

Common short flags are `-j` (JSON), `-q` (quiet), `-v` (verbose), `-p` (profile), `-t` (timeout), and `-u` (API URL). Their long forms still work.

## Configuration and environment variables

Precedence is CLI flag, environment, profile config, built-in default. Configuration lives at `$XDG_CONFIG_HOME/spaceship/config.json` or `~/.config/spaceship/config.json`. Secrets are never written there.

| Variable | Purpose |
|---|---|
| `SPACESHIP_API_KEY` | API key |
| `SPACESHIP_API_SECRET` | API secret (preferred for CI) |
| `SPACESHIP_BASE_URL` | API server override |
| `SPACESHIP_PROFILE` | Named profile |
| `SPACESHIP_TIMEOUT` | Timeout in milliseconds |
| `NO_COLOR` | Disable color |

## Exit codes

| Code | Meaning |
|---:|---|
| 0 | Success |
| 1 | General/API error |
| 2 | Invalid usage |
| 3 | Authentication/authorization failure |
| 4 | Resource not found |
| 5 | Network error or timeout |

## Troubleshooting

- `API credentials are missing`: run `space auth login` or export both credential variables.
- `unexpected response`: the live API no longer matches the bundled schema; upgrade the CLI and retry with `--verbose`.
- rate limiting: idempotent requests retry automatically and honor `Retry-After`.
- non-interactive delete: explicitly pass `--yes`.

## API analysis and assumptions

- Authentication uses the two headers above; it is not bearer or OAuth authentication.
- Resources are domains, domain availability/settings/transfers, personal nameservers, contacts and attributes, DNS records, SellerHub domains/transactions/verification, Hyperlift applications, and async operations.
- Lists use required `take`/`skip` offset pagination where pagination is exposed. Envelopes generally contain `items` and `total`.
- Errors use RFC problem-style JSON plus `spaceship-error-code` and `spaceship-operation-id` headers. HTTP 429 documents `X-RateLimit-*` and `Retry-After` headers, but the specification gives no fixed quota.
- The only documented server is `https://spaceship.dev/api`; no staging or regional server is specified.
- Scope is assumed to be all 50 documented operations because the plan left `Scope` blank. The binary is `spaceship`; the npm package is published as `@hululgroup/spaceship-cli`.
- `TODO(verify)`: Windows Credential Manager support is not implemented because Bun provides no built-in secure credential API and the specification does not select a Windows helper. On Windows the CLI uses the warned `0600` fallback (subject to filesystem ACL semantics).

## Development

```sh
bun run check
bun run compile
```
