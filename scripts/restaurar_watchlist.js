/**
 * Script de automação para restaurar a lista de filmes a partir do backup privado local.
 * Não sobe dados para o GitHub e não usa seeds automáticas fixas.
 */

const fs = require('fs');
const path = require('path');

const BACKUP_FILE = path.join(__dirname, '..', 'data', 'backup_privado_watchlist.json');
const SERVER_URL = process.env.SERVER_URL || 'https://stremiowatchlist.onrender.com';

async function restore() {
  console.log('=====================================================');
  console.log('🔄 RESTAURADOR AUTOMÁTICO DE WATCHLIST (BACKUP PRIVADO)');
  console.log('=====================================================');

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('❌ Arquivo de backup não encontrado:', BACKUP_FILE);
    process.exit(1);
  }

  let backup;
  try {
    backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
  } catch (e) {
    console.error('❌ Erro ao ler backup JSON:', e.message);
    process.exit(1);
  }

  const movies = backup.movies || [];
  if (movies.length === 0) {
    console.log('⚠️ Nenhum filme cadastrado no backup privado.');
    return;
  }

  console.log(`📋 Encontrados ${movies.length} filme(s) para restaurar no servidor...`);
  console.log(`🌐 Servidor de destino: ${SERVER_URL}\n`);

  // 1. Tentar restauração rápida em lote (sync-batch)
  try {
    console.log('⚡ Tentando restauração em lote ultra-rápida...');
    const batchRes = await fetch(`${SERVER_URL}/api/items/sync-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: movies })
    });
    const batchData = await batchRes.json();
    if (batchData.success) {
      console.log(`✅ Sucesso! ${batchData.added || movies.length} filmes sincronizados no servidor.`);
      console.log(`📊 Estatísticas atuais: Total: ${batchData.stats?.total} | Prontos: ${batchData.stats?.ready} | Aguardando: ${batchData.stats?.pending}`);
      console.log('\n🎉 Todos os seus filmes foram restaurados com sucesso!');
      return;
    }
  } catch (err) {
    console.log('⚠️ Restauração em lote falhou ou o servidor está acordando. Tentando item a item...');
  }

  // 2. Restauração individual item a item (fallback)
  let successCount = 0;
  for (const m of movies) {
    let id = typeof m === 'string' ? m : m.id;
    let name = typeof m === 'object' ? m.name : m;

    try {
      console.log(`➕ Adicionando "${name || id}" (${id})...`);
      const addRes = await fetch(`${SERVER_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'movie' })
      });
      const data = await addRes.json();
      if (data.success && data.item) {
        console.log(`   ✅ Sucesso! Qualidade: ${data.item.bestQuality} | Pronto: ${data.item.has1080pPlus ? 'SIM' : 'NÃO'}`);
        successCount++;
      } else {
        console.warn(`   ❌ Erro ao adicionar:`, data.error || 'Erro');
      }
    } catch (err) {
      console.error(`   ❌ Falha na requisição para ${id}:`, err.message);
    }
  }

  console.log('\n=====================================================');
  console.log(`🎉 Processo finalizado: ${successCount}/${movies.length} filme(s) restaurados!`);
  console.log('=====================================================');
}

restore();
