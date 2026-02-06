# Master Prompt: Build the LoVeT ClinicAI Replacement Backend

Copy-paste this entire prompt into Cursor when you open your new backend project. Make sure the `old-base44-backend-information/` folder is available in the project root (or adjust the path references).

---

## PROMPT START

This is a boilerplate template express backend template. build on top of it. the backend is already connected to the postgres project.

You are building a **replacement backend** for a veterinary clinic management app called **LoVeT ClinicAI**. The app currently runs on **Base44** (a no-code BaaS platform). The frontend is React + Vite and talks to Base44 via an SDK. We are replacing Base44 with our own backend so we have full control, can add WhatsApp, Israeli payments, and custom logic.

The entire specification for the backend you need to build lives in the **`old-base44-backend-information/`** folder in this project. Read and follow these files as your source of truth. Here is what each file/folder contains:

### Reference files (read these, do NOT modify them)

| File/Folder | What it contains |
|-------------|------------------|
| `entities/*.json` | JSON Schema for each of the 44 entities (properties, types, required, enums, defaults). **This is the source of truth for DB columns and request validation.** |
| `all-entities-json-schema.json` | Same 44 schemas in a single JSON object (entity name → schema). |
| `extracted schemas/*.txt` | Human-readable schema descriptions per entity (field name, type, required, description, default, options). |
| `db-schema.sql` | Full PostgreSQL DDL (~1000 lines) for all 44 tables with triggers, utility functions, and RLS helpers. Use as a strong starting point for your Prisma schema or raw SQL migrations. |
| `db-important-data.txt` | Behavioral rules: built-in auto fields (`id`, `created_date`, `updated_date`, `created_by`), auto-increment fields (`client_number`, `patient_number`, `order_number`, `visit_number`, `test_number`, `appointment_number`), unique constraints, denormalization pattern (store both ID and name), status flows, soft delete (`is_active`), audit trail fields, no cascade delete, no foreign key enforcement in Base44 (but we WILL add real FKs). |
| `some-backend-endpoints.txt` | Full REST endpoint reference: entity CRUD (list, filter, get, create, update, delete, bulk), auth (me, login, logout, invite, is-authenticated), WebSocket, file upload, integrations (LLM, email, SMS), custom functions. |
| `complete-openapi.json` | OpenAPI 3.0 spec covering all endpoints. |
| `OPENAPI_FRONTEND_COVERAGE.md` | Gaps between the OpenAPI spec and actual frontend usage. Known gaps: app public settings endpoint, Send SMS, auth refresh token, PublicProfile vs PublicDoctorInfo naming. |
| `sdk-call-catalogue.md` | Every `base44.*` call the frontend makes, organized by entity/area, with file path and usage description. **This is the client-side contract your API must satisfy.** |
| `migration-checklist-by-page.md` | Per-page breakdown: which entities (R/W/D), integrations, and custom functions each page uses. Includes a testing checklist. |
| `authorization-permission-map.md` | Admin-only pages, permission-based access table (15 permissions), and known polling intervals (no realtime subscriptions in v1). |
| `current-backend.txt` | How Base44 behaves: SDK patterns, auth, service role, integrations, subscriptions, no transactions, soft delete, file upload, denormalization. |
| `deno-functions.txt` | Full source code of the 2 custom backend functions: `importVaccinationHistory` (CSV parser, client/patient matching, bulk vaccination creation) and `syncSupplierPrices` (admin-only, supplier→client price sync with 1.3x markup). |
| `web-socket.txt` | WebSocket protocol: subscribe/unsubscribe messages, server event format (create/update/delete with entity data). Optional for v1. |
| `API operation examples/*.js` | JavaScript examples of how Base44's REST API is called (GET list, PUT update) for each entity. Shows filterable fields. |
| `data/*.csv` | Real data exports (CSV) for each entity as of 2026-02-06. Use for seed data and integration tests. |
| `empty-tables.txt` | 11 entities that currently have no data: Billing, ClientDocument, ExternalEmployee, MessageTemplate, PatientMetric, PriceList, PriceListItem, PublicDoctorInfo, SchedulePublication, Slot, SlotTemplate. |

