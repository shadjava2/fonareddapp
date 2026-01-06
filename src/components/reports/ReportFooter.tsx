'use client';

import { reportClasses as rc } from '@/lib/reports/report-styles';
import { ReportFooterData } from '@/types/report';

export default function ReportFooter({ footer }: { footer: ReportFooterData }) {
  return (
    <div className={rc.footer}>
      <div>{footer.additionalInfo ?? ''}</div>
      <div>{footer.date}</div>
    </div>
  );
}
