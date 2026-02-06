// JavaScript Example: Reading Entities
// Filterable fields: user_id, email, display_name, job, id_number, birthday_date, is_active
async function fetchPublicProfileEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/PublicProfile`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: user_id, email, display_name, job, id_number, birthday_date, is_active
async function updatePublicProfileEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/PublicProfile/${entityId}`, {
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
