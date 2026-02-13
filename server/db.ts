import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, dashboardData } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function saveDashboardData(input: any) {
  try {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const dataPath = path.join(process.cwd(), 'client', 'public', 'data.json');
    
    // Extrair o campo json do input
    const dataToSave = input && input.json ? input.json : (input && typeof input === 'object' ? input : {});
    
    // Garantir que os dados tem a estrutura correta
    const finalData = {
      total_itens: dataToSave.total_itens || 0,
      estoque_total: dataToSave.estoque_total || 0,
      consumo_total: dataToSave.consumo_total || 0,
      status_counts: dataToSave.status_counts || {},
      itens_criticos: dataToSave.itens_criticos || [],
      itens_atencao: dataToSave.itens_atencao || [],
      media_duracao: dataToSave.media_duracao || 0,
      data_preview: dataToSave.data_preview || []
    };
    
    await fs.writeFile(dataPath, JSON.stringify(finalData, null, 2));
    console.log('[Dashboard] Dados salvos com sucesso!', { total_itens: finalData.total_itens });
  } catch (error) {
    console.warn('[Dashboard] Aviso ao salvar data.json:', error);
  }
}

export async function getDashboardData() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dashboard data: database not available");
    return null;
  }

  try {
    const result = await db.select().from(dashboardData).limit(1);
    if (result.length > 0) {
      return JSON.parse(result[0].data);
    }
    return null;
  } catch (error) {
    console.error("[Database] Failed to get dashboard data:", error);
    return null;
  }
}
