# OpenAPI vs Frontend Backend Calls – Coverage Report

Comparison of `docs/complete-openapi.json` with all backend/API calls made in the frontend repo (`src/`).

---

## 1. Summary

| Category | OpenAPI | Frontend usage | Verdict |
|----------|---------|----------------|---------|
| **Entity CRUD** (list, filter, get, create, update, delete) | ✅ Generic `/entities/{entityName}` and `/entities/{entityName}/filter`, `/{id}`, `/bulk` | All via `base44.entities.*` | **Covered** (generic paths map to any entity) |
| **Bulk create** | ✅ `POST /entities/{entityName}/bulk` | `bulkCreate` on VaccinationType, LabTestType, PriceListItem, SupplierPrice | **Covered** |
| **Auth: me** | ✅ `GET /auth/me` | `base44.auth.me()` | **Covered** |
| **Auth: login** | ✅ `POST /auth/login` | Not used in repo (Base44 redirect login) | **Covered** |
| **Auth: logout** | ✅ `POST /auth/logout` | `base44.auth.logout()` | **Covered** |
| **Auth: invite** | ✅ `POST /auth/invite` | Not used in frontend | **Covered** |
| **Auth: refresh token** | ❌ Not present | Not used in frontend today | **Gap** (recommended for replacement API) |
| **App public settings** | ❌ Not present | `appClient.get('/prod/public-settings/by-id/{appId}')` in AuthContext | **Gap** (needed for migration) |
| **Upload file** | ✅ `POST /integrations/core/upload-file` | `UploadFile` in multiple components | **Covered** |
| **Send email** | ✅ `POST /integrations/core/send-email` | SendEmail in VetReferrals, SendNotificationForm, PublishScheduleButton | **Covered** |
| **Send SMS** | ❌ Not present | Exported in `api/integrations.js`; no direct call found in components | **Gap** (add for parity) |
| **Invoke LLM** | ✅ `POST /integrations/core/invoke-llm` | VisitForm, LabTestResultsUpload | **Covered** |
| **Extract data from file** | ✅ `POST /integrations/core/extract-data-from-uploaded-file` | Not used in frontend | **Covered** |
| **Generate image** | ✅ `POST /integrations/core/generate-image` | Not used in frontend | **Covered** |
| **Custom functions** | ✅ `POST /functions/{functionName}` | importVaccinationHistory, syncSupplierPrices (invoked from UI) | **Covered** (if frontend calls them) |

---

## 2. Calls NOT Represented in OpenAPI

### 2.1 App public settings (Base44 platform)

- **Where:** `src/lib/AuthContext.jsx`
- **Call:** `appClient.get('/prod/public-settings/by-id/${appParams.appId}')`
- **Host:** `appParams.serverUrl` → Base44 platform (`/api/apps/public`), not the LoVeT backend.
- **Purpose:** Load app-level settings (e.g. auth required, user not registered) before/after auth.
- **OpenAPI:** No equivalent path in `complete-openapi.json`.

**Recommendation for replacement backend:** Add something like:

- `GET /app/public-settings` or `GET /config/public`

returning at least:

- Whether auth is required
- Optional: app name, feature flags, etc.

So the new AuthContext can call your backend instead of Base44.

---

### 2.2 Send SMS

- **Where:** `src/api/integrations.js` exports `SendSMS` from `base44.integrations.Core.SendSMS`. No component in `src/` was found calling it (ClientFile uses `sms:` link, not the integration).
- **OpenAPI:** There is no `POST /integrations/core/send-sms` (or similar) in the spec. Only `send-email` exists under integrations.

**Recommendation:** Add `POST /integrations/core/send-sms` (or equivalent) to the OpenAPI so the replacement backend fully mirrors Base44 Core integrations, even if the current UI doesn’t use SMS yet.

---

### 2.3 Auth refresh token

- **Frontend:** No use of a refresh-token endpoint in the repo; login response includes `refresh_token` in the OpenAPI example.
- **OpenAPI:** No `POST /auth/refresh` (or similar) to exchange a refresh token for a new access token.

**Recommendation:** Add something like:

- `POST /auth/refresh`  
  - Body: `{ "refresh_token": "..." }`  
  - Response: `{ "access_token": "...", "refresh_token": "..." }` (or at least `access_token`)

