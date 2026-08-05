import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type {
  DayPerformanceRow,
  EmployeePerformanceReport,
  MonthPerformanceSummary,
  PresenceRulesConfig,
} from '@/lib/presence/attendance-performance';

/**
 * Pagination naturelle (type Word) via <Page wrap> :
 * le contenu remplit la page, puis continue automatiquement.
 * Pas de découpage artificiel ni compression forcée.
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 10,
  },
  logo: { width: 64, height: 24, marginRight: 10 },
  titleBlock: { flex: 1 },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 3,
  },
  subtitle: { fontSize: 9, color: '#374151', marginBottom: 2 },
  meta: { fontSize: 7, color: '#6b7280' },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  kpi: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
    paddingVertical: 6,
    paddingHorizontal: 5,
    marginRight: 5,
  },
  kpiLast: { marginRight: 0 },
  kpiLabel: { fontSize: 6, color: '#047857', marginBottom: 2 },
  kpiValue: { fontSize: 11, fontWeight: 'bold', color: '#064e3b' },
  note: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 6,
    fontStyle: 'italic',
    lineHeight: 1.35,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderWidth: 0.5,
    borderColor: '#9ca3af',
    marginRight: 4,
  },
  legendText: { fontSize: 7, color: '#4b5563' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
    paddingVertical: 5,
    paddingHorizontal: 3,
  },
  /** Bandeau suite en absolute : n’occupe pas de place en page 1. */
  continuation: {
    position: 'absolute',
    top: 14,
    left: 28,
    right: 28,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#065f46',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 3,
    backgroundColor: '#ffffff',
  },
  rowMuted: { backgroundColor: '#e5e7eb' },
  rowOrange: { backgroundColor: '#fff7ed' },
  rowBlue: { backgroundColor: '#eff6ff' },
  rowRed: { backgroundColor: '#fef2f2' },
  th: { fontSize: 7, fontWeight: 'bold', color: '#065f46' },
  td: { fontSize: 7, color: '#1f2937' },
  tdOrange: { color: '#c2410c', fontWeight: 'bold' },
  tdBlue: { color: '#1d4ed8', fontWeight: 'bold' },
  tdGray: { color: '#4b5563' },
  tdRed: { color: '#b91c1c', fontWeight: 'bold' },
  cDay: { width: '11%' },
  cIn: { width: '8%' },
  cOut: { width: '8%' },
  cDur: { width: '9%' },
  cArr: { width: '12%' },
  cDep: { width: '14%' },
  cMis: { width: '12%' },
  cRem: { width: '26%' },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

function rowTone(r: DayPerformanceRow) {
  if (!r.isWorkingDay) return 'muted' as const;
  if (r.arrivalStatus === 'absent') return 'red' as const;
  if (
    r.arrivalStatus === 'conge' ||
    r.arrivalStatus === 'conge_non_justifie'
  ) {
    return 'blue' as const;
  }
  if (
    r.arrivalStatus === 'en_retard' ||
    r.departureStatus === 'sortie_tardive'
  ) {
    return 'orange' as const;
  }
  if (r.departureStatus === 'sortie_anticipee') return 'blue' as const;
  if (r.arrivalStatus === 'entree_anticipee') return 'blue' as const;
  return 'normal' as const;
}

