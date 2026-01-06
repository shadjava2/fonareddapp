'use client';

import { reportClasses as rc } from '@/lib/reports/report-styles';
import { toPairs } from '@/lib/reports/report-utils';
import { ReportHeaderData } from '@/types/report';
import Image from 'next/image';

export default function ReportHeader({ header }: { header: ReportHeaderData }) {
  const logo = header.logo || '/logo.png';
  const meta = toPairs(header.metadata);

  return (
    <div className={rc.header}>
      <div className={rc.headerRow}>
        <div className={rc.headerLeft}>
          <Image
            src={logo}
            alt="Logo"
            width={200}
            height={80}
            className="h-16 w-auto"
          />
          <div>
            <div className={rc.headerTitle}>{header.title}</div>
            {header.subtitle ? (
              <div className={rc.headerSubtitle}>{header.subtitle}</div>
            ) : null}
          </div>
        </div>
        <div className="text-xs text-gray-600">
          {new Date().toLocaleString()}
        </div>
      </div>

      {meta.length > 0 && (
        <div className={rc.metaGrid}>
          {meta.map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="font-medium">{k}</span>
              <span className="text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
