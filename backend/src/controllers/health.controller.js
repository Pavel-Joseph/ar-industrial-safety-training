const { checkDatabaseConnection } = require('../config/database');

async function getHealth(_request, response) {
  const checkedAt = new Date().toISOString();

  try {
    const databaseTime = await checkDatabaseConnection();

    return response.status(200).json({
      status: 'ok',
      service: 'ar-safety-backend',
      checkedAt,
      dependencies: {
        database: {
          status: 'ok',
          serverTime: databaseTime,
        },
      },
    });
  } catch (_error) {
    return response.status(503).json({
      status: 'degraded',
      service: 'ar-safety-backend',
      checkedAt,
      dependencies: {
        database: {
          status: 'unavailable',
        },
      },
    });
  }
}

module.exports = { getHealth };
