// JavaScript Example: Reading Entities
// Filterable fields: employee_id, employee_name, employee_email, date, clock_in_time, clock_out_time, shift_type, total_hours, notes, status
async function fetchTimeClockEntryEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/TimeClockEntry`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: employee_id, employee_name, employee_email, date, clock_in_time, clock_out_time, shift_type, total_hours, notes, status
async function updateTimeClockEntryEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/TimeClockEntry/${entityId}`, {
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
