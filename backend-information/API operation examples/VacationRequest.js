// JavaScript Example: Reading Entities
// Filterable fields: employee_id, employee_name, employee_email, start_date, end_date, total_days, unpaid_days, vacation_type, medical_document_url, reason, status, manager_response, response_date
async function fetchVacationRequestEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/VacationRequest`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: employee_id, employee_name, employee_email, start_date, end_date, total_days, unpaid_days, vacation_type, medical_document_url, reason, status, manager_response, response_date
async function updateVacationRequestEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/VacationRequest/${entityId}`, {
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
