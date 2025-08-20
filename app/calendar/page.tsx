import { Suspense } from 'react';
import CalendarComponent from './CalendarComponent';

// ローディング中に表示するシンプルなUI
function CalendarSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">カレンダーを読み込んでいます...</p>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarComponent />
    </Suspense>
  );
}