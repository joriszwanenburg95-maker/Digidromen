import React from "react";

import { usePortalContext } from "../lib/portal";

const Settings: React.FC = () => {
  const { user, organization, snapshot } = usePortalContext();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Instellingen</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        <div className="p-6">
          <h3 className="font-bold text-gray-800 mb-4">Mijn Profiel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Volledige Naam</label>
              <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">{user?.name}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Email Adres</label>
              <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">{user?.email}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Organisatie</label>
              <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">{organization?.name}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Schema versie</label>
              <p className="p-2 bg-gray-50 border border-gray-100 rounded text-sm text-gray-700">{snapshot.data.schemaVersion}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-bold text-gray-800 mb-4">Notificatie Voorkeuren</h3>
          <div className="space-y-3">
            {[
              'Email bij statuswijziging bestelling',
              'Email bij nieuwe reparatie update',
              'Melding bij CRM sync fouten',
            ].map((pref, i) => (
              <div key={i} className="flex items-center">
                <input type="checkbox" id={`pref-${i}`} className="w-4 h-4 text-digidromen-primary border-gray-300 rounded focus:ring-digidromen-primary" defaultChecked />
                <label htmlFor={`pref-${i}`} className="ml-3 text-sm text-gray-700">{pref}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex justify-end">
          <button className="px-6 py-2 bg-digidromen-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            Wijzigingen Opslaan
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
