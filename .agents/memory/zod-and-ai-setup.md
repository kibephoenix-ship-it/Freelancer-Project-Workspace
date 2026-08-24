---
name: Zod and AI setup constraints
description: Workspace-specific compatibility notes for generated contracts and Gemini-backed features.
---

The shared API codegen currently targets Zod 3, so OpenAPI integer fields can emit an unsupported `zod.int()` helper; use numeric contracts for generated count fields unless the generator configuration changes.

**Why:** The first generated contract failed during the workspace library typecheck even though Orval completed successfully.

**How to apply:** After changing OpenAPI schemas, run codegen and the library typecheck before relying on generated hooks. For Gemini features, prefer the managed AI integration; if account setup is unavailable, use a securely stored `GEMINI_API_KEY` and retain a non-AI fallback where graceful degradation is acceptable.