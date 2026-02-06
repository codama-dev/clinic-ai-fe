# Authorization & Permission Map

**Source:** Base44 agent analysis. Use to implement the same rules in the replacement backend (admin-only endpoints, permission checks).

---

## 1. Admin-Only Pages / Operations (`role === 'admin'`)

| Page / Feature | Note |
|----------------|------|
| pages/AdminDashboard | Admin dashboard |
| pages/UsersPage | Full admin access (manage users) |
| pages/ApproveSchedules | Approve/reject schedules |
| pages/XMLDataImport | Import data from XML |
| functions/syncSupplierPrices | Sync prices (backend function) |

---

## 2. Permission-Based Access

| Page/Feature | Condition | Effect |
|--------------|-----------|--------|
| pages/WeeklyScheduleManager | `role === 'admin'` OR `permissions.includes('manage_schedule')` | Can create/edit schedules |
| pages/UsersPage | `role === 'admin'` OR `permissions.includes('manage_employees')` | Can manage users |
| pages/ApproveSchedules | `role === 'admin'` OR `permissions.includes('approve_schedules')` | Can approve schedules |
| pages/VacationRequests | `role === 'admin'` OR `permissions.includes('manage_vacations')` | Can approve vacation requests |
| pages/TimeClockManagement | `permissions.includes('manage_time_clock')` | Can edit time clock entries |
| pages/MedicalManagement | `role === 'admin'` OR `permissions.includes('manage_medical')` | Access medical settings |
| pages/OrderManagement | `permissions.includes('manage_orders')` | Can manage orders |
| pages/ShiftTemplatesManager | `permissions.includes('manage_shift_templates')` | Can edit shift templates |
| pages/PriceListsPage | `permissions.includes('manage_supplier_prices')` OR `permissions.includes('manage_client_prices')` | Can manage price lists |
| pages/CalendarSettingsManager | `permissions.includes('manage_calendar')` | Can configure calendar |
| pages/NotificationsManager | `permissions.includes('manage_notifications')` | Can manage notifications |
| pages/FormsManagement | `permissions.includes('manage_forms')` | Can configure forms |
| pages/ReportsPage | `role === 'admin'` OR `permissions.includes('view_reports')` | Can view reports |
| layout – Management link | `role === 'admin'` OR `permissions.length > 0` | Shows management dashboard |
| pages/VetReferrals | `permissions.includes('view_user_list_in_messages')` | Can see all users in recipient list |
| pages/ClientFile – Edit Visit | `job === 'doctor'` OR `role === 'admin'` | Can edit/delete visits |
| pages/Protocols – Edit | Created same day OR `role === 'admin'` | Can edit protocols |
| components/billing/BillingManager | `role === 'admin'` | Can delete billings |
| pages/ReportsPage – Edit Time Clock | `role === 'admin'` | Can edit time clock entries in reports |
| layout – Pending shortages indicator | `role === 'admin'` OR `permissions.includes('manage_orders')` | Shows shortage count |

**Layout – Messages link:** Always visible (all users can message).

---

## 3. Known Permissions List

Use these when implementing permission checks and when seeding/admin UI:

```
manage_employees         # User management
manage_schedule          # Weekly schedule creation
approve_schedules        # Schedule approval
manage_vacations         # Vacation approval
manage_time_clock        # Edit time clock
manage_medical           # Medical settings
manage_orders            # Orders & inventory
manage_shift_templates   # Shift configuration
manage_supplier_prices   # Supplier prices
manage_client_prices    # Client prices
manage_calendar          # Calendar settings
manage_notifications    # Notifications
manage_forms             # Form configuration
view_reports             # Reports page
view_user_list_in_messages  # See all users in messages
```

---

## 4. Realtime & Polling

**Realtime:** No `base44.entities.*.subscribe()` calls found. The app uses **polling** instead.

**Recommendation:** Implement realtime as optional for v2. For v1, the replacement backend does not need WebSocket subscriptions; the frontend can keep using the same polling intervals (or you can later replace them with WebSocket).

| Feature | Current polling interval |
|---------|---------------------------|
| VetReferrals | 5 seconds |
| Inventory shortages | 30 seconds |
| Pending cases | 30 seconds |

(Implemented via React Query `refetchInterval` in the frontend.)
