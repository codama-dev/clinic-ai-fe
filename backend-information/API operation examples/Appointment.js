// JavaScript Example: Reading Entities
// Filterable fields: appointment_number, date, start_time, end_time, client_id, client_name, client_phone, patient_id, patient_name, doctor_id, doctor_name, appointment_type_id, appointment_type_name, room_id, room_name, duration_minutes, chief_complaint, reception_notes, status, is_general_meeting, participants
async function fetchAppointmentEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Appointment`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: appointment_number, date, start_time, end_time, client_id, client_name, client_phone, patient_id, patient_name, doctor_id, doctor_name, appointment_type_id, appointment_type_name, room_id, room_name, duration_minutes, chief_complaint, reception_notes, status, is_general_meeting, participants
async function updateAppointmentEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Appointment/${entityId}`, {
        method: 'PUT',
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });
    const data = await response.json();
    console.log(data);
}
