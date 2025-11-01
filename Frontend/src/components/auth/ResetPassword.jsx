import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ResetPassword = () => {
    const { token } = useParams(); // Assume route is /reset-password/:token
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    console.log(token);
    

    const handleReset = async (e) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}api/password/reset/${token}`, { password });
            toast.success(res.data.msg || 'Password reset successful');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h flex items-center justify-center bg-[var(--color-bg)] p-6">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="card w-full max-w-md"
            >
                <h2 className="text-2xl font-bold mb-6 text-center text-[var(--color-text-primary)] font-poppins">
                    Reset Password
                </h2>

                <form onSubmit={handleReset} className="space-y-5">
                    <div className="relative">
                        <input
                            type="password"
                            placeholder="New Password"
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-4 py-3 pr-10 transition-all duration-300 focus:border-[var(--color-error)]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Lock className="w-5 h-5 absolute top-3.5 right-3 text-[var(--color-text-secondary)]" />
                    </div>

                    <div className="relative">
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-4 py-3 pr-10 transition-all duration-300 focus:border-[var(--color-error)]"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <Lock className="w-5 h-5 absolute top-3.5 right-3 text-[var(--color-text-secondary)]" />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={loading}
                        type="submit"
                        className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </motion.button>
                </form>

                <p className="text-sm text-center text-[var(--color-text-secondary)] mt-6">
                    <Link to={'/login'} className="text-[var(--color-error)] hover:underline">
                        Back to Login
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
