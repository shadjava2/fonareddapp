'use client';

import Dialog from '@/components/ui/Dialog';
import { useToast } from '@/hooks/useToast';
import { downloadReportPdf } from '@/lib/reports/report-generator';
import { reportClasses as rc } from '@/lib/reports/report-styles';
import { ReportData, ReportType } from '@/types/report';
import { useState } from 'react';
import ReportViewer from './ReportViewer';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
  reportType: ReportType;
  title: string;
};

export default function ReportModal({
  isOpen,
  onClose,
  reportData,
  reportType,
  title,
}: Props) {
  const { showError, showSuccess } = useToast();
  const [busy, setBusy] = useState(false);

  const handlePrint = async () => {
    try {
      // impression native, on masque les boutons via .print:hidden
      window.print();
    } catch (e: any) {
      showError(e?.message || 'Erreur impression');
    }
  };

  const handleDownload = async () => {
    if (!reportData) return;
    try {
      setBusy(true);
      await downloadReportPdf(reportData);
      showSuccess('PDF généré');
    } catch (e: any) {
      showError(e?.message || 'Erreur génération PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="max-h-[80vh] overflow-y-auto">
        {reportData ? (
          <ReportViewer data={reportData} />
        ) : (
          <div className="p-6 text-sm text-gray-500">Chargement…</div>
        )}
      </div>

      <div className={rc.actionsBar}>
        <button
          onClick={handlePrint}
          className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
        >
          Imprimer
        </button>

        <button
          onClick={handleDownload}
          disabled={busy || !reportData}
          className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? 'Génération…' : 'Télécharger PDF'}
        </button>

        <button
          onClick={onClose}
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
        >
          Fermer
        </button>
      </div>
    </Dialog>
  );
}
