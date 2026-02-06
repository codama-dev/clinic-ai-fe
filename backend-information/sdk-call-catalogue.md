# SDK Call Catalogue (Client-Side Contract)

**Source:** Base44 agent analysis of frontend codebase.  
**Purpose:** Verify replacement backend covers every `base44.*` call.  
**Stats:** ~150+ unique call patterns; 44 entities; 3 Core integrations (UploadFile, SendEmail, InvokeLLM); 2 custom functions.

---

## 1. Authentication SDK (`base44.auth.*`)

| Call | File(s) | Usage |
|------|---------|--------|
| `base44.auth.me()` | layout, all pages | Get current logged-in user |
| `base44.auth.isAuthenticated()` | pages/Schedule | Check if user is logged in |
| `base44.auth.logout()` | layout | Logout user |
| `base44.auth.redirectToLogin()` | layout, pages/Schedule | Redirect to login page |
| `base44.auth.updateMe(data)` | **NOT USED** | Method exists but not used in this app |

---

## 2. Entity SDK (`base44.entities.*`)

**CRUD pattern:** `.list(sort?, limit?)`, `.filter(query, sort?, limit?)`, `.create(data)`, `.update(id, data)`, `.delete(id)`, `.bulkCreate([data])` (bulkCreate not used in app).

### User & Profiles

| Call | File(s) | Usage |
|------|---------|--------|
| `base44.entities.User.me()` | Multiple files | Get current user |
| `base44.entities.User.list()` | pages/UsersPage, pages/HospitalizationReport, pages/Constraints | List users |
| `base44.entities.User.updateMyUserData(data)` | components/profile/EditProfileForm | Update current user |
| `base44.entities.PublicProfile.list()` | layout, UsersPage, ClinicCalendar, ClientFile, VetReferrals, ReportsPage, WeeklyScheduleManager | List public profiles |
| `base44.entities.PublicProfile.create(data)` | pages/UsersPage | Create public profile |
| `base44.entities.PublicProfile.update(id, data)` | pages/UsersPage, pages/AdminDashboard | Update public profile |
| `base44.entities.ExternalEmployee.list()` | pages/UsersPage, pages/WeeklyScheduleManager | List external employees |
| `base44.entities.ExternalEmployee.create(data)` | pages/UsersPage | Create |
| `base44.entities.ExternalEmployee.update(id, data)` | pages/UsersPage | Update |
| `base44.entities.ExternalEmployee.delete(id)` | pages/UsersPage | Delete |

### Scheduling & Workforce

| Call | File(s) | Usage |
|------|---------|--------|
| `WeeklySchedule.filter({week_start_date, is_published})` | pages/Schedule | |
| `WeeklySchedule.filter({week_start_date})` | pages/WeeklyScheduleManager | |
| `WeeklySchedule.filter({approval_status: 'pending_approval'})` | pages/AdminDashboard, pages/ApproveSchedules | |
| `WeeklySchedule.filter({is_published: true, approval_status: 'approved'})` | pages/WeeklyScheduleManager | |
| `WeeklySchedule.list()` | pages/ReportsPage | |
| `WeeklySchedule.list('-week_start_date', 4)` | pages/AdminDashboard | |
| `WeeklySchedule.create(data)` | pages/WeeklyScheduleManager | |
| `WeeklySchedule.update(id, data)` | pages/WeeklyScheduleManager, pages/ApproveSchedules | |
| `Constraint.filter({employee_id, week_start_date})` | pages/Schedule | |
| `Constraint.filter({week_start_date})` | pages/Constraints, WeeklyScheduleManager, AdminDashboard | |
| `Constraint.create(data)` | pages/Constraints | |
| `Constraint.delete(id)` | pages/Constraints | |
| `ShiftTemplate.filter({is_active: true})` | pages/Schedule, Constraints, WeeklyScheduleManager | |
| `ShiftTemplate.list()` | pages/WeeklyScheduleManager, pages/ReportsPage | |
| `VacationRequest.filter({status: 'approved'})` | pages/Schedule, WeeklyScheduleManager | |
| `VacationRequest.list('-start_date')` | pages/VacationRequests | |
| `VacationRequest.filter({employee_id}, '-start_date')` | pages/VacationRequests | |
| `VacationRequest.filter({status: 'pending'})` | pages/AdminDashboard | |
| `VacationRequest.list()` | pages/ReportsPage | |
| `VacationRequest.create(data)` | pages/VacationRequests | |
| `VacationRequest.update(id, data)` | pages/VacationRequests | |
| `TimeClockEntry.filter({employee_email, date})` | pages/TimeClock | |
| `TimeClockEntry.filter({employee_email}, '-date', 10)` | pages/TimeClock | |
| `TimeClockEntry.list('-date', 5000)` | pages/ReportsPage, AdminDashboard | |
| `TimeClockEntry.list('-created_date', 100)` | pages/AdminDashboard | |
| `TimeClockEntry.create(data)` | pages/TimeClock, ReportsPage | |
| `TimeClockEntry.update(id, data)` | pages/TimeClock, ReportsPage | |
| `SystemSettings.list()` | pages/Constraints | |

