-- Complete PostgreSQL Database Schema - All 44 Entities
-- ============================================
-- BASE44 LOVET CLINIC - COMPLETE DATABASE SCHEMA
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Auto-update updated_date trigger
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-set created_by from JWT
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = current_setting('request.jwt.claims', true)::json->>'email';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM public.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check permissions
CREATE OR REPLACE FUNCTION has_permission(perm TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT perm = ANY(permissions) OR role = 'admin'
        FROM public.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENTITY TABLES (44 TOTAL)
-- ============================================

-- 1. USERS (Built-in, extends Supabase Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    
    display_name TEXT,
    phone TEXT,
    job TEXT CHECK (job IN ('doctor', 'assistant', 'receptionist', 'admin')),
    id_number TEXT,
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    profile_image TEXT,
    permissions TEXT[] DEFAULT '{}'
);

-- 2. PUBLIC_PROFILE
CREATE TABLE public.public_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    job TEXT CHECK (job IN ('doctor', 'assistant', 'receptionist', 'admin')),
    id_number TEXT,
    birthday_date DATE,
    is_active BOOLEAN DEFAULT true
);

-- 3. EXTERNAL_EMPLOYEES
CREATE TABLE public.external_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    job TEXT DEFAULT 'assistant' CHECK (job IN ('doctor', 'assistant', 'receptionist')),
    is_active BOOLEAN DEFAULT true
);

-- 4. CONSTRAINTS
CREATE TABLE public.constraints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    unavailable_day TEXT CHECK (unavailable_day IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
    unavailable_shift TEXT CHECK (unavailable_shift IN ('morning', 'evening')),
    is_submitted_on_time BOOLEAN DEFAULT true
);

-- 5. WEEKLY_SCHEDULES
CREATE TABLE public.weekly_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    week_start_date DATE NOT NULL UNIQUE,
    schedule_data JSONB NOT NULL,
    previous_approved_schedule_data JSONB DEFAULT '{}',
    locked_shifts JSONB DEFAULT '{}',
    reception_coverage JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected')),
    submitted_by TEXT,
    submitted_date TIMESTAMPTZ,
    approved_by TEXT,
    rejection_reason TEXT,
    publication_date TIMESTAMPTZ
);

-- 6. SHIFT_TEMPLATES
CREATE TABLE public.shift_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    staffing_requirements JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true
);

-- 7. SCHEDULE_PUBLICATIONS
CREATE TABLE public.schedule_publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    week_start_date DATE NOT NULL,
    publication_date TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT false,
    notification_sent BOOLEAN DEFAULT false,
    recipients TEXT[]
);

-- 8. VACATION_REQUESTS
CREATE TABLE public.vacation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC NOT NULL,
    unpaid_days NUMERIC DEFAULT 0,
    vacation_type TEXT DEFAULT 'regular' CHECK (vacation_type IN ('regular', 'sick_leave', 'unpaid_leave')),
    medical_document_url TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    manager_response TEXT,
    response_date TIMESTAMPTZ
);

-- 9. TIME_CLOCK_ENTRIES
CREATE TABLE public.time_clock_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    date DATE NOT NULL,
    clock_in_time TEXT NOT NULL,
    clock_out_time TEXT,
    shift_type TEXT CHECK (shift_type IN ('morning', 'evening', 'full_day', 'split')),
    total_hours NUMERIC,
    notes TEXT,
    status TEXT DEFAULT 'clocked_in' CHECK (status IN ('clocked_in', 'clocked_out'))
);

-- 10. SYSTEM_SETTINGS
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    constraint_deadline_day TEXT DEFAULT 'thursday' CHECK (constraint_deadline_day IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
    constraint_deadline_time TEXT DEFAULT '20:00',
    constraint_weeks_ahead NUMERIC DEFAULT 3
);

