import axios from 'axios';
import { toast } from 'react-toastify';

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
        const token = localStorage.getItem('jwtToken');
        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}api/upload/product-image`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        
        return response.data.imageUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(error.response?.data?.msg || 'Failed to upload image');
    }
};
