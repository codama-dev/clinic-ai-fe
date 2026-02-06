// JavaScript Example: Reading Entities
// Filterable fields: week_start_date, schedule_data, previous_approved_schedule_data, locked_shifts, reception_coverage, is_published, approval_status, submitted_by, submitted_date, approved_by, rejection_reason, publication_date
async function fetchWeeklyScheduleEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/WeeklySchedule`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: week_start_date, schedule_data, previous_approved_schedule_data, locked_shifts, reception_coverage, is_published, approval_status, submitted_by, submitted_date, approved_by, rejection_reason, publication_date
async function updateWeeklyScheduleEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/WeeklySchedule/${entityId}`, {
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
