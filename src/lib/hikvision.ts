// Service pour la communication avec le lecteur Hikvision
// IP: 192.168.10.50

export interface HikvisionConfig {
  ip: string;
  port: number;
  username: string;
  password: string;
  timeout: number;
}

export interface HikvisionEvent {
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

export interface HikvisionUser {
  device_ip: string;
  employee_no: string;
  name?: string;
  department?: string;
  raw: any;
}

export class HikvisionService {
  private config: HikvisionConfig;
  private baseUrl: string;

  constructor(config: HikvisionConfig) {
    this.config = config;
    this.baseUrl = `http://${config.ip}:${config.port}`;
  }

  /**
   * Vérifier la connectivité avec le lecteur
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      console.log(
        `🔍 Vérification de la connectivité avec ${this.config.ip}...`
      );

      const response = await fetch(`${this.baseUrl}/ISAPI/System/deviceInfo`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (response.ok) {
        console.log('✅ Lecteur Hikvision accessible');
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
      const response = await fetch(`${this.baseUrl}/ISAPI/System/deviceInfo`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (response.ok) {
        const data = await response.text();
        console.log('✅ Informations du dispositif récupérées');
        return data;
      } else {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des informations:',
        error
      );
      throw error;
    }
  }

  /**
   * Récupérer les événements depuis le lecteur
   */
  async getEvents(): Promise<HikvisionEvent[]> {
    try {
      console.log('🔍 Récupération des événements depuis le lecteur...');

      // Simuler la récupération des événements
      // En réalité, vous feriez une requête vers l'API du lecteur
      const mockEvents: HikvisionEvent[] = [
        {
          device_ip: this.config.ip,
          event_index: Date.now(),
          event_time: new Date().toISOString(),
          event_type: 'fingerprint',
          employee_no: 'EMP001',
          direction: 'in',
          raw: { source: 'hikvision', timestamp: Date.now() },
        },
      ];

      console.log(`✅ ${mockEvents.length} événements récupérés`);
      return mockEvents;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des événements:', error);
      throw error;
    }
  }

  /**
   * Récupérer les utilisateurs depuis le lecteur
   */
  async getUsers(): Promise<HikvisionUser[]> {
    try {
      console.log('🔍 Récupération des utilisateurs depuis le lecteur...');

      // Simuler la récupération des utilisateurs
      // En réalité, vous feriez une requête vers l'API du lecteur
      const mockUsers: HikvisionUser[] = [
        {
          device_ip: this.config.ip,
          employee_no: 'EMP001',
          name: 'John Doe',
          department: 'IT',
          raw: { source: 'hikvision', timestamp: Date.now() },
        },
        {
          device_ip: this.config.ip,
          employee_no: 'EMP002',
          name: 'Jane Smith',
          department: 'HR',
          raw: { source: 'hikvision', timestamp: Date.now() },
        },
      ];

      console.log(`✅ ${mockUsers.length} utilisateurs récupérés`);
      return mockUsers;
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des utilisateurs:',
        error
      );
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
      console.log('🔄 Début de la synchronisation...');

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
        `✅ Synchronisation terminée: ${eventsSynced} événements, ${usersSynced} utilisateurs`
      );

      return {
        events: eventsSynced,
        users: usersSynced,
        success: true,
        message: `Synchronisation réussie: ${eventsSynced} événements, ${usersSynced} utilisateurs`,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      return {
        events: 0,
        users: 0,
        success: false,
        message: `Erreur lors de la synchronisation: ${error}`,
      };
    }
  }
}

// Configuration par défaut pour le lecteur Hikvision
export const defaultHikvisionConfig: HikvisionConfig = {
  ip: '192.168.10.50',
  port: 80,
  username: 'admin',
  password: 'admin', // Mot de passe par défaut Hikvision
  timeout: 5000,
};

// Instance par défaut du service
export const hikvisionService = new HikvisionService(defaultHikvisionConfig);
