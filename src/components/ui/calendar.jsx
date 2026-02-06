import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  const [displayMonth, setDisplayMonth] = React.useState(props.selected || new Date());

  const handlePreviousYear = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear() - 1, displayMonth.getMonth()));
  };

  const handleNextYear = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear() + 1, displayMonth.getMonth()));
  };

  const handlePreviousMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center px-3 gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handlePreviousYear}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium px-3 min-w-[60px] text-center">{displayMonth.getFullYear()}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleNextYear}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-center px-3 gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handlePreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium px-3 min-w-[80px] text-center">
          {displayMonth.toLocaleDateString('he-IL', { month: 'long' })}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "hidden",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: cn(
            "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
            props.mode === "range"
              ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              : "[&:has([aria-selected])]:rounded-md"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_start: "day-range-start",
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          ),
        }}
        {...props} />
    </div>
  );
}
Calendar.displayName = "Calendar"

export { Calendar }