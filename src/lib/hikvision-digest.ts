// Service Hikvision avec authentification DIGEST
import DigestFetch from 'digest-fetch';
import http from 'http';
import https from 'https';
import { parseStringPromise } from 'xml2js';

interface HikvisionConfig {
  ip: string;
  username: string;
  password: string;
  port: number;
  useHttps: boolean;
  timezone_offset_minutes?: number | null;
}

interface HikvisionEvent {
  device_ip: string;
  event_index: number;
  event_time: string;
  event_type: string;
  door_no?: number;
  direction?: string;
  card_no?: string;
  employee_no?: string;
  raw: any;
}

interface HikvisionUser {
  device_ip: string;
  employee_no: string;
  name?: string;
  department?: string;
  raw: any;
}

export class HikvisionDigestService {
  private config: HikvisionConfig;
  private client: DigestFetch;
  private agent: http.Agent | https.Agent;

  constructor(config: HikvisionConfig) {
    this.config = config;

    // Créer le client DIGEST
    this.client = new DigestFetch(config.username, config.password, {
      algorithm: 'MD5',
    });

    // Créer l'agent HTTP/HTTPS
    if (config.useHttps) {
      this.agent = new https.Agent({
        rejectUnauthorized: false, // Pour les certificats autosignés
      });
    } else {
      this.agent = new http.Agent();
    }
  }

  private getBaseUrl(): string {
    const protocol = this.config.useHttps ? 'https' : 'http';
    return `${protocol}://${this.config.ip}:${this.config.port}`;
  }

