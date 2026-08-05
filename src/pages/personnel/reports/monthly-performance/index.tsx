import PersonnelLayout from '@/components/layout/PersonnelLayout';
import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import { apiGet, apiPost, getAxiosErrorMessage } from '@/lib/fetcher';
import {
  DEFAULT_PRESENCE_RULES,
  type EmployeePerformanceReport,
  type PresenceRulesConfig,
} from '@/lib/presence/presence-rules-config';
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  FolderArrowDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type AgentOption = { value: string; label: string };

function monthStart(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function janFirstThisYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function safePdfFilenamePart(s: string): string {
  return (
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'agent'
  );
}

const MonthlyPerformancePage: React.FC = () => {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayIso);
  const [department, setDepartment] = useState('FONAREDD');
  const [employeeNo, setEmployeeNo] = useState('');
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState<EmployeePerformanceReport[]>([]);
  const [rules, setRules] = useState<PresenceRulesConfig | null>(
    DEFAULT_PRESENCE_RULES
  );
  const [showRules, setShowRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  const loadAgents = useCallback(async () => {
    try {
      setAgentsLoading(true);
      const res = await apiGet<{
        success: boolean;
        users: Array<{
          employee_no: string;
          name?: string;
          department?: string;
        }>;
      }>('/api/hikvision/users?limit=500&page=1');
      const users = res.users || [];
      setAgentOptions(
        users.map((u) => {
          const id = String(u.employee_no || '').trim();
          const name = (u.name || '').trim();
          return {
            value: id,
            label: name ? `${name} — ${id}` : `ID ${id}`,
          };
        })
      );
    } catch (e) {
      console.error(e);
      setAgentOptions([]);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const agentComboOptions = useMemo(() => {
    const emp = employeeNo.trim();
    if (!emp) return agentOptions;
    if (agentOptions.some((o) => o.value === emp)) return agentOptions;
    return [{ value: emp, label: `ID ${emp}` }, ...agentOptions];
  }, [agentOptions, employeeNo]);

  const loadRules = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; rules: PresenceRulesConfig }>(
        '/api/hikvision/presence-rules'
      );
      if (res.success && res.rules) setRules(res.rules);
      else setRules(DEFAULT_PRESENCE_RULES);
    } catch (e) {
      console.error(e);
      setRules(DEFAULT_PRESENCE_RULES);
    }
  }, []);

  const loadReports = useCallback(
    async (filters?: {
      from?: string;
      to?: string;
      department?: string;
      employee_no?: string;
    }) => {
      const f = filters?.from ?? from;
      const t = filters?.to ?? to;
      const dept = filters?.department ?? department;
      const emp = (filters?.employee_no ?? employeeNo).trim();
      try {
        setLoading(true);
        const params = new URLSearchParams({ from: f, to: t });
        if (dept.trim()) params.set('department', dept.trim());
        if (emp) params.set('employee_no', emp);
        const res = await apiGet<{
          success: boolean;
          message?: string;
          reports: EmployeePerformanceReport[];
          rules: PresenceRulesConfig;
        }>(`/api/hikvision/attendance-performance?${params.toString()}`, {
          // Période multi-mois + MySQL distant : > 60 s fréquent
          timeout: 300_000,
        });
        setReports(res.reports || []);
        // Ne pas écraser les horaires du formulaire (sinon les modifications
        // d’« heures début » disparaissent quand Afficher se termine).
        setMessage(res.message || '');
        if (res.reports?.length) {
          setSelectedEmployee((prev) =>
            prev && res.reports.some((r) => r.employeeNo === prev)
              ? prev
              : res.reports[0].employeeNo
          );
        } else {
          setSelectedEmployee('');
        }
      } catch (e: unknown) {
        console.error(e);
        setReports([]);
        setMessage(getAxiosErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [from, to, department, employeeNo]
  );

  useEffect(() => {
    void loadRules();
    void loadAgents();
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- charge initiale
  }, []);

  const downloadPdf = async (scope: 'current' | 'all') => {
    try {
      setPdfLoading(true);
      const params = new URLSearchParams({ from, to });
      if (department.trim()) params.set('department', department.trim());
      if (scope === 'current') {
        const emp = (selectedEmployee || employeeNo).trim();
        if (!emp) {
          setMessage('Sélectionnez un agent pour le PDF individuel.');
          return;
        }
        params.set('employee_no', emp);
      } else if (employeeNo.trim()) {
        params.set('employee_no', employeeNo.trim());
      }
      const res = await fetch(
        `/api/hikvision/attendance-performance-pdf?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `PDF impossible (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        scope === 'current'
          ? `performance_${(selectedEmployee || employeeNo).trim()}_${from}_${to}.pdf`
          : `performance_global_${from}_${to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Erreur PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  /** Période + dossier → un PDF par agent (Chrome / Edge). */
  const exportPdfsToFolder = async () => {
    const picker = (
      window as Window & {
        showDirectoryPicker?: (opts?: {
          mode?: 'read' | 'readwrite';
        }) => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;

    if (typeof picker !== 'function') {
      setMessage(
        'Sélection de dossier non supportée — ouvrez l’app dans Chrome ou Edge.'
      );
      return;
    }

    try {
      setPdfLoading(true);
      setMessage('Choisissez le dossier de destination…');
      let dir: FileSystemDirectoryHandle;
      try {
        dir = await picker({ mode: 'readwrite' });
      } catch (e: unknown) {
        const name =
          e && typeof e === 'object' && 'name' in e
            ? String((e as { name: string }).name)
            : '';
        if (name === 'AbortError') {
          setMessage('Export annulé.');
          return;
        }
        throw e;
      }

      setMessage('Liste des agents (période)…');
      const listParams = new URLSearchParams({
        from,
        to,
        ids_only: '1',
      });
      if (department.trim()) listParams.set('department', department.trim());
      const listRes = await apiGet<{
        success: boolean;
        message?: string;
        employees: Array<{
          employeeNo: string;
          name: string;
          department: string;
        }>;
      }>(`/api/hikvision/attendance-performance?${listParams.toString()}`, {
        timeout: 120_000,
      });
      const agents = listRes.employees || [];
      if (agents.length === 0) {
        setMessage(
          listRes.message ||
            'Aucun agent / pointage pour cette période — rien à exporter.'
        );
        return;
      }

      let ok = 0;
      let fail = 0;
      for (let i = 0; i < agents.length; i++) {
        const r = agents[i];
        const label = r.name?.trim() || r.employeeNo;
        setMessage(`Export PDF ${i + 1}/${agents.length} — ${label}…`);
        const pdfParams = new URLSearchParams({
          from,
          to,
          employee_no: r.employeeNo,
        });
        if (department.trim()) {
          pdfParams.set('department', department.trim());
        }
        try {
          const res = await fetch(
            `/api/hikvision/attendance-performance-pdf?${pdfParams.toString()}`,
            { credentials: 'include' }
          );
          if (!res.ok) {
            fail++;
            continue;
          }
          const buffer = await res.arrayBuffer();
          const filename = `performance_${safePdfFilenamePart(r.employeeNo)}_${safePdfFilenamePart(r.name)}_${from}_${to}.pdf`;
          const fileHandle = await dir.getFileHandle(filename, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(buffer);
          await writable.close();
          ok++;
        } catch {
          fail++;
        }
      }

      setMessage(
        fail > 0
          ? `Export terminé : ${ok} PDF dans le dossier, ${fail} échec(s).`
          : `Export terminé : ${ok} PDF enregistré(s) dans le dossier choisi.`
      );
    } catch (e: unknown) {
      setMessage(getAxiosErrorMessage(e));
    } finally {
      setPdfLoading(false);
    }
  };

  const saveRules = async () => {
    if (!rules) return;
    const norm = (hm: string) => {
      const m = String(hm || '')
        .trim()
        .match(/^(\d{1,2}):(\d{2})/);
      return m ? `${m[1].padStart(2, '0')}:${m[2]}` : hm;
    };
    const payload: PresenceRulesConfig = {
      ...rules,
      start_work_time: norm(rules.start_work_time),
      end_work_time: norm(rules.end_work_time),
      checkin_valid_from: norm(rules.checkin_valid_from),
      checkin_valid_to: norm(rules.checkin_valid_to),
      late_from: norm(rules.late_from),
      late_until: norm(rules.late_until),
      checkout_valid_from: norm(rules.checkout_valid_from),
      checkout_valid_to: norm(rules.checkout_valid_to),
    };
    try {
      setSavingRules(true);
      const res = await apiPost<{
        success: boolean;
        message?: string;
        rules: PresenceRulesConfig;
        error?: string;
      }>('/api/hikvision/presence-rules', payload);
      if (res.success && res.rules) {
        setRules(res.rules);
        setMessage(res.message || 'Horaires mis à jour avec succès');
        // Recalcul en arrière-plan — ne bloque pas le bouton
        void loadReports();
      } else {
        setMessage(
          res.message ||
            res.error ||
            'Échec mise à jour — les valeurs n’ont pas été sauvées'
        );
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String(
              (e as { response?: { data?: { message?: string } } }).response
                ?.data?.message || ''
            )
          : '';
      setMessage(
        msg ||
          (e instanceof Error ? e.message : 'Erreur sauvegarde règles')
      );
    } finally {
      setSavingRules(false);
    }
  };

  const active = reports.find((r) => r.employeeNo === selectedEmployee) || null;

  return (
    <PersonnelLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarDaysIcon className="h-7 w-7 text-emerald-600" />
                Performance mensuelle
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Calcul automatique à l’ouverture (Timetable iVMS) — pas de bouton
                « Calculer ». Missions = présence. Rapports en français.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                <Link
                  href="/personnel/reports"
                  className="text-emerald-700 underline hover:no-underline"
                >
                  ← Retour aux rapports de pointage
                </Link>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              Horaires & cotation
            </button>
          </div>

          {showRules && rules ? (
            <div className="mt-4 border border-emerald-100 rounded-lg bg-emerald-50/50 p-4 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-900">
                  Configuration des horaires
                </p>
                <button
                  type="button"
                  disabled={savingRules}
                  onClick={() => void saveRules()}
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {savingRules ? 'Mise à jour…' : 'Mettre à jour les horaires'}
                </button>
              </div>
              {message && showRules ? (
                <p
                  className={`text-sm ${
                    message.toLowerCase().includes('échec') ||
                    message.toLowerCase().includes('erreur')
                      ? 'text-red-700'
                      : 'text-emerald-800'
                  }`}
                >
                  {message}
                </p>
              ) : null}

              {/* Entrée */}
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Entrée (arrivée)
                </p>
                <p className="text-xs text-emerald-800/80 mt-0.5 mb-3">
                  Avant {rules.checkin_valid_from} → Entrée anticipée ·{' '}
                  {rules.checkin_valid_from}–{rules.start_work_time} à l’heure ·{' '}
                  {rules.late_from}–{rules.late_until} retard · dès{' '}
                  {rules.checkin_valid_to} absent
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(
                    [
                      ['checkin_valid_from', 'Heure début (à l’heure dès)'],
                      ['start_work_time', 'À l’heure jusqu’à'],
                      ['late_from', 'Retard dès'],
                      ['late_until', 'Retard jusqu’à'],
                      ['checkin_valid_to', 'Absent dès'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-xs text-gray-700">
                      <span className="block mb-1">{label}</span>
                      <input
                        type="time"
                        step={60}
                        value={rules[key] || ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const m = raw.match(/^(\d{1,2}):(\d{2})/);
                          const v = m
                            ? `${m[1].padStart(2, '0')}:${m[2]}`
                            : raw;
                          setRules((prev) =>
                            prev ? { ...prev, [key]: v } : prev
                          );
                        }}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={rules.count_mission_as_presence}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          count_mission_as_presence: e.target.checked,
                        })
                      }
                    />
                    Mission = présence
                  </label>
                  <button
                    type="button"
                    className="text-xs text-emerald-800 underline hover:no-underline"
                    onClick={() =>
                      setRules((prev) =>
                        prev
                          ? {
                              ...prev,
                              checkin_valid_from: '08:00',
                              start_work_time: '08:30',
                              late_from: '08:40',
                              late_until: '09:10',
                              checkin_valid_to: '09:30',
                            }
                          : prev
                      )
                    }
                  >
                    Réinitialiser entrée (08:00–08:30 / 08:40–09:10 / absent 09:30)
                  </button>
                </div>
              </div>

              {/* Sortie */}
              <div className="border-t border-emerald-100 pt-4">
                <p className="text-sm font-semibold text-emerald-900">
                  Sortie (départ)
                </p>
                <p className="text-xs text-emerald-800/80 mt-0.5 mb-3">
                  Avant l’heure de fin → Sortie anticipée · fenêtre normale jusqu’à
                  l’heure max · au-delà → Sortie tardive
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(
                    [
                      ['end_work_time', 'Heure fin de service'],
                      ['checkout_valid_from', 'Sortie normale dès'],
                      ['checkout_valid_to', 'Sortie normale jusqu’à'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-xs text-gray-700">
                      <span className="block mb-1">{label}</span>
                      <input
                        type="time"
                        step={60}
                        value={rules[key] || ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const m = raw.match(/^(\d{1,2}):(\d{2})/);
                          const v = m
                            ? `${m[1].padStart(2, '0')}:${m[2]}`
                            : raw;
                          setRules((prev) =>
                            prev ? { ...prev, [key]: v } : prev
                          );
                        }}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                      />
                    </label>
                  ))}
                  <label className="text-xs text-gray-700">
                    <span className="block mb-1">Tolérance sortie tôt (min)</span>
                    <input
                      type="number"
                      min={0}
                      value={rules.early_leave_allowable_minutes}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          early_leave_allowable_minutes: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Sans pointage de sortie : remarque « Absent ».
                </p>
              </div>

              {/* Cotation */}
              <div className="border-t border-emerald-100 pt-4">
                <p className="text-sm font-semibold text-emerald-900">
                  Scores & seuils (cotation)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {(
                    [
                      ['score_on_time', 'Score à l’heure'],
                      ['score_late', 'Score retard (entrée)'],
                      ['score_early_leave', 'Score sortie tôt'],
                      ['score_late_exit', 'Score sortie tardive'],
                      ['score_absent', 'Score absence'],
                      ['score_mission_day', 'Score mission'],
                      ['excellent_min', 'Seuil Excellent (min)'],
                      ['bon_min', 'Seuil Bon (min)'],
                      ['moyen_min', 'Seuil Moyen (min)'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-xs text-gray-700">
                      <span className="block mb-1">{label}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rules[key]}
                        onChange={(e) =>
                          setRules({
                            ...rules,
                            [key]: Number(e.target.value),
                          })
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={savingRules}
                  onClick={() => void saveRules()}
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {savingRules ? 'Mise à jour…' : 'Mettre à jour les horaires'}
                </button>
                <span className="text-xs text-gray-500">
                  Modifiez les heures début/fin puis cliquez ici pour enregistrer.
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            <div>
              <label
                htmlFor="perf-from"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Du
              </label>
              <input
                id="perf-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="perf-to"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Au
              </label>
              <input
                id="perf-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="perf-dept"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Département
              </label>
              <input
                id="perf-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="FONAREDD"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="xl:col-span-2">
              <AutocompleteSelect
                inputId="perf-agent"
                label="Agent (nom)"
                placeholder="Rechercher par nom… — vide = tous"
                options={agentComboOptions}
                value={employeeNo.trim() || null}
                loading={agentsLoading}
                onChange={(v) =>
                  setEmployeeNo(v == null ? '' : String(v).trim())
                }
              />
            </div>
            <div>
              <label
                htmlFor="perf-emp"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ID personne
              </label>
              <div className="flex gap-2">
                <input
                  id="perf-emp"
                  type="text"
                  value={employeeNo}
                  onChange={(e) => setEmployeeNo(e.target.value)}
                  placeholder="ex. 004"
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void loadReports()}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  title="Afficher"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Afficher</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
              onClick={() => {
                const f = monthStart();
                const t = todayIso();
                setFrom(f);
                setTo(t);
                void loadReports({ from: f, to: t });
              }}
            >
              Mois en cours
            </button>
            <button
              type="button"
              className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
              onClick={() => {
                const f = janFirstThisYear();
                const t = todayIso();
                setFrom(f);
                setTo(t);
                void loadReports({ from: f, to: t });
              }}
            >
              Janvier → aujourd’hui
            </button>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-gray-600">{message}</p>
          ) : null}
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="text-sm text-gray-700">
            {loading
              ? 'Calcul en cours…'
              : `${reports.length} agent(s) — sélectionnez pour voir le détail`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pdfLoading || !selectedEmployee}
              onClick={() => void downloadPdf('current')}
              className="inline-flex items-center gap-2 rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {pdfLoading ? 'PDF…' : 'PDF agent sélectionné'}
            </button>
            <button
              type="button"
              disabled={pdfLoading || reports.length === 0}
              onClick={() => void downloadPdf('all')}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {pdfLoading ? 'PDF…' : 'PDF global (1 agent / pages)'}
            </button>
            <button
              type="button"
              disabled={pdfLoading || !from || !to}
              onClick={() => void exportPdfsToFolder()}
              title="Saisissez la période, choisissez un dossier : un PDF par agent"
              className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm text-white hover:bg-teal-800 disabled:opacity-50"
            >
              <FolderArrowDownIcon className="h-4 w-4" />
              {pdfLoading
                ? 'Export dossier…'
                : 'PDF tous → dossier'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow overflow-hidden lg:col-span-1 max-h-[70vh] overflow-y-auto">
            <ul className="divide-y divide-gray-100">
              {reports.map((r) => (
                <li key={r.employeeNo}>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(r.employeeNo)}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 ${
                      selectedEmployee === r.employeeNo
                        ? 'bg-emerald-50 border-l-4 border-emerald-600'
                        : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {r.employeeName}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID {r.employeeNo} · {r.totals.statusLabel} · note{' '}
                      {r.totals.averageScore ?? '—'}
                    </div>
                  </button>
                </li>
              ))}
              {!loading && reports.length === 0 ? (
                <li className="px-3 py-6 text-sm text-gray-500 text-center">
                  Aucune donnée
                </li>
              ) : null}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {active ? (
              <>
                <div className="bg-white rounded-lg shadow p-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {active.employeeName}{' '}
                    <span className="text-sm font-normal text-gray-500">
                      (ID {active.employeeNo}) — {active.department}
                    </span>
                  </h2>
                  {(active.fonction || active.role || active.services) && (
                    <p className="text-xs text-emerald-800 mt-1">
                      {[
                        active.fonction
                          ? `Fonction : ${active.fonction}`
                          : null,
                        active.role ? `Rôle : ${active.role}` : null,
                        active.services
                          ? `Service : ${active.services}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Période {active.from} → {active.to} · Horaires{' '}
                    {active.rules.start_work_time}–{active.rules.end_work_time}
                  </p>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {(
                      [
                        ['Jours ouvrés', active.totals.workingDays],
                        ['À l’heure', active.totals.onTime],
                        ['En retard', active.totals.late],
                        ['Absents', active.totals.absent],
                        ['Sortie tôt', active.totals.earlyLeave],
                        ['Sortie tard', active.totals.lateExit],
                      ] as const
                    ).map(([label, val]) => (
                      <div
                        key={label}
                        className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-2"
                      >
                        <div className="text-[10px] uppercase text-emerald-700">
                          {label}
                        </div>
                        <div className="text-lg font-semibold text-emerald-900">
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-700">
                    Jours mission : <strong>{active.totals.missionDays}</strong>{' '}
                    · Note : <strong>{active.totals.averageScore ?? '—'}</strong>{' '}
                    · Statut : <strong>{active.totals.statusLabel}</strong>
                  </p>
                </div>

                {active.months.map((m) => (
                  <div
                    key={`${m.year}-${m.month}`}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {m.monthLabel}
                      </h3>
                      <span className="text-xs text-gray-600">
                        À l’heure {m.onTime} · Retard {m.late} · Absent{' '}
                        {m.absent} · Note {m.averageScore ?? '—'} (
                        {m.statusLabel})
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-2 py-2 text-left">Jour</th>
                            <th className="px-2 py-2 text-left">Entrée</th>
                            <th className="px-2 py-2 text-left">Sortie</th>
                            <th className="px-2 py-2 text-left">Durée</th>
                            <th className="px-2 py-2 text-left">Arrivée</th>
                            <th className="px-2 py-2 text-left">Départ</th>
                            <th className="px-2 py-2 text-left">Mission</th>
                            <th className="px-2 py-2 text-left">Remarque</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {m.days.map((d) => (
                            <tr
                              key={d.date}
                              className={
                                d.isWorkingDay ? '' : 'bg-gray-50 text-gray-400'
                              }
                            >
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                {d.dayLabel}
                              </td>
                              <td className="px-2 py-1.5">{d.entryStr}</td>
                              <td className="px-2 py-1.5">{d.exitStr}</td>
                              <td className="px-2 py-1.5">{d.durationStr}</td>
                              <td className="px-2 py-1.5">{d.arrivalLabel}</td>
                              <td className="px-2 py-1.5">
                                {d.departureLabel}
                              </td>
                              <td className="px-2 py-1.5">
                                {d.hasMission ? d.missionLabel : '—'}
                              </td>
                              <td className="px-2 py-1.5 max-w-xs truncate">
                                {d.remark}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-500">
                {loading
                  ? 'Chargement et cotation automatique…'
                  : 'Sélectionnez un agent ou élargissez la période.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </PersonnelLayout>
  );
};

export default MonthlyPerformancePage;
