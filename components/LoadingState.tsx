import React from "react";

export function LoadingCard() {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-slate-100 rounded-lg w-1/3"></div>
        <div className="h-5 bg-slate-100 rounded-full w-16"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-slate-100 rounded-md w-3/4"></div>
        <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
      </div>
      <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex justify-between items-center">
        <div className="h-4 bg-slate-100 rounded-md w-24"></div>
        <div className="h-7 bg-slate-100 rounded-lg w-20"></div>
      </div>
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-slate-700">
      <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin"></div>
      <p className="text-slate-500 text-xs font-medium tracking-wide uppercase">Connecting to EduSphere AI Engine...</p>
    </div>
  );
}