  /**
   * Effectuer une requête GET avec authentification DIGEST
   */
  async hikGet(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.getBaseUrl()}${path}`;

    console.log(`🔍 Requête DIGEST vers: ${url}`);

    const response = await this.client.fetch(url, {
      ...init,
      agent: this.agent,
      headers: {
        Accept: '*/*',
        'User-Agent': 'Next.js-Hikvision-Client/1.0',
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Hikvision GET ${path} -> ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  /**
   * Effectuer une requête GET et retourner du JSON
   */
  async hikGetJSON(path: string): Promise<any> {
    const response = await this.hikGet(path);
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      // Si ce n'est pas du JSON, retourner le texte brut
      return text;
    }
  }

  /**
   * Effectuer une requête GET et retourner du XML parsé
   */
  async hikGetXML(path: string): Promise<any> {
    const response = await this.hikGet(path);
    const xml = await response.text();

    try {
      const result = await parseStringPromise(xml, { compact: true });
      return result;
    } catch (error) {
      console.error('❌ Erreur lors du parsing XML:', error);
      return xml; // Retourner le XML brut si le parsing échoue
    }
  }

  /**
   * POST avec corps JSON (pour API Intelligent/FDLib sur terminaux DS-K1Txxx)
   */
  async hikPostJSON(path: string, body: object): Promise<any> {
    const url = `${this.getBaseUrl()}${path}`;
    console.log(`🔍 Requête DIGEST POST JSON vers: ${path}`);
    const response = await this.client.fetch(url, {
      method: 'POST',
      agent: this.agent,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Next.js-Hikvision-Client/1.0',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      console.log(`⚠️ POST ${path} -> ${response.status}`, text.slice(0, 200));
      throw new Error(`Hikvision POST ${path} -> ${response.status}`);
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Effectuer une requête POST avec authentification DIGEST (corps XML ou JSON)
   */
  async hikPost(path: string, body: string, contentType: string): Promise<Response> {
    const url = `${this.getBaseUrl()}${path}`;
    console.log(`🔍 Requête DIGEST POST vers: ${path}`);
    const response = await this.client.fetch(url, {
      method: 'POST',
      agent: this.agent,
      headers: {
        Accept: 'application/xml, application/json, */*',
        'Content-Type': contentType,
        'User-Agent': 'Next.js-Hikvision-Client/1.0',
      },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      console.log(`⚠️ POST ${path} -> ${response.status} ${response.statusText}`, text.slice(0, 200));
      throw new Error(`Hikvision POST ${path} -> ${response.status} ${response.statusText}`);
    }
    return response;
  }

  /**
   * Vérifier la connectivité avec le lecteur
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      console.log(
        `🔍 Vérification de la connectivité avec ${this.config.ip}...`
      );

      const response = await this.hikGet('/ISAPI/System/deviceInfo');

      if (response.ok) {
        console.log('✅ Lecteur Hikvision accessible avec DIGEST');
        return true;
      } else {
        console.error(`❌ Lecteur non accessible: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur de connectivité:', error);
      return false;
    }
  }

  /**
   * Récupérer les informations du dispositif
   */
  async getDeviceInfo(): Promise<any> {
    try {
      console.log('🔍 Récupération des informations du dispositif...');

      const xml = await this.hikGetXML('/ISAPI/System/deviceInfo');
      console.log('✅ Informations du dispositif récupérées');
      return xml;
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des informations:',
        error
      );
      throw error;
    }
  }

  /**
   * Format AcsEvent : ISO 8601 avec fuseau (ex. 2026-02-17T18:33:29-0800).
   * Utilise timezone_offset_minutes du config si défini (aligné Time Settings du lecteur).
   */
  private formatHikvisionDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetMinutes = this.config.timezone_offset_minutes ?? null;
    let y: number, m: number, d: number, h: number, min: number, s: number;
    let sign: string, tzH: number, tzM: number;
    if (offsetMinutes !== null && offsetMinutes !== undefined) {
      const adjusted = new Date(date.getTime() - offsetMinutes * 60 * 1000);
      y = adjusted.getUTCFullYear();
      m = adjusted.getUTCMonth() + 1;
      d = adjusted.getUTCDate();
      h = adjusted.getUTCHours();
      min = adjusted.getUTCMinutes();
      s = adjusted.getUTCSeconds();
      sign = offsetMinutes <= 0 ? '-' : '+';
      tzH = Math.floor(Math.abs(offsetMinutes) / 60);
      tzM = Math.abs(offsetMinutes) % 60;
    } else {
      y = date.getFullYear();
      m = date.getMonth() + 1;
      d = date.getDate();
      h = date.getHours();
      min = date.getMinutes();
      s = date.getSeconds();
      const tzOffset = -date.getTimezoneOffset();
      sign = tzOffset >= 0 ? '+' : '-';
      tzH = Math.floor(Math.abs(tzOffset) / 60);
      tzM = Math.abs(tzOffset) % 60;
    }
    return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(s)}${sign}${pad(tzH)}:${pad(tzM)}`;
  }

  /**
   * Récupérer les événements d'accès.
   * Sur DS-K1T321MFWX, AcsEvent n'accepte que la méthode POST avec un body JSON.
   */
  async getEvents(
    startTime?: string,
    endTime?: string
  ): Promise<HikvisionEvent[]> {
    try {
      console.log("🔍 Récupération des événements d'accès...");

      const start = startTime ? new Date(startTime) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endTime ? new Date(endTime) : new Date();
      const startStr = this.formatHikvisionDate(start);
      const endStr = this.formatHikvisionDate(end);

      let events: any[] = [];

      // 1) POST AcsEvent (obligatoire sur DS-K1T321MFWX, GET renvoie 404)
      try {
        console.log('🔍 Requête POST /ISAPI/AccessControl/AcsEvent (format DS-K1T)...');
        const data = await this.hikPostJSON('/ISAPI/AccessControl/AcsEvent?format=json', {
          AcsEventCond: {
            searchID: '1',
            searchResultPosition: 0,
            maxResults: 100,
            major: 0,
            minor: 0,
            startTime: startStr,
            endTime: endStr,
            timeReverseOrder: true,
          },
        });
        if (data?.AcsEvent?.InfoList) {
          const l = data.AcsEvent.InfoList;
          events = Array.isArray(l) ? l : [l];
        } else if (data?.AcsEvent) {
          const l = data.AcsEvent;
          events = Array.isArray(l) ? l : [l];
        }
        if (events.length > 0) {
          console.log(`✅ ${events.length} événements récupérés via POST AcsEvent`);
        }
      } catch (postError) {
        console.log('⚠️ POST AcsEvent échoué, pas de fallback GET sur ce modèle:', (postError as Error).message);
      }

      // 2) Fallback GET uniquement pour les modèles qui le supportent (pas DS-K1T)
      if (events.length === 0) {
        const getEndpoints = [
          '/ISAPI/AccessControl/AcsEvent?format=json',
          '/ISAPI/AccessControl/AcsEvent',
          '/ISAPI/Event/notification/alertStream',
          '/ISAPI/System/status',
        ];
        for (const endpoint of getEndpoints) {
          try {
            let path = endpoint;
            if (startTime && endTime && !path.includes('alertStream')) {
              const sep = path.includes('?') ? '&' : '?';
              path += `${sep}startTime=${encodeURIComponent(startStr)}&endTime=${encodeURIComponent(endStr)}`;
            }
            const data = await this.hikGetJSON(path);
            if (Array.isArray(data)) {
              events = data;
            } else if (data?.AcsEvent?.InfoList) {
              const l = data.AcsEvent.InfoList;
              events = Array.isArray(l) ? l : [l];
            } else if (data?.AcsEvent) {
              events = Array.isArray(data.AcsEvent) ? data.AcsEvent : [data.AcsEvent];
            } else if (data?.EventNotificationAlert) {
              events = Array.isArray(data.EventNotificationAlert)
                ? data.EventNotificationAlert
                : [data.EventNotificationAlert];
            }
            if (events.length > 0) break;
          } catch {
            continue;
          }
        }
      }

      if (events.length === 0) {
        console.log('⚠️ Aucun événement trouvé (POST AcsEvent et GET de secours)');
        events = [
          {
            device_ip: this.config.ip,
            event_index: Date.now(),
            event_time: new Date().toISOString(),
            event_type: 'test',
            door_no: 1,
            direction: 'in',
            card_no: 'test',
            employee_no: 'test',
            raw: { message: 'Aucun événement réel trouvé, événement de test' },
          },
        ];
      }

      console.log(`✅ ${events.length} événements récupérés`);
      return events.map((event: any) => ({
        device_ip: this.config.ip,
        event_index: event.eventIndex ?? event.event_index ?? Date.now(),
        event_time: event.time ?? event.event_time ?? new Date().toISOString(),
        event_type: event.eventType ?? event.event_type ?? 'unknown',
        door_no: event.doorNo ?? event.door_no,
        direction: event.direction,
        card_no: event.cardNo ?? event.card_no,
        employee_no: event.employeeNo ?? event.employee_no,
        raw: event,
      }));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des événements:', error);
      throw error;
    }
  }

  /**
   * Récupérer les utilisateurs ACS (plusieurs stratégies + repli sur les événements)
   */
  async getUsers(): Promise<HikvisionUser[]> {
    try {
      console.log('🔍 Récupération des utilisateurs ACS...');

      const normalizeUser = (u: any): HikvisionUser => ({
        device_ip: this.config.ip,
        employee_no:
          String(u?.employeeNo ?? u?.employee_no ?? u?.employeeNo ?? '')
            .trim() || 'N/A',
        name:
          String(u?.name ?? u?.userName ?? u?.name ?? '').trim() || undefined,
        department:
          String(u?.department ?? u?.department ?? '').trim() || undefined,
        raw: u ?? {},
      });

      // 1) GET avec format=json (certains lecteurs)
      const getJsonPaths = [
        '/ISAPI/AccessControl/UserInfo/Record?format=json',
        '/ISAPI/AccessControl/UserInfo/Search?format=json',
        '/ISAPI/AccessControl/UserInfo/Find?format=json',
      ];
      for (const path of getJsonPaths) {
        try {
          const data = await this.hikGetJSON(path);
          const users = this.parseUserListFromResponse(data, normalizeUser);
          if (users.length > 0) {
            console.log(`✅ ${users.length} utilisateur(s) via GET JSON ${path}`);
            return users;
          }
        } catch (e) {
          console.log(`⚠️ GET ${path} non disponible, essai suivant...`);
        }
      }

      // 2) GET XML (endpoints classiques)
      const xmlPaths = [
        '/ISAPI/AccessControl/UserInfo/Search',
        '/ISAPI/AccessControl/UserInfo/Find',
        '/ISAPI/AccessControl/UserInfo/Record',
      ];
      for (const path of xmlPaths) {
        try {
          const xml = await this.hikGetXML(path);
          const users = this.parseUserListFromXml(xml, normalizeUser);
          if (users.length > 0) {
            console.log(`✅ ${users.length} utilisateur(s) via GET XML ${path}`);
            return users;
          }
        } catch (e) {
          console.log(`⚠️ GET XML ${path} non disponible, essai suivant...`);
        }
      }

      // 3) POST UserInfo/Search avec corps XML (certains modèles)
      try {
        const searchBody = `<?xml version="1.0" encoding="UTF-8"?>
