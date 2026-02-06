# API Operation Examples

This folder contains **JavaScript examples** for reading and updating entities via the Base44 API. Each file is named after an entity (e.g. `Constraint.js`, `Client.js`) and includes:

- **Reading entities** – `fetch<Entity>Entities()` – GET request to list entities with optional filtering.
- **Updating an entity** – `update<Entity>Entity(entityId, updateData)` – PUT request to update a single entity by ID.

All examples use the same app base URL and the same pattern for headers (API key and `Content-Type`). The **filterable fields** listed in the comments are the fields you can use when querying or updating that entity.

---

## Source of the examples

### Copied from the Base44 UI

These **15** entity examples were taken directly from the Base44 dashboard **API → Example: API Operations** dropdown (select an entity and the code is shown). The code and filterable-fields comments match exactly what Base44 displays.

| Entity | File |
|--------|------|
| Constraint | `Constraint.js` |
| WeeklySchedule | `WeeklySchedule.js` |
| ShiftTemplate | `ShiftTemplate.js` |
| SchedulePublication | `SchedulePublication.js` |
| VacationRequest | `VacationRequest.js` |
| SystemSettings | `SystemSettings.js` |
| Order | `Order.js` |
| ExternalEmployee | `ExternalEmployee.js` |
| ProtocolTemplate | `ProtocolTemplate.js` |
| FilledProtocol | `FilledProtocol.js` |
| HospitalizedAnimal | `HospitalizedAnimal.js` |
| ClinicCase | `ClinicCase.js` |
| VetReferral | `VetReferral.js` |
| InventoryShortage | `InventoryShortage.js` |
| SupplierPrice | `SupplierPrice.js` |

### Generated from entity schemas

These **28** entity examples were **not** present in the Base44 UI dropdown at the time of export. They were generated from the entity JSON schema files in `backend-information/entities /`, using the same structure and URL/api-key pattern as the UI examples. The **filterable fields** in the comments are derived from each entity’s `properties` in its schema.

| Entity | File |
|--------|------|
| PublicDoctorInfo | `PublicDoctorInfo.js` |
| PublicProfile | `PublicProfile.js` |
| TreatmentExecution | `TreatmentExecution.js` |
| InventoryItem | `InventoryItem.js` |
| Client | `Client.js` |
| Patient | `Patient.js` |
| Room | `Room.js` |
| AppointmentType | `AppointmentType.js` |
| SlotTemplate | `SlotTemplate.js` |
| Slot | `Slot.js` |
| Appointment | `Appointment.js` |
| MedicalVisit | `MedicalVisit.js` |
| Billing | `Billing.js` |
| Notification | `Notification.js` |
| CalendarSettings | `CalendarSettings.js` |
| ClientPriceList | `ClientPriceList.js` |
| PatientMetric | `PatientMetric.js` |
| Vaccination | `Vaccination.js` |
| VaccinationType | `VaccinationType.js` |
| ClientDocument | `ClientDocument.js` |
| LabTestType | `LabTestType.js` |
| LabTest | `LabTest.js` |
| DoctorSchedule | `DoctorSchedule.js` |
| FormConfiguration | `FormConfiguration.js` |
| TimeClockEntry | `TimeClockEntry.js` |
| MessageTemplate | `MessageTemplate.js` |
| PriceList | `PriceList.js` |
| PriceListItem | `PriceListItem.js` |

---

## Usage notes

- Replace the hardcoded `api_key` with your own key or with `await User.me()` (or your app’s equivalent) if you get the key at runtime.
- The base URL (`https://app.base44.com/api/apps/.../entities`) is specific to this app; adjust it if you use a different app or environment.
- Filterable fields in the generated files are based on schema property names; the actual API may support additional or different filter/query parameters.
