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
    
    // Salvar em ambos os lugares: client/public e dist/public
    const clientPath = path.join(process.cwd(), 'client', 'public', 'data.json');
    const distPath = path.join(process.cwd(), 'dist', 'public', 'data.json');
    
    // Salvar em client/public (sempre)
    await fs.writeFile(clientPath, JSON.stringify(finalData, null, 2));
    console.log('[Dashboard] Dados salvos em client/public!', { total_itens: finalData.total_itens });
    
    // Tentar salvar em dist/public tambem (se existir)
    try {
      await fs.writeFile(distPath, JSON.stringify(finalData, null, 2));
      console.log('[Dashboard] Dados salvos em dist/public!', { total_itens: finalData.total_itens });
    } catch (distError) {
      console.log('[Dashboard] dist/public nao disponivel (normal em desenvolvimento)');
    }
  } catch (error) {
    console.warn('[Dashboard] Aviso ao salvar data.json:', error);
  }
}

export async function getDashboardData() {
  try {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    // Tentar ler de dist/public primeiro, depois de client/public
    const distPath = path.join(process.cwd(), 'dist', 'public', 'data.json');
    const clientPath = path.join(process.cwd(), 'client', 'public', 'data.json');
    
    // Tentar dist primeiro
    try {
      const fileContent = await fs.readFile(distPath, 'utf-8');
      const data = JSON.parse(fileContent);
      console.log('[Dashboard] Dados lidos de dist/public:', { total_itens: data.total_itens });
      return data;
    } catch (distError) {
      // Se dist falhar, tentar client
      try {
        const fileContent = await fs.readFile(clientPath, 'utf-8');
        const data = JSON.parse(fileContent);
        console.log('[Dashboard] Dados lidos de client/public:', { total_itens: data.total_itens });
        return data;
      } catch (clientError) {
        console.warn('[Dashboard] Nenhum arquivo data.json encontrado');
        return null;
      }
    }
  } catch (error) {
    console.error('[Dashboard] Erro ao ler dados:', error);
    return null;
  }
}
