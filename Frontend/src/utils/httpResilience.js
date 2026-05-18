import axios from 'axios';

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const SAFE_METHODS = new Set(['get', 'head', 'options']);
const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 20000;

let axiosInstalled = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (attempt) => {
  const base = 500 * 2 ** attempt;
  return base + Math.floor(Math.random() * 250);
};

const isSafeMethod = (method = 'get') => SAFE_METHODS.has(String(method).toLowerCase());

const isRetryableAxiosError = (error) => {
  const status = error.response?.status;
  return error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || RETRYABLE_STATUSES.has(status);
};

export const installHttpResilience = () => {
  if (axiosInstalled) return;
  axiosInstalled = true;

  axios.defaults.timeout = axios.defaults.timeout || DEFAULT_TIMEOUT_MS;

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config || {};
      if (!isSafeMethod(config.method) || !isRetryableAxiosError(error)) {
        return Promise.reject(error);
      }

      config.__retryCount = config.__retryCount || 0;
      const maxRetries = Number.isFinite(config.retry) ? config.retry : DEFAULT_RETRIES;

      if (config.__retryCount >= maxRetries) {
        return Promise.reject(error);
      }

      config.__retryCount += 1;
      await sleep(retryDelay(config.__retryCount - 1));
      return axios(config);
    }
  );
};

export const resilientFetch = async (input, init = {}, options = {}) => {
  const method = String(init.method || 'GET').toLowerCase();
  const safe = isSafeMethod(method);
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let attempt = 0;

  while (true) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller && timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const response = await fetch(input, {
        ...init,
        signal: init.signal || controller?.signal,
      });

      if (!safe || !RETRYABLE_STATUSES.has(response.status) || attempt >= retries) {
        return response;
      }
    } catch (error) {
      if (!safe || attempt >= retries) throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    await sleep(retryDelay(attempt));
    attempt += 1;
  }
};

