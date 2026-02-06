import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Helper function to format date for display
export const formatDateToDisplay = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

export default function DateInput({ id, value, onChange, required, disabled, className, placeholder }) {
  // Convert ISO date (YYYY-MM-DD) to Date object
  const dateValue = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  
  const handleSelect = (selectedDate) => {
    if (selectedDate) {
      // Convert Date object to ISO format (YYYY-MM-DD)
      const isoDate = format(selectedDate, 'yyyy-MM-dd');
      onChange(isoDate);
    } else {
      onChange('');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9 text-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="ml-2 h-3.5 w-3.5 opacity-50" />
          {value ? formatDateToDisplay(value) : (placeholder || "בחר תאריך")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          disabled={disabled}
          locale={he}
          dir="rtl"
          initialFocus
          className="text-sm"
        />
      </PopoverContent>
    </Popover>
  );
}