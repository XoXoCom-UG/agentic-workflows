# Optional: Cloud Webhook Layer (Modal)

> Project-specific feature, moved out of `CLAUDE.md` to keep the global agent guide
> compact. This documents the optional Modal-hosted webhook layer that can trigger
> directives remotely. It is **not** used by every workflow (e.g. the landing-page
> builds don't use it). Read this only when working on webhooks.

## What it is

A Modal app that exposes HTTP endpoints so directives can be triggered remotely
(e.g. from another service) instead of from an interactive session. Webhook activity
streams to Slack in real time.

## Key files

- `execution/webhooks.json` — Webhook slug → directive mapping
- `execution/modal_webhook.py` — Modal app for cloud execution (modify only when necessary)
- `directives/add_webhook.md` — Intended complete setup guide. **Note:** this directive
  does not exist yet — create it (per the "How to Create a Directive" rules in `CLAUDE.md`)
  the first time you formalize the webhook flow.

## Adding a webhook

1. Read `directives/add_webhook.md` for complete instructions (create it if missing).
2. Create the directive file in `directives/`.
3. Add an entry to `execution/webhooks.json`.
4. Deploy: `modal deploy execution/modal_webhook.py`.
5. Test the endpoint.

## Endpoints

Filled in after `modal deploy execution/modal_webhook.py`:

- `https://<modal-user>--claude-orchestrator-list-webhooks.modal.run` — List webhooks
- `https://<modal-user>--claude-orchestrator-directive.modal.run?slug={slug}` — Execute directive
- `https://<modal-user>--claude-orchestrator-test-email.modal.run` — Test email

## Available tools for webhooks

`send_email`, `read_sheet`, `update_sheet`

## Credentials

Google integrations used by some webhook tools rely on `credentials.json` and
`token.json` (Google OAuth, kept in `.gitignore`).

All webhook activity streams to Slack in real-time.
