# Base44 Complete Export Research

**Context:** Client has the **highest plan (Elite)** and wants to know if a **complete export** from Base44 is possible—both **data** and **code/backend**—for migration or full ownership.

**Sources:** Base44 official docs (docs.base44.com), SDK reference, Billing & Plans, Enterprise pages, third-party summaries. Last checked: February 2026.

---

## 1. What “Complete Export” Could Mean

| Export type | Meaning |
|-------------|--------|
| **Code export** | Download/push to GitHub the app’s frontend (and any exported backend code). |
| **Data export** | Get all records from all entities (tables) in a usable format (CSV, JSON, DB dump). |
| **Schema export** | Get entity definitions (field names, types, validation) to recreate the data model elsewhere. |
| **Backend export** | Get the actual backend logic, database, and auth as code or dump (run it yourself). |

---

## 2. Code Export (Frontend)

### What Base44 offers

- **GitHub integration:** Push/pull from GitHub. Available from **Builder** plan ($50/month) and above.
- **Export as ZIP:** Download app code (same content as pushing to GitHub).
- **Plan requirement:** Code export is **not** on Free or Starter; it’s on **Builder, Pro, and Elite**. With **Elite**, the client **does have** code export.

### Critical limitation

- Exported code is **frontend-focused**: React/Vite app, `src/`, components, pages, config (e.g. Vite, Tailwind).
- All **data and auth** go through **`@base44/sdk`** (calls Base44 servers). There is **no exported backend** (no Express, no DB, no auth server in the repo).
- So: you get **full frontend ownership**; you do **not** get a “complete app” that runs without Base44. Backend stays on Base44.

**Conclusion (code):**  
**Yes**, you can do a **complete code export** of what Base44 allows—and with Elite you have it. That export is **frontend + config only**; it is **not** a full-stack export (no backend code, no DB, no auth code).

---

## 3. Data Export

Base44 does **not** document a single “Export entire app” or “Database dump” button. Data export is **per entity**, and optionally **programmatic**.

### 3.1 Dashboard export (UI)

- **Path:** Dashboard → **Data** → select a **data set (table)** → **More Actions** → **Export**.
- **Format:** **CSV** (openable in Excel/Sheets).
- **Scope:** One table per export. To “export everything” you must export **each entity separately** (e.g. Client, Patient, Appointment, …).
- **Limit:** Docs say that **list/table views** are capped at **5,000 items** per request/view. For tables with **more than 5,000 records**, the doc says: *“To review everything, **export the collection to CSV from the dashboard** so you can see all items.”* So **dashboard Export is the way to get “all items”** for a single table; no explicit CSV record limit is documented. In practice, very large tables might still be subject to timeouts or limits—not specified.
- **Conclusion:** A **complete data export is possible in principle** by exporting **every entity once** via Dashboard → Data → [Entity] → More Actions → Export. For **35 entities** that means **35 CSV files**. Manual but feasible. If an entity has >5,000 rows, dashboard export is the documented way to get “all”; any hidden limit would need to be confirmed with support.

### 3.2 Programmatic export (SDK)

- **Service role:** Use **`base44.asServiceRole.entities.EntityName`** so you have **admin-level** access to all records (no per-user permission cuts).
- **list():**  
  `list(sort?, limit?, skip?, fields?)`  
  - **Max `limit`:** **5,000** per request (documented).  
  - **Pagination:** **`skip`** is supported (e.g. 0, 5000, 10000, …). So you can loop: `list('-created_date', 5000, 0)`, then `list('-created_date', 5000, 5000)`, etc., until you get fewer than 5,000 records.
- **filter():** Same **limit 5,000** and **skip** for pagination.
- So for **each entity** you can write a small script (e.g. Node/Deno) that:  
  - Uses service role.  
  - Calls `list(..., 5000, skip)` in a loop.  
  - Appends to a JSON/CSV file or in-memory array.  
  - Stops when a page returns fewer than 5,000 items.  
- That gives you a **complete, scripted export of all data** Base44 holds for that app (all entities, all records), as long as you have **service role** (e.g. in a backend function or a secure script with the right token/app id).

**Conclusion (data):**  
- **Complete data export is possible:**  
  - **Manually:** Dashboard → Data → export each of the 35 entities to CSV.  
  - **Programmatically:** Script using `base44.asServiceRole.entities.*.list(..., 5000, skip)` (and optionally `filter`) in a loop for each entity.  
- There is **no** documented single “Export all data” or “Database dump” button or API; “complete” here means “you can get every entity’s data, each in full, via UI or script.”

---

## 4. Schema Export

- **In the UI:** Dashboard → **Data** → select entity → **Schema** shows the **JSON schema** for that entity (fields, types, validation).
- There is **no** documented “Export all schemas” or schema API. So schema export is **per entity, manual** (copy from Schema tab) or you’d need to ask Base44 (or reverse from exported data).

