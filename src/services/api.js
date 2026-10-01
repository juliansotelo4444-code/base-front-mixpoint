import client from '../api/client';

const api = {
    get: async (url, config) => (await client.get(url, config)).data,
    post: async (url, body, config) => (await client.post(url, body, config)).data,
    put: async (url, body, config) => (await client.put(url, body, config)).data,
    delete: async (url, config) => (await client.delete(url, config)).data,
    client
};

export default api;
