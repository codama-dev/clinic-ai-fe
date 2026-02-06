// JavaScript Example: Reading Entities
// Filterable fields: test_number, client_number, client_name, patient_number, patient_name, test_type_id, test_name, test_date, results, results_file_url, performed_by, notes, status
async function fetchLabTestEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/LabTest`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: test_number, client_number, client_name, patient_number, patient_name, test_type_id, test_name, test_date, results, results_file_url, performed_by, notes, status
async function updateLabTestEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/LabTest/${entityId}`, {
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
