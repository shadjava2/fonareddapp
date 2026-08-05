import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 28,
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
  title: { fontSize: 14, fontWeight: 'bold', color: '#065f46', marginBottom: 3 },
  subtitle: { fontSize: 9, color: '#4b5563', marginBottom: 2 },
  meta: { fontSize: 7, color: '#6b7280' },
  note: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 5,
    paddingHorizontal: 3,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  cellDate: { width: '18%' },
  cellIn: { width: '16%' },
  cellOut: { width: '16%' },
  cellDur: { width: '14%' },
  cellRemark: { width: '36%' },
  th: { fontSize: 7, fontWeight: 'bold', color: '#374151' },
  td: { fontSize: 7, color: '#1f2937' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 28,
    right: 28,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export type MonthlyPresencePdfRow = {
  dateStr: string;
  entryStr: string;
  exitStr: string;
  durationStr: string;
  remark: string;
};

export type MonthlyPresencePdfDocumentProps = {
  logoSrc?: string;
  title: string;
  employeeLine: string;
  monthLine: string;
  noteLine: string;
  generatedStr: string;
  rows: MonthlyPresencePdfRow[];
};

const ROWS_PER_PAGE = 32;

function chunkRows<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out.length ? out : [[]];
}

export function MonthlyPresencePdfDocument({
  logoSrc,
  title,
  employeeLine,
  monthLine,
  noteLine,
  generatedStr,
  rows,
}: MonthlyPresencePdfDocumentProps) {
  const pages = chunkRows(rows, ROWS_PER_PAGE);

  return (
    <Document>
      {pages.map((pageRows, pi) => (
        <Page key={`mp-${pi}`} size="A4" style={styles.page}>
          {pi === 0 ? (
            <View style={styles.headerRow}>
              {logoSrc ? (
                <Image src={logoSrc} style={styles.logo} />
              ) : (
                <View style={{ width: 64 }} />
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{employeeLine}</Text>
                <Text style={styles.subtitle}>{monthLine}</Text>
                <Text style={styles.meta}>Généré le {generatedStr}</Text>
              </View>
            </View>
          ) : (
            <Text style={{ ...styles.subtitle, marginBottom: 8 }}>
              {title} (suite — page {pi + 1}/{pages.length})
            </Text>
          )}

          {pi === 0 ? <Text style={styles.note}>{noteLine}</Text> : null}

          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.cellDate]}>Jour</Text>
            <Text style={[styles.th, styles.cellIn]}>Entrée</Text>
            <Text style={[styles.th, styles.cellOut]}>Sortie</Text>
            <Text style={[styles.th, styles.cellDur]}>Durée</Text>
            <Text style={[styles.th, styles.cellRemark]}>Remarque</Text>
          </View>

          {pageRows.map((r) => (
            <View key={r.dateStr} style={styles.row} wrap={false}>
              <Text style={[styles.td, styles.cellDate]}>{r.dateStr}</Text>
              <Text style={[styles.td, styles.cellIn]}>{r.entryStr}</Text>
              <Text style={[styles.td, styles.cellOut]}>{r.exitStr}</Text>
              <Text style={[styles.td, styles.cellDur]}>{r.durationStr}</Text>
              <Text style={[styles.td, styles.cellRemark]}>{r.remark}</Text>
            </View>
          ))}

          <Text style={styles.footer} fixed>
            Fonds National REDD — Présence mensuelle — page {pi + 1}/{pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
