// JavaScript Example: Reading Entities
// Filterable fields: client_number, full_name, id_number, phone, phone_secondary, email, address, city, notes, status, marketing_consent, reminders_consent, preferred_contact, balance, has_no_show_history
async function fetchClientEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Client`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: client_number, full_name, id_number, phone, phone_secondary, email, address, city, notes, status, marketing_consent, reminders_consent, preferred_contact, balance, has_no_show_history
async function updateClientEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Client/${entityId}`, {
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