-- 11. CLIENTS
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    client_number SERIAL UNIQUE,
    full_name TEXT,
    id_number TEXT UNIQUE,
    phone TEXT,
    phone_secondary TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    marketing_consent BOOLEAN DEFAULT false,
    reminders_consent BOOLEAN DEFAULT true,
    preferred_contact TEXT DEFAULT 'whatsapp' CHECK (preferred_contact IN ('phone', 'email', 'whatsapp', 'sms')),
    balance NUMERIC DEFAULT 0,
    has_no_show_history BOOLEAN DEFAULT false
);

-- 12. PATIENTS
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    patient_number SERIAL UNIQUE,
    client_number INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    name TEXT NOT NULL,
    species TEXT CHECK (species IN ('כלב', 'חתול', 'ארנב', 'תוכי', 'חמוס', 'שרקן', 'אחר')),
    breed TEXT,
    sex TEXT CHECK (sex IN ('זכר', 'נקבה')),
    neutered BOOLEAN DEFAULT false,
    neutered_date DATE,
    date_of_birth DATE,
    weight NUMERIC,
    microchip TEXT,
    microchip_date DATE,
    color TEXT,
    description TEXT,
    photo_url TEXT,
    allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    is_insured BOOLEAN DEFAULT false,
    insurance_company TEXT CHECK (insurance_company IN ('מרפאט', 'חיותא', 'פניקס', 'אחר')),
    insurance_policy TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    inactive_reason TEXT CHECK (inactive_reason IN ('נפטרה', 'אבדה', 'עברה בעלים', 'אחר')),
    notes TEXT
);

-- 13. ROOMS
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    room_type TEXT CHECK (room_type IN ('examination', 'surgery', 'laboratory', 'imaging', 'reception')),
    capacity NUMERIC DEFAULT 1,
    equipment TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'maintenance', 'unavailable')),
    notes TEXT
);

-- 14. APPOINTMENT_TYPES
CREATE TABLE public.appointment_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    duration_minutes NUMERIC DEFAULT 20 NOT NULL,
    base_price NUMERIC DEFAULT 0 NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    requires_room_type TEXT DEFAULT 'examination' CHECK (requires_room_type IN ('examination', 'surgery', 'laboratory', 'imaging', 'any')),
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- 15. SLOT_TEMPLATES
CREATE TABLE public.slot_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    day_of_week NUMERIC NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    slot_duration NUMERIC DEFAULT 20,
    doctor_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    room_id TEXT,
    room_name TEXT,
    break_times JSONB DEFAULT '[]',
    allowed_appointment_types TEXT[] DEFAULT '{}',
    capacity NUMERIC DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE
);

-- 16. SLOTS
CREATE TABLE public.slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    room_id TEXT,
    room_name TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    template_id TEXT,
    capacity NUMERIC DEFAULT 1,
    booked_count NUMERIC DEFAULT 0
);

-- 17. APPOINTMENTS
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    appointment_number SERIAL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    client_id TEXT,
    client_name TEXT,
    client_phone TEXT,
    patient_id TEXT,
    patient_name TEXT,
    doctor_id TEXT,
    doctor_name TEXT,
    appointment_type_id TEXT,
    appointment_type_name TEXT,
    room_id TEXT,
    room_name TEXT,
    duration_minutes NUMERIC NOT NULL,
    chief_complaint TEXT,
    reception_notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'no_show', 'cancelled')),
    is_general_meeting BOOLEAN DEFAULT false,
    participants JSONB DEFAULT '[]'
);

-- 18. MEDICAL_VISITS
CREATE TABLE public.medical_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    visit_number SERIAL,
    client_number INTEGER NOT NULL,
    patient_number INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    doctor_license TEXT,
    visit_date DATE NOT NULL,
    visit_time TEXT NOT NULL,
    chief_complaint TEXT,
    findings_and_tests TEXT,
    diagnosis TEXT,
    treatment TEXT,
    vital_signs JSONB,
    lab_tests JSONB DEFAULT '[]',
    items_from_pricelist JSONB DEFAULT '[]',
    prescriptions JSONB DEFAULT '[]',
    follow_up_days INTEGER,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT false,
    attachments TEXT[],
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed'))
);

