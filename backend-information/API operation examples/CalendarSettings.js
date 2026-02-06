// JavaScript Example: Reading Entities
// Filterable fields: setting_type, date, day_of_week, start_time, end_time, slot_duration, is_blocked, block_reason, doctor_id, doctor_name, max_appointments_per_slot, is_active, notes, recurrence_type, recurrence_end_date
async function fetchCalendarSettingsEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/CalendarSettings`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: setting_type, date, day_of_week, start_time, end_time, slot_duration, is_blocked, block_reason, doctor_id, doctor_name, max_appointments_per_slot, is_active, notes, recurrence_type, recurrence_end_date
async function updateCalendarSettingsEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/CalendarSettings/${entityId}`, {
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
