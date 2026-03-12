import React from "react";
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";

import type { TimelineEvent } from "../types";

interface TimelineProps {
  events: TimelineEvent[];
}

const Timeline: React.FC<TimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">Nog geen workflowgeschiedenis beschikbaar.</p>;
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`
                    h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                    ${event.kind === 'system' ? 'bg-blue-50 text-blue-600' : event.kind === 'sync' ? 'bg-violet-50 text-violet-600' : 'bg-green-50 text-green-600'}
                  `}>
                    {event.kind === "system" ? (
                      <Clock size={16} />
                    ) : event.kind === "sync" ? (
                      <RefreshCw size={16} />
                    ) : event.status === "IRREPARABEL" || event.status === "GEANNULEERD" ? (
                      <AlertCircle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{event.status}</p>
                    <p className="text-sm text-gray-500">{event.message}</p>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-gray-400">
                    {new Date(event.timestamp).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Timeline;