-- 19. BILLINGS
CREATE TABLE public.billings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    appointment_id TEXT,
    visit_id TEXT,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    billing_date DATE NOT NULL,
    items JSONB DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    discount_reason TEXT,
    vat_rate NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'partial', 'cancelled')),
    payments JSONB DEFAULT '[]',
    amount_paid NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    document_type TEXT CHECK (document_type IN ('invoice', 'receipt', 'invoice_receipt')),
    document_number TEXT,
    pdf_url TEXT,
    notes TEXT
);

-- 20. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    appointment_id TEXT,
    client_id TEXT NOT NULL,
    client_name TEXT,
    patient_name TEXT,
    channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'email')),
    type TEXT CHECK (type IN ('confirmation', 'reminder_24h', 'reminder_2h', 'cancellation', 'rescheduled', 'manual')),
    scheduled_time TIMESTAMPTZ NOT NULL,
    sent_time TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    recipient TEXT,
    message_content TEXT,
    failure_reason TEXT,
    response TEXT
);

-- 21. CALENDAR_SETTINGS
CREATE TABLE public.calendar_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    setting_type TEXT CHECK (setting_type IN ('time_slots', 'blocked_date', 'working_hours', 'special_schedule')),
    date DATE,
    day_of_week NUMERIC,
    start_time TEXT,
    end_time TEXT,
    slot_duration NUMERIC DEFAULT 20,
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    doctor_id TEXT,
    doctor_name TEXT,
    max_appointments_per_slot NUMERIC DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    recurrence_type TEXT DEFAULT 'none' CHECK (recurrence_type IN ('none', 'weekly', 'monthly', 'yearly')),
    recurrence_end_date DATE
);

-- 22. CLIENT_PRICE_LISTS
CREATE TABLE public.client_price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    product_name TEXT NOT NULL,
    sub_category TEXT,
    category TEXT,
    client_price NUMERIC NOT NULL,
    supplier_price NUMERIC,
    supplier_name TEXT,
    notes TEXT
);

-- 23. PATIENT_METRICS
CREATE TABLE public.patient_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    client_id TEXT NOT NULL,
    measurement_date DATE NOT NULL,
    measurement_time TEXT,
    weight NUMERIC,
    temperature NUMERIC,
    heart_rate NUMERIC,
    respiratory_rate NUMERIC,
    blood_pressure_systolic NUMERIC,
    blood_pressure_diastolic NUMERIC,
    notes TEXT,
    measured_by TEXT NOT NULL
);

-- 24. VACCINATIONS
CREATE TABLE public.vaccinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    client_id TEXT NOT NULL,
    client_name TEXT,
    client_number NUMERIC,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    patient_number NUMERIC,
    vaccination_type TEXT NOT NULL,
    vaccination_date DATE NOT NULL,
    administered_by TEXT,
    next_vaccination_date DATE,
    first_reminder_date DATE,
    second_reminder_date DATE,
    batch_number TEXT,
    notes TEXT
);

-- 25. VACCINATION_TYPES
CREATE TABLE public.vaccination_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    description TEXT,
    default_interval_days NUMERIC,
    first_reminder_days_before NUMERIC DEFAULT 14,
    second_reminder_days_before NUMERIC DEFAULT 7,
    is_active BOOLEAN DEFAULT true
);

-- 26. CLIENT_DOCUMENTS
CREATE TABLE public.client_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by TEXT
);

-- 27. LAB_TEST_TYPES
CREATE TABLE public.lab_test_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    description TEXT,
    parameters JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true
);

