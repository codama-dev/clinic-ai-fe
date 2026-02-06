// JavaScript Example: Reading Entities
// Filterable fields: patient_id, patient_name, client_id, measurement_date, measurement_time, weight, temperature, heart_rate, respiratory_rate, blood_pressure_systolic, blood_pressure_diastolic, notes, measured_by
async function fetchPatientMetricEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/PatientMetric`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: patient_id, patient_name, client_id, measurement_date, measurement_time, weight, temperature, heart_rate, respiratory_rate, blood_pressure_systolic, blood_pressure_diastolic, notes, measured_by
async function updatePatientMetricEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/PatientMetric/${entityId}`, {
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
