import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type {
  Team,
  Competition,
  CompetitionSettings,
  AppSettings,
  CompetitionType,
} from '../types/index.js';
import {
  DEFAULT_91MIN_SETTINGS,
  DEFAULT_3H_SETTINGS,
  DEFAULT_APP_SETTINGS,
} from '../types/index.js';

interface FFAMCompetitionsDB extends DBSchema {
  teams: {
    key: string;
    value: Team;
    indexes: { 'by-competition-type': CompetitionType };
  };
  competitions: {
    key: string;
    value: Competition;
    indexes: { 'by-team': string };
  };
  settings: {
    key: string;
    value: CompetitionSettings;
  };
  appSettings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'ffam-competitions';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<FFAMCompetitionsDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FFAMCompetitionsDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FFAMCompetitionsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Teams store
      if (!db.objectStoreNames.contains('teams')) {
        const teamsStore = db.createObjectStore('teams', { keyPath: 'id' });
        teamsStore.createIndex('by-competition-type', 'competitionType');
      }

      // Competitions store
      if (!db.objectStoreNames.contains('competitions')) {
        const competitionsStore = db.createObjectStore('competitions', { keyPath: 'id' });
        competitionsStore.createIndex('by-team', 'teamId');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // App settings store
      if (!db.objectStoreNames.contains('appSettings')) {
        db.createObjectStore('appSettings', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// ============ Team Operations ============

export async function saveTeam(team: Team): Promise<void> {
  const db = await getDB();
  await db.put('teams', team);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const db = await getDB();
  return db.get('teams', id);
}

export async function getAllTeams(): Promise<Team[]> {
  const db = await getDB();
  return db.getAll('teams');
}

export async function getTeamsByCompetitionType(type: CompetitionType): Promise<Team[]> {
  const db = await getDB();
  return db.getAllFromIndex('teams', 'by-competition-type', type);
}

export async function deleteTeam(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('teams', id);
}

// ============ Competition Operations ============

export async function saveCompetition(competition: Competition): Promise<void> {
  const db = await getDB();
  await db.put('competitions', competition);
}

export async function getCompetition(id: string): Promise<Competition | undefined> {
  const db = await getDB();
  return db.get('competitions', id);
}

export async function getCompetitionByTeam(teamId: string): Promise<Competition | undefined> {
  const db = await getDB();
  const competitions = await db.getAllFromIndex('competitions', 'by-team', teamId);
  return competitions[0];
}

export async function getAllCompetitions(): Promise<Competition[]> {
  const db = await getDB();
  return db.getAll('competitions');
}

export async function deleteCompetition(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('competitions', id);
}

// ============ Settings Operations ============

export async function saveSettings(settings: CompetitionSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}

export async function getSettings(competitionType: CompetitionType): Promise<CompetitionSettings> {
  const db = await getDB();
  const settings = await db.get('settings', competitionType);
  
  if (settings) return settings;

  // Return defaults if not found
  const defaults = competitionType === '91min' 
    ? { ...DEFAULT_91MIN_SETTINGS, id: '91min' }
    : { ...DEFAULT_3H_SETTINGS, id: '3h' };
  
  await saveSettings(defaults);
  return defaults;
}

// ============ App Settings Operations ============

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('appSettings', settings);
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('appSettings', 'app');
  
  if (settings) return settings;

  // Return defaults if not found
  const defaults: AppSettings = { ...DEFAULT_APP_SETTINGS, id: 'app' };
  await saveAppSettings(defaults);
  return defaults;
}

// ============ Utility Functions ============

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('teams');
  await db.clear('competitions');
  // Keep settings
}
