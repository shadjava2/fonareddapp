import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { AttendanceReportRow } from '@/lib/hikvision/attendance-report-data';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 12,
  },
  logo: { width: 72, height: 28, marginRight: 12 },
  titleBlock: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#065f46', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#4b5563', marginBottom: 2 },
  meta: { fontSize: 8, color: '#6b7280' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  cellId: { width: '9%' },
  cellName: { width: '18%' },
  cellDept: { width: '12%' },
  cellTime: { width: '16%' },
  cellStat: { width: '12%' },
  cellCp: { width: '18%' },
  cellCustom: { width: '15%' },
  th: { fontSize: 7, fontWeight: 'bold', color: '#374151' },
  td: { fontSize: 7, color: '#1f2937' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export type AttendancePdfDocumentProps = {
  logoSrc?: string;
  title: string;
  periodLine: string;
  filtersLine: string;
  generatedStr: string;
  rows: AttendanceReportRow[];
  totalInDb: number;
  /** Nombre de lignes incluses dans ce PDF (peut être plafonné) */
  rowCountInPdf: number;
};

const ROWS_PER_PAGE = 28;

function chunkRows<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out.length ? out : [[]];
}

export function AttendancePdfDocument({
  logoSrc,
  title,
  periodLine,
  filtersLine,
  generatedStr,
  rows,
  totalInDb,
  rowCountInPdf,
}: AttendancePdfDocumentProps) {
  const pages = chunkRows(rows, ROWS_PER_PAGE);

  return (
    <Document>
      {pages.map((pageRows, pi) => (
        <Page key={pi} size="A4" style={styles.page}>
          {pi === 0 ? (
            <View style={styles.headerRow}>
              {logoSrc ? (
                <Image src={logoSrc} style={styles.logo} />
              ) : (
                <View style={{ width: 72 }} />
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{periodLine}</Text>
                <Text style={styles.subtitle}>{filtersLine}</Text>
                <Text style={styles.meta}>
                  Généré le {generatedStr} — {rowCountInPdf} ligne(s) dans ce PDF
                  {totalInDb > rowCountInPdf
                    ? ` (total filtré en base : ${totalInDb})`
                    : ''}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ ...styles.subtitle, marginBottom: 8 }}>
              {title} (suite — page {pi + 1}/{pages.length})
            </Text>
          )}

          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.cellId]}>ID</Text>
            <Text style={[styles.th, styles.cellName]}>Nom</Text>
            <Text style={[styles.th, styles.cellDept]}>Dept.</Text>
            <Text style={[styles.th, styles.cellTime]}>Date/heure</Text>
            <Text style={[styles.th, styles.cellStat]}>Statut</Text>
            <Text style={[styles.th, styles.cellCp]}>Lecteur</Text>
            <Text style={[styles.th, styles.cellCustom]}>Sens</Text>
          </View>

          {pageRows.map((r) => (
            <View key={r.id} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.cellId]}>{r.personId}</Text>
              <Text style={[styles.td, styles.cellName]}>{r.name}</Text>
              <Text style={[styles.td, styles.cellDept]}>{r.department}</Text>
              <Text style={[styles.td, styles.cellTime]}>
                {new Date(r.time).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={[styles.td, styles.cellStat]}>
                {r.attendanceStatus}
                {r.isManual ? ' (manuel)' : ''}
              </Text>
              <Text style={[styles.td, styles.cellCp]}>
                {r.isManual ? 'Saisie manuelle' : r.attendanceCheckPoint}
              </Text>
              <Text style={[styles.td, styles.cellCustom]}>{r.custom}</Text>
            </View>
          ))}

          <Text
            style={styles.footer}
            fixed
          >
            Fonds National REDD — Rapport de pointage — page {pi + 1}/{pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
