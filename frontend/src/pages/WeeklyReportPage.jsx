import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import WeeklyReportCard from '../components/dashboard/WeeklyReportCard';

export default function WeeklyReportPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Weekly AI Report</h1>
          <p className="text-white/50 text-sm mt-1">Review your progress, highlights, and missed goals from the last 7 days.</p>
        </div>
        
        {/* Full Page View of the component */}
        <div className="w-full">
           <WeeklyReportCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
