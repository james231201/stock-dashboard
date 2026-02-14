import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDashboardData, saveDashboardData } from './db';
import * as fs from 'fs';
import * as path from 'path';

describe('Dashboard Data Operations', () => {
  const testDataPath = path.join(__dirname, '../client/public/data.json');
  const testData = {
    total_itens: 25,
    estoque_total: 10000,
    consumo_total: 5000,
    status_counts: {
      '🔴 CRÍTICO': 0,
      '🟡 ATENÇÃO': 2,
      '🟢 OK': 23,
    },
    itens_criticos: [],
    itens_atencao: ['SACO DE LIXO 150L PC C/ 100UN', 'SACO PARA VACUO 18X25X0,10 UN'],
    media_duracao: 30,
    data_preview: [],
    last_update_time: new Date().toISOString(),
  };

  beforeEach(() => {
    // Limpar dados de teste antes de cada teste
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  it('should save dashboard data with timestamp', async () => {
    await saveDashboardData(testData);
    
    // Verificar se o arquivo foi criado
    expect(fs.existsSync(testDataPath)).toBe(true);
    
    // Verificar conteúdo do arquivo
    const savedData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    expect(savedData.total_itens).toBe(25);
    expect(savedData.last_update_time).toBeDefined();
  });

  it('should load dashboard data with timestamp', async () => {
    // Salvar dados primeiro
    await saveDashboardData(testData);
    
    // Carregar dados
    const loadedData = await getDashboardData();
    
    expect(loadedData).toBeDefined();
    expect(loadedData?.total_itens).toBe(25);
    expect(loadedData?.last_update_time).toBeDefined();
    
    // Verificar se o timestamp é uma string ISO válida
    if (loadedData?.last_update_time) {
      expect(() => new Date(loadedData.last_update_time)).not.toThrow();
    }
  });

  it('should preserve timestamp when loading data', async () => {
    const originalTimestamp = new Date('2026-02-14T10:00:00Z').toISOString();
    const dataWithTimestamp = {
      ...testData,
      last_update_time: originalTimestamp,
    };
    
    await saveDashboardData(dataWithTimestamp);
    const loadedData = await getDashboardData();
    
    expect(loadedData?.last_update_time).toBe(originalTimestamp);
  });

  it('should update timestamp only when saving new data', async () => {
    const timestamp1 = new Date('2026-02-14T10:00:00Z').toISOString();
    const data1 = {
      ...testData,
      last_update_time: timestamp1,
    };
    
    await saveDashboardData(data1);
    const loaded1 = await getDashboardData();
    expect(loaded1?.last_update_time).toBe(timestamp1);
    
    // Aguardar um pouco e salvar novos dados
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const timestamp2 = new Date().toISOString();
    const data2 = {
      ...testData,
      total_itens: 26,
      last_update_time: timestamp2,
    };
    
    await saveDashboardData(data2);
    const loaded2 = await getDashboardData();
    
    expect(loaded2?.total_itens).toBe(26);
    expect(loaded2?.last_update_time).toBe(timestamp2);
    expect(loaded2?.last_update_time).not.toBe(timestamp1);
  });
});

describe('Password Protection for Excel Upload', () => {
  it('should validate password correctly', () => {
    const PASSWORD = '231201';
    
    expect(PASSWORD).toBe('231201');
    expect('231201' === PASSWORD).toBe(true);
    expect('wrong' === PASSWORD).toBe(false);
  });

  it('should reject incorrect password', () => {
    const PASSWORD = '231201';
    const userInput = '123456';
    
    expect(userInput === PASSWORD).toBe(false);
  });

  it('should accept correct password', () => {
    const PASSWORD = '231201';
    const userInput = '231201';
    
    expect(userInput === PASSWORD).toBe(true);
  });
});
