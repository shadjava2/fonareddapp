import PersonnelLayout from '@/components/layout/PersonnelLayout';
import React, { useState } from 'react';

const HikvisionIngestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runIngestion = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const res = await fetch('/api/hikvision/ingest');
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Echec ingestion');
      }
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PersonnelLayout
      title="Hikvision - Ingestion"
      description="Ingestion manuelle des evenements Hikvision"
    >
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-semibold mb-4">
            Hikvision - Ingestion des evenements
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Declenche manuellement l'ingestion ISAPI du terminal (192.168.10.75)
            et insere les nouveaux evenements dans la base MySQL.
          </p>
          <button
            onClick={runIngestion}
            disabled={loading}
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Ingestion en cours...' : "Lancer l'ingestion"}
          </button>

          {error && (
            <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="mt-4 p-3 rounded bg-emerald-50 text-emerald-800 text-sm">
              Insertion: {result.inserted} evenement(s)
              <div className="text-gray-600">
                Fenetre: {result.window?.beginISO} - {result.window?.endISO}
              </div>
            </div>
          )}
        </div>
      </div>
    </PersonnelLayout>
  );
};

export default HikvisionIngestPage;
