#!/usr/bin/env sh
set -eu

# List domain names as newline-delimited text.
space --json domain-management get-domain-list --take 100 --skip 0 | jq -r '.items[].name'

# Inspect an asynchronous operation without decorating stdout.
space --json async-operations get-async-operation-details "$1" | jq '{status, type}'

# Preview a mutation; no credentials or network request are needed.
space --json domain-settings update-autorenewal example.com --data '{"autoRenew":true}' --dry-run | jq .