---

### What you need to build

**Tech stack:** Express.js + TypeScript + PostgreSQL + Prisma ORM + Vitest (for testing).

**Core requirements:**

1. **Database layer** – Prisma schema for all 44 entities with proper relations (real foreign keys), auto-increment fields, unique constraints, indexes, and the 4 auto-populated fields (`id` UUID, `created_date`, `updated_date`, `created_by`).
our first milestone is to be able to create the entities in the database. and import the data from the csv files into the database. the csv files are in the `data/` folder.
you have also the db-schema.sql file, along with json schema for each of the entities in the `entities/` folder. There's also an extracted schemas folder, with human readable descriptions of each entity and field, extracted from base44 UI under `extracted schemas/` folder.

2. **Generic entity CRUD API** – RESTful endpoints that match what the frontend expects (see `sdk-call-catalogue.md` and `some-backend-endpoints.txt`):
   - `GET /api/entities/:entityName` – list with sort, limit, offset
   - `POST /api/entities/:entityName/filter` – filter with query object (support `$gte`, `$lte`, `$in`, exact match)
   - `GET /api/entities/:entityName/:id` – get by ID
   - `POST /api/entities/:entityName` – create (validate against JSON schema from `entities/*.json`)
   - `POST /api/entities/:entityName/bulk` – bulk create
   - `PATCH /api/entities/:entityName/:id` – update (partial)
   - `DELETE /api/entities/:entityName/:id` – delete
   - `GET /api/entities/:entityName/schema` – return JSON schema

   !note - consider using the auto-generated CRUD api if such one exists in supabase, after all the entities are created. I heard supabase has a feature like this. also ok to just write the CRUD api yourself.

3. **Authentication** – JWT-based:
   - `POST /api/auth/login` – email/password → access + refresh tokens
   - `POST /api/auth/logout` – invalidate token
   - `GET /api/auth/me` – current user
   - `PATCH /api/auth/me` – update current user (block: id, email, role)
   - `POST /api/auth/invite` – admin invites new user
   - `POST /api/auth/refresh` – refresh token exchange
   - `GET /api/auth/is-authenticated` – check token validity

   note: this was the original implementation in base44. I prefer, if possible, to use supabase auth instead.

4. **Authorization middleware** – Implement the rules from `authorization-permission-map.md`:
   - Role-based: `admin` vs `user`
   - Permission-based: 15 known permissions (e.g. `manage_employees`, `manage_schedule`, `view_reports`)
   - User entity special rules: regular users can only read/update themselves; admin can manage all users

5. **Request validation** – Use the JSON schemas from `entities/*.json` to validate create/update payloads. Return 400 with clear error messages on validation failure.

6. **Integration endpoints:**
   - `POST /api/integrations/core/upload-file` – file upload to local storage or S3
   - `POST /api/integrations/core/send-email` – send email (use nodemailer or similar)
   - `POST /api/integrations/core/invoke-llm` – proxy to OpenAI/Anthropic API
   - `POST /api/integrations/core/send-sms` – placeholder (not used in frontend yet)

7. **Custom function endpoints** (reimplement from `deno-functions.txt`):
   - `POST /api/functions/importVaccinationHistory` – CSV parsing, client/patient matching, vaccination creation
   - `POST /api/functions/syncSupplierPrices` – admin-only supplier→client price sync

8. **Data seeding** – Use the CSV files in `data/` to create seed scripts for development and integration testing.

---

### How to plan and ticket this work

**Create a master plan as a numbered list of tickets.** Each ticket must be:

