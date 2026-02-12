'use client';

import { useCallback } from 'react';
import type { FortnightlyReport } from '@solis/shared';
import { narrativesToCSV, reportToJSON, downloadFile } from '@/lib/export';

export function ExportButtons({ report, date }: { report: FortnightlyReport; date: string }) {
  const handleCSV = useCallback(() => {
    const csv = narrativesToCSV(report.narratives);
    downloadFile(csv, `solis-narratives-${date}.csv`, 'text/csv');
  }, [report, date]);

  const handleJSON = useCallback(() => {
    const json = reportToJSON(report);
    downloadFile(json, `solis-report-${date}.json`, 'application/json');
  }, [report, date]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCSV}
        className="text-sol-muted hover:text-white text-sm transition-colors cursor-pointer"
      >
        Export CSV
      </button>
      <span className="text-sol-border">|</span>
      <button
        onClick={handleJSON}
        className="text-sol-muted hover:text-white text-sm transition-colors cursor-pointer"
      >
        Export JSON
      </button>
    </div>
  );
}
