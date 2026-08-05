import type {
  MonitoringCase,
  PresenceMonitoringResult,
} from '@/lib/presence/presence-monitoring';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import React from 'react';

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
    borderBottomColor: '#b45309',
    paddingBottom: 10,
  },
  logo: { width: 64, height: 24, marginRight: 10 },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 3,
  },
  subtitle: { fontSize: 9, color: '#374151', marginBottom: 2 },
  meta: { fontSize: 7, color: '#6b7280' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 3,
  },
  th: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    paddingVertical: 4,
    paddingHorizontal: 2,
    fontWeight: 'bold',
  },
  c1: { width: '28%' },
  c2: { width: '22%' },
  c3: { width: '18%' },
  c4: { width: '16%' },
  c5: { width: '16%' },
  legend: { fontSize: 7, color: '#4b5563', marginBottom: 2 },
  empty: { fontSize: 8, color: '#9ca3af', marginVertical: 6 },
});

function CaseTable({
  title,
  rows,
}: {
  title: string;
  rows: MonitoringCase[];
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>
        {title} ({rows.length})
      </Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>Aucun cas.</Text>
      ) : (
        <View>
          <View style={styles.th} wrap={false}>
            <Text style={styles.c1}>Agent</Text>
            <Text style={styles.c2}>Règle</Text>
            <Text style={styles.c3}>Métrique</Text>
            <Text style={styles.c4}>Suggestion</Text>
            <Text style={styles.c5}>Action</Text>
          </View>
          {rows.map((c) => (
            <View key={`${c.employeeNo}-${c.month}-${c.ruleCode}`} style={styles.row} wrap={false}>
              <Text style={styles.c1}>
                {c.employeeName} ({c.employeeNo})
                {data.scope === 'ytd' ? ` — ${String(c.month).padStart(2, '0')}/${c.year}` : ''}
              </Text>
              <Text style={styles.c2}>{c.ruleLabel}</Text>
              <Text style={styles.c3}>{c.metricLabel}</Text>
              <Text style={styles.c4}>{c.suggestedAction}</Text>
              <Text style={styles.c5}>{c.action}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function PresenceMonitoringPdfDocument({
  data,
  logoSrc,
  pendingOnly = true,
}: {
  data: PresenceMonitoringResult;
  logoSrc?: string;
  pendingOnly?: boolean;
}) {
  const cases = pendingOnly
    ? data.cases.filter((c) => c.action === 'pending')
    : data.cases;

  const blame = cases.filter((c) => c.section === 'blame');
  const explication = cases.filter((c) => c.section === 'explication');
  const absences = cases.filter((c) => c.section === 'absences');
  const retardsSortie = cases.filter((c) => c.section === 'retards_sortie');
  const retardsEntree = cases.filter((c) => c.section === 'retards_entree');

  const byMonth =
    data.scope === 'ytd'
      ? (data.months || []).map((m) => ({
          month: m,
          label: new Date(Date.UTC(data.year, m - 1, 1)).toLocaleDateString(
            'fr-FR',
            { month: 'long', year: 'numeric', timeZone: 'UTC' }
          ),
          blame: blame.filter((c) => c.month === m),
          explication: explication.filter((c) => c.month === m),
          absences: absences.filter((c) => c.month === m),
          retardsEntree: retardsEntree.filter((c) => c.month === m),
          retardsSortie: retardsSortie.filter((c) => c.month === m),
        }))
      : null;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          <View>
            <Text style={styles.title}>Monitoring de présence</Text>
            <Text style={styles.subtitle}>
              {data.monthLabel} — Notes circulaires (absences / retards / NJ)
            </Text>
            <Text style={styles.meta}>
              Période {data.from} → {data.to} · Plafond NJ {data.njPlafond} j./an
              · {pendingOnly ? 'Cas à traiter' : 'Tous les cas'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Légende des règles</Text>
        {data.rulesLegend.map((r) => (
          <Text key={r.code} style={styles.legend}>
            {r.code} — {r.label} → {r.suggestion}
          </Text>
        ))}

        {byMonth
          ? byMonth.map((g) => (
              <View key={g.month}>
                <Text style={styles.sectionTitle}>{g.label}</Text>
                <CaseTable title="À blâmer / révoquer" rows={g.blame} />
                <CaseTable title="Demandes d’explication" rows={g.explication} />
                <CaseTable title="Absences (retrait congé)" rows={g.absences} />
                <CaseTable title="Retards d’entrée (≥ 8)" rows={g.retardsEntree} />
                <CaseTable
                  title="Retards / sorties irrégulières"
                  rows={g.retardsSortie}
                />
              </View>
            ))
          : (
              <View>
                <CaseTable title="À blâmer / révoquer" rows={blame} />
                <CaseTable title="Demandes d’explication" rows={explication} />
                <CaseTable title="Absences (retrait congé)" rows={absences} />
                <CaseTable title="Retards d’entrée (≥ 8)" rows={retardsEntree} />
                <CaseTable
                  title="Retards / sorties irrégulières"
                  rows={retardsSortie}
                />
              </View>
            )}

        <Text style={styles.sectionTitle}>
          Classement annuel — retards d’entrée (top)
        </Text>
        {data.rankingsYear.lateEntry.slice(0, 10).map((r, i) => (
          <Text key={r.employeeNo} style={styles.legend}>
            {i + 1}. {r.employeeName} ({r.employeeNo}) — {r.lateEntry} retard(s)
          </Text>
        ))}

        <Text style={styles.sectionTitle}>
          Classement annuel — sorties tardives (top)
        </Text>
        {data.rankingsYear.lateExit.slice(0, 10).map((r, i) => (
          <Text key={r.employeeNo} style={styles.legend}>
            {i + 1}. {r.employeeName} ({r.employeeNo}) — {r.lateExit} sortie(s)
            tardive(s)
          </Text>
        ))}
      </Page>
    </Document>
  );
}
