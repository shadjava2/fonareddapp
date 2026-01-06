import { pdf, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

// Styles pour le PDF professionnel
export const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2pt solid #10b981',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 80,
    height: 80,
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1pt solid #e5e7eb',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 4,
  },
  label: {
    width: '40%',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  value: {
    width: '60%',
    fontSize: 11,
    color: '#1f2937',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#9ca3af',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 9,
    color: '#9ca3af',
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #e5e7eb',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  signatureBox: {
    width: '40%',
    paddingTop: 60,
    borderTop: '1pt solid #1f2937',
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 5,
  },
});

/**
 * Génère un blob PDF depuis un document React PDF
 */
export async function generatePDFBlob(doc: React.ReactElement): Promise<Blob> {
  const docBlob = await pdf(doc).toBlob();
  return docBlob;
}

/**
 * Télécharge un PDF
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formate une date pour le PDF
 */
export function formatDatePDF(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}






