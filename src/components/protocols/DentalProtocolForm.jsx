import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

// Professional dental chart data with numbering system
const DENTAL_CHARTS = {
  dog: {
    upper_right: [
      { id: 'UR-I3', num: '103', name: 'I3', type: 'incisor', x: 288, y: 75 },
      { id: 'UR-I2', num: '102', name: 'I2', type: 'incisor', x: 274, y: 60 },
      { id: 'UR-I1', num: '101', name: 'I1', type: 'incisor', x: 262, y: 50 },
      { id: 'UR-C', num: '104', name: 'C', type: 'canine', x: 308, y: 92 },
      { id: 'UR-P1', num: '105', name: 'P1', type: 'premolar', x: 332, y: 110 },
      { id: 'UR-P2', num: '106', name: 'P2', type: 'premolar', x: 356, y: 128 },
      { id: 'UR-P3', num: '107', name: 'P3', type: 'premolar', x: 380, y: 146 },
      { id: 'UR-P4', num: '108', name: 'P4', type: 'premolar', x: 404, y: 164 },
      { id: 'UR-M1', num: '109', name: 'M1', type: 'molar', x: 422, y: 178 },
      { id: 'UR-M2', num: '110', name: 'M2', type: 'molar', x: 438, y: 190 },
    ],
    upper_left: [
      { id: 'UL-I1', num: '201', name: 'I1', type: 'incisor', x: 238, y: 50 },
      { id: 'UL-I2', num: '202', name: 'I2', type: 'incisor', x: 226, y: 60 },
      { id: 'UL-I3', num: '203', name: 'I3', type: 'incisor', x: 212, y: 75 },
      { id: 'UL-C', num: '204', name: 'C', type: 'canine', x: 192, y: 92 },
      { id: 'UL-P1', num: '205', name: 'P1', type: 'premolar', x: 168, y: 110 },
      { id: 'UL-P2', num: '206', name: 'P2', type: 'premolar', x: 144, y: 128 },
      { id: 'UL-P3', num: '207', name: 'P3', type: 'premolar', x: 120, y: 146 },
      { id: 'UL-P4', num: '208', name: 'P4', type: 'premolar', x: 96, y: 164 },
      { id: 'UL-M1', num: '209', name: 'M1', type: 'molar', x: 78, y: 178 },
      { id: 'UL-M2', num: '210', name: 'M2', type: 'molar', x: 62, y: 190 },
    ],
    lower_right: [
      { id: 'LR-I3', num: '403', name: 'I3', type: 'incisor', x: 288, y: 425 },
      { id: 'LR-I2', num: '402', name: 'I2', type: 'incisor', x: 274, y: 440 },
      { id: 'LR-I1', num: '401', name: 'I1', type: 'incisor', x: 262, y: 450 },
      { id: 'LR-C', num: '404', name: 'C', type: 'canine', x: 308, y: 408 },
      { id: 'LR-P1', num: '405', name: 'P1', type: 'premolar', x: 332, y: 390 },
      { id: 'LR-P2', num: '406', name: 'P2', type: 'premolar', x: 356, y: 372 },
      { id: 'LR-P3', num: '407', name: 'P3', type: 'premolar', x: 380, y: 354 },
      { id: 'LR-P4', num: '408', name: 'P4', type: 'premolar', x: 404, y: 336 },
      { id: 'LR-M1', num: '409', name: 'M1', type: 'molar', x: 422, y: 322 },
      { id: 'LR-M2', num: '410', name: 'M2', type: 'molar', x: 438, y: 310 },
      { id: 'LR-M3', num: '411', name: 'M3', type: 'molar', x: 452, y: 298 },
    ],
    lower_left: [
      { id: 'LL-I1', num: '301', name: 'I1', type: 'incisor', x: 238, y: 450 },
      { id: 'LL-I2', num: '302', name: 'I2', type: 'incisor', x: 226, y: 440 },
      { id: 'LL-I3', num: '303', name: 'I3', type: 'incisor', x: 212, y: 425 },
      { id: 'LL-C', num: '304', name: 'C', type: 'canine', x: 192, y: 408 },
      { id: 'LL-P1', num: '305', name: 'P1', type: 'premolar', x: 168, y: 390 },
      { id: 'LL-P2', num: '306', name: 'P2', type: 'premolar', x: 144, y: 372 },
      { id: 'LL-P3', num: '307', name: 'P3', type: 'premolar', x: 120, y: 354 },
      { id: 'LL-P4', num: '308', name: 'P4', type: 'premolar', x: 96, y: 336 },
      { id: 'LL-M1', num: '309', name: 'M1', type: 'molar', x: 78, y: 322 },
      { id: 'LL-M2', num: '310', name: 'M2', type: 'molar', x: 62, y: 310 },
      { id: 'LL-M3', num: '311', name: 'M3', type: 'molar', x: 48, y: 298 },
    ],
  },
  cat: {
    upper_right: [
      { id: 'UR-I3', num: '103', name: 'I3', type: 'incisor', x: 288, y: 75 },
      { id: 'UR-I2', num: '102', name: 'I2', type: 'incisor', x: 274, y: 60 },
      { id: 'UR-I1', num: '101', name: 'I1', type: 'incisor', x: 262, y: 50 },
      { id: 'UR-C', num: '104', name: 'C', type: 'canine', x: 308, y: 92 },
      { id: 'UR-P2', num: '106', name: 'P2', type: 'premolar', x: 356, y: 128 },
      { id: 'UR-P3', num: '107', name: 'P3', type: 'premolar', x: 380, y: 146 },
      { id: 'UR-P4', num: '108', name: 'P4', type: 'premolar', x: 404, y: 164 },
      { id: 'UR-M1', num: '109', name: 'M1', type: 'molar', x: 422, y: 178 },
    ],
    upper_left: [
      { id: 'UL-I1', num: '201', name: 'I1', type: 'incisor', x: 238, y: 50 },
      { id: 'UL-I2', num: '202', name: 'I2', type: 'incisor', x: 226, y: 60 },
      { id: 'UL-I3', num: '203', name: 'I3', type: 'incisor', x: 212, y: 75 },
      { id: 'UL-C', num: '204', name: 'C', type: 'canine', x: 192, y: 92 },
      { id: 'UL-P2', num: '206', name: 'P2', type: 'premolar', x: 144, y: 128 },
      { id: 'UL-P3', num: '207', name: 'P3', type: 'premolar', x: 120, y: 146 },
      { id: 'UL-P4', num: '208', name: 'P4', type: 'premolar', x: 96, y: 164 },
      { id: 'UL-M1', num: '209', name: 'M1', type: 'molar', x: 78, y: 178 },
    ],
    lower_right: [
      { id: 'LR-I3', num: '403', name: 'I3', type: 'incisor', x: 288, y: 425 },
      { id: 'LR-I2', num: '402', name: 'I2', type: 'incisor', x: 274, y: 440 },
      { id: 'LR-I1', num: '401', name: 'I1', type: 'incisor', x: 262, y: 450 },
      { id: 'LR-C', num: '404', name: 'C', type: 'canine', x: 308, y: 408 },
      { id: 'LR-P3', num: '407', name: 'P3', type: 'premolar', x: 380, y: 354 },
      { id: 'LR-P4', num: '408', name: 'P4', type: 'premolar', x: 404, y: 336 },
      { id: 'LR-M1', num: '409', name: 'M1', type: 'molar', x: 422, y: 322 },
    ],
    lower_left: [
      { id: 'LL-I1', num: '301', name: 'I1', type: 'incisor', x: 238, y: 450 },
      { id: 'LL-I2', num: '302', name: 'I2', type: 'incisor', x: 226, y: 440 },
      { id: 'LL-I3', num: '303', name: 'I3', type: 'incisor', x: 212, y: 425 },
      { id: 'LL-C', num: '304', name: 'C', type: 'canine', x: 192, y: 408 },
      { id: 'LL-P3', num: '307', name: 'P3', type: 'premolar', x: 120, y: 354 },
      { id: 'LL-P4', num: '308', name: 'P4', type: 'premolar', x: 96, y: 336 },
      { id: 'LL-M1', num: '309', name: 'M1', type: 'molar', x: 78, y: 322 },
    ],
  },
};