### Client & Patient Management

| Call | File(s) | Usage |
|------|---------|--------|
| `Client.list('-created_date', 5000)` | pages/ClientsManagement, ClientFile | |
| `Client.list()` | pages/ClientFile | |
| `Client.create(data)` | pages/ClientsManagement | |
| `Client.update(id, data)` | pages/ClientsManagement, ClientFile | |
| `Client.delete(id)` | pages/ClientsManagement | |
| `Patient.list('-created_date', 5000)` | pages/ClientsManagement, ClientFile | |
| `Patient.list()` | pages/ClientFile, ClinicCalendar | |
| `Patient.create(data)` | pages/ClientsManagement, ClientFile | |
| `Patient.update(id, data)` | pages/ClientsManagement, ClientFile | |
| `Patient.delete(id)` | pages/ClientsManagement | |

### Appointments & Calendar

| Call | File(s) | Usage |
|------|---------|--------|
| `Appointment.list('-date', 200)` | pages/ClinicCalendar | |
| `Appointment.list('-date', 100)` | pages/ClientFile | |
| `Appointment.list('-appointment_number', 1)` | pages/ClinicCalendar | |
| `Appointment.create(data)` | pages/ClinicCalendar, components/visits/VisitForm | |
| `Appointment.update(id, data)` | pages/ClinicCalendar | |
| `Appointment.delete(id)` | pages/ClinicCalendar | |
| `CalendarSettings.list()` | pages/ClinicCalendar, CalendarSettingsManager | |
| `CalendarSettings.create(data)` | pages/CalendarSettingsManager | |
| `CalendarSettings.update(id, data)` | pages/CalendarSettingsManager | |
| `CalendarSettings.delete(id)` | pages/CalendarSettingsManager | |
| `AppointmentType.list()` | pages/CalendarSettingsManager | |
| `DoctorSchedule.list()` | pages/ClinicCalendar, CalendarSettingsManager | |
| `DoctorSchedule.create(data)` | pages/CalendarSettingsManager | |
| `DoctorSchedule.update(id, data)` | pages/CalendarSettingsManager | |
| `DoctorSchedule.delete(id)` | pages/CalendarSettingsManager | |
| `Room.list()` | pages/CalendarSettingsManager | |

### Medical Records

| Call | File(s) | Usage |
|------|---------|--------|
| `MedicalVisit.list('-visit_date', 100)` | pages/ClientFile | |
| `MedicalVisit.list('-created_date', 1000)` | components/visits/VisitForm | |
| `MedicalVisit.create(data)` | components/visits/VisitForm | |
| `MedicalVisit.update(id, data)` | VisitForm, ClientFile | |
| `MedicalVisit.delete(id)` | pages/ClientFile | |
| `PatientMetric.list('-measurement_date', 200)` | pages/ClientFile | |
| `PatientMetric.list('-measurement_date', 5)` | components/visits/VisitForm | |
| `PatientMetric.create(data)` | pages/ClientFile | |
| `PatientMetric.update(id, data)` | pages/ClientFile | |
| `PatientMetric.delete(id)` | pages/ClientFile | |
| `Vaccination.list('-vaccination_date', 100)` | pages/ClientFile | |
| `Vaccination.create(data)` | pages/ClientFile, functions/importVaccinationHistory | |
| `Vaccination.update(id, data)` | pages/ClientFile | |
| `Vaccination.delete(id)` | pages/ClientFile | |

### Lab Tests

| Call | File(s) | Usage |
|------|---------|--------|
| `LabTest.list('-test_date', 100)` | pages/ClientFile | |
| `LabTest.list('-created_date', 100)` | pages/ClientFile | |
| `LabTest.list('-created_date', 1000)` | pages/ClientFile, components/visits/VisitForm | |
| `LabTest.create(data)` | pages/ClientFile, components/visits/VisitForm | |
| `LabTest.update(id, data)` | pages/ClientFile | |
| `LabTest.delete(id)` | pages/ClientFile, components/visits/VisitForm | |
| `LabTestType.list('-created_date', 100)` | pages/ClientFile, components/visits/VisitForm | |

### Billing & Payments

