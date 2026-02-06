// Utility functions for import validation and normalization

/**
 * Normalize ID number - remove spaces, dashes, preserve leading zeros
 */
export function normalizeIdNumber(idNumber) {
  if (!idNumber) return '';
  const normalized = String(idNumber).replace(/[\s\-]/g, '').trim();
  return normalized;
}

/**
 * Normalize client number - convert to integer
 */
export function normalizeClientNumber(clientNumber) {
  if (!clientNumber || clientNumber === '') return null;
  const num = parseInt(String(clientNumber).replace(/[\s\-]/g, '').trim());
  return isNaN(num) ? null : num;
}

/**
 * Normalize email - trim and lowercase
 */
export function normalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

/**
 * Check if a value is considered empty (for import logic)
 */
export function isEmptyValue(value) {
  return value === '' || value === null || value === undefined || value === '-';
}

/**
 * Normalize phone - remove spaces and dashes, keep digits only
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/[\s\-]/g, '');
}

/**
 * Parse CSV line with proper quote handling
 */
export function parseCSVLine(line) {
  const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
  return values.map(v => v.replace(/^"|"$/g, '').trim());
}

/**
 * Reason codes for import results
 */
export const REASON_CODES = {
  // Invalid reasons
  MISSING_OR_INVALID_ID_NUMBER: 'חסרה תעודת זהות או לא תקינה',
  MISSING_BOTH_IDENTIFIERS: 'חסרים מזהים (תעודת זהות ומספר לקוח)',
  INVALID_CLIENT_NUMBER: 'מספר לקוח לא תקין',
  MISSING_FULL_NAME: 'חסר שם מלא',
  INVALID_ROW_FORMAT: 'פורמט שורה לא תקין',
  
  // Duplicate in file reasons
  DUPLICATE_ID_IN_FILE: 'תעודת זהות כפולה בקובץ',
  DUPLICATE_CLIENT_NUMBER_IN_FILE: 'מספר לקוח כפול בקובץ',
  
  // Conflict with DB reasons
  ID_EXISTS_BUT_CLIENT_NUMBER_MISMATCH: 'תעודת זהות קיימת אך מספר לקוח שונה',
  CLIENT_NUMBER_TAKEN_BY_OTHER_ID: 'מספר לקוח תפוס על ידי תעודת זהות אחרת',
  CLIENT_NUMBER_EXISTS_WITH_DIFFERENT_DATA: 'מספר לקוח קיים עם נתונים שונים',
  
  // Success reasons
  CLIENT_NUMBER_ASSIGNED_AUTOMATICALLY: 'מספר לקוח הוקצה אוטומטית',
  CLIENT_NUMBER_CONFLICT_RESOLVED: 'התנגשות מספר לקוח נפתרה',
  
  // DB error
  DB_ERROR: 'שגיאת מסד נתונים',
  
  // Patient-specific reasons
  OWNER_NOT_FOUND: 'לא נמצא בעלים עם מספר לקוח זה',
  MISSING_PATIENT_NAME: 'חסר שם מטופל',
  PATIENT_ALREADY_EXISTS: 'מטופל קיים עבור לקוח זה'
};

/**
 * Perform preflight analysis on clients CSV
 */