-- 28. LAB_TESTS
CREATE TABLE public.lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    test_number SERIAL,
    client_number INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    patient_number INTEGER NOT NULL,
    patient_name TEXT NOT NULL,
    test_type_id TEXT,
    test_name TEXT NOT NULL,
    test_date DATE NOT NULL,
    results JSONB DEFAULT '{}' NOT NULL,
    results_file_url TEXT,
    performed_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reviewed'))
);

-- 29. DOCTOR_SCHEDULES
CREATE TABLE public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    doctor_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    day_of_week NUMERIC NOT NULL,
    shift_type TEXT DEFAULT 'full_day' CHECK (shift_type IN ('morning', 'evening', 'full_day', 'split')),
    start_time TEXT,
    end_time TEXT,
    morning_start TEXT,
    morning_end TEXT,
    evening_start TEXT,
    evening_end TEXT,
    break_start TEXT,
    break_end TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT
);

-- 30. FORM_CONFIGURATIONS
CREATE TABLE public.form_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    form_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    fields JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    allow_multiple_submissions BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    notification_settings JSONB
);

-- 31. MESSAGE_TEMPLATES
CREATE TABLE public.message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    template_name TEXT NOT NULL,
    channel TEXT CHECK (channel IN ('email', 'whatsapp', 'sms')),
    subject TEXT,
    header_image_url TEXT,
    message_content TEXT NOT NULL,
    signature TEXT,
    footer_text TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false
);

-- 32. PRICE_LISTS
CREATE TABLE public.price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- 33. PRICE_LIST_ITEMS
CREATE TABLE public.price_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    price_list_id TEXT NOT NULL,
    price_list_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT,
    sub_category TEXT,
    supplier_name TEXT,
    supplier_price NUMERIC,
    sale_price NUMERIC NOT NULL,
    notes TEXT
);

-- 34. HOSPITALIZED_ANIMALS
CREATE TABLE public.hospitalized_animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    owner_name TEXT NOT NULL,
    animal_name TEXT NOT NULL,
    animal_image_url TEXT,
    animal_type TEXT CHECK (animal_type IN ('כלב', 'חתול', 'ארנב', 'תוכי', 'חמוס', 'שרקן')),
    admission_weight NUMERIC,
    animal_sex TEXT CHECK (animal_sex IN ('זכר', 'נקבה')),
    age TEXT,
    breed TEXT,
    is_neutered BOOLEAN DEFAULT false,
    has_catheter BOOLEAN DEFAULT false,
    catheter_insertion_date DATE,
    admission_date DATE NOT NULL,
    diagnoses TEXT,
    treatment_instructions JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'deceased')),
    discharge_instructions TEXT,
    date_of_death DATE,
    monitoring_log JSONB DEFAULT '[]',
    fluids_log JSONB DEFAULT '[]',
    treatments_log JSONB DEFAULT '[]',
    observations_log JSONB DEFAULT '[]'
);

-- 35. TREATMENT_EXECUTIONS
CREATE TABLE public.treatment_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    animal_id TEXT NOT NULL,
    animal_name TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    route TEXT,
    frequency TEXT,
    instruction_notes TEXT,
    executed_by TEXT NOT NULL,
    executed_by_name TEXT NOT NULL,
    execution_date DATE NOT NULL,
    execution_time TEXT NOT NULL
);

-- 36. PROTOCOL_TEMPLATES
CREATE TABLE public.protocol_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    name TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL
);

-- 37. FILLED_PROTOCOLS
CREATE TABLE public.filled_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    filled_by_name TEXT NOT NULL,
    data JSONB NOT NULL,
    field_metadata JSONB DEFAULT '{}',
    is_released BOOLEAN DEFAULT false,
    released_by TEXT,
    released_date TIMESTAMPTZ
);

