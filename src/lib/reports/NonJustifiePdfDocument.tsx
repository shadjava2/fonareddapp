import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import React from 'react';

/** Charte institutionnelle Fonaredd (vert pour corps du document) */
const GREEN = {
  dark: '#047857',
  main: '#059669',
  light: '#10b981',
  pale: '#ecfdf5',
  border: '#a7f3d0',
};

/** En-tête : gris neutre pour que le logo (verts du fichier) reste lisible */
const HEADER = {
  bg: '#e5e7eb',
  border: '#9ca3af',
  title: '#111827',
  subtitle: '#374151',
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  hero: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HEADER.bg,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderBottomWidth: 2,
    borderBottomColor: HEADER.border,
  },
  /** Logo horizontal `public/logo.png` */
  logo: {
    width: 168,
    height: 48,
    objectFit: 'contain',
  },
  logoFallback: {
    width: 112,
    height: 36,
    justifyContent: 'center',
  },
  logoFallbackText: {
    color: HEADER.title,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  heroTextCol: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  heroOrg: {
    color: HEADER.title,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroModule: {
    color: HEADER.subtitle,
    fontSize: 9,
  },
  body: {
    paddingHorizontal: 40,
    paddingTop: 22,
    paddingBottom: 52,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: GREEN.dark,
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 14,
  },
  meta: {
    padding: 12,
    backgroundColor: GREEN.pale,
    borderRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: GREEN.main,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: GREEN.border,
    borderRightColor: GREEN.border,
    borderBottomColor: GREEN.border,
    marginBottom: 16,
  },
  metaLine: {
    fontSize: 9.5,
    marginBottom: 4,
    color: '#374151',
  },
  metaLabel: {
    fontWeight: 'bold',
    color: GREEN.dark,
  },
  table: {
    width: '100%',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  trHead: {
    flexDirection: 'row',
    backgroundColor: GREEN.dark,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  trAlt: {
    backgroundColor: '#f9fafb',
  },
  th: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  td: {
    fontSize: 9,
    color: '#1f2937',
  },
  colDate: { width: '24%' },
  colJours: { width: '12%' },
  colReste: { width: '14%' },
  colCom: { width: '50%' },
  thRight: { textAlign: 'right' },
  tdRight: { textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 2,
    borderTopColor: GREEN.light,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerBrand: {
    color: GREEN.dark,
    fontWeight: 'bold',
  },
  empty: {
    marginTop: 16,
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: GREEN.pale,
    borderRadius: 2,
  },
});

export type NonJustifiePdfRow = {
  id: string;
  dateStr: string;
  joursStr: string;
  resteStr: string;
  commentaire: string;
};

export type NonJustifiePdfProps = {
  /** Data URI ou URL du logo (ex. PNG base64) — fiable sous Windows pour @react-pdf */
  logoSrc?: string;
  agentLine: string;
  username: string;
  plafondStr: string;
  soldeRestantStr: string;
  generatedStr: string;
  rows: NonJustifiePdfRow[];
};

export function NonJustifiePdfDocument({
  logoSrc,
  agentLine,
  username,
  plafondStr,
  soldeRestantStr,
  generatedStr,
  rows,
}: NonJustifiePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          {logoSrc ? (
            <Image src={logoSrc} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>FONAREDD</Text>
            </View>
          )}
          <View style={styles.heroTextCol}>
            <Text style={styles.heroOrg}>Fond National REDD — Fonaredd</Text>
            <Text style={styles.heroModule}>
              Module Congé — document institutionnel
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.docTitle}>
            Rapport — congés non justifiés
          </Text>
          <Text style={styles.docSubtitle}>
            Historique des retraits sur le solde annuel (usage RH / archivage)
          </Text>

          <View style={styles.meta}>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>Agent : </Text>
              {agentLine}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>Identifiant : </Text>
              {username}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>Plafond annuel (configuration) : </Text>
              {plafondStr}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>Solde non justifié restant : </Text>
              {soldeRestantStr}
            </Text>
          </View>

          {rows.length === 0 ? (
            <Text style={styles.empty}>
              Aucun retrait enregistré pour cet agent sur la période couverte.
            </Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.trHead}>
                <Text style={[styles.th, styles.colDate]}>Date</Text>
                <Text style={[styles.th, styles.colJours, styles.thRight]}>
                  Jours
                </Text>
                <Text style={[styles.th, styles.colReste, styles.thRight]}>
                  Reste après
                </Text>
                <Text style={[styles.th, styles.colCom]}>Commentaire</Text>
              </View>
              {rows.map((r, index) => (
                <View
                  key={r.id}
                  style={[
                    styles.tr,
                    index % 2 === 1 ? styles.trAlt : {},
                  ]}
                  wrap={false}
                >
                  <Text style={[styles.td, styles.colDate]}>{r.dateStr}</Text>
                  <Text style={[styles.td, styles.colJours, styles.tdRight]}>
                    {r.joursStr}
                  </Text>
                  <Text style={[styles.td, styles.colReste, styles.tdRight]}>
                    {r.resteStr}
                  </Text>
                  <Text style={[styles.td, styles.colCom]}>{r.commentaire}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            <Text style={styles.footerBrand}>Fonaredd</Text>
            {' — '}
            Généré le {generatedStr}
          </Text>
          <Text>Document confidentiel</Text>
        </View>
      </Page>
    </Document>
  );
}