export async function performClientsPreflight(csvText, existingClients) {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  // Skip header and filter valid data lines
  const dataLines = lines.slice(1).filter(line => {
    const values = parseCSVLine(line);
    const fullName = values[1];
    return fullName && fullName !== 'שם לקוח' && fullName.trim() !== '';
  });
  
  const result = {
    total_rows: dataLines.length,
    valid_rows: [],
    invalid_rows: [],
    duplicates_in_file: [],
    conflicts_with_db: [],
    to_create: [],
    to_update: [],
    to_skip: [],
    
    // Maps for quick lookup
    usedIdNumbers: new Set(existingClients.map(c => normalizeIdNumber(c.id_number)).filter(Boolean)),
    usedClientNumbers: new Set(existingClients.map(c => c.client_number).filter(Boolean)),
    seenIdNumbers: new Set(),
    seenClientNumbers: new Set(),
    
    // For client number assignment
    maxClientNumber: existingClients.length > 0 
      ? Math.max(...existingClients.map(c => c.client_number || 0))
      : 0,
    nextClientNumber: null
  };
  
  result.nextClientNumber = result.maxClientNumber + 1;
  
  // Process each line
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const rowIndex = i + 2; // +2 because we skip header and arrays are 0-indexed
    
    try {
      const values = parseCSVLine(line);
      const [clientNumberStr, fullName, idNumber, phone, phoneSecondary, email, address, city, statusStr] = values;
      
      // Normalize data
      const normalized = {
        client_number_raw: clientNumberStr,
        client_number: normalizeClientNumber(clientNumberStr),
        full_name: fullName ? fullName.trim() : '',
        id_number: normalizeIdNumber(idNumber),
        phone: normalizePhone(phone),
        phone_secondary: normalizePhone(phoneSecondary),
        email: normalizeEmail(email),
        address: address ? address.trim() : '',
        city: city ? city.trim() : '',
        status: statusStr === 'פעיל' ? 'active' : 'inactive'
      };
      
      const row = {
        row_index: rowIndex,
        raw_data: values,
        normalized,
        action_taken: null,
        reason: null,
        reason_details: null,
        assigned_client_number: null,
        match_by: null // ID_NUMBER, CLIENT_NUMBER, or NONE
      };
      
      // Validation: Check if we have at least one identifier
      const hasIdNumber = normalized.id_number && normalized.id_number !== '';
      const hasClientNumber = normalized.client_number !== null;
      
      if (!hasIdNumber && !hasClientNumber) {
        row.action_taken = 'INVALID';
        row.reason = REASON_CODES.MISSING_BOTH_IDENTIFIERS;
        row.reason_details = `שורה ${rowIndex}: חסרים תעודת זהות ומספר לקוח`;
        row.match_by = 'NONE';
        result.invalid_rows.push(row);
        continue;
      }
      
      // Set match_by based on available identifiers
      if (hasIdNumber) {
        row.match_by = 'ID_NUMBER';
      } else if (hasClientNumber) {
        row.match_by = 'CLIENT_NUMBER';
      }
      
      // Validation: Check full name
      if (!normalized.full_name || normalized.full_name === '') {
        row.action_taken = 'INVALID';
        row.reason = REASON_CODES.MISSING_FULL_NAME;
        row.reason_details = `שורה ${rowIndex}: חסר שם מלא`;
        result.invalid_rows.push(row);
        continue;
      }
      
      // Check for duplicates in file based on match_by
      if (row.match_by === 'ID_NUMBER') {
        // Check for duplicate ID in file
        if (result.seenIdNumbers.has(normalized.id_number)) {
          row.action_taken = 'SKIPPED';
          row.reason = REASON_CODES.DUPLICATE_ID_IN_FILE;
          row.reason_details = `שורה ${rowIndex}: תעודת זהות ${normalized.id_number} כבר מופיעה בקובץ`;
          result.duplicates_in_file.push(row);
          result.to_skip.push(row);
          continue;
        }
        result.seenIdNumbers.add(normalized.id_number);
        
        // Also track client_number if provided (for validation)
        if (normalized.client_number !== null) {
          if (result.seenClientNumbers.has(normalized.client_number)) {
            row.action_taken = 'SKIPPED';
            row.reason = REASON_CODES.DUPLICATE_CLIENT_NUMBER_IN_FILE;
            row.reason_details = `שורה ${rowIndex}: מספר לקוח ${normalized.client_number} כבר מופיע בקובץ`;
            result.duplicates_in_file.push(row);
            result.to_skip.push(row);
            continue;
          }
          result.seenClientNumbers.add(normalized.client_number);
        }
      } else if (row.match_by === 'CLIENT_NUMBER') {
        // Check for duplicate client_number in file (this is the primary identifier)
        if (result.seenClientNumbers.has(normalized.client_number)) {
          row.action_taken = 'SKIPPED';
          row.reason = REASON_CODES.DUPLICATE_CLIENT_NUMBER_IN_FILE;
          row.reason_details = `שורה ${rowIndex}: מספר לקוח ${normalized.client_number} כבר מופיע בקובץ`;
          result.duplicates_in_file.push(row);
          result.to_skip.push(row);
          continue;
        }
        result.seenClientNumbers.add(normalized.client_number);
      }
      
      // Check if client exists in DB based on match_by
      let existingClient = null;
      
      if (row.match_by === 'ID_NUMBER') {
        // Primary match by ID number
        existingClient = existingClients.find(c => 
          normalizeIdNumber(c.id_number) === normalized.id_number
        );
        
        if (existingClient) {
          // Client exists - check for client_number mismatch
          if (normalized.client_number !== null && 
              normalized.client_number !== existingClient.client_number) {
            // Conflict: ID exists but client number is different
            row.action_taken = 'CONFLICT';
            row.reason = REASON_CODES.ID_EXISTS_BUT_CLIENT_NUMBER_MISMATCH;
            row.reason_details = `שורה ${rowIndex}: תעודת זהות ${normalized.id_number} קיימת במערכת עם מספר לקוח ${existingClient.client_number}, אך בקובץ מופיע מספר ${normalized.client_number}`;
            row.existing_client = existingClient;
            result.conflicts_with_db.push(row);
            continue;
          }
        }
      } else if (row.match_by === 'CLIENT_NUMBER') {
        // Primary match by client_number (no ID number available)
        existingClient = existingClients.find(c => 
          c.client_number === normalized.client_number
        );
        
        if (existingClient) {
          // Client exists with this client_number
          // Check if existing client has an ID number - if yes, it's a conflict
          if (existingClient.id_number && normalizeIdNumber(existingClient.id_number) !== '') {
            row.action_taken = 'CONFLICT';
            row.reason = REASON_CODES.CLIENT_NUMBER_EXISTS_WITH_DIFFERENT_DATA;
            row.reason_details = `שורה ${rowIndex}: מספר לקוח ${normalized.client_number} קיים במערכת עם תעודת זהות ${existingClient.id_number}`;
            row.existing_client = existingClient;
            result.conflicts_with_db.push(row);
            continue;
          }
        }
      }
      
      if (existingClient) {
        // Check for changes - only update if existing value is empty and new value is not empty
        const changes = [];
        
        // Full name - update only if existing is empty
        if (isEmptyValue(existingClient.full_name) && !isEmptyValue(normalized.full_name)) {
          changes.push({ field: 'שם', old: existingClient.full_name || '-', new: normalized.full_name });
        }
        
        // City - update only if existing is empty
        if (isEmptyValue(existingClient.city) && !isEmptyValue(normalized.city)) {
          changes.push({ field: 'עיר', old: existingClient.city || '-', new: normalized.city });
        }
        
        // Address - update only if existing is empty
        if (isEmptyValue(existingClient.address) && !isEmptyValue(normalized.address)) {
          changes.push({ field: 'כתובת', old: existingClient.address || '-', new: normalized.address });
        }
        
        // Phone - update only if existing is empty
        if (isEmptyValue(existingClient.phone) && !isEmptyValue(normalized.phone)) {
          changes.push({ field: 'טלפון', old: existingClient.phone || '-', new: phone || '-' });
        }
        
        // Phone secondary - update only if existing is empty
        if (isEmptyValue(existingClient.phone_secondary) && !isEmptyValue(normalized.phone_secondary)) {
          changes.push({ field: 'טלפון נוסף', old: existingClient.phone_secondary || '-', new: phoneSecondary || '-' });
        }
        
        // Email - update only if existing is empty
        if (isEmptyValue(existingClient.email) && !isEmptyValue(normalized.email)) {
          changes.push({ field: 'אימייל', old: existingClient.email || '-', new: email || '-' });
        }
        
        if (changes.length > 0) {
          row.action_taken = 'TO_UPDATE';
          row.reason = 'שינויים זוהו';
          row.existing_client = existingClient;
          row.changes = changes;
          result.to_update.push(row);
        } else {
          // Include clients with no changes in the update list (no actual changes will be made, but they'll be counted as processed)
          row.action_taken = 'TO_UPDATE';
          row.reason = 'לקוח קיים ללא שינויים';
          row.existing_client = existingClient;
          row.changes = [];
          result.to_update.push(row);
        }
        continue;
      }
      
      // Client doesn't exist - handle client_number assignment
      if (row.match_by === 'ID_NUMBER') {
        // Has ID number - can create new client
        if (normalized.client_number !== null) {
          // Client number provided - check if available
          const existingClientByNumber = existingClients.find(c => 
            c.client_number === normalized.client_number
          );
          
          if (existingClientByNumber) {
            // Conflict: client_number taken
            row.action_taken = 'CONFLICT';
            row.reason = REASON_CODES.CLIENT_NUMBER_TAKEN_BY_OTHER_ID;
            row.reason_details = `שורה ${rowIndex}: מספר לקוח ${normalized.client_number} תפוס על ידי ${existingClientByNumber.id_number ? 'תעודת זהות ' + existingClientByNumber.id_number : 'לקוח אחר'}`;
            row.existing_client = existingClientByNumber;
            result.conflicts_with_db.push(row);
            continue;
          }
          
          // Check if taken in this import
          if (result.usedClientNumbers.has(normalized.client_number)) {
            // Assign new number
            while (result.usedClientNumbers.has(result.nextClientNumber) || 
                   result.seenClientNumbers.has(result.nextClientNumber)) {
              result.nextClientNumber++;
            }
            row.assigned_client_number = result.nextClientNumber;
            row.reason = REASON_CODES.CLIENT_NUMBER_CONFLICT_RESOLVED;
            row.reason_details = `מספר ${normalized.client_number} תפוס, הוקצה מספר ${result.nextClientNumber}`;
            result.usedClientNumbers.add(result.nextClientNumber);
            result.seenClientNumbers.add(result.nextClientNumber);
            result.nextClientNumber++;
          } else {
            // Can use requested number
            row.assigned_client_number = normalized.client_number;
            result.usedClientNumbers.add(normalized.client_number);
          }
        } else {
          // No client number provided - assign new one (allowed when we have ID)
          while (result.usedClientNumbers.has(result.nextClientNumber) || 
                 result.seenClientNumbers.has(result.nextClientNumber)) {
            result.nextClientNumber++;
          }
          row.assigned_client_number = result.nextClientNumber;
          row.reason = REASON_CODES.CLIENT_NUMBER_ASSIGNED_AUTOMATICALLY;
          result.usedClientNumbers.add(result.nextClientNumber);
          result.seenClientNumbers.add(result.nextClientNumber);
          result.nextClientNumber++;
        }
      } else if (row.match_by === 'CLIENT_NUMBER') {
        // No ID number - must use the provided client_number
        // Check if this client_number is already taken in DB
        const existingClientByNumber = existingClients.find(c => 
          c.client_number === normalized.client_number
        );
        
        if (existingClientByNumber) {
          // This should have been caught earlier, but double-check
          row.action_taken = 'CONFLICT';
          row.reason = REASON_CODES.CLIENT_NUMBER_TAKEN_BY_OTHER_ID;
          row.reason_details = `שורה ${rowIndex}: מספר לקוח ${normalized.client_number} כבר קיים במערכת`;
          row.existing_client = existingClientByNumber;
          result.conflicts_with_db.push(row);
          continue;
        }
        
        // Use the provided client_number (no auto-assignment when no ID)
        row.assigned_client_number = normalized.client_number;
        result.usedClientNumbers.add(normalized.client_number);
      }
      
      row.action_taken = 'TO_CREATE';
      result.to_create.push(row);
      result.valid_rows.push(row);
      
    } catch (error) {
      const row = {
        row_index: rowIndex,
        raw_data: line,
        action_taken: 'INVALID',
        reason: REASON_CODES.INVALID_ROW_FORMAT,
        reason_details: `שורה ${rowIndex}: ${error.message}`
      };
      result.invalid_rows.push(row);
    }
  }
  
  return result;
}

