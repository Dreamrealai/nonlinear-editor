// Enhanced job storage with multiple persistence strategies
// Priority: 1. Netlify Blobs, 2. Environment variables, 3. In-memory cache

const JOB_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const STORE_NAME = 'storyboard-jobs';

// Global in-memory cache that persists across function invocations within the same instance
const globalCache = global.__jobCache || (global.__jobCache = {});

// Flags to track if we've already logged the warning
let blobsWarningLogged = false;
let blobsAvailable = null;

// Try to load Netlify Blobs module
let getBlobsStore;
try {
  const blobsModule = require('@netlify/blobs');
  getBlobsStore = blobsModule.getStore;
  blobsAvailable = true;
} catch (error) {
  blobsAvailable = false;
}

class JobStorage {
  // Get Netlify Blobs store if available
  static async getBlobs(context) {
    if (!getBlobsStore || blobsAvailable === false) {
      console.log('[JobStorage] Blobs module not available - using in-memory storage only');
      return null;
    }

    try {
      // In Netlify Functions, getStore should be called with just the store name
      // The function context automatically provides the necessary configuration
      const store = getBlobsStore(STORE_NAME);
      return store;
    } catch (error) {
      // Only log the warning once to avoid cluttering logs
      if (!blobsWarningLogged) {
        console.warn('[JobStorage] Netlify Blobs store creation failed. Using in-memory storage. Error:', error.message);
        console.warn('[JobStorage] Full error details:', error);
        console.warn('[JobStorage] Make sure Netlify Blobs is enabled in your site settings!');
        blobsWarningLogged = true;
      }
      return null;
    }
  }

  // Encode job data for environment variable storage
  static encodeJob(jobData) {
    try {
      return Buffer.from(JSON.stringify(jobData)).toString('base64');
    } catch (error) {
      return null;
    }
  }

  // Decode job data from environment variable storage
  static decodeJob(encodedData) {
    try {
      return JSON.parse(Buffer.from(encodedData, 'base64').toString());
    } catch (error) {
      return null;
    }
  }

  // Get job using multiple strategies
  static async get(jobId, context) {
    const now = Date.now();

    // Strategy 1: Try Netlify Blobs
    try {
      const store = await JobStorage.getBlobs(context);
      if (store) {
        const jobData = await store.get(jobId, { type: 'json' });
        if (jobData) {
          if (jobData.created && (now - jobData.created) < JOB_EXPIRY_MS) {
            return jobData;
          } else {
            await store.delete(jobId).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error('Blobs get error:', error);
    }

    // Strategy 2: Check global cache
    const cachedJob = globalCache[jobId];
    if (cachedJob) {
      if (cachedJob.created && (now - cachedJob.created) < JOB_EXPIRY_MS) {
        return cachedJob;
      } else {
        delete globalCache[jobId];
      }
    }

    // Strategy 3: Check environment variable (for recovery after function restart)
    const envKey = `JOB_${jobId}`;
    const envData = process.env[envKey];
    if (envData) {
      const job = JobStorage.decodeJob(envData);
      if (job && job.created && (now - job.created) < JOB_EXPIRY_MS) {
        // Restore to cache
        globalCache[jobId] = job;
        return job;
      }
    }

    return null;
  }

  // Set job using multiple strategies
  static async set(jobId, jobData, context) {
    const dataWithTimestamp = {
      ...jobData,
      created: jobData.created || Date.now()
    };

    // Always save to global cache first (fastest)
    globalCache[jobId] = dataWithTimestamp;

    // Strategy 1: Try Netlify Blobs
    try {
      const store = await JobStorage.getBlobs(context);
      if (store) {
        await store.set(jobId, dataWithTimestamp, {
          metadata: {
            created: dataWithTimestamp.created.toString(),
            expiresAt: (dataWithTimestamp.created + JOB_EXPIRY_MS).toString()
          }
        });
        // Successfully saved to Blobs
      }
    } catch (error) {
      console.error('Blobs set error:', error);
    }

    // Strategy 2: Try to set in environment (for recovery)
    // Note: This is a workaround and has limitations
    try {
      const envKey = `JOB_${jobId}`;
      const encoded = JobStorage.encodeJob(dataWithTimestamp);
      if (encoded && encoded.length < 4000) { // Environment variable size limit
        process.env[envKey] = encoded;
      }
    } catch (error) {
      // Ignore environment variable errors
    }
  }

  // Delete job from all storage locations
  static async delete(jobId, context) {
    // Delete from global cache
    delete globalCache[jobId];

    // Delete from environment
    delete process.env[`JOB_${jobId}`];

    // Try to delete from Blobs
    try {
      const store = await JobStorage.getBlobs(context);
      if (store) {
        await store.delete(jobId);
      }
    } catch (error) {
      console.error('Blobs delete error:', error);
    }
  }

  // Cleanup expired jobs
  static async cleanup(context) {
    const now = Date.now();

    // Clean global cache
    for (const [id, job] of Object.entries(globalCache)) {
      if (job.created && (now - job.created) >= JOB_EXPIRY_MS) {
        delete globalCache[id];
        delete process.env[`JOB_${id}`];
      }
    }

    // Clean environment variables
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('JOB_')) {
        const job = JobStorage.decodeJob(process.env[key]);
        if (job && job.created && (now - job.created) >= JOB_EXPIRY_MS) {
          delete process.env[key];
        }
      }
    }

    // Try to clean Blobs
    try {
      const store = await JobStorage.getBlobs(context);
      if (store) {
        // Clean up expired jobs from Blobs
        for await (const blob of store.list()) {
          if (blob.metadata?.expiresAt) {
            const expiresAt = parseInt(blob.metadata.expiresAt);
            if (now > expiresAt) {
              await store.delete(blob.key).catch(() => {});
            }
          }
        }
      }
    } catch (error) {
      console.error('Blobs cleanup error:', error);
    }
  }

  // Ensure job exists with recovery
  static async ensureJobExists(jobId, defaultData = null, context) {
    let job = await JobStorage.get(jobId, context);
    
    if (!job && defaultData) {
      await JobStorage.set(jobId, defaultData, context);
      job = defaultData;
    }
    
    return job;
  }

  // Get all active jobs (for debugging)
  static async getAllJobs(context) {
    const jobs = {};
    const now = Date.now();

    // Get from global cache
    for (const [id, job] of Object.entries(globalCache)) {
      if (job.created && (now - job.created) < JOB_EXPIRY_MS) {
        jobs[id] = job;
      }
    }

    // Get from environment
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('JOB_')) {
        const jobId = key.substring(4);
        if (!jobs[jobId]) {
          const job = JobStorage.decodeJob(process.env[key]);
          if (job && job.created && (now - job.created) < JOB_EXPIRY_MS) {
            jobs[jobId] = job;
          }
        }
      }
    }

    // Try to get from Blobs
    try {
      const store = await JobStorage.getBlobs(context);
      if (store) {
        // The list method returns an async iterator
        // List jobs from Blobs store
        for await (const blob of store.list()) {
          const jobId = blob.key;
          if (!jobs[jobId]) {
            try {
              const job = await store.get(jobId, { type: 'json' });
              if (job && job.created && (now - job.created) < JOB_EXPIRY_MS) {
                jobs[jobId] = job;
              }
            } catch (getError) {
              console.error(`[JobStorage] Error getting job ${jobId}:`, getError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to list jobs from Blobs:', error);
    }

    return jobs;
  }
}

module.exports = JobStorage;
