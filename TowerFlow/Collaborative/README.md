# TowerFlow Collaborative Foundation

**Status:** implementation scaffold committed to a separate branch. It is not yet a deployed or verified multi-user service.

## Purpose

Add a cross-platform room foundation alongside the existing TowerFlow portfolio application. The original `TowerFlow/` files are not replaced.

## Current scope

- Responsive browser UI for desktop, tablet, and mobile.
- Supabase email-link authentication.
- Persistent rooms and owner/editor/viewer membership.
- Private-by-default room visibility through PostgreSQL row-level security.
- Owner-created, expiring, use-limited viewer invitation links.
- Persistent room messages and server-side activity events.
- Realtime message and activity subscriptions.

## Not included yet

- Production deployment, custom domain, billing, backups or disaster recovery.
- Live multi-user document editing / conflict resolution.
- AI room participant or AI provider credentials.
- Corporate public-data research.
- Equity quote provider or live market feed.
- Full invitation management/revocation UI.
- Automated browser/e2e or live two-account tests.

## Architecture choice

This initial scaffold uses Supabase (PostgreSQL, Auth, RLS and Realtime) to reduce operational cost and avoid operating a separate authentication, database, and WebSocket stack at the outset. The frontend uses the Supabase JavaScript client from an ESM CDN.

Supabase is a **proposed implementation choice** for the approved provider-based/hybrid hosting direction. Hosting provider and paid tier still require owner approval before production use.

## Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase/migrations/0001_collaboration.sql`.
3. In Supabase project settings, configure Auth email sign-in and the allowed redirect URLs for the local and hosted app origins.
4. Copy `config.example.js` to `config.js`.
5. Set `SUPABASE_URL` and the public anon/publishable key in `config.js`.
6. Serve this directory over HTTP (not `file://`). For example, with Node installed, run `npx serve .` from this directory, or use another static web host.
7. Open `index.html`, sign in using the emailed link, create a room, then invite another signed-in user.

The anon/publishable key is designed for browser use and is safe to expose **only because** RLS is enabled. Never put a Supabase service-role key, AI API key, or market-data secret in browser code or `config.js`.

## Data and permissions

- Room creation is performed by a database function that atomically creates the room and its owner membership.
- Rooms, membership, messages and activity are protected by RLS.
- Only owners can create invitations in this first cut.
- Invitation tokens are random, hashed at rest, expire after seven days by default, and are limited to ten uses by default.
- Invitations grant Viewer access by default. The SQL function can create Editor invitations, but the current UI intentionally only exposes Viewer invitations.
- Editors and owners can send room messages; viewers can read.
- Room activity records room creation, invitation creation, member joining, and message sent events. This is an activity feed, not a tamper-proof compliance audit log.

## First verification checklist

- [ ] Apply SQL migration without errors.
- [ ] Configure Auth redirect URLs and public client config.
- [ ] Sign in as account A.
- [ ] Create a room and confirm owner membership.
- [ ] Create an invitation and open it in a separate browser/device.
- [ ] Sign in as account B and accept the invitation.
- [ ] Confirm both accounts can see room messages in realtime.
- [ ] Confirm Viewer cannot send messages.
- [ ] Confirm account B cannot read a room it was not invited to.
- [ ] Confirm expired/revoked/used-up invitation tokens fail.
- [ ] Confirm refresh and reauthentication preserve rooms and messages.

## Security notes / follow-up hardening

- Apply database migrations through controlled deployment and review SQL policy behavior with two independent accounts before public use.
- Configure Supabase Auth rate limits, email templates, allowed origins, and provider security settings.
- Add invitation revocation RPC/UI and role-management workflow.
- Add server-enforced rate limiting and abuse monitoring for messages and invite creation.
- Add automated SQL/RLS integration tests.
- Add backup/restore verification before storing important business data.
- Keep service-role credentials server-side only.
