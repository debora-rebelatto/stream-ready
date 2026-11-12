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
  console.log('🔄 RESTAURADOR AUTOMÁTICO DE WATCHLIST');
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
    console.log('⚠️ Nenhum filme cadastrado no backup privado ainda.');
    console.log('👉 Adicione os nomes ou IDs dos seus filmes em: data/backup_privado_watchlist.json');
    return;
  }

  console.log(`📋 Encontrados ${movies.length} filme(s) para restaurar...`);
  console.log(`🌐 Servidor de destino: ${SERVER_URL}\n`);

  let successCount = 0;

  for (const m of movies) {
    let id = typeof m === 'string' ? m : m.id;
    let name = typeof m === 'object' ? m.name : m;

    // Se for apenas o nome e não um ID IMDb (tt...), pesquisa no Cinemeta
    if (id && !id.startsWith('tt')) {
      try {
        console.log(`🔍 Pesquisando ID IMDb para "${name}"...`);
        const searchRes = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent(name)}`);
        const results = await searchRes.json();
        if (results && results.length > 0) {
          id = results[0].id;
          name = results[0].name;
          console.log(`   ↳ Encontrado: ${name} (${id})`);
        } else {
          console.warn(`   ⚠️ Nenhum resultado encontrado para "${name}". Pulando.`);
          continue;
        }
      } catch (err) {
        console.warn(`   ⚠️ Falha ao buscar "${name}":`, err.message);
        continue;
      }
    }

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
        console.warn(`   ❌ Erro ao adicionar:`, data.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error(`   ❌ Falha na requisição para ${id}:`, err.message);
    }
  }

  console.log('\n=====================================================');
  console.log(`🎉 Processo finalizado: ${successCount}/${movies.length} filme(s) restaurados com sucesso!`);
  console.log('=====================================================');
}

restore();
