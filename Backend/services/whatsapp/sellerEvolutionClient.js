// Evolution API client for the SELLER notification instance.
// Same Evolution server, different WhatsApp instance name.
// Used to send order notifications TO sellers from the admin dashboard.

const createEvolutionClient = require('./createEvolutionClient');

module.exports = createEvolutionClient('EVOLUTION_SELLER_INSTANCE_NAME', 'rozare-seller');
