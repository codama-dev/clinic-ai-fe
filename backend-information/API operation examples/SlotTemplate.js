// JavaScript Example: Reading Entities
// Filterable fields: name, day_of_week, start_time, end_time, slot_duration, doctor_id, doctor_name, room_id, room_name, break_times, allowed_appointment_types, capacity, is_active, valid_from, valid_until
async function fetchSlotTemplateEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/SlotTemplate`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: name, day_of_week, start_time, end_time, slot_duration, doctor_id, doctor_name, room_id, room_name, break_times, allowed_appointment_types, capacity, is_active, valid_from, valid_until
async function updateSlotTemplateEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/SlotTemplate/${entityId}`, {
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
