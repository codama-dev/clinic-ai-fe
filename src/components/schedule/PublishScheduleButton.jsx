import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SchedulePublication } from "@/entities/all";
import { SendEmail } from "@/integrations/Core";
import { Mail, Send } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function PublishScheduleButton({ schedule, employees, weekStartDate, onPublished }) {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      const publicationDate = new Date().toISOString();
      const recipients = employees.filter(emp => emp.email).map(emp => emp.email);
      
      // Create publication record
      await SchedulePublication.create({
        week_start_date: format(weekStartDate, 'yyyy-MM-dd'),
        publication_date: publicationDate,
        is_published: true,
        notification_sent: true,
        recipients: recipients
      });

      // Update schedule with publication info
      await schedule.update({
        ...schedule,
        is_published: true,
        publication_date: publicationDate
      });

      // Send email to each employee
      const weekStr = format(weekStartDate, 'dd/MM/yyyy', { locale: he });
      const endWeekStr = format(new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy', { locale: he });
      
      for (const employee of employees) {
        if (employee.email) {
          const emailBody = `
שלום ${employee.name},

לוח המשמרות לשבוע ${weekStr} - ${endWeekStr} פורסם!

ניתן לצפות בלוח המשמרות במערכת LoVeT.

בברכה,
צוות LoVeT
          `;
          
          try {
            await SendEmail({
              to: employee.email,
              subject: `לוח משמרות שבוע ${weekStr} - LoVeT`,
              body: emailBody,
              from_name: "LoVeT מרפאה וטרינרית"
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${employee.email}:`, emailError);
          }
        }
      }
      
      onPublished();
    } catch (error) {
      console.error("Error publishing schedule:", error);
    }
    
    setIsPublishing(false);
  };

  return (
    <Button
      onClick={handlePublish}
      disabled={isPublishing}
      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg"
    >
      {isPublishing ? (
        <>
          <Send className="w-4 h-4 ml-2 animate-pulse" />
          מפרסם ושולח מיילים...
        </>
      ) : (
        <>
          <Mail className="w-4 h-4 ml-2" />
          פרסם ושלח למייל העובדים
        </>
      )}
    </Button>
  );
}