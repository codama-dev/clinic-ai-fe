// JavaScript Example: Reading Entities
// Filterable fields: appointment_id, visit_id, client_id, client_name, patient_id, patient_name, billing_date, items, subtotal, discount, discount_reason, vat_rate, vat_amount, total, status, payments, amount_paid, balance, document_type, document_number, pdf_url, notes
async function fetchBillingEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Billing`, {
        headers: {
            'api_key': 'e6043ce623da416295f22294b96bc722', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: appointment_id, visit_id, client_id, client_name, patient_id, patient_name, billing_date, items, subtotal, discount, discount_reason, vat_rate, vat_amount, total, status, payments, amount_paid, balance, document_type, document_number, pdf_url, notes
async function updateBillingEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/68d7b52d0d33b12757415b4f/entities/Billing/${entityId}`, {
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