const ToothSVG = ({ tooth, status, onClick, disabled }) => {
  const getColorByType = () => {
    if (status === 'extracted') return { fill: '#ef4444', stroke: '#dc2626' };
    if (status === 'treated') return { fill: '#60a5fa', stroke: '#3b82f6' };

    switch (tooth.type) {
      case 'incisor':
        return { fill: '#c084fc', stroke: '#a855f7' }; // Purple/Pink
      case 'canine':
        return { fill: '#4ade80', stroke: '#22c55e' }; // Green
      case 'premolar':
        return { fill: '#fbbf24', stroke: '#f59e0b' }; // Yellow
      case 'molar':
        return { fill: '#60a5fa', stroke: '#3b82f6' }; // Blue
      default:
        return { fill: '#ffffff', stroke: '#9ca3af' };
    }
  };

  const colors = getColorByType();

  const renderToothShape = () => {
    switch (tooth.type) {
      case 'incisor':
        // Incisors - smallest teeth
        return (
          <rect
            x={tooth.x - 4.5}
            y={tooth.y - 8}
            width="9"
            height="16"
            rx="2"
            ry="2"
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="2"
            className={disabled ? 'opacity-50' : 'hover:opacity-80'}
          />
        );
      
      case 'canine':
        // Canines - large pointed triangular shape
        return (
          <path
            d={`M ${tooth.x} ${tooth.y - 24} 
                L ${tooth.x - 14} ${tooth.y + 16} 
                Q ${tooth.x} ${tooth.y + 20} ${tooth.x + 14} ${tooth.y + 16} 
                Z`}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="2.5"
            className={disabled ? 'opacity-50' : 'hover:opacity-80'}
          />
        );
      
      case 'premolar':
        // Premolars - gradual size increase from P1 to P4
        let width, height, rx;
        
        if (tooth.name === 'P1') {
          // P1 - smallest premolar
          width = 13;
          height = 20;
          rx = 3;
        } else if (tooth.name === 'P2') {
          // P2 - small-medium premolar
          width = 17;
          height = 25;
          rx = 3.5;
        } else if (tooth.name === 'P3') {
          // P3 - medium-large premolar
          width = 21;
          height = 29;
          rx = 4;
        } else {
          // P4 - largest premolar
          width = 24;
          height = 32;
          rx = 4.5;
        }
        
        return (
          <rect
            x={tooth.x - width/2}
            y={tooth.y - height/2}
            width={width}
            height={height}
            rx={rx}
            ry={rx}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="2.5"
            className={disabled ? 'opacity-50' : 'hover:opacity-80'}
          />
        );
      
      case 'molar':
        // Molars - different sizes based on position
        let molarWidth, molarHeight;
        
        if (tooth.name === 'M1' && (tooth.num === '109' || tooth.num === '209' || tooth.num === '309' || tooth.num === '409')) {
          // M1 (109, 209, 309, 409) - largest molars
          molarWidth = 26;
          molarHeight = 34;
        } else if (tooth.name === 'M2' && (tooth.num === '110' || tooth.num === '210')) {
          // M2 upper (110, 210) - medium-large molars
          molarWidth = 23;
          molarHeight = 30;
        } else if (tooth.name === 'M2' && (tooth.num === '310' || tooth.num === '410')) {
          // M2 lower (310, 410) - small molars
          molarWidth = 18;
          molarHeight = 24;
        } else if (tooth.name === 'M3') {
          // M3 (311, 411) - smallest molars
          molarWidth = 15;
          molarHeight = 20;
        } else {
          // Default molar size
          molarWidth = 26;
          molarHeight = 34;
        }
        
        return (
          <rect
            x={tooth.x - molarWidth/2}
            y={tooth.y - molarHeight/2}
            width={molarWidth}
            height={molarHeight}
            rx="5"
            ry="5"
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="2.5"
            className={disabled ? 'opacity-50' : 'hover:opacity-80'}
          />
        );
      
      default:
        return (
          <ellipse
            cx={tooth.x}
            cy={tooth.y}
            rx="12"
            ry="18"
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="2.5"
            className={disabled ? 'opacity-50' : 'hover:opacity-80'}
          />
        );
    }
  };

  return (
    <g
      onClick={disabled ? undefined : onClick}
      className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      style={{ transition: 'all 0.2s' }}
    >
      {/* Tooth shape */}
      {renderToothShape()}
      
      {/* Tooth number with outline for better visibility */}
      <text
        x={tooth.x}
        y={tooth.y + 3}
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="#ffffff"
        stroke="#1f2937"
        strokeWidth="2.5"
        paintOrder="stroke"
        pointerEvents="none"
      >
        {tooth.num}
      </text>
      
      {/* Status indicator */}
      {status && (
        <circle
          cx={tooth.x + 10}
          cy={tooth.y - 15}
          r="4"
          fill={status === 'treated' ? '#3b82f6' : '#ef4444'}
          stroke="#ffffff"
          strokeWidth="2"
        />
      )}
    </g>
  );
};

