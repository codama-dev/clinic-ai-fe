// JavaScript Example: Reading Entities
// Filterable fields: animal_id, animal_name, medication_name, dosage, route, frequency, instruction_notes, executed_by, executed_by_name, execution_date, execution_time
async function fetchTreatmentExecutionEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/TreatmentExecution`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: animal_id, animal_name, medication_name, dosage, route, frequency, instruction_notes, executed_by, executed_by_name, execution_date, execution_time
async function updateTreatmentExecutionEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/TreatmentExecution/${entityId}`, {
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
