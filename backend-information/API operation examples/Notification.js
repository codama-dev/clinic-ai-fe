// JavaScript Example: Reading Entities
// Filterable fields: appointment_id, client_id, client_name, patient_name, channel, type, scheduled_time, sent_time, status, recipient, message_content, failure_reason, response
async function fetchNotificationEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Notification`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: appointment_id, client_id, client_name, patient_name, channel, type, scheduled_time, sent_time, status, recipient, message_content, failure_reason, response
async function updateNotificationEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Notification/${entityId}`, {
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
