import React from 'react';

export type ReportType = 'conge' | 'admin' | 'statistique';

export interface ReportSection {
  title: string;
  content: string | React.ReactNode;
  data?: Record<string, any>;
}

export interface ReportTable {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ReportHeaderData {
  logo?: string; // default: /logo.png
  title: string; // e.g. "Rapport de congé"
  subtitle?: string; // e.g. "Demande #123"
  metadata?: Record<string, any>; // e.g. { Demandeur: "…" }
}

export interface ReportFooterData {
  date: string; // string déjà formatée
  page?: number; // utilisé côté PDF
  totalPages?: number; // utilisé côté PDF
  additionalInfo?: string;
}

export interface ReportContentData {
  sections: ReportSection[];
  tables?: ReportTable[];
}

export interface ReportData {
  id: number;
  type: ReportType;
  title: string; // titre général (modal)
  header: ReportHeaderData;
  content: ReportContentData;
  footer: ReportFooterData;
}
