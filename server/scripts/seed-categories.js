import { seedDefaultCategories } from '../src/services/categorySeedService.js';

const count = seedDefaultCategories();
console.log(`Categorias padrão garantidas (${count}).`);
