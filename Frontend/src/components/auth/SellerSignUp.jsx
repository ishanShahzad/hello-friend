import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Eye, EyeOff, AlertCircle, CheckCircle2, Store, Phone, MapPin, ArrowLeft, ArrowRight, Globe, Instagram, Facebook, Twitter, Youtube, SkipForward } from 'lucide-react';
import GlassBackground from '../common/GlassBackground';
import { motion, AnimatePresence } from 'framer-motion';

const SellerSignUp = () => {
  const [step, setStep] = useState(1); // 1: account, 2: business info, 3: store setup, 4: OTP
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [sellerForm, setSellerForm] = useState({ phoneNumber: '', businessName: '', address: '', city: '', country: '' });
  const [storeForm, setStoreForm] = useState({ storeName: '', storeDescription: '', website: '', instagram: '', facebook: '', twitter: '', youtube: '', tiktok: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
    if (error) setError('');
  };

  const handleSellerChange = (e) => {
    const { name, value } = e.target;
    setSellerForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleStoreChange = (e) => {
    const { name, value } = e.target;
    setStoreForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) { setError('Please fill in all fields'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setStep(2);
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    if (!sellerForm.phoneNumber || sellerForm.phoneNumber.trim().length < 10) { setError('Please enter a valid phone number (at least 10 digits)'); return; }
    if (!sellerForm.address || sellerForm.address.trim().length < 5) { setError('Please enter a valid address'); return; }
    if (!sellerForm.city || sellerForm.city.trim().length < 2) { setError('Please enter your city'); return; }
    if (!sellerForm.country || sellerForm.country.trim().length < 2) { setError('Please enter your country'); return; }
    setError(''); setStep(3);
  };

  const handleStep3Submit = async (skipStore = false) => {
    if (!skipStore && storeForm.storeName && storeForm.storeName.trim().length < 3) {
      setError('Store name must be at least 3 characters'); return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}api/auth/seller/send-otp`, {
        ...form, ...sellerForm
      }, { timeout: 30000 });
      setSuccess(res.data.msg || 'OTP sent successfully!');
      setStep(4);
    } catch (error) {
      if (error.code === 'ECONNABORTED') setError('Request timed out. Please try again.');
      else setError(error.response?.data?.msg || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const socialLinks = {};
      if (storeForm.website) socialLinks.website = storeForm.website;
      if (storeForm.instagram) socialLinks.instagram = storeForm.instagram;
      if (storeForm.facebook) socialLinks.facebook = storeForm.facebook;
      if (storeForm.twitter) socialLinks.twitter = storeForm.twitter;
      if (storeForm.youtube) socialLinks.youtube = storeForm.youtube;
      if (storeForm.tiktok) socialLinks.tiktok = storeForm.tiktok;

      const res = await axios.post(`${import.meta.env.VITE_API_URL}api/auth/seller/verify-otp`, {
        email: form.email, otp, ...sellerForm,
        storeName: storeForm.storeName?.trim() || '',
        storeDescription: storeForm.storeDescription?.trim() || '',
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined
      });
      localStorage.setItem("jwtToken", res.data.token);
      localStorage.setItem("currentUser", JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);
      toast.success('Seller account created successfully!');
      navigate('/seller-dashboard/store-overview');
      location.reload();
    } catch (error) {
      setError(error.response?.data?.msg || 'Invalid OTP. Please check and try again.');
    } finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}api/auth/seller/send-otp`, { ...form, ...sellerForm });
      setSuccess('OTP resent successfully!');
    } catch { setError('Failed to resend OTP.'); }
    finally { setLoading(false); }
  };

  const alertVariants = { initial: { opacity: 0, y: -8, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -8, scale: 0.95 } };
  const stepTitles = ['Create Account', 'Business Details', 'Store Setup', 'Verify Email'];
  const stepDescriptions = ['Set up your seller credentials', 'Tell us about your business', 'Set up your store (optional)', 'Check your email for the code'];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <GlassBackground />
      <Link to="/"><button className="absolute top-3 left-3 glass-button px-4 py-2 font-semibold rounded-xl cursor-pointer z-50 text-sm" style={{ color: 'hsl(var(--primary))' }}>← Home</button></Link>
      <div className="w-full max-w-md glass-panel-strong overflow-hidden relative z-10">
        <div className="p-8">
          <div className="text-center mb-6">
            <img src="/rozare-logo.svg" alt="Rozare" className="h-12 mx-auto mb-4" />
            <div className="tag-pill mx-auto w-fit mb-4"><Store size={12} /> Seller Registration</div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: 'hsl(var(--foreground))' }}>{stepTitles[step - 1]}</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>{stepDescriptions[step - 1]}</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{ background: step >= s ? 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))' : 'hsl(var(--muted))', color: step >= s ? 'white' : 'hsl(var(--muted-foreground))' }}>
                  {step > s ? '✓' : s}
                </div>
                {s < 4 && <div className="w-6 h-0.5 rounded" style={{ background: step > s ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }} />}
              </div>
            ))}
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="error" variants={alertVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}
                className="mb-5 flex items-start gap-3 p-3.5 rounded-xl border" style={{ background: 'hsla(0, 70%, 50%, 0.08)', borderColor: 'hsla(0, 70%, 50%, 0.25)' }}>
                <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: 'hsl(0, 70%, 55%)' }} />
                <p className="text-sm font-medium" style={{ color: 'hsl(0, 70%, 60%)' }}>{error}</p>
              </motion.div>
            )}
            {success && !error && (
              <motion.div key="success" variants={alertVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}
                className="mb-5 flex items-start gap-3 p-3.5 rounded-xl border" style={{ background: 'hsla(142, 70%, 45%, 0.08)', borderColor: 'hsla(142, 70%, 45%, 0.25)' }}>
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: 'hsl(142, 70%, 45%)' }} />
                <p className="text-sm font-medium" style={{ color: 'hsl(142, 70%, 50%)' }}>{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 1: Account Info */}
          {step === 1 && (
            <form onSubmit={handleStep1Next}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
                  <input id="username" type="text" value={form.username} onChange={handleChange} className="glass-input" placeholder="johndoe" required disabled={loading} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
                  <input id="email" type="email" value={form.email} onChange={handleChange} className="glass-input" placeholder="john@example.com" required disabled={loading} />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                  <div className="relative flex items-center">
                    <input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} className="glass-input pr-10" placeholder="••••••••" required disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 flex items-center justify-center transition-colors cursor-pointer" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full mt-8 py-3 px-4 rounded-xl font-semibold glow-soft hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }}>
                Next <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <form onSubmit={handleStep2Next}>
              <div className="space-y-4">
                <div>
                  <label className="flex text-sm font-medium mb-1 items-center gap-2"><Phone size={14} style={{ color: 'hsl(var(--primary))' }} /> Phone Number <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span></label>
                  <input type="tel" name="phoneNumber" value={sellerForm.phoneNumber} onChange={handleSellerChange} className="glass-input" placeholder="+1 234 567 8900" required disabled={loading} />
                </div>
                <div>
                  <label className="flex text-sm font-medium mb-1 items-center gap-2"><Store size={14} style={{ color: 'hsl(var(--primary))' }} /> Business Name (Optional)</label>
                  <input type="text" name="businessName" value={sellerForm.businessName} onChange={handleSellerChange} className="glass-input" placeholder="Your business or brand name" disabled={loading} maxLength={100} />
                </div>
                <div>
                  <label className="flex text-sm font-medium mb-1 items-center gap-2"><MapPin size={14} style={{ color: 'hsl(var(--primary))' }} /> Address <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span></label>
                  <input type="text" name="address" value={sellerForm.address} onChange={handleSellerChange} className="glass-input" placeholder="Street address" required disabled={loading} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">City <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span></label>
                    <input type="text" name="city" value={sellerForm.city} onChange={handleSellerChange} className="glass-input" placeholder="Your city" required disabled={loading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Country <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span></label>
                    <input type="text" name="country" value={sellerForm.country} onChange={handleSellerChange} className="glass-input" placeholder="Your country" required disabled={loading} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => { setStep(1); setError(''); }} className="flex-1 py-3 px-4 rounded-xl font-semibold glass-button flex items-center justify-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button type="submit" className="flex-1 py-3 px-4 rounded-xl font-semibold glow-soft hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }}>
                  Next <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Store Setup */}
          {step === 3 && (
            <div>
              <div className="space-y-4">
                <div>
                  <label className="flex text-sm font-medium mb-1 items-center gap-2"><Store size={14} style={{ color: 'hsl(var(--primary))' }} /> Store Name <span className="text-xs font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>(recommended)</span></label>
                  <input type="text" name="storeName" value={storeForm.storeName} onChange={handleStoreChange} className="glass-input" placeholder="My Awesome Store" disabled={loading} maxLength={50} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Store Description <span className="text-xs font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>(optional)</span></label>
                  <textarea name="storeDescription" value={storeForm.storeDescription} onChange={handleStoreChange} className="glass-input" placeholder="Tell customers about your store..." disabled={loading} maxLength={500} rows={2} style={{ resize: 'none' }} />
                </div>
                <div>
                  <label className="flex text-sm font-medium mb-1 items-center gap-2"><Globe size={14} style={{ color: 'hsl(var(--primary))' }} /> Website <span className="text-xs font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>(optional)</span></label>
                  <input type="url" name="website" value={storeForm.website} onChange={handleStoreChange} className="glass-input" placeholder="https://yourwebsite.com" disabled={loading} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex text-xs font-medium mb-1 items-center gap-1"><Instagram size={12} /> Instagram</label>
                    <input type="text" name="instagram" value={storeForm.instagram} onChange={handleStoreChange} className="glass-input text-sm" placeholder="@handle" disabled={loading} />
                  </div>
                  <div>
                    <label className="flex text-xs font-medium mb-1 items-center gap-1"><Facebook size={12} /> Facebook</label>
                    <input type="text" name="facebook" value={storeForm.facebook} onChange={handleStoreChange} className="glass-input text-sm" placeholder="Page URL" disabled={loading} />
                  </div>
                  <div>
                    <label className="flex text-xs font-medium mb-1 items-center gap-1"><Twitter size={12} /> Twitter / X</label>
                    <input type="text" name="twitter" value={storeForm.twitter} onChange={handleStoreChange} className="glass-input text-sm" placeholder="@handle" disabled={loading} />
                  </div>
                  <div>
                    <label className="flex text-xs font-medium mb-1 items-center gap-1"><Youtube size={12} /> YouTube</label>
                    <input type="text" name="youtube" value={storeForm.youtube} onChange={handleStoreChange} className="glass-input text-sm" placeholder="Channel URL" disabled={loading} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => { setStep(2); setError(''); }} className="flex-1 py-3 px-4 rounded-xl font-semibold glass-button flex items-center justify-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button type="button" onClick={() => handleStep3Submit(false)} disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold glow-soft hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }}>
                  {loading ? 'Sending OTP...' : <><span>Continue</span> <ArrowRight size={18} /></>}
                </button>
              </div>
              <button type="button" onClick={() => handleStep3Submit(true)} disabled={loading}
                className="w-full mt-3 py-2 px-4 text-sm font-medium transition flex items-center justify-center gap-2 rounded-xl glass-button"
                style={{ color: 'hsl(var(--muted-foreground))' }}>
                <SkipForward size={14} /> Skip — I'll set up my store later
              </button>
            </div>
          )}

          {/* Step 4: OTP */}
          {step === 4 && (
            <form onSubmit={handleVerifyOTP}>
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>We've sent a code to</p>
                  <p className="font-semibold">{form.email}</p>
                </div>
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium mb-1 text-center">Enter OTP</label>
                  <input id="otp" type="text" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(''); }}
                    className="glass-input text-center text-2xl font-bold tracking-widest" placeholder="000000" maxLength={6} required disabled={loading} />
                </div>
                <div className="text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Didn't receive the code?{' '}
                  <button type="button" onClick={handleResendOTP} disabled={loading} className="font-medium underline disabled:opacity-50" style={{ color: 'hsl(var(--primary))' }}>Resend OTP</button>
                </div>
              </div>
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full mt-8 py-3 px-4 rounded-xl font-semibold glow-soft hover:-translate-y-0.5 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }}>
                {loading ? 'Creating Account...' : 'Create Seller Account'}
              </button>
              <button type="button" onClick={() => { setStep(3); setOtp(''); setError(''); setSuccess(''); }}
                className="w-full mt-4 py-2 px-4 font-medium transition" style={{ color: 'hsl(var(--muted-foreground))' }}>← Back</button>
            </form>
          )}

          {step === 1 && (
            <>
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/15" /></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Or</span></div>
                </div>
                <div className="mt-6 text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Already have an account?{' '}
                  <button onClick={() => navigate("/login")} className="font-medium underline" style={{ color: 'hsl(var(--primary))' }}>Log in</button>
                </div>
                <div className="mt-3 text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Want to sign up as a buyer?{' '}
                  <button onClick={() => navigate("/signup")} className="font-medium underline" style={{ color: 'hsl(var(--primary))' }}>Sign up here</button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="py-4 px-8 border-t border-white/15 text-center">
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>By signing up, you agree to our Terms and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default SellerSignUp;
