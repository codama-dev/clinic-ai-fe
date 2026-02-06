// JavaScript Example: Reading Entities
// Filterable fields: patient_number, client_number, client_id, client_name, name, species, breed, sex, neutered, neutered_date, date_of_birth, weight, microchip, microchip_date, color, description, photo_url, allergies, chronic_conditions, current_medications, is_insured, insurance_company, insurance_policy, status, inactive_reason, notes
async function fetchPatientEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Patient`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: patient_number, client_number, client_id, client_name, name, species, breed, sex, neutered, neutered_date, date_of_birth, weight, microchip, microchip_date, color, description, photo_url, allergies, chronic_conditions, current_medications, is_insured, insurance_company, insurance_policy, status, inactive_reason, notes
async function updatePatientEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Patient/${entityId}`, {
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
