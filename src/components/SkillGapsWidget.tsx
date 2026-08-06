'use client';

import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SkillGapsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-500" /> 
          Skill Gap Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
          No skill gap data available. Add more job applications to generate insights.
        </div>
      </CardContent>
    </Card>
  );
}
