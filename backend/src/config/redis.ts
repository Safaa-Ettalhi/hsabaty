import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: Awaited<ReturnType<typeof createClient>> | null = null;
let redisTentativeEchouee = false;

export async function obtenirClientRedis() {
  if (redisClient?.isOpen) {
    return redisClient;
  }
  if (redisTentativeEchouee) {
    return null;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    return null;
  }

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false
      }
    });

    client.on('error', () => {});

    client.on('connect', () => {
      console.log('Connecté à Redis');
    });

    await client.connect();
    redisClient = client;
    return redisClient;
  } catch {
    redisTentativeEchouee = true;
    redisClient = null;
    console.warn('Redis non disponible, le cache sera désactivé.');
    return null;
  }
}

export class CacheService {
  static async obtenir<T>(cle: string): Promise<T | null> {
    try {
      const client = await obtenirClientRedis();
      if (!client) return null;
      const valeur = await client.get(cle);
      return valeur ? JSON.parse(valeur) : null;
    } catch {
      return null;
    }
  }

  static async definir(cle: string, valeur: unknown, expirationSecondes?: number): Promise<boolean> {
    try {
      const client = await obtenirClientRedis();
      if (!client) return false;
      const valeurStr = JSON.stringify(valeur);
      if (expirationSecondes) {
        await client.setEx(cle, expirationSecondes, valeurStr);
      } else {
        await client.set(cle, valeurStr);
      }
      return true;
    } catch {
      return false;
    }
  }
}
