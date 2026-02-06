// JavaScript Example: Reading Entities
// Filterable fields: owner_name, animal_name, animal_image_url, animal_type, admission_weight, animal_sex, age, breed, is_neutered, has_catheter, catheter_insertion_date, admission_date, diagnoses, treatment_instructions, status, discharge_instructions, date_of_death, monitoring_log, fluids_log, treatments_log, observations_log
async function fetchHospitalizedAnimalEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/HospitalizedAnimal`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: owner_name, animal_name, animal_image_url, animal_type, admission_weight, animal_sex, age, breed, is_neutered, has_catheter, catheter_insertion_date, admission_date, diagnoses, treatment_instructions, status, discharge_instructions, date_of_death, monitoring_log, fluids_log, treatments_log, observations_log
async function updateHospitalizedAnimalEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/HospitalizedAnimal/${entityId}`, {
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
