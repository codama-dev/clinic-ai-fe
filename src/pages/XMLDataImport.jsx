import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  Database,
  Link as LinkIcon,
  Key,
  Shield,
  Eye,
  Play
} from 'lucide-react';

const STEPS = {
  UPLOAD: 'upload',
  IDENTIFY: 'identify',
  MAP_ENTITIES: 'map_entities',
  MAP_FIELDS: 'map_fields',
  IDENTITY_RULES: 'identity_rules',
  RELATIONSHIPS: 'relationships',
  VALIDATION: 'validation',
  SUMMARY: 'summary',
  IMPORTING: 'importing'
};

// ישויות זמינות במערכת
const SYSTEM_ENTITIES = [
  { id: 'Client', label: 'לקוח (Client)', fields: ['client_number', 'full_name', 'id_number', 'phone', 'phone_secondary', 'email', 'address', 'city', 'notes'] },
  { id: 'Patient', label: 'מטופל (Patient)', fields: ['client_number', 'name', 'species', 'breed', 'sex', 'date_of_birth', 'weight', 'microchip'] },
  { id: 'MedicalVisit', label: 'ביקור רפואי (Medical Visit)', fields: ['patient_id', 'visit_date', 'complaint', 'diagnosis', 'treatment_plan', 'veterinarian_name'] },
  { id: 'TreatmentExecution', label: 'ביצוע טיפול (Treatment)', fields: ['animal_id', 'medication_name', 'dosage', 'route', 'execution_date', 'execution_time'] },
  { id: 'Billing', label: 'חשבונית (Billing)', fields: ['client_id', 'patient_id', 'issue_date', 'total_amount', 'items'] },
  { id: 'LabTest', label: 'בדיקת מעבדה (Lab Test)', fields: ['patient_id', 'test_type', 'test_date', 'results', 'veterinarian_notes'] }
];