function KpiBox({
  label,
  value,
  last,
}: Readonly<{ label: string; value: string; last?: boolean }>) {
  return (
    <View style={[styles.kpi, last ? styles.kpiLast : undefined]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function LegendItem({
  color,
  label,
}: Readonly<{ color: string; label: string }>) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function DayTableHeader() {
  return (
    <View style={styles.tableHeader} wrap={false}>
      <Text style={[styles.th, styles.cDay]}>Jour</Text>
      <Text style={[styles.th, styles.cIn]}>Entrée</Text>
      <Text style={[styles.th, styles.cOut]}>Sortie</Text>
      <Text style={[styles.th, styles.cDur]}>Durée</Text>
      <Text style={[styles.th, styles.cArr]}>Arrivée</Text>
      <Text style={[styles.th, styles.cDep]}>Départ</Text>
      <Text style={[styles.th, styles.cMis]}>Mission</Text>
      <Text style={[styles.th, styles.cRem]}>Remarque</Text>
    </View>
  );
}

function DayRow({ r }: Readonly<{ r: DayPerformanceRow }>) {
  const tone = rowTone(r);
  return (
    <View
      style={[
        styles.row,
        tone === 'muted' && styles.rowMuted,
        tone === 'red' && styles.rowRed,
        tone === 'orange' && styles.rowOrange,
        tone === 'blue' && styles.rowBlue,
      ]}
      wrap={false}
    >
      <Text style={[styles.td, styles.cDay, tone === 'muted' && styles.tdGray]}>
        {r.dayLabel}
      </Text>
      <Text style={[styles.td, styles.cIn, tone === 'muted' && styles.tdGray]}>
        {r.entryStr}
      </Text>
      <Text style={[styles.td, styles.cOut, tone === 'muted' && styles.tdGray]}>
        {r.exitStr}
      </Text>
      <Text style={[styles.td, styles.cDur, tone === 'muted' && styles.tdGray]}>
        {r.durationStr}
      </Text>
      <Text
        style={[
          styles.td,
          styles.cArr,
          tone === 'orange' &&
            r.arrivalStatus === 'en_retard' &&
            styles.tdOrange,
          r.arrivalStatus === 'entree_anticipee' && styles.tdBlue,
          tone === 'red' && styles.tdRed,
          tone === 'muted' && styles.tdGray,
        ]}
      >
        {r.arrivalLabel}
      </Text>
      <Text
        style={[
          styles.td,
          styles.cDep,
          r.departureStatus === 'sortie_tardive' && styles.tdOrange,
          r.departureStatus === 'sortie_anticipee' && styles.tdBlue,
          tone === 'muted' && styles.tdGray,
        ]}
      >
        {r.departureLabel}
      </Text>
      <Text style={[styles.td, styles.cMis, tone === 'muted' && styles.tdGray]}>
        {r.hasMission ? r.missionLabel : '—'}
      </Text>
      <Text
        style={[
          styles.td,
          styles.cRem,
          tone === 'orange' && styles.tdOrange,
          tone === 'blue' && styles.tdBlue,
          tone === 'red' && styles.tdRed,
          tone === 'muted' && styles.tdGray,
        ]}
      >
        {r.remark}
      </Text>
    </View>
  );
}

function ReportIntro({
  report,
  month,
  rules,
  logoSrc,
  generatedStr,
}: Readonly<{
  report: EmployeePerformanceReport;
  month: MonthPerformanceSummary;
  rules: PresenceRulesConfig;
  logoSrc?: string;
  generatedStr: string;
}>) {
  return (
    <View wrap={false}>
      <View style={styles.headerRow}>
        {logoSrc ? (
          <Image src={logoSrc} style={styles.logo} />
        ) : (
          <View style={{ width: 64 }} />
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Rapport de performance — présence</Text>
          <Text style={styles.subtitle}>
            {report.employeeName} (ID {report.employeeNo}) — {report.department}
          </Text>
          {(report.fonction || report.role || report.services) && (
            <Text style={styles.meta}>
              {[
                report.fonction ? `Fonction : ${report.fonction}` : '',
                report.role ? `Rôle : ${report.role}` : '',
                report.services ? `Service : ${report.services}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
          <Text style={styles.subtitle}>{month.monthLabel}</Text>
          <Text style={styles.meta}>Généré le {generatedStr}</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <KpiBox label="Jours ouvrés" value={String(month.workingDays)} />
        <KpiBox label="À l’heure" value={String(month.onTime)} />
        <KpiBox label="En retard" value={String(month.late)} />
        <KpiBox label="Absents" value={String(month.absent)} />
        <KpiBox label="Sortie tôt" value={String(month.earlyLeave)} />
        <KpiBox label="Sortie tard" value={String(month.lateExit)} last />
      </View>
      <View style={styles.kpiRow}>
        <KpiBox label="Jours mission" value={String(month.missionDays)} />
        <KpiBox
          label="Note moyenne"
          value={
            month.averageScore != null ? String(month.averageScore) : '—'
          }
        />
        <KpiBox label="Statut" value={month.statusLabel} last />
      </View>

      <Text style={styles.note}>
        Entrée : avant {rules.checkin_valid_from} = Entrée anticipée ; à l’heure{' '}
        {rules.checkin_valid_from}–{rules.start_work_time}, retard{' '}
        {rules.late_from}–{rules.late_until}, absent dès {rules.checkin_valid_to}.
        Sortie : avant {rules.end_work_time} = Sortie anticipée ; fenêtre{' '}
        {rules.checkout_valid_from}–{rules.checkout_valid_to}. First In & Last
        Out. Mission = présence.
      </Text>

      <View style={styles.legendRow}>
        <LegendItem color="#ffffff" label="Ligne normale" />
        <LegendItem color="#fef2f2" label="Absent" />
        <LegendItem color="#e5e7eb" label="Week-end / non ouvré" />
        <LegendItem color="#fff7ed" label="Retard ou sortie tardive" />
        <LegendItem color="#eff6ff" label="Sortie tôt / avance signalée" />
      </View>
    </View>
  );
}

function EmployeeMonthPage({
  report,
  month,
  rules,
  logoSrc,
  generatedStr,
}: Readonly<{
  report: EmployeePerformanceReport;
  month: MonthPerformanceSummary;
  rules: PresenceRulesConfig;
  logoSrc?: string;
  generatedStr: string;
}>) {
  return (
    <Page size="A4" style={styles.page} wrap>
      {/* Titre de suite — visible seulement à partir de la page 2 */}
      <Text
        style={styles.continuation}
        fixed
        render={({ pageNumber }) =>
          pageNumber > 1
            ? `${report.employeeName} — ${month.monthLabel} (suite)`
            : ''
        }
      />

      <ReportIntro
        report={report}
        month={month}
        rules={rules}
        logoSrc={logoSrc}
        generatedStr={generatedStr}
      />

      <DayTableHeader />

      {month.days.map((r) => (
        <DayRow key={r.date} r={r} />
      ))}

      <Text
        style={styles.footer}
        fixed
        render={({ pageNumber, totalPages }) =>
          `Fonds National REDD — Performance présence — page ${pageNumber}/${totalPages}`
        }
      />
    </Page>
  );
}

export type MonthlyPerformancePdfDocumentProps = {
  logoSrc?: string;
  generatedStr: string;
  reports: EmployeePerformanceReport[];
  rules: PresenceRulesConfig;
};

export function MonthlyPerformancePdfDocument({
  logoSrc,
  generatedStr,
  reports,
  rules,
}: Readonly<MonthlyPerformancePdfDocumentProps>) {
  const sections: Array<{
    report: EmployeePerformanceReport;
    month: MonthPerformanceSummary;
  }> = [];

  for (const report of reports) {
    for (const month of report.months) {
      sections.push({ report, month });
    }
  }

  return (
    <Document>
      {sections.length === 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Rapport de performance — présence</Text>
          <Text style={styles.subtitle}>Aucune donnée pour la période.</Text>
          <Text style={styles.footer}>Fonds National REDD — page 1/1</Text>
        </Page>
      ) : (
        sections.map((sec) => (
          <EmployeeMonthPage
            key={`${sec.report.employeeNo}-${sec.month.year}-${sec.month.month}`}
            report={sec.report}
            month={sec.month}
            rules={rules}
            logoSrc={logoSrc}
            generatedStr={generatedStr}
          />
        ))
      )}
    </Document>
  );
}
