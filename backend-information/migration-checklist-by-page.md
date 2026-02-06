# Migration Checklist by Page/Feature

**Source:** Base44 agent analysis. Use to test each screen after switching to replacement backend.  
**Legend:** R = Read, W = Write, D = Delete.

---

## Employee Management & Scheduling

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| Schedule (Weekly View) | WeeklySchedule (R), ShiftTemplate (R), Constraint (R), VacationRequest (R) | — | — |
| Constraints (Employee) | Constraint (R/W/D), ShiftTemplate (R), SystemSettings (R), User (R) | — | — |
| VacationRequests | VacationRequest (R/W), User (R) | — | — |
| TimeClock | TimeClockEntry (R/W) | — | — |
| UsersPage (Admin) | User (R), PublicProfile (R/W/D), ExternalEmployee (R/W/D) | — | — |
| WeeklyScheduleManager (Admin) | WeeklySchedule (R/W), Constraint (R), PublicProfile (R), ExternalEmployee (R), ShiftTemplate (R), VacationRequest (R) | — | — |
| ApproveSchedules (Admin) | WeeklySchedule (R/W) | — | — |
| TimeClockManagement (Admin) | TimeClockEntry (R/W) | — | — |

---

## Client & Patient Management

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| ClientsManagement | Client (R/W/D), Patient (R/W/D) | — | — |
| ClientFile | Client (R/W), Patient (R/W), Appointment (R), MedicalVisit (R/W/D), Billing (R), ClientPriceList (R), PatientMetric (R/W/D), Vaccination (R/W/D), ClientDocument (R/W/D), LabTest (R/W/D), LabTestType (R), PublicProfile (R) | Core.UploadFile | — |

---

## Appointment Calendar

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| ClinicCalendar | Appointment (R/W/D), Patient (R), PublicProfile (R), CalendarSettings (R), DoctorSchedule (R) | — | — |

---

## Medical & Protocols

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| Protocols | ProtocolTemplate (R/W), FilledProtocol (R/W/D), User (R) | — | — |
| Hospitalization | HospitalizedAnimal (R/W/D) | — | — |
| HospitalizationReport | HospitalizedAnimal (R/W), User (R) | — | — |

---

## Inventory & Orders

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| InventoryManagement | Order (R/W), InventoryShortage (W) | — | — |
| OrderManagement (Admin) | Order (R/W/D), InventoryShortage (R/W) | — | — |

---

## Messages & Communication

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| VetReferrals | VetReferral (R/W), PublicProfile (R) | Core.SendEmail | — |

---

## Marpet (Clinic Cases)

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| MarpetTracking | ClinicCase (R/W/D) | — | — |

---

## Reports & Analytics

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| ReportsPage (Admin) | PublicProfile (R), WeeklySchedule (R), VacationRequest (R), TimeClockEntry (R/W), FilledProtocol (R), HospitalizedAnimal (R), TreatmentExecution (R), InventoryShortage (R), Order (R), ProtocolTemplate (R) | — | — |
| AdminDashboard | PublicProfile (R/W), WeeklySchedule (R), Constraint (R), VacationRequest (R), ShiftTemplate (R), TimeClockEntry (R), FilledProtocol (R), TreatmentExecution (R), InventoryShortage (R) | — | — |

---

## User Profile

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| MyProfile | User (R/W) | Core.UploadFile | — |

---

## Settings & Configuration

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| CalendarSettingsManager | CalendarSettings (R/W/D), DoctorSchedule (R/W/D), Room (R/W/D), AppointmentType (R) | — | — |
| FormsManagement | FormConfiguration (R/W) | — | — |
| NotificationsManager | Notification (R) | — | — |
| PriceListsPage | PriceList (R/W/D) | — | — |

---

## Data Import (Admin)

| Page | Entities (R/W/D) | Integrations | Functions |
|------|-------------------|--------------|-----------|
| XMLDataImport | All entities (dynamic R/W) | — | — |

---

## Testing checklist (copy and tick)

- [ ] Schedule (Weekly View)
- [ ] Constraints
- [ ] VacationRequests
- [ ] TimeClock
- [ ] UsersPage
- [ ] WeeklyScheduleManager
- [ ] ApproveSchedules
- [ ] TimeClockManagement
- [ ] ClientsManagement
- [ ] ClientFile (incl. UploadFile)
- [ ] ClinicCalendar
- [ ] Protocols
- [ ] Hospitalization
- [ ] HospitalizationReport
- [ ] InventoryManagement
- [ ] OrderManagement
- [ ] VetReferrals (incl. SendEmail)
- [ ] MarpetTracking
- [ ] ReportsPage
- [ ] AdminDashboard
- [ ] MyProfile (incl. UploadFile)
- [ ] CalendarSettingsManager
- [ ] FormsManagement
- [ ] NotificationsManager
- [ ] PriceListsPage
- [ ] XMLDataImport
- [ ] Custom: importVaccinationHistory
- [ ] Custom: syncSupplierPrices