**Conclusion:** Schema can be recreated by viewing/copying each entity’s schema in the dashboard; no bulk schema export is documented.

---

## 5. Backend “Export” (Running Without Base44)

- Base44 does **not** offer:  
  - Export of backend **code** (server logic, auth server, etc.).  
  - A **database dump** (e.g. PostgreSQL dump) or “download full database.”  
  - A way to “take the backend and run it on your own infra.”
- The **backend is a service**: you use it via SDK (entities, auth, integrations). You cannot “export” it in the sense of getting runnable backend code or a DB dump from the product itself.

**Conclusion:** There is **no complete backend export**. Full ownership of the “full stack” (run the same app without Base44) requires building your own backend and migrating data (as in MIGRATION_PLAN.md).

---

## 6. Elite Plan and Enterprise

- **Elite** (client’s plan): Highest **public** tier. Includes:  
  - More message/integration credits.  
  - **Premium support.**  
  - Code export (GitHub/ZIP).  
  - No extra **documented** data-export or backend-export features.
- **Enterprise** (“Base44 for enterprises”): Custom/contact-sales. Docs mention:  
  - SSO, workspace domain, IP allowlist, app visibility.  
  - Dedicated account manager, priority support, secure hosting.  
  - **No** documented “full data export” or “database dump” or “backend export.”

So even on the **highest plan**, “complete export” is **not** a documented product feature.  
**Practical recommendation:** With **Elite** (or Enterprise), the client can **ask Base44 support** whether they provide, for migration:  
- A **full data export** (e.g. all entities in one go or as a dump), or  
- **Schema export** in bulk, or  
- Any **special export tool** for leaving the platform.  
That would be a **custom/support** question, not something guaranteed in the docs.

---

## 7. Summary Table

| What | Possible? | How | Notes |
|------|------------|-----|------|
| **Frontend code** | Yes | GitHub push / ZIP export (Builder+) | Client has Elite; full access. Backend still on Base44. |
| **All app data** | Yes | (1) Dashboard: export each entity to CSV. (2) Script: `asServiceRole` + `list(..., 5000, skip)` per entity | No one-click “export all”; 35 entities → 35 CSVs or one script. |
| **Entity schemas** | Partially | Dashboard → Data → [Entity] → Schema (per entity) | No bulk schema export in docs. |
| **Backend code / DB dump** | No | Not offered | Backend is a service; no export of server code or raw DB. |
| **Run app without Base44** | Only after migration | Use exported code + data + your own backend (e.g. Express + Postgres) | See MIGRATION_PLAN.md. |

---

## 8. Recommendations for the Client (Elite Plan)

1. **Data (complete export)**  
   - **Option A:** Export each of the 35 entities from **Dashboard → Data → [Entity] → More Actions → Export** (CSV). Keep the CSVs as the official “complete data export” and use them for migration (e.g. into Express + Postgres).  
   - **Option B:** Commission a **one-off script** (Node/Deno) that uses **service role** and, for each entity, paginates with `list(..., 5000, skip)` and writes JSON/CSV. That gives one repeatable, automated “full export” and can be run before migration.

2. **Schema**  
   - For each entity, open **Data → [Entity] → Schema** and save the JSON (or screenshot). Or ask Base44 support if they can provide all schemas in one file for Elite/Enterprise.

3. **Ask Base44**  
   - Open a ticket (Elite = premium support) and ask explicitly:  
     - “We need to perform a **complete data export** of our app (all entities, all records) for migration. Do you provide a bulk export, database dump, or recommended process?”  
     - “Is there a record limit on dashboard CSV export per entity?”  
   - They may offer a custom export or tool not in the public docs.

4. **Code**  
   - Use the existing **GitHub integration** (or ZIP) to ensure the latest frontend is exported. That’s the “complete code export” Base44 supports; the rest of “complete” (backend, DB) has to be rebuilt and filled with the exported data (see MIGRATION_PLAN.md).

---

## 9. Bottom Line

- **Complete export of what Base44 allows:**  
  - **Code:** Yes (frontend only; client has Elite).  
  - **Data:** Yes, by exporting every entity (dashboard CSV per entity or script with `asServiceRole` + pagination).  
  - **Backend / DB dump:** No; not a product feature.  
- So: **data can be fully exported**; **code export is complete for the frontend only**. A **complete export** in the sense of “we have everything we need to run the same app without Base44” is **only** achievable by combining this export with your own backend and migration (as in MIGRATION_PLAN.md).  
- With the **highest plan (Elite)**, the client is in the best position to get **support-assisted** export (e.g. bulk data or schema) if Base44 offers it off-docs; they should ask support explicitly.
