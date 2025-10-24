// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useGlobal } from "./GlobalContext";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    // const {
    //     fetchCart
    // } = useGlobal()

    const [currentUser, setCurrentUser] = useState(() => {
        let user = localStorage.getItem('currentUser')
        if (user) return JSON.parse(user)
        else return null
    });

    const navigate = useNavigate()

    const fetchAndUpdateCurrentUser = async () => {
        try {
            const token = localStorage.getItem('jwtToken')
            const res = await axios.get('http://localhost:5000/api/user/single',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            setCurrentUser(res.data?.user)
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        fetchAndUpdateCurrentUser()
    }, [])
    useEffect(() => {
        localStorage.setItem('currentUser', JSON.stringify(currentUser))
    }, [currentUser])

    // SIGNUP FUNCTION
    const signup = async (data, reset, setIsLoginActive) => {
        try {
            const res = await axios.post("http://localhost:5000/api/auth/registerr", data);
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
            const res = await axios.post("http://localhost:5000/api/auth/login", data);
            toast.success(res.data.msg);
            localStorage.setItem("jwtToken", res.data.token);
            setCurrentUser(res.data.user);
            reset();
            navigate('/')
            // fetchCart()
            location.reload()
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Login failed");
        }
    };

    // ✅ LOGOUT FUNCTION
    const logout = () => {
        localStorage.removeItem("jwtToken");
        setCurrentUser(null);
        toast.info("Logged out successfully");
        navigate('/')
    };

    return (
        <AuthContext.Provider value={{ currentUser, fetchAndUpdateCurrentUser , signup, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
