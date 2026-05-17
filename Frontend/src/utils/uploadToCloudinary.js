import axios from 'axios';
import { getAuthToken } from "../utils/cookieHelper";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/';

export const uploadImageToCloudinary = async (file) => {
    if (!file) {
        throw new Error('No file provided');
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size should be less than 5MB');
    }

    const formData = new FormData();
    formData.append('productImage', file);

    try {
        const token = getAuthToken();
        const response = await axios.post(
            `${API_BASE}api/upload/product-image`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            }
        );
        
        return response.data.imageUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(error.response?.data?.msg || 'Failed to upload image');
    }
};
