const redis = require("redis");

let client = null;
let disabled = false;

async function obtenirClientRedis() {
  if (client?.isOpen) return client;
  if (disabled) return null;

  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  try {
    client = redis.createClient({
      url,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false,
      },
    });
    client.on("error", () => {}); // on ignore les erreurs Redis

    // Ne jamais bloquer le démarrage du serveur si Redis est lent/down
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 5000)),
    ]);

    console.log("✅ Redis connecté");
    return client;
  } catch {
    disabled = true;
    client = null;
    console.warn("⚠️ Redis indisponible (cache désactivé)");
    return null;
  }
}

class CacheService {
  static async obtenir(cle) {
    try {
      const c = await obtenirClientRedis();
      if (!c) return null;
      const v = await c.get(cle);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }

  static async definir(cle, valeur, expirationSecondes) {
    try {
      const c = await obtenirClientRedis();
      if (!c) return false;
      const v = JSON.stringify(valeur);
      if (expirationSecondes) await c.setEx(cle, expirationSecondes, v);
      else await c.set(cle, v);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { obtenirClientRedis, CacheService };
