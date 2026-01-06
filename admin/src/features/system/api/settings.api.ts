import apiClient from "@/lib/axios";

export const settingsApi = {
    getSetting: async (key: string) => {
        const res = await apiClient.get(`/settings/${key}`);
        return res.data.data; // { key, value }
    },

    updateSetting: async (key: string, value: unknown, description?: string) => {
        const res = await apiClient.put(`/settings/${key}`, { value, description });
        return res.data.data;
    },

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'system/level-icons');

        const res = await apiClient.post('/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.data; // { url, publicId, ... }
    }
};
