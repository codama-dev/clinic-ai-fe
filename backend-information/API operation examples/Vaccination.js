// JavaScript Example: Reading Entities
// Filterable fields: client_id, client_name, client_number, patient_id, patient_name, patient_number, vaccination_type, vaccination_date, administered_by, next_vaccination_date, first_reminder_date, second_reminder_date, batch_number, notes
async function fetchVaccinationEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Vaccination`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: client_id, client_name, client_number, patient_id, patient_name, patient_number, vaccination_type, vaccination_date, administered_by, next_vaccination_date, first_reminder_date, second_reminder_date, batch_number, notes
async function updateVaccinationEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Vaccination/${entityId}`, {
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
