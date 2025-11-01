import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}api/password/forgot`, { email });
      toast.success(res.data.message || 'Password reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="height flex items-center justify-center bg-[var(--color-bg)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--color-text-primary)] font-poppins">
          Forgot Password
        </h2>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-4 py-3 pr-10 transition-all duration-300 focus:border-[var(--color-error)]"
            />
            <Mail className="w-5 h-5 absolute top-3.5 right-3 text-[var(--color-text-secondary)]" />
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
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </motion.button>
        </form>

        <p className="text-sm text-center text-[var(--color-text-secondary)] mt-6">
          Remember your password?{' '}
          <Link
            to={'/login'}
            className="text-[var(--color-error)] hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
