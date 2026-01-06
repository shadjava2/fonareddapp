'use client';

import { reportClasses as rc } from '@/lib/reports/report-styles';
import { ReportData } from '@/types/report';
import ReportContent from './ReportContent';
import ReportFooter from './ReportFooter';
import ReportHeader from './ReportHeader';

export default function ReportViewer({ data }: { data: ReportData }) {
  return (
    <div className={`${rc.shell} ${rc.pagePadding}`}>
      <div className="mx-auto max-w-6xl">
        <div className={rc.screenOnly}>
          <ReportHeader header={data.header} />
        </div>

        <ReportContent content={data.content} />

        <div className={rc.screenOnly}>
          <ReportFooter footer={data.footer} />
        </div>
      </div>
    </div>
  );
}