0. each ticket will be presented as an md file in the `tickets/` folder. the status of the tickets will be presented as a markdown table in the `tickets/status.md` file.
1. **Small and focused** – one concern per ticket (e.g. "Prisma schema for User + PublicProfile + ExternalEmployee" or "Auth login endpoint + tests").
2. **Testable with unit/integration tests** – every ticket includes writing tests FIRST (TDD). The ticket is done when tests pass.
3. **Sequential and buildable** – each ticket can only depend on tickets that come before it. You must be confident the previous ticket's tests pass before starting the next.
4. **Grouped into phases** – group related tickets into phases (e.g. Phase 1: Project setup & DB, Phase 2: Auth, Phase 3: Entity CRUD, etc.).

**For each ticket, include:**
- **Ticket ID** (e.g. LOVET-BE-001)
- **Title** (short, descriptive)
- **Description** (what to implement)
- **Acceptance criteria** (what tests to write, what must pass)
- **Dependencies** (which ticket IDs must be done first)
- **Files to create/modify** (estimated)
- **Estimated effort** (S/M/L)

**TDD approach for every ticket:**
1. Write failing tests first (unit tests for pure logic, integration tests for API endpoints).
2. Implement the minimum code to make tests pass.
3. Refactor if needed.
4. Verify all previous tests still pass (regression).

**Phase structure (suggested, adjust as needed):**

- **Phase 0: Project scaffold** – Express + TypeScript + Prisma + Jest setup, folder structure, config, health endpoint.
- **Phase 1: Database** – Prisma schema for all 44 entities (can be split into groups: User/Profile, Client/Patient, Appointment/Calendar, Medical, Billing, Inventory, Scheduling, Settings/Config). Migrations. Seed scripts.
- **Phase 2: Auth** – JWT auth (login, logout, me, refresh, invite, is-authenticated). Auth middleware. User entity special rules.
- **Phase 3: Generic CRUD engine** – The entity router that handles list/filter/get/create/update/delete/bulk for any entity. JSON schema validation. Auto-populated fields.
- **Phase 4: Authorization** – Permission middleware. Admin-only guards. Per-entity access rules (User entity restrictions).
- **Phase 5: Integrations** – File upload, email, LLM proxy, SMS placeholder.
- **Phase 6: Custom functions** – importVaccinationHistory, syncSupplierPrices (reimplement from the Deno function code).
- **Phase 7: Data migration** – Seed from CSV exports. Verify data integrity.
- **Phase 8: End-to-end validation** – Run the migration checklist (`migration-checklist-by-page.md`) and verify each page's required endpoints work.

**Important behavioral rules to replicate** (from `db-important-data.txt` and `current-backend.txt`):
- Every record gets auto: `id` (UUID), `created_date` (now), `updated_date` (now, auto-updated), `created_by` (email from JWT).
- Auto-increment: `client_number`, `patient_number`, `order_number`, `visit_number`, `test_number`, `appointment_number`.
- Unique constraints: `Client.client_number`, `Client.id_number`, `Patient.patient_number`.
- Denormalization: many entities store both FK ID and the related name (e.g. `doctor_id` + `doctor_name`). Keep this pattern for now.
- Soft delete: entities with `is_active` field use soft delete (don't actually delete, set `is_active = false`). Other entities use hard delete.
- No cascade delete: deleting a parent does NOT auto-delete children. The API should check for dependent records before allowing delete (or return a warning).
- Status enums: follow the exact enum values from the JSON schemas (e.g. Appointment: scheduled → confirmed → arrived → in_progress → completed / no_show / cancelled).
- Filter operators: support exact match, `$gte`, `$lte`, `$in` at minimum.
- Sorting: prefix with `-` for descending (e.g. `-created_date`).
- Pagination: `limit` (default 50, max 5000) and `offset` (skip).


if you're missing crucial information about the old base44 backend, you can ask me to ask the base44 agent for help.


**Now create the full master plan with all tickets.**

## PROMPT END
