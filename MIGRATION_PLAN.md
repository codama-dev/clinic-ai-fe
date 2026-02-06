# ClinicAI Migration Plan: Base44 → Express + PostgreSQL

## Executive Summary

This document outlines a complete migration strategy from Base44 to a self-hosted Express.js + PostgreSQL backend. The migration involves:

- **35 entities** with complex relationships
- **2 serverless functions** to migrate
- **Authentication system** replacement
- **Integration layer** for WhatsApp and Israeli payments
- **~300+ API call sites** in the frontend to update

**Estimated Total Effort: 320-480 developer hours (8-12 weeks for 1 senior developer)**

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Database Schema Design](#3-database-schema-design)
4. [API Design](#4-api-design)
5. [Authentication Migration](#5-authentication-migration)
6. [Integration Layer](#6-integration-layer)
7. [Frontend Migration](#7-frontend-migration)
8. [Data Migration](#8-data-migration)
9. [Serverless Functions Migration](#9-serverless-functions-migration)
10. [Deployment Strategy](#10-deployment-strategy)
11. [Testing Strategy](#11-testing-strategy)
12. [Risk Assessment](#12-risk-assessment)
13. [Phase-by-Phase Plan](#13-phase-by-phase-plan)
14. [Effort Estimation](#14-effort-estimation)

---

## 1. Current Architecture Analysis

### 1.1 Frontend Stack (Stays the Same)
- React 18 + Vite 6
- React Router DOM
- TanStack Query (React Query)
- Radix UI + Tailwind CSS
- Stripe React SDK (unused currently)

### 1.2 Base44 Dependencies

#### Entities (35 total)
All data operations go through `base44.entities.EntityName.method()`:

| Entity | Operations Used | Record Count (Est.) |
|--------|----------------|---------------------|
| Client | list, create, update, delete, filter | High (1000+) |
| Patient | list, create, update, delete, filter | High (2000+) |
| Appointment | list, create, update, delete, filter | High (5000+) |
| MedicalVisit | list, create, update, delete, filter | High (3000+) |
| Billing | list, create, update, delete, filter | High (3000+) |
| Vaccination | list, create, update, delete, filter | Medium (1000+) |
| LabTest | list, create, update, delete, filter | Medium (500+) |
| PatientMetric | list, create, update, delete | Medium (1000+) |
| User | list, create, update, delete, filter | Low (50) |
| PublicProfile | list, create, update, delete, filter | Low (50) |
| ExternalEmployee | list, create, update, delete | Low (20) |
| TimeClockEntry | list, create, update, delete, filter | High (5000+) |
| WeeklySchedule | list, create, update, delete, filter | Medium (200+) |
| VacationRequest | list, create, update, delete, filter | Low (100) |
| Constraint | list, create, delete, filter | Low (100) |
| ShiftTemplate | list, filter | Low (20) |
| AppointmentType | list, create, update, delete | Low (30) |
| Room | list, create, update, delete | Low (10) |
| CalendarSettings | list, create, update, delete | Low (50) |
| DoctorSchedule | list, create, update, delete | Low (100) |
| Order | list, create, update, delete | Medium (200) |
| InventoryShortage | list, create, update, filter | Medium (300) |
| PriceList | list, create, update, delete | Low (10) |
| PriceListItem | list, create, update, delete, filter, bulkCreate | Medium (500) |
| ClientPriceList | list, create, update, delete, bulkCreate | Medium (500) |
| SupplierPrice | list, create, update, delete, bulkCreate | Medium (500) |
| VaccinationType | list, create, update, delete, bulkCreate | Low (30) |
| LabTestType | list, create, update, delete, bulkCreate | Low (50) |
| MessageTemplate | list, create, update, delete | Low (20) |
| Notification | list, create | Medium (500) |
| ProtocolTemplate | list, create, update | Low (20) |
| FilledProtocol | list, create | Medium (300) |
| HospitalizedAnimal | list, create, update, delete | Low (100) |
| TreatmentExecution | list, create | Medium (500) |
| ClinicCase | list, create, update, delete | Low (50) |
| VetReferral | list, filter | Low (50) |
| FormConfiguration | list, create, update | Low (20) |
| ClientDocument | list, create, delete | Medium (300) |

#### Integrations Used
- `SendEmail` - Email sending via Base44
- `SendSMS` - SMS sending via Base44
- `UploadFile` - File upload to Base44 storage
- `InvokeLLM` - AI/LLM calls via Base44
- `ExtractDataFromUploadedFile` - Document parsing

#### Serverless Functions
- `importVaccinationHistory.ts` - CSV import for vaccinations
- `syncSupplierPrices.ts` - Price sync between supplier and client lists

### 1.3 Authentication Flow
- Token-based auth managed by Base44
- `base44.auth.me()` - Get current user
- `base44.auth.logout()` - Logout
- `base44.auth.redirectToLogin()` - Redirect to Base44 login page
- App public settings fetched from Base44

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React + Vite (existing code, updated API client)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / BACKEND                       │
│  Express.js + Node.js                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Auth      │ │   REST API  │ │ Integrations│               │
│  │  (JWT)      │ │  (CRUD)     │ │   Layer     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
        │                  │                    │
        ▼                  ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌────────────────────────────┐
│  PostgreSQL   │  │  Redis Cache  │  │   External Services        │
│  (Primary DB) │  │  (Sessions)   │  │  ┌────────┐ ┌────────────┐ │
└───────────────┘  └───────────────┘  │  │WhatsApp│ │Israeli Pay │ │
                                       │  │  API   │ │(Tranzila/  │ │
┌───────────────┐                      │  └────────┘ │ PayPlus)   │ │
│  S3/Cloudflare│                      │             └────────────┘ │
│  R2 (Files)   │                      │  ┌────────┐ ┌────────────┐ │
└───────────────┘                      │  │ SMTP   │ │  OpenAI    │ │
                                       │  │ Server │ │   API      │ │
                                       │  └────────┘ └────────────┘ │
                                       └────────────────────────────┘
```

### 2.1 Technology Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Runtime | Node.js 20 LTS | Stable, widely supported |
| Framework | Express.js 4.x | Simple, flexible, huge ecosystem |
| Database | PostgreSQL 16 | Robust, supports JSON, full-text search |
| ORM | Prisma | Type-safe, migrations, great DX |
| Auth | JWT + Passport.js | Industry standard, flexible |
| Sessions | Redis | Fast, scalable session store |
| File Storage | Cloudflare R2 or AWS S3 | Cost-effective, S3-compatible |
| Email | SendGrid or Custom SMTP | Reliable, affordable |
| SMS | Twilio Israel or SMS4Free | Israeli phone support |
| WhatsApp | WhatsApp Business API (via 360dialog or official) | Required for business messaging |
| Payments | Tranzila / PayPlus / Cardcom | Israeli payment processors |
| LLM | OpenAI API direct | No middleman, full control |

---

## 3. Database Schema Design

### 3.1 Core Entities

```sql
-- ============================================
-- AUTHENTICATION & USERS
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    display_name VARCHAR(255),
    phone VARCHAR(50),
    id_number VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    role VARCHAR(50) DEFAULT 'user', -- admin, doctor, receptionist, etc.
    job VARCHAR(50), -- doctor, nurse, receptionist, etc.
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    display_name VARCHAR(255),
    job VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    id_number VARCHAR(20),
    birthday_date DATE,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE external_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    job VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CLIENTS & PATIENTS
-- ============================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_number SERIAL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    phone_secondary VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    id_number VARCHAR(20),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive
    marketing_consent BOOLEAN DEFAULT false,
    reminders_consent BOOLEAN DEFAULT true,
    preferred_contact VARCHAR(50) DEFAULT 'phone', -- phone, email, whatsapp
    balance DECIMAL(10,2) DEFAULT 0,
    has_no_show_history BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_full_name ON clients(full_name);

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_number SERIAL UNIQUE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    species VARCHAR(100), -- dog, cat, bird, etc.
    breed VARCHAR(100),
    sex VARCHAR(20), -- male, female
    neutered BOOLEAN DEFAULT false,
    neutered_date DATE,
    date_of_birth DATE,
    weight DECIMAL(6,2),
    microchip VARCHAR(100),
    microchip_date DATE,
    color VARCHAR(100),
    description TEXT,
    photo_url TEXT,
    allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    is_insured BOOLEAN DEFAULT false,
    insurance_company VARCHAR(255),
    insurance_policy VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, deceased
    inactive_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_client_id ON patients(client_id);
CREATE INDEX idx_patients_name ON patients(name);

CREATE TABLE client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    document_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- APPOINTMENTS & CALENDAR
-- ============================================

CREATE TABLE appointment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_number SERIAL UNIQUE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    appointment_type_id UUID REFERENCES appointment_types(id),
    room_id UUID REFERENCES rooms(id),
    duration_minutes INTEGER DEFAULT 30,
    chief_complaint TEXT,
    reception_notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, arrived, in_progress, completed, no_show, cancelled
    is_general_meeting BOOLEAN DEFAULT false,
    participants JSONB, -- for general meetings
    -- Denormalized for quick display
    client_name VARCHAR(255),
    client_phone VARCHAR(50),
    patient_name VARCHAR(255),
    doctor_name VARCHAR(255),
    appointment_type_name VARCHAR(255),
    room_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE TABLE calendar_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_type VARCHAR(50) NOT NULL, -- blocked_date, holiday, etc.
    date DATE,
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    doctor_id UUID REFERENCES users(id),
    slot_duration INTEGER,
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    shift_type VARCHAR(50), -- morning, evening, full
    start_time TIME,
    end_time TIME,
    morning_start TIME,
    morning_end TIME,
    evening_start TIME,
    evening_end TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MEDICAL RECORDS
-- ============================================

CREATE TABLE medical_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_number SERIAL UNIQUE,
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    doctor_id UUID REFERENCES users(id),
    visit_date DATE NOT NULL,
    visit_time TIME,
    chief_complaint TEXT,
    findings_and_tests TEXT,
    diagnosis TEXT,
    treatment TEXT,
    vital_signs JSONB, -- {weight, temperature, heart_rate, respiratory_rate, blood_pressure}
    lab_tests JSONB, -- array of lab test references
    items_from_pricelist JSONB, -- items used in visit
    prescriptions JSONB, -- array of prescriptions
    follow_up_days INTEGER,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT false,
    attachments JSONB, -- array of file URLs
    notes TEXT,
    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed
    -- Denormalized
    client_name VARCHAR(255),
    patient_name VARCHAR(255),
    doctor_name VARCHAR(255),
    doctor_license VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_visits_patient_id ON medical_visits(patient_id);
CREATE INDEX idx_medical_visits_visit_date ON medical_visits(visit_date);

CREATE TABLE patient_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    measurement_date DATE NOT NULL,
    weight DECIMAL(6,2),
    temperature DECIMAL(4,1),
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    measured_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patient_metrics_patient_id ON patient_metrics(patient_id);

CREATE TABLE vaccination_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    default_interval_days INTEGER,
    first_reminder_days_before INTEGER DEFAULT 14,
    second_reminder_days_before INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vaccinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    vaccination_type_id UUID REFERENCES vaccination_types(id),
    vaccination_type VARCHAR(255), -- denormalized name
    vaccination_date DATE NOT NULL,
    next_vaccination_date DATE,
    first_reminder_date DATE,
    second_reminder_date DATE,
    batch_number VARCHAR(100),
    administered_by VARCHAR(255),
    notes TEXT,
    -- Denormalized
    client_name VARCHAR(255),
    patient_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vaccinations_patient_id ON vaccinations(patient_id);
CREATE INDEX idx_vaccinations_next_date ON vaccinations(next_vaccination_date);

CREATE TABLE lab_test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parameters JSONB, -- array of {name, unit, min_normal, max_normal}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_number SERIAL UNIQUE,
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    visit_id UUID REFERENCES medical_visits(id),
    test_type_id UUID REFERENCES lab_test_types(id),
    test_name VARCHAR(255),
    test_date DATE NOT NULL,
    results JSONB, -- structured test results
    performed_by VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed
    -- Denormalized
    client_name VARCHAR(255),
    patient_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lab_tests_patient_id ON lab_tests(patient_id);

-- ============================================
-- BILLING & PAYMENTS
-- ============================================

CREATE TABLE billings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    visit_id UUID REFERENCES medical_visits(id),
    billing_date DATE NOT NULL,
    items JSONB NOT NULL, -- array of {description, quantity, unit_price, total, discount, discount_type}
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(50), -- percentage, fixed
    discount_reason TEXT,
    vat_rate DECIMAL(4,2) DEFAULT 17,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, partial, paid, cancelled
    payments JSONB DEFAULT '[]', -- array of {date, amount, method, reference, notes}
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2),
    -- Denormalized
    client_name VARCHAR(255),
    patient_name VARCHAR(255),
    visit_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billings_client_id ON billings(client_id);
CREATE INDEX idx_billings_status ON billings(status);

-- Future: separate payments table for Israeli payment integration
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_id UUID REFERENCES billings(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ILS',
    method VARCHAR(50) NOT NULL, -- cash, credit, bit, check, bank_transfer
    status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed, refunded
    provider_transaction_id VARCHAR(255), -- from payment provider
    provider_response JSONB, -- raw response from provider
    reference VARCHAR(255),
    notes TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRICING
-- ============================================

CREATE TABLE price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    sub_category VARCHAR(100),
    item_type VARCHAR(100),
    client_price DECIMAL(10,2),
    supplier_price DECIMAL(10,2),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE client_price_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    item_type VARCHAR(100),
    client_price DECIMAL(10,2),
    supplier_price DECIMAL(10,2),
    supplier_name VARCHAR(255),
    description TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255),
    price DECIMAL(10,2),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    supplier_prices JSONB, -- {supplier_name: price} for multiple suppliers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVENTORY & ORDERS
-- ============================================

CREATE TABLE inventory_shortages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity_needed INTEGER,
    status VARCHAR(50) DEFAULT 'needed', -- needed, ordered, received
    requested_by VARCHAR(255),
    report_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL UNIQUE,
    order_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, received, cancelled
    total_amount DECIMAL(10,2),
    items JSONB NOT NULL, -- array of {product_name, quantity, price_per_unit, notes}
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EMPLOYEE MANAGEMENT
-- ============================================

CREATE TABLE weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    shifts JSONB NOT NULL, -- array of {date, shift_type, start_time, end_time}
    approval_status VARCHAR(50) DEFAULT 'draft', -- draft, pending_approval, approved
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weekly_schedules_week ON weekly_schedules(week_start_date);

CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    shift_type VARCHAR(50),
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vacation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_email VARCHAR(255),
    employee_name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(50) DEFAULT 'vacation', -- vacation, sick, unpaid_leave, etc.
    total_days INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    notes TEXT,
    attachment_url TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    unavailable_day INTEGER, -- day of week
    unavailable_shift VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE time_clock_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES users(id),
    employee_email VARCHAR(255),
    employee_name VARCHAR(255),
    date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    total_hours DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_time_clock_date ON time_clock_entries(date);
CREATE INDEX idx_time_clock_employee ON time_clock_entries(employee_id);

-- ============================================
-- NOTIFICATIONS & MESSAGING
-- ============================================

CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- email, sms, whatsapp
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    recipient VARCHAR(255) NOT NULL, -- phone or email
    message_content TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL, -- email, sms, whatsapp
    template_id UUID REFERENCES message_templates(id),
    scheduled_time TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    provider_message_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_time);

-- ============================================
-- PROTOCOLS & FORMS
-- ============================================

CREATE TABLE protocol_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sections JSONB NOT NULL, -- template structure
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE filled_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES protocol_templates(id),
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    filled_by VARCHAR(255),
    consent_agreed BOOLEAN DEFAULT false,
    client_signature TEXT,
    field_metadata JSONB, -- filled form data
    -- Denormalized
    client_name VARCHAR(255),
    patient_name VARCHAR(255),
    animal_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE form_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_name VARCHAR(255) NOT NULL UNIQUE,
    fields JSONB NOT NULL, -- array of field configs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- HOSPITALIZATION
-- ============================================

CREATE TABLE hospitalized_animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    patient_id UUID REFERENCES patients(id),
    owner_name VARCHAR(255),
    animal_name VARCHAR(255),
    animal_type VARCHAR(100),
    animal_sex VARCHAR(20),
    age VARCHAR(50),
    breed VARCHAR(100),
    animal_image_url TEXT,
    is_neutered BOOLEAN DEFAULT false,
    has_catheter BOOLEAN DEFAULT false,
    catheter_insertion_date DATE,
    admission_date DATE NOT NULL,
    admission_time TIME,
    admission_weight DECIMAL(6,2),
    diagnoses TEXT,
    treatment_instructions JSONB, -- array of treatment instructions
    status VARCHAR(50) DEFAULT 'admitted', -- admitted, discharged, deceased
    discharge_instructions TEXT,
    date_of_death DATE,
    monitoring_log JSONB,
    fluids_log JSONB,
    observations_log JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE treatment_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID REFERENCES hospitalized_animals(id) ON DELETE CASCADE,
    instruction_id VARCHAR(100), -- reference to instruction in treatment_instructions
    execution_time TIMESTAMP NOT NULL,
    executed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MISC
-- ============================================

CREATE TABLE clinic_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number SERIAL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, closed
    created_by UUID REFERENCES users(id),
    created_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vet_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_doctor_id UUID REFERENCES users(id),
    target_doctor_id UUID REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    client_id UUID REFERENCES clients(id),
    patient_name VARCHAR(255),
    client_name VARCHAR(255),
    referral_reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FILE STORAGE REFERENCES
-- ============================================

CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename VARCHAR(500),
    stored_filename VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id),
    entity_type VARCHAR(100), -- what entity this file belongs to
    entity_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
```

### 3.2 Database Migrations Strategy

Using Prisma migrations:
```
prisma/
├── schema.prisma
└── migrations/
    ├── 001_initial_schema/
    ├── 002_add_payments_table/
    └── ...
```

---

## 4. API Design

### 4.1 API Structure

```
/api/v1/
├── /auth
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /refresh
│   ├── GET    /me
│   └── POST   /forgot-password
│
├── /users
│   ├── GET    /                    (list)
│   ├── POST   /                    (create)
│   ├── GET    /:id                 (read)
│   ├── PUT    /:id                 (update)
│   └── DELETE /:id                 (delete)
│
├── /clients
│   ├── GET    /                    (list with pagination, search, filters)
│   ├── POST   /                    (create)
│   ├── GET    /:id                 (read)
│   ├── PUT    /:id                 (update)
│   ├── DELETE /:id                 (delete)
│   ├── GET    /:id/patients        (get client's patients)
│   ├── GET    /:id/appointments    (get client's appointments)
│   ├── GET    /:id/billings        (get client's billings)
│   └── GET    /:id/documents       (get client's documents)
│
├── /patients
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── GET    /:id/visits
│   ├── GET    /:id/vaccinations
│   ├── GET    /:id/lab-tests
│   └── GET    /:id/metrics
│
├── /appointments
│   ├── GET    /                    (with date range filters)
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── PATCH  /:id/status          (update status only)
│
├── /medical-visits
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /billings
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── POST   /:id/payments        (add payment)
│
├── /vaccinations
│   ├── GET    /
│   ├── POST   /
│   ├── POST   /bulk                (bulk create)
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /lab-tests
│   ├── GET    /
│   ├── POST   /
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /settings
│   ├── /appointment-types          (CRUD)
│   ├── /rooms                      (CRUD)
│   ├── /calendar-settings          (CRUD)
│   ├── /doctor-schedules           (CRUD)
│   ├── /vaccination-types          (CRUD + bulk)
│   ├── /lab-test-types             (CRUD + bulk)
│   ├── /message-templates          (CRUD)
│   ├── /protocol-templates         (CRUD)
│   └── /form-configurations        (CRUD)
│
├── /pricing
│   ├── /price-lists                (CRUD)
│   ├── /price-list-items           (CRUD + bulk)
│   ├── /client-price-list          (CRUD + bulk)
│   └── /supplier-prices            (CRUD + bulk)
│
├── /inventory
│   ├── /shortages                  (CRUD)
│   └── /orders                     (CRUD)
│
├── /employees
│   ├── /public-profiles            (CRUD)
│   ├── /external-employees         (CRUD)
│   ├── /weekly-schedules           (CRUD + approve)
│   ├── /vacation-requests          (CRUD + approve/reject)
│   ├── /constraints                (CRUD)
│   ├── /time-clock                 (CRUD + clock-in/out)
│   └── /shift-templates            (CRUD)
│
├── /hospitalization
│   ├── /animals                    (CRUD)
│   └── /treatment-executions       (CRUD)
│
├── /notifications
│   ├── GET    /
│   ├── POST   /                    (schedule notification)
│   └── POST   /send-now            (send immediately)
│
├── /integrations
│   ├── POST   /upload-file
│   ├── POST   /send-email
│   ├── POST   /send-sms
│   ├── POST   /send-whatsapp
│   ├── POST   /invoke-llm
│   └── POST   /extract-document
│
├── /payments (Israeli payment integration)
│   ├── POST   /create-charge       (initiate payment)
│   ├── POST   /webhook             (payment provider callback)
│   └── GET    /:id/status          (check payment status)
│
└── /reports
    ├── GET    /time-clock
    ├── GET    /financial
    ├── GET    /medical
    └── GET    /inventory
```

### 4.2 API Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ... } | [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### 4.3 Express Project Structure

```
backend/
├── src/
│   ├── index.ts                    # Entry point
│   ├── app.ts                      # Express app setup
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.ts                 # JWT verification
│   │   ├── validation.ts           # Request validation
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── clients.routes.ts
│   │   ├── patients.routes.ts
│   │   └── ...
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── clients.controller.ts
│   │   └── ...
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── clients.service.ts
│   │   ├── email.service.ts
│   │   ├── sms.service.ts
│   │   ├── whatsapp.service.ts
│   │   ├── payment.service.ts
│   │   ├── storage.service.ts
│   │   └── llm.service.ts
│   ├── models/                     # Prisma models (generated)
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── pagination.ts
│   │   └── helpers.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## 5. Authentication Migration

### 5.1 Current Auth Flow (Base44)
1. User clicks login → redirected to Base44 login page
2. Base44 authenticates and redirects back with token in URL
3. Token stored in localStorage
4. `base44.auth.me()` validates token and returns user

### 5.2 New Auth Flow (JWT)

```typescript
// Auth Service
class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      throw new UnauthorizedError('Invalid credentials');
    }
    
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = await this.createRefreshToken(user.id);
    
    return { accessToken, refreshToken, user: this.sanitizeUser(user) };
  }
  
  async refreshAccessToken(refreshToken: string) {
    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, expires_at: { gt: new Date() } }
    });
    if (!stored) throw new UnauthorizedError('Invalid refresh token');
    
    const user = await prisma.user.findUnique({ where: { id: stored.user_id } });
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    return { accessToken };
  }
}
```

### 5.3 Frontend Auth Changes

Replace `AuthContext.jsx`:

```jsx
// New AuthContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 6. Integration Layer

### 6.1 WhatsApp Business API Integration

**Option 1: Official WhatsApp Cloud API (Meta)**
- Free tier: 1,000 conversations/month
- Requires Meta Business verification
- Templates must be pre-approved

**Option 2: 360dialog (Recommended for Israel)**
- Official WhatsApp partner
- Better support for Israeli businesses
- Easier onboarding

```typescript
// whatsapp.service.ts
import axios from 'axios';

class WhatsAppService {
  private apiUrl = 'https://waba.360dialog.io/v1';
  private apiKey = process.env.WHATSAPP_API_KEY;
  
  async sendTemplateMessage(
    phone: string, 
    templateName: string, 
    language: string = 'he',
    components: any[]
  ) {
    const response = await axios.post(
      `${this.apiUrl}/messages`,
      {
        to: this.formatPhone(phone),
        type: 'template',
        template: {
          namespace: process.env.WHATSAPP_NAMESPACE,
          name: templateName,
          language: { code: language },
          components
        }
      },
      { headers: { 'D360-API-KEY': this.apiKey } }
    );
    
    // Log to database
    await prisma.notification.create({
      data: {
        recipient: phone,
        channel: 'whatsapp',
        message_content: templateName,
        status: 'sent',
        provider_message_id: response.data.messages[0].id
      }
    });
    
    return response.data;
  }
  
  private formatPhone(phone: string): string {
    // Convert Israeli format to international
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    }
    return cleaned;
  }
}
```

### 6.2 Israeli Payment Integration

**Recommended Providers:**

| Provider | Pros | Cons |
|----------|------|------|
| **Tranzila** | Veteran, stable, good support | Older API |
| **PayPlus** | Modern API, good docs | Newer company |
| **Cardcom** | Feature-rich | Complex pricing |
| **Meshulam** | Simple API | Limited features |

```typescript
// payment.service.ts (PayPlus example)
class PaymentService {
  private apiUrl = 'https://reapi.payplus.co.il/api/v1.0';
  private apiKey = process.env.PAYPLUS_API_KEY;
  private secretKey = process.env.PAYPLUS_SECRET_KEY;
  
  async createPaymentPage(billing: Billing, client: Client) {
    const response = await axios.post(
      `${this.apiUrl}/PaymentPages/generateLink`,
      {
        payment_page_uid: process.env.PAYPLUS_PAGE_UID,
        charge_method: 1, // 1=charge, 2=auth
        amount: billing.balance,
        currency_code: 'ILS',
        customer: {
          customer_name: client.full_name,
          email: client.email,
          phone: client.phone,
          vat_number: client.id_number
        },
        items: billing.items.map(item => ({
          name: item.description,
          quantity: item.quantity,
          price: item.unit_price,
          vat_type: 1 // 1=included
        })),
        more_info: billing.id,
        success_url: `${process.env.FRONTEND_URL}/payment/success`,
        failure_url: `${process.env.FRONTEND_URL}/payment/failure`,
        webhook_url: `${process.env.API_URL}/payments/webhook`
      },
      {
        headers: {
          'Authorization': JSON.stringify({
            api_key: this.apiKey,
            secret_key: this.secretKey
          })
        }
      }
    );
    
    return response.data.data.payment_page_link;
  }
  
  async handleWebhook(payload: any) {
    // Verify webhook signature
    // Update billing status
    // Create payment record
    const billing = await prisma.billing.findUnique({
      where: { id: payload.more_info }
    });
    
    if (payload.status_code === '000') { // Success
      await prisma.$transaction([
        prisma.billing.update({
          where: { id: billing.id },
          data: {
            status: 'paid',
            amount_paid: billing.total,
            balance: 0
          }
        }),
        prisma.payment.create({
          data: {
            billing_id: billing.id,
            amount: payload.amount,
            currency: 'ILS',
            method: 'credit',
            status: 'completed',
            provider_transaction_id: payload.transaction_uid,
            provider_response: payload
          }
        })
      ]);
    }
  }
}
```

### 6.3 File Storage (S3/R2)

```typescript
// storage.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class StorageService {
  private s3: S3Client;
  private bucket = process.env.S3_BUCKET;
  
  constructor() {
    this.s3 = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT, // For R2
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
      }
    });
  }
  
  async uploadFile(file: Express.Multer.File, folder: string = 'uploads') {
    const key = `${folder}/${Date.now()}-${file.originalname}`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));
    
    const url = `${process.env.CDN_URL}/${key}`;
    
    // Save to database
    await prisma.fileUpload.create({
      data: {
        original_filename: file.originalname,
        stored_filename: key,
        file_url: url,
        mime_type: file.mimetype,
        file_size: file.size
      }
    });
    
    return { file_url: url };
  }
}
```

### 6.4 Email & SMS

```typescript
// email.service.ts
import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
  
  async send(to: string, subject: string, html: string) {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM,
      subject,
      html
    });
  }
}

// sms.service.ts
import twilio from 'twilio';

class SMSService {
  private client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  async send(to: string, body: string) {
    await this.client.messages.create({
      to: this.formatPhone(to),
      from: process.env.TWILIO_PHONE_NUMBER,
      body
    });
  }
}
```

### 6.5 LLM Integration

```typescript
// llm.service.ts
import OpenAI from 'openai';

class LLMService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  async invoke(prompt: string, systemPrompt?: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  }
  
  async extractFromDocument(fileUrl: string, schema: any) {
    // Download file, convert to text/image, send to GPT-4 Vision
    // Return structured data
  }
}
```

---

## 7. Frontend Migration

### 7.1 New API Client

Replace all `base44.entities.*` calls with a unified API client:

```typescript
// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/v1/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', response.data.accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export { apiClient };
```

### 7.2 Entity Services

Create service modules that mirror Base44's API:

```typescript
// src/api/entities/clients.ts
import { apiClient } from '../client';

export const ClientsService = {
  list: async (sort?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (sort) params.append('sort', sort);
    if (limit) params.append('limit', String(limit));
    const response = await apiClient.get(`/clients?${params}`);
    return response.data.data;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data.data;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/clients', data);
    return response.data.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/clients/${id}`, data);
    return response.data.data;
  },
  
  delete: async (id: string) => {
    await apiClient.delete(`/clients/${id}`);
  },
  
  filter: async (filters: Record<string, any>, sort?: string) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.append(`filter[${key}]`, String(value));
    });
    if (sort) params.append('sort', sort);
    const response = await apiClient.get(`/clients?${params}`);
    return response.data.data;
  }
};

// Similar for all other entities...
```

### 7.3 Migration Script for Frontend Imports

```bash
# Find and replace pattern in all JSX files:
# FROM: base44.entities.Client.list(...)
# TO:   ClientsService.list(...)

# FROM: import { base44 } from "@/api/base44Client";
# TO:   import { ClientsService, PatientService, ... } from "@/api/entities";
```

### 7.4 Files to Update

| File | Changes Required |
|------|-----------------|
| `src/api/base44Client.js` | Replace with `client.ts` |
| `src/api/entities.js` | Replace with entity services |
| `src/api/integrations.js` | Replace with integration services |
| `src/lib/AuthContext.jsx` | Complete rewrite |
| `src/pages/*.jsx` (40 files) | Update all entity imports/calls |
| `src/components/**/*.jsx` (56 files) | Update all entity imports/calls |

**Estimated frontend changes: ~300+ individual API call sites**

---

## 8. Data Migration

### 8.1 Migration Strategy

1. **Export from Base44** - Use Base44 SDK to export all data as JSON
2. **Transform** - Map Base44 IDs to UUIDs, normalize data
3. **Import to PostgreSQL** - Run import scripts

### 8.2 Migration Script

```typescript
// scripts/migrate-data.ts
import { PrismaClient } from '@prisma/client';
import { createClient } from '@base44/sdk';

const prisma = new PrismaClient();
const base44 = createClient({ appId: '...', serverUrl: '...', token: '...' });

// ID mapping for foreign keys
const idMap = new Map<string, string>();

async function migrateClients() {
  console.log('Migrating clients...');
  const clients = await base44.asServiceRole.entities.Client.list('', 10000);
  
  for (const client of clients) {
    const newId = await prisma.client.create({
      data: {
        client_number: client.client_number,
        full_name: client.full_name,
        phone: client.phone,
        email: client.email,
        address: client.address,
        // ... map all fields
      }
    });
    idMap.set(`client:${client.id}`, newId.id);
  }
  console.log(`Migrated ${clients.length} clients`);
}

async function migratePatients() {
  console.log('Migrating patients...');
  const patients = await base44.asServiceRole.entities.Patient.list('', 10000);
  
  for (const patient of patients) {
    const clientId = idMap.get(`client:${patient.client_id}`);
    const newId = await prisma.patient.create({
      data: {
        patient_number: patient.patient_number,
        client_id: clientId,
        name: patient.name,
        // ... map all fields
      }
    });
    idMap.set(`patient:${patient.id}`, newId.id);
  }
}

// ... similar for all entities

async function main() {
  // Order matters due to foreign keys
  await migrateClients();
  await migratePatients();
  await migrateAppointmentTypes();
  await migrateRooms();
  await migrateAppointments();
  await migrateMedicalVisits();
  await migrateBillings();
  await migrateVaccinations();
  // ... etc
  
  console.log('Migration complete!');
}

main().catch(console.error);
```

### 8.3 Data Validation

```typescript
// scripts/validate-migration.ts
async function validateCounts() {
  const base44Counts = {
    clients: await base44.entities.Client.list().then(c => c.length),
    patients: await base44.entities.Patient.list().then(p => p.length),
    // ...
  };
  
  const pgCounts = {
    clients: await prisma.client.count(),
    patients: await prisma.patient.count(),
    // ...
  };
  
  for (const [entity, count] of Object.entries(base44Counts)) {
    if (pgCounts[entity] !== count) {
      console.error(`Mismatch for ${entity}: Base44=${count}, PG=${pgCounts[entity]}`);
    }
  }
}
```

---

## 9. Serverless Functions Migration

### 9.1 importVaccinationHistory

Convert Deno function to Express endpoint:

```typescript
// routes/vaccinations.routes.ts
router.post('/import-csv', authMiddleware, adminOnly, async (req, res) => {
  const { csvContent, dry_run = false } = req.body;
  
  // Parse CSV
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0].split(',').map(h => h.trim());
  
  // ... same logic as original function
  
  const results = { total: 0, successful: 0, failed: 0, errors: [], to_create: [] };
  
  // Get all clients and patients for lookup
  const allClients = await prisma.client.findMany();
  const allPatients = await prisma.patient.findMany();
  
  for (let i = 1; i < lines.length; i++) {
    // ... process each row
    
    if (!dry_run) {
      await prisma.vaccination.create({ data: vaccinationData });
    }
  }
  
  res.json({ success: true, results });
});
```

### 9.2 syncSupplierPrices

```typescript
// routes/pricing.routes.ts
router.post('/sync-supplier-prices', authMiddleware, adminOnly, async (req, res) => {
  const { dry_run = false, confirmed_items } = req.body;
  
  const supplierPrices = await prisma.supplierPrice.findMany();
  const clientPrices = await prisma.clientPriceList.findMany();
  
  // ... same sync logic
  
  res.json({ success: true, results });
});
```

---

## 10. Deployment Strategy

### 10.1 Infrastructure Options

**Option A: Simple VPS (Recommended for start)**
- DigitalOcean/Linode/Vultr
- 2 vCPU, 4GB RAM (~$24/month)
- Managed PostgreSQL ($15/month)
- Total: ~$40-50/month

**Option B: Serverless**
- Railway/Render/Fly.io for API
- Neon/Supabase for PostgreSQL
- Total: ~$30-60/month depending on usage

**Option C: Full Cloud**
- AWS/GCP/Azure
- ECS/Cloud Run + RDS/Cloud SQL
- Total: ~$100-200/month

### 10.2 Docker Setup

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=clinicai
      - POSTGRES_USER=clinicai
      - POSTGRES_PASSWORD=...
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 10.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to server
        # ... deployment steps
```

---

## 11. Testing Strategy

### 11.1 Test Coverage Requirements

| Area | Coverage Target |
|------|-----------------|
| API Endpoints | 80%+ |
| Services | 90%+ |
| Auth flows | 100% |
| Payment webhooks | 100% |

### 11.2 Test Examples

```typescript
// __tests__/api/clients.test.ts
describe('Clients API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });
  
  it('should create a client', async () => {
    const response = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        full_name: 'Test Client',
        phone: '0501234567'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.full_name).toBe('Test Client');
  });
  
  it('should list clients with pagination', async () => {
    const response = await request(app)
      .get('/api/v1/clients?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(1);
  });
});
```

---

## 12. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Medium | Critical | Multiple backups, staged migration, validation scripts |
| Auth issues blocking users | Medium | High | Parallel auth systems during transition |
| Payment integration failures | Medium | High | Extensive sandbox testing, fallback to manual |
| Performance degradation | Low | Medium | Load testing, caching, monitoring |
| WhatsApp API rate limits | Medium | Medium | Queue system, retry logic |
| Scope creep | High | Medium | Strict phase boundaries, MVP focus |

---

## 13. Phase-by-Phase Plan

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Express.js project structure
- [ ] Configure PostgreSQL + Prisma
- [ ] Implement core database schema (users, clients, patients)
- [ ] Implement JWT authentication
- [ ] Basic CRUD for 5 core entities
- [ ] Unit tests for auth and core entities

**Deliverable:** Backend with auth + core entities working

### Phase 2: Medical Core (Weeks 3-4)
- [ ] Appointments, MedicalVisits, Vaccinations, LabTests
- [ ] Calendar settings and doctor schedules
- [ ] File upload service (S3/R2)
- [ ] API documentation (Swagger/OpenAPI)

**Deliverable:** All medical/clinical entities working

### Phase 3: Business Operations (Weeks 5-6)
- [ ] Billing and pricing entities
- [ ] Inventory and orders
- [ ] Employee management (time clock, schedules, vacations)
- [ ] Notifications entity (without sending yet)

**Deliverable:** Full entity coverage

### Phase 4: Integrations (Weeks 7-8)
- [ ] WhatsApp Business API integration
- [ ] Israeli payment provider integration
- [ ] Email service (SendGrid)
- [ ] SMS service (Twilio)
- [ ] LLM integration (OpenAI)

**Deliverable:** All external integrations working

### Phase 5: Frontend Migration (Weeks 9-10)
- [ ] Create new API client
- [ ] Migrate auth flow
- [ ] Update all entity calls (300+ changes)
- [ ] Integration testing with new backend

**Deliverable:** Frontend connected to new backend

### Phase 6: Data Migration & Testing (Weeks 11-12)
- [ ] Export data from Base44
- [ ] Run migration scripts
- [ ] Validate data integrity
- [ ] Full E2E testing
- [ ] Performance testing
- [ ] Security audit

**Deliverable:** Production-ready system

### Phase 7: Deployment & Cutover (Week 12+)
- [ ] Deploy to production infrastructure
- [ ] DNS cutover
- [ ] Monitor and fix issues
- [ ] Decommission Base44

**Deliverable:** System live and stable

---

## 14. Effort Estimation

### 14.1 Detailed Breakdown

| Task | Hours (Low) | Hours (High) |
|------|-------------|--------------|
| **Phase 1: Foundation** | | |
| Project setup, configs | 4 | 8 |
| Database schema design | 8 | 12 |
| Prisma setup + migrations | 6 | 10 |
| JWT auth implementation | 12 | 16 |
| Core CRUD (5 entities) | 15 | 20 |
| Unit tests | 8 | 12 |
| **Subtotal** | **53** | **78** |
| | | |
| **Phase 2: Medical Core** | | |
| Appointments system | 12 | 16 |
| Medical visits | 10 | 14 |
| Vaccinations + lab tests | 10 | 14 |
| Calendar settings | 8 | 12 |
| File upload service | 6 | 10 |
| API documentation | 4 | 6 |
| **Subtotal** | **50** | **72** |
| | | |
| **Phase 3: Business Ops** | | |
| Billing system | 12 | 18 |
| Pricing entities | 8 | 12 |
| Inventory/orders | 8 | 12 |
| Employee management | 14 | 20 |
| Notifications entity | 4 | 6 |
| **Subtotal** | **46** | **68** |
| | | |
| **Phase 4: Integrations** | | |
| WhatsApp Business API | 16 | 24 |
| Israeli payment provider | 20 | 32 |
| Email/SMS services | 8 | 12 |
| LLM integration | 6 | 10 |
| Testing integrations | 10 | 16 |
| **Subtotal** | **60** | **94** |
| | | |
| **Phase 5: Frontend** | | |
| New API client | 6 | 10 |
| Auth flow migration | 8 | 12 |
| Entity calls update (300+) | 40 | 60 |
| Integration testing | 12 | 20 |
| **Subtotal** | **66** | **102** |
| | | |
| **Phase 6: Data & Testing** | | |
| Migration scripts | 16 | 24 |
| Data validation | 8 | 12 |
| E2E testing | 12 | 20 |
| Performance testing | 6 | 10 |
| Security review | 4 | 8 |
| Bug fixes buffer | 10 | 20 |
| **Subtotal** | **56** | **94** |
| | | |
| **Phase 7: Deployment** | | |
| Infrastructure setup | 8 | 12 |
| CI/CD pipeline | 6 | 10 |
| Monitoring setup | 4 | 8 |
| Cutover support | 8 | 16 |
| **Subtotal** | **26** | **46** |
| | | |
| **TOTAL** | **357** | **554** |

### 14.2 Summary

| Scenario | Hours | Weeks (40h/week) | Calendar Time |
|----------|-------|------------------|---------------|
| Optimistic | 320 | 8 weeks | 2-2.5 months |
| Realistic | 420 | 10.5 weeks | 2.5-3 months |
| Pessimistic | 480 | 12 weeks | 3-4 months |

### 14.3 Team Options

| Option | Duration | Cost Estimate* |
|--------|----------|----------------|
| 1 Senior Full-Stack Dev | 10-12 weeks | $15,000-25,000 |
| 1 Senior + 1 Mid Dev | 6-8 weeks | $18,000-30,000 |
| Small Agency | 8-10 weeks | $25,000-40,000 |

*Costs vary significantly by region and rates

### 14.4 Cost Breakdown (Post-Migration)

| Item | Monthly Cost |
|------|--------------|
| Server (VPS/Cloud) | $40-100 |
| PostgreSQL (managed) | $15-50 |
| Redis (managed) | $10-30 |
| File storage (R2/S3) | $5-20 |
| WhatsApp Business API | $0-50 (usage-based) |
| Payment provider | Transaction fees only |
| Email (SendGrid) | $0-20 |
| SMS (Twilio) | Usage-based |
| **Total** | **$70-270/month** |

---

## Appendix A: Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.yourclinic.com
FRONTEND_URL=https://app.yourclinic.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/clinicai

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# File Storage (S3/R2)
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=clinicai-files
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
CDN_URL=https://cdn.yourclinic.com

# Email
SENDGRID_API_KEY=xxx
EMAIL_FROM=noreply@yourclinic.com

# SMS
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+972...

# WhatsApp
WHATSAPP_API_KEY=xxx
WHATSAPP_NAMESPACE=xxx

# Payment (PayPlus example)
PAYPLUS_API_KEY=xxx
PAYPLUS_SECRET_KEY=xxx
PAYPLUS_PAGE_UID=xxx

# OpenAI
OPENAI_API_KEY=xxx
```

---

## Appendix B: Quick Reference - Base44 to Express Mapping

| Base44 SDK | Express Equivalent |
|------------|-------------------|
| `base44.entities.X.list(sort, limit)` | `GET /api/v1/x?sort=...&limit=...` |
| `base44.entities.X.filter(filters)` | `GET /api/v1/x?filter[field]=value` |
| `base44.entities.X.create(data)` | `POST /api/v1/x` |
| `base44.entities.X.update(id, data)` | `PUT /api/v1/x/:id` |
| `base44.entities.X.delete(id)` | `DELETE /api/v1/x/:id` |
| `base44.entities.X.bulkCreate(items)` | `POST /api/v1/x/bulk` |
| `base44.auth.me()` | `GET /api/v1/auth/me` |
| `base44.auth.logout()` | `POST /api/v1/auth/logout` |
| `base44.integrations.Core.SendEmail` | `POST /api/v1/integrations/send-email` |
| `base44.integrations.Core.SendSMS` | `POST /api/v1/integrations/send-sms` |
| `base44.integrations.Core.UploadFile` | `POST /api/v1/integrations/upload-file` |
| `base44.integrations.Core.InvokeLLM` | `POST /api/v1/integrations/invoke-llm` |

---

*Document Version: 1.0*
*Created: February 2026*
*Last Updated: February 2026*
