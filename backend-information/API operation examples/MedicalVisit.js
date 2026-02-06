// JavaScript Example: Reading Entities
// Filterable fields: visit_number, client_number, patient_number, full_name, client_name, patient_name, doctor_name, doctor_license, visit_date, visit_time, chief_complaint, findings_and_tests, diagnosis, treatment, vital_signs, lab_tests, items_from_pricelist, prescriptions, follow_up_days, follow_up_date, follow_up_completed, attachments, notes, status
async function fetchMedicalVisitEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/MedicalVisit`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: visit_number, client_number, patient_number, full_name, client_name, patient_name, doctor_name, doctor_license, visit_date, visit_time, chief_complaint, findings_and_tests, diagnosis, treatment, vital_signs, lab_tests, items_from_pricelist, prescriptions, follow_up_days, follow_up_date, follow_up_completed, attachments, notes, status
async function updateMedicalVisitEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/MedicalVisit/${entityId}`, {
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
