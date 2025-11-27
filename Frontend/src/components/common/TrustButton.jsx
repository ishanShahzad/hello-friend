import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const TrustButton = ({ storeId, storeName, initialTrustCount = 0, initialIsTrusted = false, compact = false, onTrustChange }) => {
  const [isTrusted, setIsTrusted] = useState(initialIsTrusted);
  const [trustCount, setTrustCount] = useState(initialTrustCount);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    setIsTrusted(initialIsTrusted);
    setTrustCount(initialTrustCount);
  }, [initialIsTrusted, initialTrustCount]);

  // Fetch trust status when component mounts if user is logged in
  useEffect(() => {
    const fetchTrustStatus = async () => {
      if (!currentUser || !storeId) return;

      try {
        const token = localStorage.getItem('jwtToken');
        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}api/stores/${storeId}/trust-status`,
          config
        );

        setIsTrusted(response.data.data.isTrusted);
        setTrustCount(response.data.data.trustCount);
      } catch (error) {
        // Silently fail - user might not be authenticated
        console.log('Could not fetch trust status:', error.message);
      }
    };

    fetchTrustStatus();
  }, [storeId, currentUser]);

  const handleTrustToggle = async () => {
    if (!currentUser) {
      toast.error('Please login to trust stores');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('jwtToken');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      if (isTrusted) {
        // Untrust the store
        const response = await axios.delete(
          `${import.meta.env.VITE_API_URL}api/stores/${storeId}/trust`,
          config
        );

        setIsTrusted(false);
        setTrustCount(response.data.data.trustCount);
        toast.success(`You no longer trust ${storeName}`);
        
        // Notify parent component
        if (onTrustChange) {
          onTrustChange(false, response.data.data.trustCount);
        }
      } else {
        // Trust the store
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}api/stores/${storeId}/trust`,
          {},
          config
        );

        console.log('Trust response:', response.data);
        
        setIsTrusted(true);
        setTrustCount(response.data.data.trustCount);
        
        console.log('State updated - isTrusted: true, trustCount:', response.data.data.trustCount);
        
        toast.success(`You now trust ${storeName}`);
        
        // Notify parent component
        if (onTrustChange) {
          onTrustChange(true, response.data.data.trustCount);
        }
      }
    } catch (error) {
      console.error('Trust toggle error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update trust status';
      
      // If already trusted/untrusted, just update the UI state
      if (error.response?.status === 400) {
        if (error.response?.data?.message?.includes('already trusted')) {
          setIsTrusted(true);
          toast.info('You already trust this store');
        } else if (error.response?.data?.message?.includes('not trusted')) {
          setIsTrusted(false);
          toast.info('You have not trusted this store');
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Compact mode for cards (like social media follow button)
  if (compact) {
    return (
      <button
        onClick={handleTrustToggle}
        disabled={isLoading || !currentUser}
        className={`
          flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all
          ${isTrusted
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={!currentUser ? 'Login to trust stores' : ''}
      >
        {isLoading ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <span>{isTrusted ? '✓' : '+'}</span>
        )}
        <span>{isTrusted ? 'Trusting' : 'Trust'}</span>
      </button>
    );
  }

  // Full mode for store pages
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleTrustToggle}
        disabled={isLoading || !currentUser}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${isTrusted
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={!currentUser ? 'Login to trust stores' : ''}
      >
        {isLoading ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <span>{isTrusted ? '✓' : '+'}</span>
        )}
        <span>{isTrusted ? 'Trusting' : 'Trust'}</span>
      </button>
      
      <div className="flex items-center gap-1 text-gray-600">
        <span className="font-semibold">{trustCount}</span>
        <span className="text-sm">{trustCount === 1 ? 'truster' : 'trusters'}</span>
      </div>
    </div>
  );
};

export default TrustButton;
