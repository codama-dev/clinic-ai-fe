# Extracted Schemas

This folder contains **schema descriptions** for each Base44 Data entity. Each file is named after the entity (e.g. `Constraint.txt`, `Client.txt`) and describes the fields, types, and options as shown in the Base44 **Schema Editor** pane.

## How these were created

### Copied from the Base44 UI (Data → entity → ⋮ → Schema)

These **5** schemas were taken directly from the Base44 app:

1. Open **Data** in the sidebar.
2. Select an entity (e.g. Constraint).
3. Click the **three-dots (⋮)** button next to the entity name.
4. Click **Schema**.
5. The Schema Editor pane opens on the right — the text was copied and saved here.

| Entity | File |
|--------|------|
| Constraint | `Constraint.txt` |
| WeeklySchedule | `WeeklySchedule.txt` |
| ShiftTemplate | `ShiftTemplate.txt` |
| SchedulePublication | `SchedulePublication.txt` |
| VacationRequest | `VacationRequest.txt` |

### Generated from entity JSON

The remaining **38** schema files were **generated** from the entity JSON schema files in `backend-information/entities /`. The format matches the Schema Editor (field name, type, required, description, default, options). The content is equivalent to what the UI shows but was not copied from the live pane.

All other entities (SystemSettings, Order, ExternalEmployee, ProtocolTemplate, FilledProtocol, HospitalizedAnimal, ClinicCase, VetReferral, InventoryShortage, SupplierPrice, PublicDoctorInfo, PublicProfile, TreatmentExecution, InventoryItem, Client, Patient, Room, AppointmentType, SlotTemplate, Slot, Appointment, MedicalVisit, Billing, Notification, CalendarSettings, ClientPriceList, PatientMetric, Vaccination, VaccinationType, ClientDocument, LabTestType, LabTest, DoctorSchedule, FormConfiguration, TimeClockEntry, MessageTemplate, PriceList, PriceListItem) have schema files generated from the same entity definitions.

## How to re-extract from the UI

To copy the schema for any entity yourself:

1. In Base44, go to **Data**.
2. Click the entity in the sidebar.
3. Click the **⋮** (three dots) next to the entity name.
4. Click **Schema**.
5. Copy the text from the Schema Editor pane on the right and save it as `EntityName.txt` in this folder.

## File format

Each `.txt` file contains:

- **Schema Editor** header and **Close** (from the UI).
- For each field:
  - Field name
  - Type in parentheses (e.g. `text`, `date`, `boolean`), with `, required` when applicable
  - Description (if any)
  - **Default:** value when present
  - **Options:** for enum fields
