import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeeklySchedule } from "@/entities/all";
import { RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

export default function GenerateScheduleButton({ 
  currentWeek, 
  employees, 
  constraints, 
  onScheduleGenerated,
  hasExistingSchedule 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generateOptimalSchedule = (employees, constraints) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shifts = ['morning', 'evening'];
    const schedule = {};
    
    // Initialize empty schedule
    days.forEach(day => {
      schedule[day] = { morning: [], evening: [] };
    });

    // Create constraint map for quick lookup
    const constraintMap = {};
    constraints.forEach(constraint => {
      const key = `${constraint.unavailable_day}-${constraint.unavailable_shift}`;
      if (!constraintMap[key]) constraintMap[key] = [];
      constraintMap[key].push(constraint.employee_name);
    });

    // Get available employees for each shift
    days.forEach(day => {
      shifts.forEach(shift => {
        const constraintKey = `${day}-${shift}`;
        const unavailableEmployees = constraintMap[constraintKey] || [];
        
        const availableEmployees = employees.filter(emp => 
          emp.is_active && !unavailableEmployees.includes(emp.name)
        );

        // Assign employees based on roles and day
        let assignedCount = 2;
        if (day === 'friday') assignedCount = 1; // Friday shorter shifts
        if (day === 'saturday') assignedCount = 1; // Saturday minimal staff
        
        const shuffled = [...availableEmployees].sort(() => 0.5 - Math.random());
        
        schedule[day][shift] = shuffled
          .slice(0, Math.min(assignedCount, shuffled.length))
          .map(emp => emp.name);
      });
    });

    return schedule;
  };

  const handleGenerateSchedule = async () => {
    if (employees.length === 0) {
      setError("לא ניתן ליצור לוח משמרות ללא עובדים במערכת");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const scheduleData = generateOptimalSchedule(employees, constraints);
      const weekStartDate = format(currentWeek, 'yyyy-MM-dd');

      // Check if schedule already exists
      const existingSchedule = await WeeklySchedule.filter({ week_start_date: weekStartDate });
      
      let newSchedule;
      if (existingSchedule.length > 0) {
        // Update existing schedule
        newSchedule = await WeeklySchedule.update(existingSchedule[0].id, {
          schedule_data: scheduleData,
          is_published: false // Reset publication status when updating
        });
      } else {
        // Create new schedule
        newSchedule = await WeeklySchedule.create({
          week_start_date: weekStartDate,
          schedule_data: scheduleData,
          is_published: false
        });
      }

      onScheduleGenerated(newSchedule);
    } catch (error) {
      console.error("Error generating schedule:", error);
      setError("שגיאה ביצירת לוח המשמרות. אנא נסו שוב.");
    }

    setIsGenerating(false);
  };

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Button
        onClick={handleGenerateSchedule}
        disabled={isGenerating}
        className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-lg"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
            יוצר לוח משמרות...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 ml-2" />
            {hasExistingSchedule ? 'עדכן לוח משמרות' : 'צור לוח משמרות'}
          </>
        )}
      </Button>
    </div>
  );
}