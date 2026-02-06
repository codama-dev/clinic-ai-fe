import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Clock, CheckCircle, XCircle } from "lucide-react";

export default function VacationSummary({ requests = [], isManager = false }) {
  if (!Array.isArray(requests)) return null;
  
  const pending = requests.filter(r => r?.status === 'pending').length;
  const approved = requests.filter(r => r?.status === 'approved').length;
  const rejected = requests.filter(r => r?.status === 'rejected').length;

  const allStats = [
    { title: "בקשות בהמתנה", value: pending, icon: Clock, color: "text-yellow-500", showForManager: true },
    { title: "בקשות שאושרו", value: approved, icon: CheckCircle, color: "text-green-500", showForManager: false },
    { title: "בקשות שנדחו", value: rejected, icon: XCircle, color: "text-red-500", showForManager: false },
    { title: "סה\"כ בקשות", value: requests.length, icon: Plane, color: "text-purple-500", showForManager: false },
  ];

  const statsToDisplay = isManager 
    ? allStats 
    : allStats.filter(stat => !stat.showForManager);

  return (
    <>
      {statsToDisplay.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}