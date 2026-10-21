import { createApp } from './app.js';
import { config } from './config.js';
import { applySchema } from './db/schemaRunner.js';
import { seedDefaultCategories } from './services/categorySeedService.js';

// Idempotente: garante tabelas e categorias padrão a cada subida, inclusive
// após rebuild/restart do container (dados persistem no volume data/).
applySchema();
seedDefaultCategories();

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`CasaFinance rodando em http://${config.host}:${config.port} (ambiente: ${config.env})`);
  if (config.host === '0.0.0.0') {
    console.log('Acessível na rede local em http://<IP-DA-MAQUINA>:' + config.port);
  }
});
