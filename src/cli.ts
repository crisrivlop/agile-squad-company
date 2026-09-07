import * as readline from 'readline';
import { CompanyOrchestrator } from './CompanyOrchestrator';

async function main() {
  const company = new CompanyOrchestrator();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🤖 Bienvenido a Agile Squad Company (CLI)');
  console.log('Escribe una funcionalidad o requerimiento de software a implementar por tu equipo de IA:');

  rl.question('\n> Requerimiento: ', async (input) => {
    if (!input || input.trim().length === 0) {
      console.log('Requerimiento vacío. Saliendo...');
      rl.close();
      return;
    }

    try {
      await company.runParallelDevPipeline(input.trim());
    } catch (err) {
      console.error('Error en pipeline:', err);
    } finally {
      rl.close();
    }
  });
}

main();
