'use client';

import { reportClasses as rc } from '@/lib/reports/report-styles';
import { TableHtml } from '@/lib/reports/report-utils';
import { ReportContentData } from '@/types/report';

export default function ReportContent({
  content,
}: {
  content: ReportContentData;
}) {
  return (
    <div className={rc.content}>
      {content.sections.map((s, i) => (
        <section key={i} className={rc.section}>
          <h3 className={rc.sectionTitle}>{s.title}</h3>
          {typeof s.content === 'string' ? (
            <p className="text-sm leading-6 text-gray-800">{s.content}</p>
          ) : (
            s.content
          )}
        </section>
      ))}

      {(content.tables || []).map((t, i) => (
        <div key={i} className={rc.tableWrap}>
          <TableHtml table={t} />
        </div>
      ))}
    </div>
  );
}
