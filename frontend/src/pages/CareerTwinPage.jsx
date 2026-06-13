import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import CareerTwinCard from '../components/dashboard/CareerTwinCard';

export default function CareerTwinPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Career Twin Intelligence</h1>
          <p className="text-white/50 text-sm mt-1">See how you match up against successful professionals in your target role.</p>
        </div>
        
        {/* Full Page View of the component */}
        <div className="w-full">
           <CareerTwinCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
