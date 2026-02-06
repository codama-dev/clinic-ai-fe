# What We Already Have vs. What to Ask the Base44 Agent

## What You Already Have (in `backend-information/`)

| Document | Content | Use for migration |
|----------|---------|-------------------|
| **db-entities.txt** | All 44 entities with field names, types, enums. Hebrew labels. | ✅ Full entity field list – use for API validation & DB columns. |
| **db-relations.txt** | All FK-style relationships (e.g. Patient → Client, Appointment → Patient). One-to-one vs many-to-one. | ✅ ER model – use for foreign keys and joins. |
| **db-important-data.txt** | Built-in fields, auto-increment, uniques, denormalization, status enums, soft delete, audit trail, arrays/objects, User rules, “no cascade delete”. | ✅ Patterns and constraints – use for backend behavior. |
| **db-schema.sql** | Full PostgreSQL DDL (~1000 lines): tables, triggers, RLS-style helpers. | ✅ Actual DB schema – use as-is or adapt for Express+Postgres. |
| **current-backend.txt** | BaaS overview, SDK usage (list/filter/create/update/delete), auth (me, logout, redirectToLogin), service role, integrations list, real-time subscribe, no transactions, soft delete, file upload. | ✅ How Base44 behaves – use to replicate in your API. |
| **some-backend-endpoints.txt** | REST-style endpoint list (entity CRUD, auth, WebSocket, upload, integrations, custom functions) + “Current: base44...” mapping + implementation priority. | ✅ Endpoint checklist for your backend. |
| **deno-functions.txt** | Full code of **importVaccinationHistory** and **syncSupplierPrices** (request body: `csvContent`, `dry_run` / `confirmed_items`, `dry_run`; logic and response shapes). | ✅ Exact contract for the 2 custom functions – reimplement from this. |
| **web-socket.txt** | WebSocket URL, subscribe/unsubscribe message format, server event types (create/update/delete) and payload shape. | ✅ Realtime API – use to implement WS in your backend. |
| **complete-openapi.json** | Full OpenAPI 3 spec (entities, auth, integrations, functions, health). | ✅ API spec for your replacement backend. |
| **OPENAPI_FRONTEND_COVERAGE.md** | Gaps: app public settings, Send SMS, auth refresh, PublicProfile vs PublicDoctorInfo. | ✅ Reminders for endpoints to add and names to align. |

So you already have:

- Entity list and field-level “schema” (db-entities)
- Relationships (db-relations)
- Behavioral notes (db-important-data, current-backend)
- Full SQL schema (db-schema.sql)
- Endpoint mapping (some-backend-endpoints)
- Custom function code and behavior (deno-functions)
- Realtime protocol (web-socket)
- OpenAPI + coverage report

---

## What Would Still Add Value from the Base44 Agent

The agent said it **cannot** give platform internals (public-settings API, token refresh, Core.SendSMS server contract). It **can** analyze your app code and produce:

1. **SDK call catalogue**  
   You do **not** have a single, exhaustive list of every `base44.*` call with file, line, and example. Grep and OPENAPI_FRONTEND_COVERAGE gave a high-level picture, not a “client-side contract” table.  
   → **Worth asking for:** “List every base44.* call in this app with file path, line/snippet, and a one-line description of what it’s used for.”

2. **JSON Schema per entity (optional)**  
   You have field names and types in db-entities and full SQL in db-schema.sql. You do **not** have the **JSON Schema** (e.g. `required`, `enum`, `format`) as Base44 would use it for validation.  
   → **Optional ask:** “For each entity this app uses, output the JSON Schema (properties, required, types, enums) as exposed in the app’s entities/schema, so we can use it for request validation in our backend.”  
   If the agent can’t see that in the repo, skip it.

3. **Migration checklist from actual usage**  
   You have implementation priority in some-backend-endpoints and OPENAPI_FRONTEND_COVERAGE. A **usage-based** checklist (e.g. “ClientFile page uses: Client.list, Patient.list, …”) can help with testing and ordering.  
   → **Worth asking for:** “Create a migration checklist: by page/feature, list which base44 entities and integrations are used, so we can test each part when we switch to our backend.”

4. **Do not ask again**  
   - Full list of 44 entities and their fields → you have db-entities.txt.  
   - Full relationship map → you have db-relations.txt.  
   - How the two Deno functions work → you have deno-functions.txt with full code.

---

## Refined Prompt for the Base44 Agent (copy-paste)

Use this so the agent doesn’t repeat what you already have and focuses on what’s missing.

---

**Prompt:**

We already have detailed docs for this app: full list of 44 entities with fields and types, all relationships between entities, full PostgreSQL schema, endpoint mapping to base44, and the full code of our two custom functions (importVaccinationHistory, syncSupplierPrices). We also have OpenAPI and a coverage report.

We do **not** need you to recreate entity schemas or relationship diagrams. We need the following only:

1. **SDK call catalogue (from this app’s code)**  
   Scan the entire frontend (all `src/` files) and produce a single list/table of **every** call to:
   - `base44.entities.<EntityName>.<method>` (list, filter, get, create, update, delete, bulkCreate)
   - `base44.auth.*` (me, logout, redirectToLogin, updateMe, isAuthenticated – if used)
   - `base44.integrations.Core.*` (UploadFile, SendEmail, SendSMS, InvokeLLM, etc.)

   For each call please include:
   - **File path** (e.g. `src/pages/ClientFile.jsx`)
   - **Exact call** or a one-line snippet (e.g. `base44.entities.Billing.list('-billing_date', 100)`)
   - **Short description** of what it’s used for in the UI (e.g. “Load billings for client file”)

   Sort by entity or by file, whichever is easier. The goal is to have a complete “client-side contract” so we can verify our replacement backend covers every call.

2. **Migration checklist by page/feature**  
   Based on the same codebase, list the main **pages or features** (e.g. Client File, Clinic Calendar, Reports, Time Clock, etc.) and for each one:
   - Which **entities** are used (read/write)
   - Which **integrations** are used (UploadFile, SendEmail, etc.)
   - Any **custom function** invoked (importVaccinationHistory, syncSupplierPrices)

   This will be used to test the app after we switch to our own backend (we can tick off each page once it works).

3. **Optional – JSON Schema per entity**  
   Only if you can see it in this app’s code (e.g. in an entities folder or schema config): for each entity that this app uses, output the **JSON Schema** (properties, required array, types, enums). We need it for request validation in our replacement API. If you don’t have access to that, say so and skip this part.

Please don’t regenerate the full entity list or relationship document; we already have those. Focus only on the catalogue and the migration checklist above.

---

## After You Get the Agent’s Response

- Merge the **SDK call catalogue** into your backend-information (e.g. `sdk-call-catalogue.md`) and use it to double-check OPENAPI_FRONTEND_COVERAGE and your OpenAPI spec.
- Use the **migration checklist** when testing each screen after cutting over to your Express + Postgres backend.
- For **app public settings**, **Send SMS**, and **auth refresh**: get those from Base44 support or docs, as the agent said it cannot see platform APIs.
