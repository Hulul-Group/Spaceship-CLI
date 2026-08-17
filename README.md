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
spaceship auth login
spaceship domain-management get-domain-list --take 20 --skip 0
spaceship --json domain-management get-domain-info example.com | jq .expirationDate
```

Run `spaceship --help`, then `spaceship <group> --help`, for the complete command catalog generated from `openapi.json`.

## Authentication

The API requires both `X-API-Key` and `X-API-Secret`. Interactive login stores the public API key in the selected config profile and the secret in macOS Keychain or Linux libsecret. If neither is available, the secret is stored in a warning-announced `0600` credentials file. In CI, avoid persistence:

```sh
export SPACESHIP_API_KEY='...'
export SPACESHIP_API_SECRET='...'
spaceship --json async-operations get-async-operation-details OPERATION_ID
```

## Command reference

The top-level command groups are:

```text
auth
async-operations
contacts
contacts-attributes
dns-records
domain-management
domain-availability
domain-settings
personal-nameservers
domain-transfer
hyperlift
seller-hub
```

API commands use the OpenAPI `operationId` in kebab case. Required URL identifiers are positional. Query values are flags with the exact API spelling. Operations with JSON bodies accept `--data '{...}'` or `--data @request.json`. All mutating operations support `--dry-run`; deletes require confirmation or `--yes`.

```sh
spaceship dns-records get-resource-records-list example.com
spaceship domain-settings update-autorenewal example.com --data '{"autoRenew":true}' --dry-run
spaceship seller-hub update-seller-hub-domain example.com --data @update.json
spaceship domain-management domain-delete example.com --yes
```

Global flags include `--json`, `--quiet`, `--verbose`, `--no-color`, `--profile`, `--timeout`, and `--base-url`.

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

- `API credentials are missing`: run `spaceship auth login` or export both credential variables.
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
