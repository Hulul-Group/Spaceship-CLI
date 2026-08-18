# Changelog

## 1.1.0 - 2026-08-18

- Add a domain-first command layout with nested DNS record and nameserver actions.
- Add type-aware single-record save and removal commands for all supported DNS record types.
- Shorten command names, options, descriptions, examples, and help output while retaining legacy aliases.

## 1.0.2 - 2026-08-18

- Render list envelopes as compact tables and use plain tabular output when piped.
- Source CLI and HTTP user-agent versions from `package.json`.

## 1.0.1 - 2026-08-18

- Fix OpenAPI `allOf` response validation for scalar references and nullable values.

## 1.0.0 - 2026-08-18

- Initial release with all 50 documented Spaceship API operations.
- Secure profile authentication, schema validation, retries, structured output, dry runs, and documented exit codes.
