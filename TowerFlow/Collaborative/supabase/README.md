# Superseded prototype — do not deploy

This directory contains the former Supabase-based TowerFlow collaboration experiment.

**The Supabase direction was retired on 2026-11-06.** These SQL migrations, local Supabase configuration, and pgTAP tests are retained temporarily as historical reference only. They are not part of the approved TowerFlow architecture and must not be applied to a project or used for deployment.

The approved replacement is documented in [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md). It uses a self-hostable Node.js/TypeScript service, WebSockets, self-hosted PostgreSQL, Yjs shared editing, per-participant code-server workspaces, and Git-based contributions.

Do not add features to this implementation. Remove these files from the active application when the replacement service foundation is introduced and validated.