export default function XMLDataImportPage() {
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [xmlFile, setXmlFile] = useState(null);
  const [xmlContent, setXmlContent] = useState(null);
  const [parsedNodes, setParsedNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState({});
  const [entityMappings, setEntityMappings] = useState({});
  const [fieldMappings, setFieldMappings] = useState({});
  const [compositeFields, setCompositeFields] = useState({}); // שדות מורכבים: {nodePath: {systemField: [xmlField1, xmlField2]}}
  const [identityRules, setIdentityRules] = useState({});
  const [relationships, setRelationships] = useState([]);
  const [validationRules, setValidationRules] = useState({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // שלב 1: העלאת קובץ
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setXmlFile(file);
      const text = await file.text();
      setXmlContent(text);

      // ניתוח XML בצורה בטוחה
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      // בדיקה אם יש שגיאת ניתוח
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        alert('שגיאה בניתוח קובץ XML. אנא וודא שהקובץ תקין.');
        setXmlFile(null);
        setXmlContent(null);
        return;
      }
      
      // זיהוי Nodes עם הגבלות
      const nodes = analyzeXMLStructure(xmlDoc);
      setParsedNodes(nodes);
      setCurrentStep(STEPS.IDENTIFY);
    } catch (error) {
      console.error('Error parsing XML:', error);
      alert('שגיאה בטעינת הקובץ. אנא נסה שוב.');
      setXmlFile(null);
      setXmlContent(null);
    }
  };

  const analyzeXMLStructure = (xmlDoc) => {
    const nodes = [];
    const root = xmlDoc.documentElement;
    const MAX_DEPTH = 10;
    const MAX_NODES = 50;
    let nodeCount = 0;
    
    const traverseNode = (node, path = '', depth = 0) => {
      // הגבלות בטיחות
      if (node.nodeType !== 1) return;
      if (depth > MAX_DEPTH) return;
      if (nodeCount >= MAX_NODES) return;
      
      const nodeName = node.nodeName;
      const fullPath = path ? `${path}/${nodeName}` : nodeName;
      const children = Array.from(node.children);
      
      if (children.length === 0) return;
      
      // בדיקה אם יש רשימה של אלמנטים זהים
      const childGroups = {};
      children.forEach(child => {
        childGroups[child.nodeName] = (childGroups[child.nodeName] || 0) + 1;
      });
      
      const isCollection = Object.values(childGroups).some(count => count > 1);
      
      if (isCollection) {
        // קבלת דוגמה של הנתונים - סריקת עד 10 ילדים ראשונים לאיסוף כל השדות
        const sampleData = {};
        const allFieldNames = new Set();
        
        // סרוק את ה-10 ילדים הראשונים כדי לאסוף את כל השדות האפשריים
        const childrenToScan = children.slice(0, 10);
        childrenToScan.forEach(child => {
          if (child && child.children) {
            Array.from(child.children).forEach(field => {
              if (field.children.length === 0) {
                allFieldNames.add(field.nodeName);
              }
            });
          }
        });
        
        // מלא דוגמת נתונים מהילד הראשון
        const firstChild = children[0];
        if (firstChild && firstChild.children) {
          Array.from(firstChild.children).forEach(field => {
            if (field.children.length === 0 && field.textContent && allFieldNames.has(field.nodeName)) {
              const content = field.textContent.substring(0, 100);
              sampleData[field.nodeName] = content;
            }
          });
        }
        
        if (allFieldNames.size > 0) {
          // תיקון: הנתיב צריך להצביע על האלמנט הבודד בתוך הקולקציה
          const collectionItemName = firstChild.nodeName;
          const collectionItemPath = `${fullPath}/${collectionItemName}`;
          
          nodes.push({
            path: collectionItemPath,
            name: collectionItemName,
            isCollection,
            count: Math.max(...Object.values(childGroups)),
            fields: Array.from(allFieldNames),
            sampleData
          });
          nodeCount++;
        }
        
        // לא ממשיכים עמוק יותר אחרי Collection
        return;
      }
      
      // ממשיכים רקורסיבית רק אם לא Collection
      children.slice(0, 10).forEach(child => traverseNode(child, fullPath, depth + 1));
    };
    
    traverseNode(root);
    return nodes;
  };

  // שלב 2: בחירת Nodes
  const handleNodeSelection = (nodePath, isSelected) => {
    setSelectedNodes(prev => ({
      ...prev,
      [nodePath]: isSelected
    }));
  };

  // שלב 3: מיפוי ישויות
  const handleEntityMapping = (nodePath, entityId) => {
    setEntityMappings(prev => ({
      ...prev,
      [nodePath]: entityId
    }));
  };

  // שלב 4: מיפוי שדות
  const handleFieldMapping = (nodePath, xmlField, systemField, defaultValue = null) => {
    setFieldMappings(prev => ({
      ...prev,
      [nodePath]: {
        ...(prev[nodePath] || {}),
        [xmlField]: { systemField, defaultValue }
      }
    }));
  };

  // הוספה/הסרה של שדה XML לשדה מורכב
  const toggleCompositeField = (nodePath, systemField, xmlField) => {
    setCompositeFields(prev => {
      const nodeComposites = prev[nodePath] || {};
      const currentFields = nodeComposites[systemField] || [];
      
      const isAlreadyAdded = currentFields.includes(xmlField);
      
      return {
        ...prev,
        [nodePath]: {
          ...nodeComposites,
          [systemField]: isAlreadyAdded 
            ? currentFields.filter(f => f !== xmlField)
            : [...currentFields, xmlField]
        }
      };
    });
  };

  // שלב 5: הגדרת מפתחות ייחודיים
  const handleIdentityRule = (nodePath, fields) => {
    setIdentityRules(prev => ({
      ...prev,
      [nodePath]: fields
    }));
  };

  // שלב 6: הגדרת קשרים
  const addRelationship = () => {
    setRelationships(prev => [...prev, { 
      parentNode: '', 
      childNode: '', 
      foreignKey: '' 
    }]);
  };

  const updateRelationship = (index, field, value) => {
    setRelationships(prev => prev.map((rel, i) => 
      i === index ? { ...rel, [field]: value } : rel
    ));
  };

  const removeRelationship = (index) => {
    setRelationships(prev => prev.filter((_, i) => i !== index));
  };

  // שלב 7: חוקי ולידציה
  const handleValidationRule = (nodePath, rule, value) => {
    setValidationRules(prev => ({
      ...prev,
      [nodePath]: {
        ...(prev[nodePath] || {}),
        [rule]: value
      }
    }));
  };

  // שלב 8: ביצוע ייבוא
  const executeImport = async () => {
    setCurrentStep(STEPS.IMPORTING);
    setImportResults({ success: [], failed: [], updated: [] });
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    for (const nodePath of Object.keys(selectedNodes)) {
      if (!selectedNodes[nodePath]) continue;
      
      const entityId = entityMappings[nodePath];
      if (!entityId) continue;
      
      const nodeData = extractNodeData(xmlDoc, nodePath);
      setImportProgress({ current: 0, total: nodeData.length });
      
      for (let i = 0; i < nodeData.length; i++) {
        const record = nodeData[i];
        const mappedData = mapRecordToEntity(record, nodePath);
        
        try {
          // בדיקה אם קיימת רשומה
          const identityFields = identityRules[nodePath] || [];
          let existingRecord = null;
          
          if (identityFields.length > 0) {
            const filterQuery = {};
            identityFields.forEach(field => {
              if (mappedData[field]) {
                filterQuery[field] = mappedData[field];
              }
            });
            
            if (Object.keys(filterQuery).length > 0) {
              const results = await base44.entities[entityId].filter(filterQuery, '', 1);
              existingRecord = results[0];
            }
          }
          
          // Upsert
          if (existingRecord) {
            await base44.entities[entityId].update(existingRecord.id, mappedData);
            setImportResults(prev => ({
              ...prev,
              updated: [...prev.updated, { entity: entityId, id: existingRecord.id }]
            }));
          } else {
            const created = await base44.entities[entityId].create(mappedData);
            setImportResults(prev => ({
              ...prev,
              success: [...prev.success, { entity: entityId, id: created.id }]
            }));
          }
        } catch (error) {
          setImportResults(prev => ({
            ...prev,
            failed: [...prev.failed, { entity: entityId, data: mappedData, error: error.message }]
          }));
        }
        
        setImportProgress({ current: i + 1, total: nodeData.length });
      }
    }
  };

  const extractNodeData = (xmlDoc, nodePath) => {
    const parts = nodePath.split('/').filter(p => p);
    
    let currentElements = [xmlDoc.documentElement];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const newElements = [];
      
      currentElements.forEach(el => {
        Array.from(el.children).forEach(child => {
          if (child.nodeName === part) {
            newElements.push(child);
          }
        });
      });
      
      currentElements = newElements;
      
      if (currentElements.length === 0 && i === parts.length - 1) {
        currentElements = Array.from(xmlDoc.getElementsByTagName(part));
      }
    }
    
    return currentElements.map(el => {
      const data = {};
      Array.from(el.children).forEach(child => {
        if (child.children.length === 0 && child.textContent) {
          data[child.nodeName] = child.textContent.trim();
        }
      });
      return data;
    }).filter(record => Object.keys(record).length > 0);
  };

  const mapRecordToEntity = (record, nodePath) => {
    const mapping = fieldMappings[nodePath] || {};
    const composites = compositeFields[nodePath] || {};
    const mapped = {};
    
    // מיפוי רגיל של שדות בודדים
    Object.keys(record).forEach(xmlField => {
      const fieldMapping = mapping[xmlField];
      if (fieldMapping && fieldMapping.systemField !== 'skip') {
        // בדוק אם השדה הזה לא חלק משדה מורכב
        const isPartOfComposite = Object.values(composites).some(fields => fields.includes(xmlField));
        if (!isPartOfComposite) {
          mapped[fieldMapping.systemField] = record[xmlField] || fieldMapping.defaultValue;
        }
      }
    });
    
    // מיפוי שדות מורכבים
    Object.entries(composites).forEach(([systemField, xmlFields]) => {
      if (xmlFields.length > 0) {
        const parts = xmlFields
          .map(xmlField => record[xmlField])
          .filter(val => val && val.trim());
        
        if (parts.length > 0) {
          mapped[systemField] = parts.join(' ');
        }
      }
    });
    
    return mapped;
  };

  // ניווט בין שלבים
  const goToNextStep = () => {
    const steps = Object.values(STEPS);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const steps = Object.values(STEPS);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case STEPS.UPLOAD: return xmlFile !== null;
      case STEPS.IDENTIFY: return Object.values(selectedNodes).some(v => v);
      case STEPS.MAP_ENTITIES: 
        return Object.keys(selectedNodes).filter(k => selectedNodes[k]).every(k => entityMappings[k]);
      case STEPS.MAP_FIELDS:
        return Object.keys(selectedNodes).filter(k => selectedNodes[k]).every(k => {
          const nodeFieldMappings = fieldMappings[k];
          const nodeComposites = compositeFields[k];
          
          // בדוק אם יש לפחות שדה אחד ממופה (רגיל או מורכב)
          const hasRegularMapping = nodeFieldMappings && Object.values(nodeFieldMappings).some(
            fieldMap => fieldMap.systemField && fieldMap.systemField !== 'skip'
          );
          const hasCompositeMapping = nodeComposites && Object.values(nodeComposites).some(
            fields => fields && fields.length > 0
          );
          
          return hasRegularMapping || hasCompositeMapping;
        });
      case STEPS.IDENTITY_RULES:
        return Object.keys(selectedNodes).filter(k => selectedNodes[k]).every(k => {
          const mappedFields = Object.keys(fieldMappings[k] || {})
            .filter(xmlField => fieldMappings[k][xmlField]?.systemField !== 'skip')
            .map(xmlField => fieldMappings[k][xmlField].systemField);
          
          const compositeSystemFields = Object.keys(compositeFields[k] || {})
            .filter(systemField => (compositeFields[k][systemField] || []).length > 0);
          
          const allSystemFields = [...new Set([...mappedFields, ...compositeSystemFields])];
          
          return identityRules[k]?.length > 0 && identityRules[k].every(field => allSystemFields.includes(field));
        });
      default: return true;
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            גישה נדחתה. רק מנהלי מערכת יכולים לגשת לדף זה.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ייבוא נתונים מקובץ XML</h1>
        <p className="text-gray-600">ייבוא והתאמת נתונים מקובץ XML לישויות המערכת</p>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {Object.values(STEPS).filter(s => s !== STEPS.IMPORTING).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step ? 'border-purple-600 bg-purple-600 text-white' :
                  Object.values(STEPS).indexOf(currentStep) > index ? 'border-green-600 bg-green-600 text-white' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {Object.values(STEPS).indexOf(currentStep) > index ? <CheckCircle className="w-5 h-5" /> : index + 1}
                </div>
                {index < Object.values(STEPS).length - 2 && (
                  <div className={`w-12 h-1 mx-2 ${
                    Object.values(STEPS).indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Upload */}
      {currentStep === STEPS.UPLOAD && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              שלב 1: העלאת קובץ XML
            </CardTitle>
            <CardDescription>העלה את קובץ ה-XML שברצונך לייבא</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <Label htmlFor="xml-upload" className="cursor-pointer">
                <div className="text-lg font-medium mb-2">לחץ לבחירת קובץ או גרור לכאן</div>
                <div className="text-sm text-gray-500">קבצי XML בלבד</div>
                <Input
                  id="xml-upload"
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </Label>
              {xmlFile && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>{xmlFile.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Identify Nodes */}
      {currentStep === STEPS.IDENTIFY && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              שלב 2: זיהוי מבנה הקובץ
            </CardTitle>
            <CardDescription>בחר אילו Nodes מייצגים ישויות עסקיות</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parsedNodes.map(node => (
                <div key={node.path} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedNodes[node.path] || false}
                      onCheckedChange={(checked) => handleNodeSelection(node.path, checked)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-lg">{node.name}</div>
                      <div className="text-sm text-gray-500 mb-2">{node.path}</div>
                      <div className="flex items-center gap-4 mb-2">
                        <Badge variant="outline">{node.count} רשומות</Badge>
                        <Badge variant="outline">{node.fields.length} שדות</Badge>
                      </div>
                      <div className="text-sm">
                        <strong>שדות לדוגמה:</strong>
                        <div className="mt-1 text-gray-600">
                          {node.fields.slice(0, 5).join(', ')}
                          {node.fields.length > 5 && '...'}
                        </div>
                      </div>
                      {Object.keys(node.sampleData).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-purple-600">הצג דוגמת נתונים</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                            {JSON.stringify(node.sampleData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Map Entities */}
      {currentStep === STEPS.MAP_ENTITIES && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              שלב 3: התאמת ישויות
            </CardTitle>
            <CardDescription>קשר כל Node לישות במערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.keys(selectedNodes).filter(k => selectedNodes[k]).map(nodePath => {
                const node = parsedNodes.find(n => n.path === nodePath);
                return (
                  <div key={nodePath} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <Label className="text-lg font-medium">{node.name}</Label>
                      <div className="text-sm text-gray-500">{nodePath}</div>
                    </div>
                    <div className="grid gap-2">
                      <Label>בחר ישות יעד במערכת:</Label>
                      <Select
                        value={entityMappings[nodePath] || ''}
                        onValueChange={(value) => handleEntityMapping(nodePath, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר ישות..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_ENTITIES.map(entity => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Map Fields */}
      {currentStep === STEPS.MAP_FIELDS && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              שלב 4: מיפוי שדות
            </CardTitle>
            <CardDescription>התאם שדות מה-XML לשדות במערכת. ניתן לשלב מספר שדות לשדה אחד.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Object.keys(selectedNodes).filter(k => selectedNodes[k]).map(nodePath => {
                const node = parsedNodes.find(n => n.path === nodePath);
                const entity = SYSTEM_ENTITIES.find(e => e.id === entityMappings[nodePath]);
                const nodeComposites = compositeFields[nodePath] || {};
                
                return (
                  <div key={nodePath} className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">
                      {node.name} → {entity?.label}
                    </h3>
                    
                    {/* שדות מורכבים - רק עבור full_name */}
                    {entity?.fields.includes('full_name') && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          שילוב שם פרטי ושם משפחה לשם מלא
                        </h4>
                        <div className="border rounded p-3 bg-white">
                          <div className="font-medium mb-2">full_name</div>
                          <div className="flex flex-wrap gap-2">
                            {node.fields.map(xmlField => (
                              <div key={xmlField} className="flex items-center gap-2">
                                <Checkbox
                                  checked={(nodeComposites['full_name'] || []).includes(xmlField)}
                                  onCheckedChange={() => toggleCompositeField(nodePath, 'full_name', xmlField)}
                                />
                                <Label className="text-sm font-normal cursor-pointer">
                                  {xmlField}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {(nodeComposites['full_name'] || []).length > 0 && (
                            <div className="mt-2 text-sm text-blue-600">
                              ✓ יחובר: {(nodeComposites['full_name'] || []).join(' + ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* מיפוי רגיל */}
                    <div>
                      <h4 className="font-medium mb-3">מיפוי שדות בודדים</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>שדה ב-XML</TableHead>
                            <TableHead>ערך לדוגמה</TableHead>
                            <TableHead>שדה יעד במערכת</TableHead>
                            <TableHead>ערך ברירת מחדל</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {node.fields.map(xmlField => {
                            const isPartOfComposite = Object.values(nodeComposites).some(fields => fields.includes(xmlField));
                            return (
                              <TableRow key={xmlField} className={isPartOfComposite ? 'opacity-50' : ''}>
                                <TableCell className="font-medium">
                                  {xmlField}
                                  {isPartOfComposite && <span className="text-xs text-blue-600 mr-2">(מורכב)</span>}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {node.sampleData[xmlField] || '-'}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={fieldMappings[nodePath]?.[xmlField]?.systemField || ''}
                                    onValueChange={(value) => handleFieldMapping(nodePath, xmlField, value)}
                                    disabled={isPartOfComposite}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="בחר שדה..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="skip">דלג על שדה זה</SelectItem>
                                      {entity?.fields.map(field => (
                                        <SelectItem key={field} value={field}>
                                          {field}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="ערך ברירת מחדל..."
                                    value={fieldMappings[nodePath]?.[xmlField]?.defaultValue || ''}
                                    onChange={(e) => handleFieldMapping(
                                      nodePath, 
                                      xmlField, 
                                      fieldMappings[nodePath]?.[xmlField]?.systemField || 'skip',
                                      e.target.value
                                    )}
                                    disabled={isPartOfComposite}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Identity Rules */}
      {currentStep === STEPS.IDENTITY_RULES && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              שלב 5: הגדרת מפתחות ייחודיים
            </CardTitle>
            <CardDescription>
              בחר שדות לזיהוי רשומות קיימות (למניעת כפילויות)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                שדות אלו ישמשו לבדיקה האם רשומה כבר קיימת במערכת. אם קיימת - היא תתעדכן, אם לא - תיווצר חדשה.
              </AlertDescription>
            </Alert>
            <div className="space-y-6">
              {Object.keys(selectedNodes).filter(k => selectedNodes[k]).map(nodePath => {
                const node = parsedNodes.find(n => n.path === nodePath);
                const entity = SYSTEM_ENTITIES.find(e => e.id === entityMappings[nodePath]);
                const mappedFields = Object.keys(fieldMappings[nodePath] || {})
                  .filter(xmlField => fieldMappings[nodePath][xmlField]?.systemField !== 'skip')
                  .map(xmlField => fieldMappings[nodePath][xmlField].systemField);
                
                const compositeSystemFields = Object.keys(compositeFields[nodePath] || {})
                  .filter(systemField => (compositeFields[nodePath][systemField] || []).length > 0);
                
                const allSystemFields = [...new Set([...mappedFields, ...compositeSystemFields])];
                
                return (
                  <div key={nodePath} className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">{node.name} → {entity?.label}</h3>
                    <div className="space-y-2">
                      <Label>בחר שדות למפתח ייחודי:</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {allSystemFields.map(field => (
                          <div key={field} className="flex items-center gap-2">
                            <Checkbox
                              checked={identityRules[nodePath]?.includes(field) || false}
                              onCheckedChange={(checked) => {
                                const current = identityRules[nodePath] || [];
                                handleIdentityRule(
                                  nodePath,
                                  checked 
                                    ? [...current, field]
                                    : current.filter(f => f !== field)
                                );
                              }}
                            />
                            <Label className="font-normal">{field}</Label>
                          </div>
                        ))}
                      </div>
                      {identityRules[nodePath]?.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                          <strong>מפתח נבחר:</strong> {identityRules[nodePath].join(' + ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Relationships */}
      {currentStep === STEPS.RELATIONSHIPS && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              שלב 6: הגדרת קשרים בין ישויות
            </CardTitle>
            <CardDescription>הגדר קשרים בין הישויות (אופציונלי)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {relationships.map((rel, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>ישות הורה</Label>
                      <Select
                        value={rel.parentNode}
                        onValueChange={(value) => updateRelationship(index, 'parentNode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(selectedNodes).filter(k => selectedNodes[k]).map(nodePath => {
                            const node = parsedNodes.find(n => n.path === nodePath);
                            return (
                              <SelectItem key={nodePath} value={nodePath}>
                                {node.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>ישות ילד</Label>
                      <Select
                        value={rel.childNode}
                        onValueChange={(value) => updateRelationship(index, 'childNode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(selectedNodes).filter(k => selectedNodes[k]).map(nodePath => {
                            const node = parsedNodes.find(n => n.path === nodePath);
                            return (
                              <SelectItem key={nodePath} value={nodePath}>
                                {node.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>שדה מקשר</Label>
                      <Input
                        placeholder="שם השדה..."
                        value={rel.foreignKey}
                        onChange={(e) => updateRelationship(index, 'foreignKey', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => removeRelationship(index)}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    הסר קשר
                  </Button>
                </div>
              ))}
              <Button onClick={addRelationship} variant="outline">
                <LinkIcon className="w-4 h-4 ml-2" />
                הוסף קשר
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 7: Validation Rules */}
      {currentStep === STEPS.VALIDATION && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              שלב 7: חוקי ולידציה
            </CardTitle>
            <CardDescription>הגדר חוקים לולידציה של הנתונים</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.keys(selectedNodes).filter(k => selectedNodes[k]).map(nodePath => {
                const node = parsedNodes.find(n => n.path === nodePath);
                return (
                  <div key={nodePath} className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">{node.name}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={validationRules[nodePath]?.skipEmpty || false}
                          onCheckedChange={(checked) => 
                            handleValidationRule(nodePath, 'skipEmpty', checked)
                          }
                        />
                        <Label className="font-normal">דלג על רשומות עם שדות חובה ריקים</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={validationRules[nodePath]?.preventDuplicates || false}
                          onCheckedChange={(checked) => 
                            handleValidationRule(nodePath, 'preventDuplicates', checked)
                          }
                        />
                        <Label className="font-normal">מנע יצירה כפולה (רק עדכון)</Label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 8: Summary */}
      {currentStep === STEPS.SUMMARY && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              שלב 8: סיכום ואישור
            </CardTitle>
            <CardDescription>סקור את התצורה לפני תחילת הייבוא</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>אזהרה:</strong> לאחר אישור, תהליך הייבוא יתחיל ויבצע שינויים במסד הנתונים.
                וודא כי כל ההגדרות נכונות לפני המשך.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              {Object.keys(selectedNodes).filter(k => selectedNodes[k]).map(nodePath => {
                const node = parsedNodes.find(n => n.path === nodePath);
                const entity = SYSTEM_ENTITIES.find(e => e.id === entityMappings[nodePath]);
                
                return (
                  <Card key={nodePath} className="border-2">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="text-lg">
                        {node.name} → {entity?.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>מספר רשומות צפוי:</strong> {node.count}
                        </div>
                        <div>
                          <strong>מפתחות ייחודיים:</strong>{' '}
                          {identityRules[nodePath]?.join(', ') || 'לא הוגדרו'}
                        </div>
                        <div>
                          <strong>שדות ממופים:</strong>{' '}
                          {Object.keys(fieldMappings[nodePath] || {}).filter(
                            f => fieldMappings[nodePath][f].systemField !== 'skip'
                          ).length}
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-purple-600 font-medium">
                            הצג מיפוי מפורט
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            {Object.entries(fieldMappings[nodePath] || {}).map(([xml, mapping]) => (
                              mapping.systemField !== 'skip' && (
                                <div key={xml} className="py-1">
                                  {xml} → {mapping.systemField}
                                  {mapping.defaultValue && ` (ברירת מחדל: ${mapping.defaultValue})`}
                                </div>
                              )
                            ))}
                          </div>
                        </details>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                onClick={executeImport}
              >
                <Play className="w-5 h-5 ml-2" />
                אישור ותחילת ייבוא
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 9: Importing */}
      {currentStep === STEPS.IMPORTING && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              מבצע ייבוא...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>התקדמות</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <Progress 
                  value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} 
                />
              </div>

              {importResults && importProgress.current === importProgress.total && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong>הייבוא הושלם!</strong>
                      <div className="mt-2 space-y-1">
                        <div>✓ נוצרו: {importResults.success.length} רשומות</div>
                        <div>↻ עודכנו: {importResults.updated.length} רשומות</div>
                        <div>✗ נכשלו: {importResults.failed.length} רשומות</div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {importResults.failed.length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-red-600 font-medium">
                        הצג שגיאות ({importResults.failed.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {importResults.failed.map((fail, index) => (
                          <div key={index} className="p-3 bg-red-50 rounded text-sm">
                            <div className="font-medium">{fail.entity}</div>
                            <div className="text-red-600">{fail.error}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => window.location.reload()}
                  >
                    סיים וחזור להתחלה
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {currentStep !== STEPS.UPLOAD && currentStep !== STEPS.IMPORTING && (
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={goToPreviousStep}>
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button 
            onClick={goToNextStep}
            disabled={!canProceed()}
          >
            המשך
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      )}
    </div>
  );
}