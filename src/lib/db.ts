import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:propulse.db");
    // Foreign keys sont OFF par défaut dans SQLite à chaque connexion.
    // Il faut les activer explicitement pour que les CASCADE fonctionnent.
    await _db.execute("PRAGMA foreign_keys = ON");
  }
  return _db;
}