const LabelWithArrow = ({ x, y, text, direction = 'right', targetX, targetY }) => {
  const textOffsetX = direction === 'right' ? 8 : -8;
  const textX = x + textOffsetX;
  
  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={targetX}
        y2={targetY}
        stroke="#6b7280"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <text
        x={textX}
        y={y - 2}
        textAnchor={direction === 'right' ? 'start' : 'end'}
        fontSize="11"
        fontWeight="600"
        fill="#374151"
      >
        {text}
      </text>
    </g>
  );
};

export default function DentalProtocolForm({ protocol, onSubmit, onCancel, readOnly, currentUser, onPartialSave }) {
  const [animalData, setAnimalData] = useState({
    animal_name: protocol?.data?.animal_name || '',
    file_number: protocol?.data?.file_number || '',
    weight: protocol?.data?.weight || '',
    animal_type: protocol?.data?.animal_type || '',
  });

  const [teethStatus, setTeethStatus] = useState(protocol?.data?.teeth_status || {});
  const [protocolTimestamp] = useState(protocol?.created_date || new Date().toISOString());
  const autoSaveTimerRef = useRef(null);

  const handleAnimalDataChange = (field, value) => {
    setAnimalData(prev => ({ ...prev, [field]: value }));
    triggerAutoSave({ ...animalData, [field]: value }, teethStatus);
  };

  const handleToothClick = (toothId) => {
    if (readOnly) return;
    
    setTeethStatus(prev => {
      const currentStatus = prev[toothId];
      let newStatus;
      
      if (!currentStatus) {
        newStatus = 'treated';
      } else if (currentStatus === 'treated') {
        newStatus = 'extracted';
      } else {
        newStatus = null;
      }
      
      const updated = { ...prev };
      if (newStatus) {
        updated[toothId] = newStatus;
      } else {
        delete updated[toothId];
      }
      
      // Auto-save immediately after tooth click
      triggerAutoSave(animalData, updated);
      
      return updated;
    });
  };

  const triggerAutoSave = (currentAnimalData, currentTeethStatus) => {
    if (readOnly || !onPartialSave) return;
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      const formData = {
        animal_name: currentAnimalData.animal_name,
        file_number: currentAnimalData.file_number,
        weight: currentAnimalData.weight,
        animal_type: currentAnimalData.animal_type,
        teeth_status: currentTeethStatus,
      };
      onPartialSave(formData);
    }, 1000); // Auto-save after 1 second of inactivity
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const protocolData = {
      data: {
        animal_name: animalData.animal_name,
        file_number: animalData.file_number,
        weight: animalData.weight,
        animal_type: animalData.animal_type,
        teeth_status: teethStatus,
      },
      patient_name: animalData.animal_name || 'פרוטוקול שיניים',
      filled_by_name: currentUser?.display_name || currentUser?.full_name || currentUser?.email,
    };

    onSubmit(protocolData);
  };

  const currentChart = animalData.animal_type ? DENTAL_CHARTS[animalData.animal_type] : null;

  const treatedCount = Object.values(teethStatus).filter(s => s === 'treated').length;
  const extractedCount = Object.values(teethStatus).filter(s => s === 'extracted').length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* Protocol Timestamp */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-blue-900">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">תאריך ושעת פתיחת הפרוטוקול:</span>
            <span className="font-bold">
              {new Date(protocolTimestamp).toLocaleString('he-IL', { 
                timeZone: 'Asia/Jerusalem',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Animal Details */}
      <Card>
        <CardHeader>
          <CardTitle>פרטי החיה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="animal-name">שם החיה *</Label>
              <Input
                id="animal-name"
                value={animalData.animal_name}
                onChange={(e) => handleAnimalDataChange('animal_name', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>
            <div>
              <Label htmlFor="file-number">מספר תיק</Label>
              <Input
                id="file-number"
                value={animalData.file_number}
                onChange={(e) => handleAnimalDataChange('file_number', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="weight">משקל החיה (ק"ג)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={animalData.weight}
                onChange={(e) => handleAnimalDataChange('weight', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="animal-type">סוג החיה *</Label>
              <Select
                value={animalData.animal_type}
                onValueChange={(value) => handleAnimalDataChange('animal_type', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="animal-type">
                  <SelectValue placeholder="בחר סוג חיה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dog">כלב</SelectItem>
                  <SelectItem value="cat">חתול</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Dental Chart */}
      {currentChart && (
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold uppercase tracking-wide mb-4">
                {animalData.animal_type === 'dog' ? 'CANINE DENTAL CHART' : 'FELINE DENTAL CHART'}
              </CardTitle>
              {animalData.animal_type === 'dog' && (
                <div className="mb-4">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/70ab1de4c_image.png"
                    alt="תרשים שיניים כלבים - מדריך מספור"
                    className="mx-auto rounded-lg shadow-md max-w-md"
                  />
                  <p className="text-xs text-gray-600 mt-2">מדריך מספור שיניים - לזיהוי מדויק</p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-400 border-2 border-purple-500"></div>
                  <span>חותכות (Incisors)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-400 border-2 border-green-500"></div>
                  <span>ניבים (Canine)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-400 border-2 border-yellow-500"></div>
                  <span>טוחנות קדמיות (Premolars)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-400 border-2 border-blue-500"></div>
                  <span>טוחנות אחוריות (Molars)</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 text-sm mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-400 border-2 border-white"></div>
                  <span className="font-semibold">טופלה ({treatedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white"></div>
                  <span className="font-semibold">נעקרה ({extractedCount})</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              לחץ על שן: פעם אחת - טיפול • פעם שנייה - עקירה • פעם שלישית - ביטול
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-xl p-4 shadow-lg overflow-x-auto">
              <svg viewBox="0 0 600 500" className="w-full" style={{ maxHeight: '600px', minWidth: '550px' }}>
                {/* Upper jaw outline */}
                <path
                  d="M 300 70 Q 150 70 100 150 Q 100 190 115 220 L 485 220 Q 500 190 500 150 Q 450 70 300 70 Z"
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="2"
                  strokeDasharray="5,3"
                />
                
                {/* Lower jaw outline */}
                <path
                  d="M 300 430 Q 150 430 100 350 Q 100 310 115 280 L 485 280 Q 500 310 500 350 Q 450 430 300 430 Z"
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="2"
                  strokeDasharray="5,3"
                />
                
                {/* Center line */}
                <line x1="300" y1="60" x2="300" y2="240" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6,3" />
                <line x1="300" y1="260" x2="300" y2="440" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6,3" />
                
                {/* Main Position Labels */}
                <text x="570" y="110" fontSize="13" fontWeight="bold" fill="#1f2937">Right</text>
                <text x="570" y="125" fontSize="13" fontWeight="bold" fill="#1f2937">Upper</text>
                
                <text x="10" y="110" fontSize="13" fontWeight="bold" fill="#1f2937">Left</text>
                <text x="10" y="125" fontSize="13" fontWeight="bold" fill="#1f2937">Upper</text>
                
                <text x="570" y="385" fontSize="13" fontWeight="bold" fill="#1f2937">Right</text>
                <text x="570" y="400" fontSize="13" fontWeight="bold" fill="#1f2937">Lower</text>
                
                <text x="10" y="385" fontSize="13" fontWeight="bold" fill="#1f2937">Left</text>
                <text x="10" y="400" fontSize="13" fontWeight="bold" fill="#1f2937">Lower</text>
                
                {/* Tooth Type Labels - Upper Right */}
                <LabelWithArrow x={520} y={100} text="Incisors" direction="right" targetX={353} targetY={100} />
                <LabelWithArrow x={520} y={128} text="Canine" direction="right" targetX={370} targetY={128} />
                <LabelWithArrow x={520} y={165} text="Premolars" direction="right" targetX={400} targetY={165} />
                <LabelWithArrow x={520} y={220} text={animalData.animal_type === 'dog' ? "Molars" : "Molar"} direction="right" targetX={450} targetY={220} />
                
                {/* Tooth Type Labels - Upper Left */}
                <LabelWithArrow x={80} y={100} text="Incisors" direction="left" targetX={195} targetY={100} />
                <LabelWithArrow x={80} y={128} text="Canine" direction="left" targetX={160} targetY={128} />
                <LabelWithArrow x={80} y={165} text="Premolars" direction="left" targetX={125} targetY={165} />
                <LabelWithArrow x={80} y={220} text={animalData.animal_type === 'dog' ? "Molars" : "Molar"} direction="left" targetX={82} targetY={220} />
                
                {/* Tooth Type Labels - Lower Right */}
                <LabelWithArrow x={520} y={280} text={animalData.animal_type === 'dog' ? "Molars" : "Molar"} direction="right" targetX={450} targetY={280} />
                <LabelWithArrow x={520} y={325} text="Premolars" direction="right" targetX={400} targetY={325} />
                <LabelWithArrow x={520} y={372} text="Canine" direction="right" targetX={370} targetY={372} />
                <LabelWithArrow x={520} y={400} text="Incisors" direction="right" targetX={353} targetY={400} />
                
                {/* Tooth Type Labels - Lower Left */}
                <LabelWithArrow x={80} y={280} text={animalData.animal_type === 'dog' ? "Molars" : "Molar"} direction="left" targetX={82} targetY={280} />
                <LabelWithArrow x={80} y={325} text="Premolars" direction="left" targetX={125} targetY={325} />
                <LabelWithArrow x={80} y={372} text="Canine" direction="left" targetX={160} targetY={372} />
                <LabelWithArrow x={80} y={400} text="Incisors" direction="left" targetX={195} targetY={400} />
                
                {/* Render all teeth - offset by +50 on X axis to center in new viewBox */}
                {[...currentChart.upper_right, ...currentChart.upper_left, ...currentChart.lower_right, ...currentChart.lower_left].map(tooth => (
                  <ToothSVG
                    key={tooth.id}
                    tooth={{...tooth, x: tooth.x + 50}}
                    status={teethStatus[tooth.id]}
                    onClick={() => handleToothClick(tooth.id)}
                    disabled={readOnly}
                  />
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 ml-2" />
            ביטול
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 ml-2" />
            שמור פרוטוקול
          </Button>
        </div>
      )}
    </form>
  );
}