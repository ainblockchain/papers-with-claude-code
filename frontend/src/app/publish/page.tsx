'use client';

import { Upload } from 'lucide-react';

export default function PublishPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      <div className="flex flex-col items-center justify-center py-24">
        <Upload className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-[#111827]">Publish</h1>
        <p className="mt-2 text-[#6B7280] text-center max-w-sm">
          Paper publishing feature is coming soon. Stay tuned for updates.
        </p>
        <div className="mt-6 px-4 py-2 bg-gray-100 rounded-full text-sm text-[#6B7280]">
          To be continued
        </div>
      </div>
    </div>
  );
}
