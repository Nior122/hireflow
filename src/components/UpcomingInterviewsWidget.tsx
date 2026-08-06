'use client';

import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UpcomingInterviewsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" /> 
          Upcoming Interviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
          No upcoming interviews this week.
        </div>
      </CardContent>
    </Card>
  );
}