/**
 * Generate detailed import report
 */
export function generateImportReport(preflightResult) {
  const report = {
    summary: {
      total_rows: preflightResult.total_rows,
      to_create: preflightResult.to_create.length,
      to_update: preflightResult.to_update.length,
      to_skip: preflightResult.to_skip.length,
      invalid: preflightResult.invalid_rows.length,
      conflicts: preflightResult.conflicts_with_db.length,
      duplicates_in_file: preflightResult.duplicates_in_file.length
    },
    details: {
      to_create: preflightResult.to_create.map(row => ({
        row_index: row.row_index,
        id_number: row.normalized.id_number,
        full_name: row.normalized.full_name,
        patient_name: row.normalized?.patient_name,
        client: row.client,
        assigned_client_number: row.assigned_client_number,
        match_by: row.match_by,
        reason: row.reason
      })),
      to_update: preflightResult.to_update.map(row => ({
        row_index: row.row_index,
        id_number: row.normalized.id_number,
        full_name: row.normalized.full_name,
        patient_name: row.normalized?.patient_name,
        client: row.client,
        client_number: row.normalized?.client_number || row.existing_client?.client_number || row.existing_patient?.client_number,
        match_by: row.match_by,
        changes: row.changes
      })),
      to_skip: preflightResult.to_skip.map(row => ({
        row_index: row.row_index,
        id_number: row.normalized?.id_number,
        full_name: row.normalized?.full_name,
        patient_name: row.normalized?.patient_name,
        client: row.client,
        match_by: row.match_by,
        reason: row.reason,
        reason_details: row.reason_details
      })),
      invalid: preflightResult.invalid_rows.map(row => ({
        row_index: row.row_index,
        id_number: row.normalized?.id_number,
        full_name: row.normalized?.full_name,
        patient_name: row.normalized?.patient_name,
        client: row.client,
        match_by: row.match_by,
        reason: row.reason,
        reason_details: row.reason_details
      })),
      conflicts: preflightResult.conflicts_with_db.map(row => ({
        row_index: row.row_index,
        id_number: row.normalized?.id_number,
        full_name: row.normalized?.full_name,
        patient_name: row.normalized?.patient_name,
        client: row.client,
        match_by: row.match_by,
        reason: row.reason,
        reason_details: row.reason_details,
        existing_client: row.existing_client ? {
          id: row.existing_client.id,
          client_number: row.existing_client.client_number,
          id_number: row.existing_client.id_number,
          full_name: row.existing_client.full_name
        } : null
      }))
    }
  };
  
  return report;
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 500) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable = 
        error.message?.includes('timeout') ||
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.status === 429 ||
        error.status >= 500 ||
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError';
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Process items in batches with controlled concurrency
 */
