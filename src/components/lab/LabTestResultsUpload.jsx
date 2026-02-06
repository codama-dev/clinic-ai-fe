import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Camera, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function LabTestResultsUpload({ labTest, labTestType, onResultsUpdated, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [results, setResults] = useState(labTest.results || {});
  const [resultsFileUrl, setResultsFileUrl] = useState(labTest.results_file_url || '');

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setResultsFileUrl(file_url);
      
      // If this is a typed test with parameters, try to extract values
      if (labTestType?.parameters && labTestType.parameters.length > 0) {
        setExtracting(true);
        
        const parametersDescription = labTestType.parameters.map(p => 
          `${p.name} (${p.unit || 'ללא יחידה'}${p.min_normal && p.max_normal ? `, טווח תקין: ${p.min_normal}-${p.max_normal}` : ''})`
        ).join('\n');
        
        const prompt = `נא לחלץ את ערכי הבדיקה הבאים מהתמונה:
${parametersDescription}

החזר את הנתונים בפורמט JSON עם שמות הפרמטרים כמפתחות והערכים המספריים בלבד (ללא יחידות).
אם פרמטר לא נמצא בתמונה, השאר אותו ריק.`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          file_urls: [file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              results: {
                type: 'object',
                additionalProperties: { type: 'string' }
              }
            }
          }
        });
        
        if (response && response.results) {
          setResults(response.results);
          toast.success('הערכים חולצו בהצלחה מהתמונה');
        }
        
        setExtracting(false);
      } else {
        toast.success('הקובץ הועלה בהצלחה');
      }
      
      setUploading(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('שגיאה בהעלאת הקובץ');
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleResultChange = (paramName, value) => {
    setResults(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleSave = async () => {
    try {
      await base44.entities.LabTest.update(labTest.id, {
        results: results,
        results_file_url: resultsFileUrl,
        status: Object.keys(results).length > 0 ? 'completed' : 'pending'
      });
      toast.success('התוצאות נשמרו בהצלחה');
      onResultsUpdated();
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('שגיאה בשמירת התוצאות');
    }
  };

  const isOutOfRange = (value, min, max) => {
    if (!value || !min || !max) return false;
    const numValue = parseFloat(value);
    return !isNaN(numValue) && (numValue < parseFloat(min) || numValue > parseFloat(max));
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold">
            {labTestType ? 'העלאת תוצאות לחילוץ אוטומטי' : 'העלאת קובץ תוצאות'}
          </Label>
          {(uploading || extracting) && (
            <span className="text-xs text-blue-600 animate-pulse flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {extracting ? 'מחלץ נתונים...' : 'מעלה...'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Label htmlFor="lab-file-upload" className="cursor-pointer flex-1">
            <div className="border rounded-lg p-3 text-center hover:bg-white transition-colors">
              <Upload className="w-5 h-5 mx-auto mb-1 text-gray-500" />
              <span className="text-xs text-gray-600">העלה קובץ</span>
            </div>
          </Label>
          <Input
            id="lab-file-upload"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            disabled={uploading || extracting}
          />
          <Label htmlFor="lab-camera-upload" className="cursor-pointer flex-1">
            <div className="border rounded-lg p-3 text-center hover:bg-white transition-colors">
              <Camera className="w-5 h-5 mx-auto mb-1 text-gray-500" />
              <span className="text-xs text-gray-600">צלם תמונה</span>
            </div>
          </Label>
          <Input
            id="lab-camera-upload"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            disabled={uploading || extracting}
          />
        </div>
        {resultsFileUrl && (
          <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700 flex items-center justify-between">
            <span>✓ הקובץ הועלה בהצלחה</span>
            <a href={resultsFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              צפה בקובץ
            </a>
          </div>
        )}
      </div>

      {labTestType?.parameters && labTestType.parameters.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">ערכי הפרמטרים (ניתן לעריכה)</h4>
          {labTestType.parameters.map((param, idx) => {
            const value = results[param.name] || '';
            const hasRange = param.min_normal !== undefined && param.max_normal !== undefined;
            const outOfRange = isOutOfRange(value, param.min_normal, param.max_normal);
            
            return (
              <div key={idx} className={`p-3 rounded-lg border ${outOfRange ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <Label className="flex-1 text-sm">
                    {param.name}
                    {param.unit && <span className="text-gray-500 text-xs ml-1">({param.unit})</span>}
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={value}
                    onChange={(e) => handleResultChange(param.name, e.target.value)}
                    placeholder="ערך"
                    className={`w-28 text-center font-semibold text-sm ${outOfRange ? 'border-red-500 text-red-700' : ''}`}
                  />
                </div>
                {hasRange && (
                  <div className="mt-1 text-xs text-gray-500">
                    טווח תקין: {param.min_normal} - {param.max_normal}
                    {outOfRange && <span className="text-red-600 font-semibold mr-2">⚠ חריג</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="button" onClick={handleSave}>
          <Save className="w-4 h-4 ml-2" />
          שמור תוצאות
        </Button>
      </div>
    </div>
  );
}