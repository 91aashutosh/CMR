(function() {
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
    const localApiBase = 'http://127.0.0.1:5000/api';
    const productionApiBase = 'https://cmr-1-p1qb.onrender.com/api';

    window.API_BASE_URL = window.API_BASE_URL || (
        localHosts.has(window.location.hostname) ? localApiBase : productionApiBase
    );

    window.apiUrl = function(path) {
        const normalizedPath = String(path || '').replace(/^\/+/, '');
        return `${window.API_BASE_URL}/${normalizedPath}`;
    };
})();