export async function processBatches(items, batchSize, concurrency, processor) {
  const results = {
    successful: [],
    failed: []
  };
  
  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch with controlled concurrency
    const batchPromises = [];
    for (let j = 0; j < batch.length; j += concurrency) {
      const chunk = batch.slice(j, Math.min(j + concurrency, batch.length));
      const chunkResults = await Promise.allSettled(
        chunk.map(item => processor(item))
      );
      
      chunkResults.forEach((result, idx) => {
        const item = chunk[idx];
        if (result.status === 'fulfilled') {
          results.successful.push({ item, result: result.value });
        } else {
          results.failed.push({ item, error: result.reason });
        }
      });
    }
  }
  
  return results;
}

/**
 * Perform preflight analysis on patients CSV
 */
export async function performPatientsPreflight(csvText, existingClients, existingPatients) {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  // Skip header and filter valid data lines
  const dataLines = lines.slice(1).filter(line => {
    const values = parseCSVLine(line);
    const clientNumberStr = values[0];
    return clientNumberStr && clientNumberStr !== 'מספר לקוח' && clientNumberStr.trim() !== '';
  });
  
  const result = {
    total_rows: dataLines.length,
    valid_rows: [],
    invalid_rows: [],
    duplicates_in_file: [],
    conflicts_with_db: [],
    to_create: [],
    to_update: [],
    to_skip: [],
    
    // Maps for quick lookup
    clientNumbersMap: new Map(existingClients.map(c => [c.client_number, c])),
    existingPatientsMap: new Map(
      existingPatients.map(p => [`${p.client_number}_${p.name?.toLowerCase()}`, p])
    ),
    seenPatients: new Set(),
    
    // For patient number assignment
    maxPatientNumber: existingPatients.length > 0 
      ? Math.max(...existingPatients.map(p => p.patient_number || 0))
      : 0,
    nextPatientNumber: null
  };
  
  result.nextPatientNumber = result.maxPatientNumber + 1;
  
  // Process each line
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const rowIndex = i + 2;
    
    try {
      const values = parseCSVLine(line);
      const [
        clientNumberStr, clientName, clientIdNumber,
        patientName, species, breed, dateOfBirth, sex, neuteredStatus, weight, microchip,
        color, allergies, chronicConditions, currentMedications, isInsuredStatus, insuranceCompany, insurancePolicy, statusStr, notes
      ] = values;
      
      // Normalize data
      const normalized = {
        client_number: normalizeClientNumber(clientNumberStr),
        patient_name: patientName ? patientName.trim() : '',
        species: species && species.trim() !== '' && species !== '-' ? species.trim() : 'אחר',
        breed: breed || '',
        date_of_birth: dateOfBirth || '',
        sex: sex || '',
        neutered: neuteredStatus?.toLowerCase() === 'כן' || neuteredStatus?.toLowerCase() === 'yes' || false,
        weight: weight ? parseFloat(weight) : null,
        microchip: microchip || '',
        color: color || '',
        allergies: allergies || '',
        chronic_conditions: chronicConditions || '',
        current_medications: currentMedications || '',
        is_insured: isInsuredStatus?.toLowerCase() === 'כן' || isInsuredStatus?.toLowerCase() === 'yes' || false,
        insurance_company: insuranceCompany || '',
        insurance_policy: insurancePolicy || '',
        status: statusStr === 'פעיל' ? 'active' : 'inactive',
        notes: notes || ''
      };
      
      const row = {
        row_index: rowIndex,
        raw_data: values,
        normalized,
        action_taken: null,
        reason: null,
        reason_details: null,
        assigned_patient_number: null,
        existing_patient: null,
        client: null
      };
      
      // Validation: Check client_number
      if (normalized.client_number === null) {
        row.action_taken = 'INVALID';
        row.reason = REASON_CODES.INVALID_CLIENT_NUMBER;
        row.reason_details = `שורה ${rowIndex}: מספר לקוח לא תקין`;
        result.invalid_rows.push(row);
        continue;
      }
      
      // Find the client
      const client = result.clientNumbersMap.get(normalized.client_number);
      if (!client) {
        row.action_taken = 'INVALID';
        row.reason = REASON_CODES.OWNER_NOT_FOUND;
        row.reason_details = `שורה ${rowIndex}: לא נמצא לקוח עם מספר ${normalized.client_number}`;
        result.invalid_rows.push(row);
        continue;
      }
      row.client = client;
      
      // Validation: Check patient name
      if (!normalized.patient_name || normalized.patient_name === '' || normalized.patient_name === '-') {
        row.action_taken = 'INVALID';
        row.reason = REASON_CODES.MISSING_PATIENT_NAME;
        row.reason_details = `שורה ${rowIndex}: חסר שם מטופל`;
        result.invalid_rows.push(row);
        continue;
      }
      
      // Create unique key for patient
      const patientKey = `${normalized.client_number}_${normalized.patient_name.toLowerCase()}`;
      
      // Check for duplicates in file
      if (result.seenPatients.has(patientKey)) {
        row.action_taken = 'SKIPPED';
        row.reason = 'כפילות בקובץ';
        row.reason_details = `שורה ${rowIndex}: מטופל ${normalized.patient_name} ללקוח ${normalized.client_number} כבר מופיע בקובץ`;
        result.duplicates_in_file.push(row);
        result.to_skip.push(row);
        continue;
      }
      result.seenPatients.add(patientKey);
      
      // Check if patient exists in DB
      const existingPatient = result.existingPatientsMap.get(patientKey);
      
      if (existingPatient) {
        // Patient exists - check for changes - only update if existing value is empty and new value is not empty
        const changes = [];
        
        // Species - update only if existing is empty
        if (isEmptyValue(existingPatient.species) && !isEmptyValue(normalized.species)) {
          changes.push({ field: 'סוג', old: existingPatient.species || '-', new: normalized.species });
        }
        
        // Breed - update only if existing is empty
        if (isEmptyValue(existingPatient.breed) && !isEmptyValue(normalized.breed)) {
          changes.push({ field: 'גזע', old: existingPatient.breed || '-', new: normalized.breed });
        }
        
        // Date of birth - update only if existing is empty
        if (isEmptyValue(existingPatient.date_of_birth) && !isEmptyValue(normalized.date_of_birth)) {
          changes.push({ field: 'תאריך לידה', old: existingPatient.date_of_birth || '-', new: normalized.date_of_birth });
        }
        
        // Sex - update only if existing is empty
        if (isEmptyValue(existingPatient.sex) && !isEmptyValue(normalized.sex)) {
          changes.push({ field: 'מין', old: existingPatient.sex || '-', new: normalized.sex });
        }
        
        // Neutered - update only if existing is false and new is true (special case for boolean)
        if (!existingPatient.neutered && normalized.neutered) {
          changes.push({ field: 'מעוקר', old: 'לא', new: 'כן' });
        }
        
        // Weight - update only if existing is empty
        if (isEmptyValue(existingPatient.weight) && !isEmptyValue(normalized.weight)) {
          changes.push({ field: 'משקל', old: existingPatient.weight || '-', new: normalized.weight });
        }
        
        // Microchip - update only if existing is empty
        if (isEmptyValue(existingPatient.microchip) && !isEmptyValue(normalized.microchip)) {
          changes.push({ field: 'שבב', old: existingPatient.microchip || '-', new: normalized.microchip });
        }
        
        // Color - update only if existing is empty
        if (isEmptyValue(existingPatient.color) && !isEmptyValue(normalized.color)) {
          changes.push({ field: 'צבע', old: existingPatient.color || '-', new: normalized.color });
        }
        
        // Allergies - update only if existing is empty
        if (isEmptyValue(existingPatient.allergies) && !isEmptyValue(normalized.allergies)) {
          changes.push({ field: 'אלרגיות', old: existingPatient.allergies || '-', new: normalized.allergies });
        }
        
        // Chronic conditions - update only if existing is empty
        if (isEmptyValue(existingPatient.chronic_conditions) && !isEmptyValue(normalized.chronic_conditions)) {
          changes.push({ field: 'מחלות כרוניות', old: existingPatient.chronic_conditions || '-', new: normalized.chronic_conditions });
        }
        
        // Current medications - update only if existing is empty
        if (isEmptyValue(existingPatient.current_medications) && !isEmptyValue(normalized.current_medications)) {
          changes.push({ field: 'תרופות', old: existingPatient.current_medications || '-', new: normalized.current_medications });
        }
        
        // Is insured - update only if existing is false and new is true (special case for boolean)
        if (!existingPatient.is_insured && normalized.is_insured) {
          changes.push({ field: 'מבוטח', old: 'לא', new: 'כן' });
        }
        
        // Insurance company - update only if existing is empty
        if (isEmptyValue(existingPatient.insurance_company) && !isEmptyValue(normalized.insurance_company)) {
          changes.push({ field: 'חברת ביטוח', old: existingPatient.insurance_company || '-', new: normalized.insurance_company });
        }
        
        // Insurance policy - update only if existing is empty
        if (isEmptyValue(existingPatient.insurance_policy) && !isEmptyValue(normalized.insurance_policy)) {
          changes.push({ field: 'פוליסה', old: existingPatient.insurance_policy || '-', new: normalized.insurance_policy });
        }
        
        // Status - update only if existing is 'inactive' and new is 'active'
        if (existingPatient.status === 'inactive' && normalized.status === 'active') {
          changes.push({ field: 'סטטוס', old: 'לא פעיל', new: 'פעיל' });
        }
        
        // Notes - update only if existing is empty
        if (isEmptyValue(existingPatient.notes) && !isEmptyValue(normalized.notes)) {
          changes.push({ field: 'הערות', old: existingPatient.notes || '-', new: normalized.notes });
        }
        
        if (changes.length > 0) {
          row.action_taken = 'TO_UPDATE';
          row.reason = 'שינויים זוהו';
          row.existing_patient = existingPatient;
          row.changes = changes;
          result.to_update.push(row);
        } else {
          row.action_taken = 'TO_UPDATE';
          row.reason = 'מטופל קיים ללא שינויים';
          row.existing_patient = existingPatient;
          row.changes = [];
          result.to_update.push(row);
        }
        continue;
      }
      
      // Patient doesn't exist - assign patient number and mark for creation
      row.assigned_patient_number = result.nextPatientNumber;
      result.nextPatientNumber++;
      
      row.action_taken = 'TO_CREATE';
      result.to_create.push(row);
      result.valid_rows.push(row);
      
    } catch (error) {
      const row = {
        row_index: rowIndex,
        raw_data: line,
        action_taken: 'INVALID',
        reason: REASON_CODES.INVALID_ROW_FORMAT,
        reason_details: `שורה ${rowIndex}: ${error.message}`
      };
      result.invalid_rows.push(row);
    }
  }
  
  return result;
}

/**
 * Export report to CSV
 */
export function exportReportToCSV(report, filename = 'import_report.csv') {
  const headers = ['מספר שורה', 'תעודת זהות', 'מספר לקוח', 'שם מלא', 'פעולה', 'סיבה', 'פרטים'];
  const rows = [];
  
  // Add all rows from different categories
  const allRows = [
    ...report.details.to_create.map(r => ({...r, action: 'ייווצר'})),
    ...report.details.to_update.map(r => ({...r, action: 'יעודכן'})),
    ...report.details.to_skip.map(r => ({...r, action: 'דולג'})),
    ...report.details.invalid.map(r => ({...r, action: 'לא תקין'})),
    ...report.details.conflicts.map(r => ({...r, action: 'קונפליקט'}))
  ].sort((a, b) => a.row_index - b.row_index);
  
  allRows.forEach(row => {
    rows.push([
      row.row_index,
      row.id_number || '',
      row.client_number || row.assigned_client_number || '',
      row.full_name || '',
      row.action,
      row.reason || '',
      row.reason_details || (row.changes ? row.changes.map(c => `${c.field}: ${c.old} → ${c.new}`).join('; ') : '')
    ]);
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}