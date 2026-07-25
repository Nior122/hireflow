'use client';

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportApplicationsCSV } from "@/actions/export";
import { toast } from "sonner";

export function ExportButton() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportApplicationsCSV();
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `hireflow-export-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported successfully");
      } else {
        toast.error(result.error ?? "Failed to export");
      }
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={exporting}>
      <Download className="h-4 w-4" />
      {exporting ? "Exporting..." : "Export"}
    </Button>
  );
}
