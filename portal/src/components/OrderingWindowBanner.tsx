import React from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { useOrderingWindow } from '../hooks/useOrderingWindow';
import { useAuth } from '../context/AuthContext';

export const OrderingWindowBanner: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading } = useOrderingWindow();

  // Alleen tonen voor help_org
  if (user?.role !== 'help_org') return null;
  if (isLoading || !data) return null;
  if (data.bypassActive) return null;

  if (data.isOpen) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>
          <strong>Bestelvenster is open</strong>
          {data.forcedOpenHelpOrg ? (
            <>
              {" "}
              — tijdelijk geopend door Digidromen (ook buiten de vaste dagen). Je kunt nu bestellen.
            </>
          ) : (
            <>
              {" "}
              — je kunt bestellen tot en met dag {data.closeDay} van deze maand.
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <CalendarClock size={16} className="shrink-0" />
      <span>
        <strong>Bestellen is momenteel niet mogelijk.</strong>{' '}
        Het bestelvenster opent op {data.nextOpenDate} (dag {data.openDay} t/m {data.closeDay} van de maand).
      </span>
    </div>
  );
};
