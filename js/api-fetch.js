//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

/**
 * Centralized fetch wrapper with cache-busting, timeout, and error handling.
 *
 * @param {string} url - The URL to fetch
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.timeout=10000] - Request timeout in ms
 * @param {boolean} [options.cacheBust=true] - Append timestamp query param
 * @param {boolean} [options.showErrorToast=true] - Show toast on failure
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.headers] - Additional headers
 * @param {string|Object} [options.body] - Request body (auto-stringified if object)
 * @returns {Promise<any|null>} Parsed JSON on success, null on failure
 */
async function apiFetch(url, options = {}) {
    const {
        timeout = 10000,
        cacheBust = true,
        showErrorToast = false,
        method = 'GET',
        headers = {},
        body = undefined
    } = options;

    let fetchUrl = url;
    if (cacheBust) {
        const separator = url.includes('?') ? '&' : '?';
        fetchUrl = `${url}${separator}t=${Date.now()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const fetchOptions = {
            method,
            signal: controller.signal
        };

        if (Object.keys(headers).length > 0 || body !== undefined) {
            fetchOptions.headers = { ...headers };
        }

        if (body !== undefined) {
            if (typeof body === 'object' && !(body instanceof FormData)) {
                fetchOptions.body = JSON.stringify(body);
                fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
            } else {
                fetchOptions.body = body;
            }
        }

        const response = await fetch(fetchUrl, fetchOptions);

        if (!response.ok) {
            console.error(`[apiFetch] HTTP ${response.status} for ${url}`);
            if (showErrorToast && typeof showToast === 'function') {
                showToast(`Request failed (${response.status})`, 'error');
            }
            return null;
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`[apiFetch] Timeout for ${url}`);
            if (showErrorToast && typeof showToast === 'function') {
                showToast('Request timed out', 'error');
            }
        } else {
            console.error(`[apiFetch] Error fetching ${url}:`, error.message);
            if (showErrorToast && typeof showToast === 'function') {
                showToast('Network error', 'error');
            }
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}
