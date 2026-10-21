import { applySchema } from './schemaRunner.js';
import { config } from '../config.js';

applySchema();
console.log('Migração aplicada com sucesso em', config.databasePath);
