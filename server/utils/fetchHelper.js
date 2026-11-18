/**
 * Safe HTTP Fetch Utility with deterministic timeout & automatic resource cleanup.
 * Prevents hanging Event Loop handles and memory leaks in serverless and Jest workers.
 * Follows Lauren Tan Constraint Engineering ("Pit of Success").
 */
async function safeFetch(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }

  try {
    const combinedSignal = options.signal || controller.signal;
    return await fetch(url, { ...options, signal: combinedSignal });
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

module.exports = { safeFetch };