| Call | File(s) | Usage |
|------|---------|--------|
| `Billing.list('-billing_date', 100)` | pages/ClientFile, components/billing/BillingManager | |
| `Billing.list('-created_date', 1000)` | components/visits/VisitForm | |
| `Billing.create(data)` | components/billing/BillingManager | |
| `Billing.update(id, data)` | components/billing/BillingManager | |
| `Billing.delete(id)` | BillingManager, components/visits/VisitForm | |
| `ClientPriceList.list('-created_date', 500)` | pages/ClientFile, VisitForm, BillingManager | |
| `ClientPriceList.list('-updated_date', 5000)` | functions/syncSupplierPrices | |
| `ClientPriceList.create(data)` | functions/syncSupplierPrices | |
| `ClientPriceList.update(id, data)` | functions/syncSupplierPrices | |
| `SupplierPrice.list('-updated_date', 5000)` | functions/syncSupplierPrices | |

### Protocols & Hospitalization

| Call | File(s) | Usage |
|------|---------|--------|
| `ProtocolTemplate.list('-created_date')` | pages/Protocols, ReportsPage | |
| `ProtocolTemplate.create(data)` | pages/Protocols | |
| `FilledProtocol.list('-created_date')` | pages/Protocols, ReportsPage | |
| `FilledProtocol.create(data)` | pages/Protocols | |
| `FilledProtocol.update(id, data)` | pages/Protocols | |
| `FilledProtocol.delete(id)` | pages/Protocols | |
| `HospitalizedAnimal.list('-created_date')` | pages/Hospitalization, HospitalizationReport, ReportsPage | |
| `HospitalizedAnimal.create(data)` | pages/HospitalizationReport | |
| `HospitalizedAnimal.update(id, data)` | pages/HospitalizationReport | |
| `HospitalizedAnimal.delete(id)` | pages/Hospitalization | |
| `TreatmentExecution.list('-execution_time')` | pages/ReportsPage | |
| `TreatmentExecution.list('-created_date', 200)` | pages/AdminDashboard | |

### Inventory & Orders

| Call | File(s) | Usage |
|------|---------|--------|
| `InventoryShortage.filter({status: 'needed'})` | layout, pages/AdminDashboard | |
| `InventoryShortage.list('-created_date')` | pages/ReportsPage | |
| `InventoryShortage.create(data)` | pages/InventoryManagement | |
| `Order.list('-order_date')` | pages/InventoryManagement, OrderManagement, ReportsPage | |
| `Order.update(id, data)` | pages/InventoryManagement, OrderManagement | |
| `Order.create(data)` | pages/OrderManagement | |
| `Order.delete(id)` | pages/OrderManagement | |

### Messages & Documents

| Call | File(s) | Usage |
|------|---------|--------|
| `VetReferral.list('-updated_date')` | pages/VetReferrals | |
| `VetReferral.filter({status}, '-updated_date')` | pages/VetReferrals | |
| `VetReferral.filter({target_doctor_id, status})` | layout | |
| `VetReferral.filter({referring_user_id, status})` | layout | |
| `VetReferral.create(data)` | pages/VetReferrals | |
| `VetReferral.update(id, data)` | pages/VetReferrals | |
| `ClientDocument.list('-created_date', 100)` | pages/ClientFile | |
| `ClientDocument.create(data)` | pages/ClientFile | |
| `ClientDocument.delete(id)` | pages/ClientFile | |

### Clinic Cases

| Call | File(s) | Usage |
|------|---------|--------|
| `ClinicCase.list('-updated_date')` | pages/MarpetTracking | |
| `ClinicCase.list('-updated_date', 10)` | layout | |
| `ClinicCase.create(data)` | pages/MarpetTracking | |
| `ClinicCase.update(id, data)` | pages/MarpetTracking | |
| `ClinicCase.delete(id)` | pages/MarpetTracking | |

### Other Entities

FormConfiguration, MessageTemplate, PriceList, etc. are referenced in FormsManagement, NotificationsManager, PriceListsPage and follow the same CRUD pattern.

---

## 3. Integrations SDK (`base44.integrations.Core.*`)

| Call | File(s) | Usage |
|------|---------|--------|
| `base44.integrations.Core.UploadFile({ file })` | pages/ClientFile, MyProfile, EditProfileForm, components/visits/VisitForm | File upload |
| `base44.integrations.Core.SendEmail({ to, subject, body })` | pages/VetReferrals | Send email |
| `base44.integrations.Core.InvokeLLM({ prompt, file_urls?, response_json_schema? })` | components/visits/VisitForm | Extract lab results from images |

**Not used in app:** SendSMS, GenerateImage, ExtractDataFromUploadedFile.

---

## 4. Custom Functions

| Function | Called from frontend? | Usage |
|----------|------------------------|--------|
| `importVaccinationHistory` | No | Admin feature via XML import page (invoked separately) |
| `syncSupplierPrices` | No | Admin feature (invoked separately) |

---

## 5. User entity methods (note)

- App uses `base44.entities.User.me()` and `base44.entities.User.updateMyUserData(data)` in addition to `base44.auth.me()`. Ensure replacement backend exposes equivalent (e.g. GET /auth/me and PATCH /auth/me or PATCH /users/me).