-- 38. INVENTORY_ITEMS
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    product_name TEXT NOT NULL,
    item_type TEXT CHECK (item_type IN ('תרופה', 'ציוד רפואי', 'מזון', 'מזון רפואי', 'תכשיר', 'ציוד משרדי', 'אחר')),
    current_quantity NUMERIC DEFAULT 0,
    required_quantity NUMERIC DEFAULT 0,
    locations JSONB DEFAULT '[]',
    location TEXT CHECK (location IN ('חדר בדיקות 1', 'חדר בדיקות 2', 'קבלה', 'חדר ניתוח', 'חדרי אשפוז')),
    last_counted_by TEXT,
    last_counted_date TIMESTAMPTZ
);

-- 39. INVENTORY_SHORTAGES
CREATE TABLE public.inventory_shortages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    item_name TEXT NOT NULL,
    category TEXT CHECK (category IN ('תרופה', 'ציוד מתכלה', 'מזון רפואי', 'ציוד משרדי', 'אחר')),
    quantity_needed NUMERIC,
    notes TEXT,
    status TEXT DEFAULT 'needed' CHECK (status IN ('needed', 'ordered', 'stocked')),
    requested_by_id TEXT NOT NULL,
    requested_by_name TEXT NOT NULL
);

-- 40. ORDERS
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    order_number SERIAL,
    customer_name TEXT NOT NULL,
    order_date DATE NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'draft', 'completed_with_shortages')),
    items JSONB NOT NULL,
    received_items JSONB DEFAULT '{}',
    received_by TEXT,
    received_date TIMESTAMPTZ
);

-- 41. SUPPLIER_PRICES
CREATE TABLE public.supplier_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    product_name TEXT NOT NULL,
    category TEXT,
    sub_category TEXT,
    supplier_prices JSONB DEFAULT '{}'
);

-- 42. CLINIC_CASES
CREATE TABLE public.clinic_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    case_number TEXT,
    client_name TEXT,
    created_by_name TEXT,
    treatments JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'submitted')),
    approved_by TEXT,
    approval_date TIMESTAMPTZ,
    submitted_by TEXT,
    submission_date TIMESTAMPTZ
);

-- 43. VET_REFERRALS
CREATE TABLE public.vet_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    subject TEXT NOT NULL,
    referring_user_id TEXT NOT NULL,
    referring_user_name TEXT NOT NULL,
    target_doctor_id TEXT NOT NULL,
    target_doctor_name TEXT NOT NULL,
    is_urgent BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    messages JSONB NOT NULL
);

-- 44. PUBLIC_DOCTOR_INFO
CREATE TABLE public.public_doctor_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL
);

-- ============================================
-- TRIGGERS - Auto-update timestamps
-- ============================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('
            CREATE TRIGGER %I_updated_date
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_date()
        ', t, t);
        
        EXECUTE format('
            CREATE TRIGGER %I_created_by
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION set_created_by()
        ', t, t);
    END LOOP;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END;
$$;

-- Users table: special policies
CREATE POLICY "users_view_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_view_all_admin" ON public.users FOR SELECT USING (is_admin());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_update_all_admin" ON public.users FOR UPDATE USING (is_admin());
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE USING (is_admin());

-- Default policy for all other tables: authenticated users have full access
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'users'
    LOOP
        EXECUTE format('
            CREATE POLICY "allow_authenticated" 
            ON public.%I
            FOR ALL
            USING (auth.role() = ''authenticated'')
        ', t);
    END LOOP;
END;
$$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Common query patterns
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_medical_visits_client ON public.medical_visits(client_number);
CREATE INDEX idx_medical_visits_patient ON public.medical_visits(patient_number);
CREATE INDEX idx_patients_client ON public.patients(client_id);
CREATE INDEX idx_vaccinations_patient ON public.vaccinations(patient_id);
CREATE INDEX idx_time_clock_date ON public.time_clock_entries(date);
CREATE INDEX idx_constraints_week ON public.constraints(week_start_date);
CREATE INDEX idx_schedules_week ON public.weekly_schedules(week_start_date);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default system settings
INSERT INTO public.system_settings (constraint_deadline_day, constraint_deadline_time, constraint_weeks_ahead)
VALUES ('thursday', '20:00', 3);

-- Done!