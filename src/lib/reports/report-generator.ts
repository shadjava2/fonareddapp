// Pont unique vers @react-pdf/renderer en s'appuyant sur les utilitaires existants.

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { ReportData } from '@/types/report';
import {
  generatePDFBlob,
  downloadPDF,
  formatDatePDF,
} from '@/lib/pdf';
import { fileNameFrom } from './report-utils';

// Styles PDF cohérents avec la palette verte
const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 48,
    marginRight: 10,
  },
  titleWrap: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 10,
    color: '#4b5563',
  },
  metaGrid: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    width: '50%',
    fontSize: 9,
    color: '#374151',
    marginBottom: 2,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
  },
  p: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    margin: 0,
    padding: 6,
    fontSize: 10,
    fontWeight: 600,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    margin: 0,
    padding: 6,
    fontSize: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footer: {
    borderTopWidth: 2,
    borderTopColor: '#10b981',
    paddingTop: 8,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#6b7280',
  },
});

function PdfDoc({ data }: { data: ReportData }) {
  const logo = data.header.logo || '/logo.png';
  const meta = Object.entries(data.header.metadata || {});

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image style={styles.logo} src={logo} />
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{data.header.title}</Text>
              {data.header.subtitle ? (
                <Text style={styles.subtitle}>{data.header.subtitle}</Text>
              ) : null}
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: '#374151' }}>
              {formatDatePDF(new Date())}
            </Text>
          </View>
        </View>

        {meta.length > 0 && (
          <View style={styles.metaGrid}>
            {meta.map(([k, v]) => (
              <Text key={k} style={styles.metaItem}>{`${k}: ${v}`}</Text>
            ))}
          </View>
        )}

        {data.content.sections.map((s, i) => (
          <View key={i} style={styles.section} wrap>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {typeof s.content === 'string' ? (
              <Text style={styles.p}>{s.content}</Text>
            ) : null}
          </View>
        ))}

        {(data.content.tables || []).map((t, i) => (
          <View key={i} style={styles.section} wrap>
            {t.title ? (
              <Text style={styles.sectionTitle}>{t.title}</Text>
            ) : null}
            <View style={styles.table}>
              <View style={styles.tableRow}>
                {t.headers.map((h) => (
                  <Text
                    key={h}
                    style={[
                      styles.tableHeaderCell,
                      { width: `${100 / t.headers.length}%` },
                    ]}
                  >
                    {h}
                  </Text>
                ))}
              </View>
              {t.rows.map((row, rIdx) => (
                <View key={rIdx} style={styles.tableRow}>
                  {row.map((cell, cIdx) => (
                    <Text
                      key={cIdx}
                      style={[
                        styles.tableCell,
                        { width: `${100 / t.headers.length}%` },
                      ]}
                    >
                      {String(cell)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{data.footer.additionalInfo ?? ''}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function downloadReportPdf(data: ReportData) {
  const blob = await generatePDFBlob(<PdfDoc data={data} />);
  downloadPDF(blob, fileNameFrom(data.id, data.type, data.footer.date));
}

