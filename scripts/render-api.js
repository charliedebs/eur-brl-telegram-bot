import https from 'https';

const RENDER_API_KEY = 'rnd_sHkjEv8cuhkP3pEs9DLkv6544Fp6';
const RENDER_API_BASE = 'api.render.com';

/**
 * Fait une requête à l'API Render
 */
function makeRenderRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: RENDER_API_BASE,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Liste tous les services Render
 */
export async function listServices() {
  console.log('📋 Récupération de la liste des services Render...\n');

  try {
    const response = await makeRenderRequest('/v1/services?limit=20');

    if (!response || !Array.isArray(response)) {
      console.log('⚠️  Format de réponse inattendu:', response);
      return [];
    }

    console.log(`✅ ${response.length} service(s) trouvé(s):\n`);

    response.forEach((service, index) => {
      console.log(`${index + 1}. ${service.service.name}`);
      console.log(`   - ID: ${service.service.id}`);
      console.log(`   - Type: ${service.service.type}`);
      console.log(`   - Statut: ${service.service.serviceDetails?.deployStatus || 'unknown'}`);
      console.log(`   - URL: ${service.service.serviceDetails?.url || 'N/A'}`);
      console.log('');
    });

    return response;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des services:', error.message);
    return [];
  }
}

/**
 * Récupère les logs d'un service
 */
export async function getLogs(serviceId, limit = 100) {
  console.log(`📝 Récupération des logs pour le service ${serviceId}...\n`);

  try {
    const response = await makeRenderRequest(`/v1/services/${serviceId}/logs?limit=${limit}`);

    if (!response || !Array.isArray(response)) {
      console.log('⚠️  Format de réponse inattendu:', response);
      return [];
    }

    console.log(`✅ ${response.length} ligne(s) de logs récupérée(s):\n`);
    console.log('─'.repeat(80));

    response.forEach((log) => {
      const timestamp = new Date(log.timestamp).toLocaleString('fr-FR');
      console.log(`[${timestamp}] ${log.message}`);
    });

    console.log('─'.repeat(80));

    return response;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des logs:', error.message);
    return [];
  }
}

/**
 * Récupère les détails d'un service
 */
export async function getServiceDetails(serviceId) {
  console.log(`🔍 Récupération des détails du service ${serviceId}...\n`);

  try {
    const response = await makeRenderRequest(`/v1/services/${serviceId}`);

    console.log('✅ Détails du service:\n');
    console.log(`Nom: ${response.service.name}`);
    console.log(`Type: ${response.service.type}`);
    console.log(`Statut: ${response.service.serviceDetails?.deployStatus || 'unknown'}`);
    console.log(`URL: ${response.service.serviceDetails?.url || 'N/A'}`);
    console.log(`Région: ${response.service.serviceDetails?.region || 'N/A'}`);
    console.log(`Créé le: ${new Date(response.service.createdAt).toLocaleString('fr-FR')}`);
    console.log(`Mis à jour le: ${new Date(response.service.updatedAt).toLocaleString('fr-FR')}`);
    console.log('');

    return response;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des détails:', error.message);
    return null;
  }
}

/**
 * Récupère les déploiements récents
 */
export async function getDeployments(serviceId, limit = 10) {
  console.log(`🚀 Récupération des déploiements pour ${serviceId}...\n`);

  try {
    const response = await makeRenderRequest(`/v1/services/${serviceId}/deploys?limit=${limit}`);

    if (!response || !Array.isArray(response)) {
      console.log('⚠️  Format de réponse inattendu:', response);
      return [];
    }

    console.log(`✅ ${response.length} déploiement(s) trouvé(s):\n`);

    response.forEach((deploy, index) => {
      const created = new Date(deploy.deploy.createdAt).toLocaleString('fr-FR');
      const finished = deploy.deploy.finishedAt
        ? new Date(deploy.deploy.finishedAt).toLocaleString('fr-FR')
        : 'En cours';

      console.log(`${index + 1}. Deploy ID: ${deploy.deploy.id}`);
      console.log(`   - Statut: ${deploy.deploy.status}`);
      console.log(`   - Créé: ${created}`);
      console.log(`   - Terminé: ${finished}`);
      console.log(`   - Commit: ${deploy.deploy.commit?.message || 'N/A'}`);
      console.log('');
    });

    return response;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des déploiements:', error.message);
    return [];
  }
}

// CLI - Si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const arg = process.argv[3];

  (async () => {
    switch (command) {
      case 'list':
        await listServices();
        break;

      case 'logs':
        if (!arg) {
          console.error('❌ Usage: node render-api.js logs <service-id>');
          process.exit(1);
        }
        await getLogs(arg, parseInt(process.argv[4]) || 100);
        break;

      case 'details':
        if (!arg) {
          console.error('❌ Usage: node render-api.js details <service-id>');
          process.exit(1);
        }
        await getServiceDetails(arg);
        break;

      case 'deploys':
        if (!arg) {
          console.error('❌ Usage: node render-api.js deploys <service-id>');
          process.exit(1);
        }
        await getDeployments(arg, parseInt(process.argv[4]) || 10);
        break;

      case 'bot':
        // Commande spéciale pour récupérer tous les infos du bot
        console.log('🤖 Analyse complète du bot EUR/BRL...\n');
        const services = await listServices();
        const botService = services.find(s =>
          s.service.name.toLowerCase().includes('eur-brl') ||
          s.service.name.toLowerCase().includes('telegram')
        );

        if (botService) {
          const serviceId = botService.service.id;
          console.log('\n' + '='.repeat(80) + '\n');
          await getServiceDetails(serviceId);
          console.log('\n' + '='.repeat(80) + '\n');
          await getDeployments(serviceId, 5);
          console.log('\n' + '='.repeat(80) + '\n');
          await getLogs(serviceId, 50);
        } else {
          console.log('⚠️  Aucun service bot EUR/BRL trouvé');
        }
        break;

      default:
        console.log('Usage:');
        console.log('  node render-api.js list');
        console.log('  node render-api.js logs <service-id> [limit]');
        console.log('  node render-api.js details <service-id>');
        console.log('  node render-api.js deploys <service-id> [limit]');
        console.log('  node render-api.js bot    (analyse complète du bot)');
        process.exit(1);
    }
  })();
}
