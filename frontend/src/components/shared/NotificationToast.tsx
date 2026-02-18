'use client';

import { useEffect } from 'react';
import { X, Trophy, UserPlus } from 'lucide-react';
import { useSocialStore } from '@/stores/useSocialStore';
import { cn } from '@/lib/utils';

export function NotificationToast() {
  const { notifications, removeNotification } = useSocialStore();

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    const timer = setTimeout(() => removeNotification(latest.id), 5000);
    return () => clearTimeout(timer);
  }, [notifications, removeNotification]);

  // Only show the 3 most recent
  const visible = notifications.slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-40 space-y-2 w-72">
      {visible.map((notif, i) => (
        <div
          key={notif.id}
          className={cn(
            'flex items-start gap-3 p-3 bg-white rounded-lg shadow-lg border border-[#E5E7EB]',
            'animate-in slide-in-from-right-5 fade-in duration-300'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex-shrink-0 mt-0.5">
            {notif.type === 'stage_clear' ? (
              <Trophy className="h-4 w-4 text-[#FF9D00]" />
            ) : (
              <UserPlus className="h-4 w-4 text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#111827]">{notif.username}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{notif.message}</p>
          </div>
          <button
            onClick={() => removeNotification(notif.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
