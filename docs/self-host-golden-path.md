# Self-Host Golden Path

Use this flow to get Outlayo running quickly and safely.

If you want first visible signal before the full operator path, start with `docs/10-minute-quickstart.md`.

## 1) Bootstrap

1. Install CLI (`docs/install-cli.md`) or run from source via `pnpm run cli -- init`.
2. Run `outlayo init` to pick connectors and generate `.env`.
3. Run `outlayo doctor` to validate required fields.
4. Run `pnpm install` and `pnpm run dev`.
5. Open `http://127.0.0.1:8787` and `http://127.0.0.1:8787/api/summary`.

## 2) Verify ingestion

- Confirm `/api/health/connectors` shows connector names and status.
- Confirm dashboard MTD and usage sections are populated.
- Confirm confidence section is present (authoritative/estimated/reconciled rows).
- Run `pnpm run verify:live` for real connector poll checks.
- Run `pnpm test` before opening a contribution or deploying changes.

## 3) Add app-side ingest and reconciliation

- Use `/api/ingest/events` to submit app-side normalized events when vendor telemetry is partial.
- Ensure each event has stable `source_ref` for idempotent upsert behavior.
- For package setup + HTTP interception examples, follow `docs/app-side-auto-intercept.md`.
- For a concrete confidence/reconciliation example, follow `docs/reconciliation-walkthrough.md`.

## 4) Production hardening checklist

- Set `ADMIN_TOKEN` on non-local deployments.
- Store secrets in a secret manager, not in git.
- Enable backups and monitor DB/storage health.
- Rotate vendor tokens on a regular schedule.
- Add alert webhook and monthly budget thresholds.
- Pin dependency updates and run tests before deploy.