<UserSearchDescription>
  <searchID>${Date.now()}</searchID>
  <maxResults>500</maxResults>
  <searchResultPosition>0</searchResultPosition>
</UserSearchDescription>`;
        const res = await this.hikPost(
          '/ISAPI/AccessControl/UserInfo/Search',
          searchBody,
          'application/xml'
        );
        const text = await res.text();
        const xml = await parseStringPromise(text, { compact: true }).catch(() => null);
        if (xml) {
          const users = this.parseUserListFromXml(xml, normalizeUser);
          if (users.length > 0) {
            console.log(
              `✅ ${users.length} utilisateur(s) via POST UserInfo/Search`
            );
            return users;
          }
        }
      } catch {
        console.log('⚠️ POST UserInfo/Search non disponible.');
      }

      // 4) Terminaux face/empreinte (DS-K1T321MFWX, etc.) : Intelligent/FDLib
      const fdlibUsers = await this.getUsersFromFDLib(normalizeUser);
      if (fdlibUsers.length > 0) {
        console.log(
          `✅ ${fdlibUsers.length} personne(s) via Intelligent/FDLib (DS-K1T...)`
        );
        return fdlibUsers;
      }

      // 5) Repli : utilisateurs uniques à partir des événements ACS
      console.log(
        '🔍 Aucun endpoint UserInfo disponible, extraction depuis les événements ACS...'
      );
      const usersFromEvents = await this.getUsersFromEvents(normalizeUser);
      if (usersFromEvents.length > 0) {
        console.log(
          `✅ ${usersFromEvents.length} personne(s) extraite(s) des événements`
        );
        return usersFromEvents;
      }

      console.log('⚠️ Aucun utilisateur trouvé (ni UserInfo ni événements).');
      return [];
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des utilisateurs:',
        error
      );
      throw error;
    }
  }

  private parseUserListFromResponse(data: any, normalize: (u: any) => HikvisionUser): HikvisionUser[] {
    if (!data) return [];
    const list =
      data.UserInfoSearchResult?.UserInfo?.length !== undefined
        ? Array.isArray(data.UserInfoSearchResult.UserInfo)
          ? data.UserInfoSearchResult.UserInfo
          : [data.UserInfoSearchResult.UserInfo]
        : data.UserInfo
        ? Array.isArray(data.UserInfo)
          ? data.UserInfo
          : [data.UserInfo]
        : data.userInfo
        ? Array.isArray(data.userInfo)
          ? data.userInfo
          : [data.userInfo]
        : Array.isArray(data)
        ? data
        : [];
    return list.map((u: any) => normalize(u)).filter((u: HikvisionUser) => u.employee_no !== 'N/A' || u.name);
  }

  private parseUserListFromXml(xml: any, normalize: (u: any) => HikvisionUser): HikvisionUser[] {
    if (!xml) return [];
    const raw =
      xml.UserInfoSearchResult?.UserInfo ??
      xml.UserInfo ??
      xml.userInfo ??
      xml.UserInfoList?.UserInfo;
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((u: any) => normalize(u)).filter((u: HikvisionUser) => u.employee_no !== 'N/A' || u.name);
  }

  /**
   * Récupérer les personnes via Intelligent/FDLib (terminaux DS-K1T321MFWX, etc.)
   */
  private async getUsersFromFDLib(
    normalize: (u: any) => HikvisionUser
  ): Promise<HikvisionUser[]> {
    const users: HikvisionUser[] = [];
    const pushFromList = (list: any[]): void => {
      const items = Array.isArray(list) ? list : [list];
      for (const item of items) {
        const employeeNo =
          String(
            item?.employeeNo ?? item?.employee_no ?? item?.personId ?? item?.personNo
            ?? item?.FPID ?? item?.fpid ?? item?.id ?? ''
          ).trim() || 'N/A';
        const rawName =
          item?.name ?? item?.personName ?? item?.Name ?? item?.employeeName
          ?? item?.personInfo?.name ?? item?.faceInfo?.personName
          ?? item?.personInfo?.personName ?? '';
        const name = (rawName != null && rawName !== '')
          ? String(rawName).trim()
          : undefined;
        if (employeeNo === 'N/A' && !name) continue;
        users.push(
          normalize({
            employeeNo,
            name,
            department: item?.department ?? item?.deptName,
            raw: item,
          })
        );
      }
    };

    const extractListFromFDSearch = (data: any): any[] => {
      if (!data || typeof data !== 'object') return [];
      if (data.statusCode && data.statusCode !== 1) return [];
      const r = data.FDSearchResult ?? data?.response ?? data?.data ?? data;
      const list =
        r?.list ?? r?.FaceList ?? r?.faceList ?? r?.recordList ?? r?.RecordList
        ?? r?.matchList ?? r?.MatchList ?? r?.searchResult ?? r?.SearchResult
        ?? r?.Face ?? r?.Person ?? r?.personList ?? r?.faceInfoList
        ?? data?.list ?? data?.FaceList ?? data?.faceList ?? data?.matchList
        ?? (Array.isArray(data) ? data : []);
      return Array.isArray(list) ? list : list ? [list] : [];
    };

    try {
      // Liste des bibliothèques (faceLibType, FDID) — requise par le DS-K1T321MFWX
      let libs: { faceLibType?: string; FDID?: string }[] = [];
      try {
        const libRes = await this.hikGetJSON('/ISAPI/Intelligent/FDLib?format=json');
        if (libRes?.FDLibList?.FDLib) {
          const l = libRes.FDLibList.FDLib;
          libs = Array.isArray(l) ? l : [l];
        } else if (libRes?.FDLib) {
          libs = Array.isArray(libRes.FDLib) ? libRes.FDLib : [libRes.FDLib];
        } else if (libRes?.data?.FDLib) {
          const l = libRes.data.FDLib;
          libs = Array.isArray(l) ? l : [l];
        } else if (Array.isArray(libRes)) {
          libs = libRes;
        }
        if (libs.length > 0) {
          console.log('🔍 FDLib:', libs.length, 'bibliothèque(s)', libs.map((x: any) => ({ t: x.faceLibType ?? x.FaceLibType, id: x.FDID ?? x.fdId })));
        } else if (libRes && typeof libRes === 'object') {
          console.log('🔍 FDLib GET 200, structure inconnue. Clés:', Object.keys(libRes).join(', '));
        }
      } catch {
        // ignoré
      }
      if (libs.length === 0) {
        libs = [
          { faceLibType: 'blackFD', FDID: '1' },
          { faceLibType: 'whiteFD', FDID: '1' },
        ];
      }

      const maxResultsPerPage = 100;
      const maxPages = 70;
      for (const lib of libs) {
        const fdId = String(lib?.FDID ?? lib?.fdId ?? '1').trim();
        const faceLibType = String(lib?.faceLibType ?? lib?.FaceLibType ?? 'blackFD').trim();
        try {
          let position = 0;
          let totalMatches = 0;
          let pageCount = 0;
          do {
            if (pageCount >= maxPages) break;
            pageCount++;
            const body: Record<string, unknown> = {
              searchResultPosition: position,
              maxResults: maxResultsPerPage,
              faceLibType,
              FDID: fdId,
            };
            const data = await this.hikPostJSON(
              '/ISAPI/Intelligent/FDLib/FDSearch?format=json',
              body
            );
            const list = extractListFromFDSearch(data);
            const respTotal =
              data?.totalMatches ?? data?.FDSearchResult?.totalMatches
              ?? data?.totalCount ?? data?.recordCount;
            if (respTotal != null) totalMatches = Number(respTotal);
            else if (totalMatches === 0 && list.length > 0) totalMatches = list.length;

            if (list.length > 0 && pageCount <= 3) {
              console.log(
                '🔍 FDSearch',
                faceLibType,
                'FDID',
                fdId,
                `| page ${pageCount}: +${list.length} (total: ${position + list.length}${totalMatches > 0 ? `/${totalMatches}` : ''})`
              );
            }

            if (list.length > 0) {
              pushFromList(list);
              position += list.length;
              if (totalMatches > 0 && position >= totalMatches) break;
            } else {
              if (data && typeof data === 'object' && position === 0) {
                const tm = (data as any).totalMatches ?? (data as any).numOfMatches;
                if (tm === 0) {
                  console.log(
                    '🔍 FDSearch',
                    faceLibType,
                    'FDID',
                    fdId,
                    '| totalMatches=0'
                  );
                }
              }
              break;
            }
          } while (true);
        } catch (e) {
          continue;
        }
      }

      const seen = new Set<string>();
      return users.filter((u) => {
        const key = `${u.employee_no}:${u.name ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (e) {
      console.log('⚠️ Intelligent/FDLib non disponible:', (e as Error)?.message);
      return [];
    }
  }

  /**
   * Extraire une liste d'utilisateurs uniques à partir des événements ACS (repli si pas d'API UserInfo)
   */
  private async getUsersFromEvents(
    normalize: (u: any) => HikvisionUser
  ): Promise<HikvisionUser[]> {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000); // ~6 mois
      const events = await this.getEvents(
        start.toISOString(),
        end.toISOString()
      );
      const byEmployee = new Map<string, HikvisionUser>();
      for (const ev of events) {
        const no =
          String(ev.employee_no ?? (ev.raw?.employeeNo ?? '')).trim();
        if (!no || no === 'test') continue;
        if (!byEmployee.has(no)) {
          byEmployee.set(no, normalize({
            employeeNo: no,
            name: ev.raw?.name ?? ev.raw?.employeeName ?? no,
            department: ev.raw?.department,
          }));
        }
      }
      return Array.from(byEmployee.values());
    } catch (e) {
      console.error('❌ Erreur extraction utilisateurs depuis événements:', e);
      return [];
    }
  }

  /**
   * Récupérer le flux d'alertes en continu
   */
  async getAlertStream(): Promise<ReadableStream> {
    try {
      console.log("🔍 Démarrage du flux d'alertes...");

      const response = await this.hikGet(
        '/ISAPI/Event/notification/alertStream'
      );

      if (!response.body) {
        throw new Error("Flux d'alertes non disponible");
      }

      console.log("✅ Flux d'alertes démarré");
      return response.body;
    } catch (error) {
      console.error("❌ Erreur lors du démarrage du flux d'alertes:", error);
      throw error;
    }
  }

  /**
   * Synchroniser les données avec la base de données
   */
  async syncData(): Promise<{
    events: number;
    users: number;
    success: boolean;
    message: string;
  }> {
    try {
      console.log('🔄 Début de la synchronisation DIGEST...');

      const [events, users] = await Promise.all([
        this.getEvents(),
        this.getUsers(),
      ]);

      // Envoyer les événements à l'API
      let eventsSynced = 0;
      for (const event of events) {
        try {
          const response = await fetch('/api/hikvision/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          });

          if (response.ok) {
            eventsSynced++;
          }
        } catch (error) {
          console.error(
            "❌ Erreur lors de la synchronisation de l'événement:",
            error
          );
        }
      }

      // Envoyer les utilisateurs à l'API
      let usersSynced = 0;
      for (const user of users) {
        try {
          const response = await fetch('/api/hikvision/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
          });

          if (response.ok) {
            usersSynced++;
          }
        } catch (error) {
          console.error(
            "❌ Erreur lors de la synchronisation de l'utilisateur:",
            error
          );
        }
      }

      console.log(
        `✅ Synchronisation DIGEST terminée: ${eventsSynced} événements, ${usersSynced} utilisateurs`
      );

      return {
        events: eventsSynced,
        users: usersSynced,
        success: true,
        message: `Synchronisation DIGEST réussie: ${eventsSynced} événements, ${usersSynced} utilisateurs`,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation DIGEST:', error);
      return {
        events: 0,
        users: 0,
        success: false,
        message: `Erreur lors de la synchronisation DIGEST: ${error}`,
      };
    }
  }
}

// Configuration par défaut pour le lecteur Hikvision
export const defaultHikvisionDigestConfig: HikvisionConfig = {
  ip: '192.168.10.50',
  username: 'admin',
  password: 'Fonaredd',
  port: 80,
  useHttps: false,
};

// Instance par défaut du service DIGEST
export const hikvisionDigestService = new HikvisionDigestService(
  defaultHikvisionDigestConfig
);
