// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useGlobal } from "./GlobalContext";
import { setCrossDomainCookie, getCookie, deleteCookie } from "../utils/cookieHelper";

const AuthContext = createContext();

const JWT_TOKEN_KEY = 'jwtToken';
const JWT_TOKEN_COOKIE = 'rozare_jwt_token';
const CURRENT_USER_KEY = 'currentUser';
const CURRENT_USER_COOKIE = 'rozare_current_user';

// Helper functions for JWT token storage
const getJwtToken = () => {
    // Try cookie first (new method)
    const cookieToken = getCookie(JWT_TOKEN_COOKIE);
    if (cookieToken) {
        return cookieToken;
    }
    
    // Fallback to localStorage (old method) and migrate
    const localToken = localStorage.getItem(JWT_TOKEN_KEY);
    if (localToken) {
        // Migrate to cookie
        setJwtToken(localToken);
        return localToken;
    }
    
    return null;
};

const setJwtToken = (token) => {
    // Save to cookie (primary storage)
    setCrossDomainCookie(JWT_TOKEN_COOKIE, token, 30);
    // Also save to localStorage as backup
    localStorage.setItem(JWT_TOKEN_KEY, token);
};

const removeJwtToken = () => {
    deleteCookie(JWT_TOKEN_COOKIE);
    localStorage.removeItem(JWT_TOKEN_KEY);
};

// Helper functions for current user storage
const getCurrentUserFromStorage = () => {
    // Try cookie first
    const cookieUser = getCookie(CURRENT_USER_COOKIE);
    if (cookieUser && cookieUser !== 'undefined' && cookieUser !== 'null') {
        try {
            return JSON.parse(cookieUser);
        } catch (error) {
            console.error('Error parsing user from cookie:', error);
        }
    }
    
    // Fallback to localStorage
    const localUser = localStorage.getItem(CURRENT_USER_KEY);
    if (localUser && localUser !== 'undefined' && localUser !== 'null') {
        try {
            const user = JSON.parse(localUser);
            // Migrate to cookie
            saveCurrentUserToStorage(user);
            return user;
        } catch (error) {
            console.error('Error parsing currentUser:', error);
            localStorage.removeItem(CURRENT_USER_KEY);
        }
    }
    
    return null;
};

const saveCurrentUserToStorage = (user) => {
    if (user) {
        const userData = JSON.stringify(user);
        // Save to cookie (primary storage)
        setCrossDomainCookie(CURRENT_USER_COOKIE, userData, 30);
        // Also save to localStorage as backup
        localStorage.setItem(CURRENT_USER_KEY, userData);
    }
};

const removeCurrentUserFromStorage = () => {
    deleteCookie(CURRENT_USER_COOKIE);
    localStorage.removeItem(CURRENT_USER_KEY);
};

export const AuthProvider = ({ children }) => {

    // const {
    //     fetchCart
    // } = useGlobal()

    const [currentUser, setCurrentUser] = useState(() => getCurrentUserFromStorage());

    const navigate = useNavigate()

    const fetchAndUpdateCurrentUser = async () => {
        try {
            const token = getJwtToken();
            if (!token) {
                // No token, user not logged in - this is normal
                return;
            }
            const res = await axios.get(`${import.meta.env.VITE_API_URL}api/user/single`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            setCurrentUser(res.data?.user)
        } catch (error) {
            // Only log error if it's not a 403 (unauthorized)
            if (error.response?.status !== 403) {
                console.error(error);
            }
        }
    }

    useEffect(() => {
        fetchAndUpdateCurrentUser()
    }, [])
    
    useEffect(() => {
        if (currentUser) {
            saveCurrentUserToStorage(currentUser);
        } else {
            removeCurrentUserFromStorage();
        }
    }, [currentUser])

    // SIGNUP FUNCTION
    const signup = async (data, reset, setIsLoginActive) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}api/auth/registerr`, data);
            toast.success(res.data.msg);
            reset();
            setIsLoginActive(true); // Switch to login form after successful signup
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Signup failed");
        }
    };

    // LOGIN FUNCTION
    const login = async (data, reset) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}api/auth/login`, data);
            toast.success(res.data.msg);
            setJwtToken(res.data.token);
            setCurrentUser(res.data.user);
            reset();
            // Check for redirect param in URL (e.g., /login?redirect=/become-seller)
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirect');
            if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
                window.location.href = redirectTo;
            } else {
                navigate('/');
                location.reload();
            }
        } catch (error) {
            console.error(error);
            // Re-throw so Login component can catch and show inline error
            throw error;
        }
    };

    // ✅ LOGOUT FUNCTION
    const logout = () => {
        removeJwtToken();
        setCurrentUser(null);
        toast.info("Logged out successfully");
        navigate('/')
    };

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        currentUser,
        setCurrentUser,
        fetchAndUpdateCurrentUser,
        signup,
        login,
        logout
    }), [currentUser]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