so the replacement API supports long-lived sessions and the frontend can be updated to use it later.

---

## 3. Entity name alignment

- **OpenAPI** `entityName` enum includes: `PublicDoctorInfo`, and does **not** include `PublicProfile`.
- **Frontend** uses only **PublicProfile** (e.g. `base44.entities.PublicProfile.list()`, `filter`, etc.).

So either:

- Base44’s real entity name is `PublicProfile` and the spec should use that, or  
- Base44 uses `PublicDoctorInfo` and the frontend is using an alias.  

**Recommendation:** Confirm the actual entity name in Base44 and make the OpenAPI enum match what the backend and frontend use (likely `PublicProfile`).

---

## 4. Frontend entities and operations (for reference)

All of these are expressed via the generic entity paths in the OpenAPI (list/filter/get/create/update/delete/bulk), so they are **covered** as long as the entity name in the path matches.

**Entities used in the frontend:**

- Client, Patient, Appointment, MedicalVisit, Billing, ClientPriceList, ClientDocument  
- User, PublicProfile, ExternalEmployee  
- AppointmentType, Room, DoctorSchedule, CalendarSettings  
- Vaccination, VaccinationType, LabTest, LabTestType, PatientMetric  
- MessageTemplate, Notification  
- Order, SupplierPrice, PriceList, PriceListItem, InventoryShortage, InventoryItem  
- TimeClockEntry, WeeklySchedule, VacationRequest, Constraint, ShiftTemplate  
- HospitalizedAnimal, TreatmentExecution  
- ProtocolTemplate, FilledProtocol  
- FormConfiguration  
- ClinicCase, VetReferral  
- SchedulePublication, SystemSettings (in `src/entities/all.js`)

**Operations used:**

- **list(sort, limit, skip)** → `GET /entities/{entityName}?sort=&limit=&offset=`
- **filter(query, sort, limit, skip)** → `POST /entities/{entityName}/filter`
- **get(id)** → not seen in frontend; OpenAPI has `GET /entities/{entityName}/{id}`
- **create(data)** → `POST /entities/{entityName}`
- **update(id, data)** → `PATCH /entities/{entityName}/{id}`
- **delete(id)** → `DELETE /entities/{entityName}/{id}`
- **bulkCreate(data)** → `POST /entities/{entityName}/bulk`

No frontend use of **deleteMany** or **importEntities** was found; OpenAPI does not need to expose them for current coverage.

---

## 5. Other insights

1. **Auth flow**  
   The app uses Base44’s redirect-based login (`redirectToLogin`). The OpenAPI correctly describes a direct `POST /auth/login` for the replacement backend; the new frontend will call that instead of redirecting to Base44.

2. **Limit/offset vs Base44**  
   Base44 SDK uses `list(sort, limit, skip)`. The OpenAPI uses `limit` and `offset`, which is a good match (backend can map `offset` to `skip` if needed).

3. **Integrations**  
   The spec includes upload-file, send-email, invoke-llm, generate-image, extract-data-from-uploaded-file. Only **send-sms** is missing for full parity with the frontend’s exported integrations.

4. **Custom functions**  
   OpenAPI documents `POST /functions/{functionName}` with examples for `importVaccinationHistory` and `syncSupplierPrices`. If the frontend invokes these (e.g. from a migration/sync UI), they are covered; ensure the real payloads (e.g. `csvContent`, `dry_run` for import; `confirmed_items`, `dry_run` for sync) are reflected in the request body schema or examples.

5. **Real-time / WebSocket**  
   The spec has agent conversation SSE endpoints. The frontend does not use Base44 entity **subscribe()** (realtime) in the files searched. If you add realtime later, the OpenAPI can be extended then.

---

## 6. Checklist for OpenAPI / backend

- [ ] Add **GET /app/public-settings** (or similar) for app config used by AuthContext.
- [ ] Add **POST /integrations/core/send-sms** for SMS parity.
- [ ] Add **POST /auth/refresh** for refresh token exchange.
- [ ] Align **entity name** in OpenAPI with Base44/frontend: prefer **PublicProfile** unless the backend truly uses PublicDoctorInfo.
- [ ] Ensure **custom function** request bodies (importVaccinationHistory, syncSupplierPrices) match what the frontend and Base44 functions expect.

---

*Generated from frontend repo and `docs/complete-openapi.json`.*
