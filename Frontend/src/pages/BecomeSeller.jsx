import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, ArrowLeft, Sparkles, CheckCircle, CheckCircle2, TrendingUp, Shield, BarChart3, Phone, MapPin, Globe, Instagram, Facebook, Twitter, Youtube, SkipForward, ArrowRight, MessageCircle, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import SEOHead from '../components/common/SEOHead';
import PhoneField, { isValidPhone } from '../components/common/PhoneField';

export default function BecomeSeller() {
  const navigate = useNavigate();
  const { currentUser, fetchAndUpdateCurrentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formStep, setFormStep] = useState(0); // 0: landing, 1: seller info, 2: store setup, 3: WhatsApp verify
  const [formData, setFormData] = useState({ phoneNumber: '', address: '', city: '', country: '', businessName: '' });
  const [storeData, setStoreData] = useState({ storeName: '', storeDescription: '', website: '', instagram: '', facebook: '', twitter: '', youtube: '', tiktok: '' });
  // WhatsApp OTP state
  const [whatsappOtp, setWhatsappOtp] = useState('');
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappVerifying, setWhatsappVerifying] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappCodeSent, setWhatsappCodeSent] = useState(false);
  const [editingNumber, setEditingNumber] = useState(false);
  // Timers
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const countdownRef = useRef(null);
  const resendRef = useRef(null);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleStoreChange = (e) => { const { name, value } = e.target; setStoreData(prev => ({ ...prev, [name]: value })); };

  // Countdown timer effect
  useEffect(() => {
    if (otpCountdown > 0) {
      countdownRef.current = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(countdownRef.current);
    }
  }, [otpCountdown]);

  useEffect(() => {
    if (resendCooldown > 0) {
      resendRef.current = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(resendRef.current);
    }
  }, [resendCooldown]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendWhatsAppOtp = async () => {
    if (!formData.phoneNumber || !isValidPhone(formData.phoneNumber)) {
      setWhatsappError('Please enter a valid phone number first');
      return;
    }
    setWhatsappSending(true);
    setWhatsappError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}api/seller-whatsapp/send-otp`, { whatsappNumber: formData.phoneNumber });
      setWhatsappCodeSent(true);
      setOtpCountdown(120);
      setResendCooldown(30);
      setEditingNumber(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 503) {
        setWhatsappError('WhatsApp verification is temporarily unavailable. Please try again later.');
      } else if (status === 429) {
        setWhatsappError(err.response?.data?.msg || 'Too many attempts. Please try again later.');
      } else {
        setWhatsappError(err.response?.data?.message || err.response?.data?.msg || 'Failed to send verification code');
      }
    } finally {
      setWhatsappSending(false);
    }
  };

  const handleVerifyWhatsApp = async () => {
    setWhatsappVerifying(true);
    setWhatsappError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}api/seller-whatsapp/verify-otp`, { whatsappNumber: formData.phoneNumber, otp: whatsappOtp });
      setWhatsappVerified(true);
      setWhatsappCodeSent(false);
      setWhatsappOtp('');
      setOtpCountdown(0);
    } catch (err) {
      setWhatsappError(err.response?.data?.message || err.response?.data?.msg || 'Invalid code. Please try again.');
    } finally {
      setWhatsappVerifying(false);
    }
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!formData.phoneNumber || !isValidPhone(formData.phoneNumber)) { toast.error('Please enter a valid phone number (select your country and enter the number)'); return; }
    if (!formData.address || formData.address.trim().length < 5) { toast.error('Please enter a valid address'); return; }
    if (!formData.city || formData.city.trim().length < 2) { toast.error('Please enter your city'); return; }
    if (!formData.country || formData.country.trim().length < 2) { toast.error('Please enter your country'); return; }
    setFormStep(2);
  };

  const handleStep2Next = (skipStore = false) => {
    if (!skipStore && storeData.storeName && storeData.storeName.trim().length < 3) {
      toast.error('Store name must be at least 3 characters'); return;
    }
    // Go to WhatsApp verification step
    setFormStep(3);
  };

  const handleBecomeSeller = async () => {
    if (!whatsappVerified) { toast.error('Please verify your WhatsApp number first'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('jwtToken');
      const socialLinks = {};
      if (storeData.website) socialLinks.website = storeData.website;
      if (storeData.instagram) socialLinks.instagram = storeData.instagram;
      if (storeData.facebook) socialLinks.facebook = storeData.facebook;
      if (storeData.twitter) socialLinks.twitter = storeData.twitter;
      if (storeData.youtube) socialLinks.youtube = storeData.youtube;
      if (storeData.tiktok) socialLinks.tiktok = storeData.tiktok;

      const res = await axios.post(`${import.meta.env.VITE_API_URL}api/user/become-seller`, {
        phoneNumber: formData.phoneNumber.trim(), address: formData.address.trim(),
        city: formData.city.trim(), country: formData.country.trim(), businessName: formData.businessName.trim(),
        whatsappNumber: formData.phoneNumber.trim(),
        whatsappVerified: true,
        storeName: storeData.storeName?.trim() || '',
        storeDescription: storeData.storeDescription?.trim() || '',
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.token) localStorage.setItem('jwtToken', res.data.token);
      toast.success('Congratulations! You are now a seller!');
      await fetchAndUpdateCurrentUser();
      setTimeout(() => { window.location.href = '/seller-dashboard/store-overview'; }, 1500);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to create seller account'); }
    finally { setLoading(false); }
  };

  if (currentUser?.role === 'seller' || currentUser?.role === 'admin') { navigate('/'); return null; }

  const benefits = [
    { icon: <TrendingUp size={28} />, title: 'Grow Your Business', description: 'Reach millions of customers and scale your sales', color: 'hsl(220, 70%, 55%)' },
    { icon: <Shield size={28} />, title: 'Secure Platform', description: 'Safe payments and buyer protection guaranteed', color: 'hsl(200, 80%, 50%)' },
    { icon: <BarChart3 size={28} />, title: 'Analytics & Insights', description: 'Track performance with powerful analytics tools', color: 'hsl(150, 60%, 45%)' },
  ];

  const features = ['Full store management dashboard', 'Product listing & inventory control', 'Order management system', 'Secure payment processing', 'Real-time sales analytics', 'Customer communication tools', 'Marketing & promotion features', '24/7 seller support'];

  return (
    <div className="min-h-screen py-12 px-4">
      <SEOHead
        title="Become a Seller — Start Selling Online for Free"
        description="Join Rozare as a seller and start your e-commerce business for free. Create your online store, list unlimited products, manage orders, track sales analytics, and reach millions of customers worldwide. No hidden costs, no monthly fees — just sell and grow."
        canonical="/become-seller"
        keywords="become a seller, sell online free, start selling online, open online store, create store free, rozare seller, sell products online, e-commerce seller, online business, start online business, vendor registration, seller signup, free seller account, sell from home, side hustle, make money online, dropshipping, sell handmade products, sell crafts online, sell electronics online, sell fashion online, online shop owner"
        jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Become a Seller on Rozare',
            description: 'Start selling online for free on Rozare marketplace. Create your store and reach customers worldwide.',
            url: 'https://rozare.com/become-seller',
            potentialAction: {
                '@type': 'RegisterAction',
                name: 'Register as Seller',
                target: 'https://rozare.com/become-seller',
            },
        }}
      />
      <div className="max-w-4xl mx-auto">
        <button onClick={() => formStep > 0 ? setFormStep(formStep - 1) : navigate(-1)} className="flex items-center gap-2 mb-6 transition-colors text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <ArrowLeft size={20} /> <span>Back</span>
        </button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 30px -4px hsl(220, 70%, 55%, 0.4)' }}>
              <Store size={48} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Become a Seller - FREE
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Join thousands of successful sellers and start your e-commerce journey today</p>
          <p className="text-xl font-bold" style={{ color: 'hsl(150, 60%, 45%)' }}>
            <Sparkles size={18} className="inline mr-1" /> Create your store for FREE - No hidden costs!
          </p>
        </motion.div>

        {formStep === 0 && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid md:grid-cols-3 gap-6 mb-8">
              {benefits.map((b, i) => (
                <motion.div key={i} whileHover={{ y: -4 }} className="glass-card p-6 text-center">
                  <div className="glass-inner w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ color: b.color }}>{b.icon}</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{b.title}</h3>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{b.description}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                <Sparkles size={24} style={{ color: 'hsl(45, 93%, 47%)' }} /> What You'll Get
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle size={20} style={{ color: 'hsl(150, 60%, 45%)' }} className="shrink-0" />
                    <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl p-8 text-center text-white" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 40px -8px hsl(220, 70%, 55%, 0.4)' }}>
              <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
              <p className="text-white/90 mb-2 max-w-2xl mx-auto text-lg">Click below to provide your details and activate your seller account!</p>
              <p className="font-semibold text-xl mb-6" style={{ color: 'hsl(45, 93%, 70%)' }}>
                <Sparkles size={18} className="inline mr-1" /> 100% FREE - No setup fees, no monthly charges!
              </p>
              <motion.button onClick={() => setFormStep(1)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="font-bold text-lg px-12 py-4 rounded-full shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-3"
                style={{ background: 'white', color: 'hsl(220, 70%, 55%)' }}>
                <Store size={24} /> Get Started
              </motion.button>
            </motion.div>
          </>
        )}

        {/* Step 1: Seller Info */}
        {formStep === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
            <h2 className="text-3xl font-bold mb-2 text-center" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Seller Information</h2>
            <p className="text-center mb-6 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Please provide your contact details</p>
            <form onSubmit={handleStep1Next} className="space-y-6">
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider mb-2 items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <Phone size={14} style={{ color: 'hsl(var(--primary))' }} /> WhatsApp Number <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span>
                </label>
                <PhoneField
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(v) => { setFormData((prev) => ({ ...prev, phoneNumber: v || '' })); if (whatsappVerified) { setWhatsappVerified(false); setWhatsappCodeSent(false); setWhatsappOtp(''); } }}
                  profileCountry={formData.country}
                  required
                  placeholder="WhatsApp number"
                />
                <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>We'll send order notifications on this number. You'll verify it in the final step.</p>
              </div>
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider mb-2 items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <Store size={14} style={{ color: 'hsl(var(--primary))' }} /> Business Name (Optional)
                </label>
                <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} placeholder="Your business or brand name" className="glass-input" maxLength={100} />
              </div>
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider mb-2 items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <MapPin size={14} style={{ color: 'hsl(var(--primary))' }} /> Address <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span>
                </label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Street address" className="glass-input" required />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>City <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span></label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="Your city" className="glass-input" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Country <span style={{ color: 'hsl(0, 72%, 55%)' }}>*</span></label>
                  <input type="text" name="country" value={formData.country} onChange={handleInputChange} placeholder="Your country" className="glass-input" required />
                </div>
              </div>
              <button type="submit" className="w-full py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
                Next: Store Setup <ArrowRight size={18} />
              </button>
            </form>
          </motion.div>
        )}

        {/* Step 2: Store Setup */}
        {formStep === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8">
            <h2 className="text-3xl font-bold mb-2 text-center" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Set Up Your Store</h2>
            <p className="text-center mb-6 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Create your store now or skip and set it up later</p>
            <div className="space-y-5">
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider mb-2 items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <Store size={14} style={{ color: 'hsl(var(--primary))' }} /> Store Name <span className="normal-case font-normal text-xs">(recommended)</span>
                </label>
                <input type="text" name="storeName" value={storeData.storeName} onChange={handleStoreChange} placeholder="My Awesome Store" className="glass-input" maxLength={50} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Store Description <span className="normal-case font-normal">(optional)</span></label>
                <textarea name="storeDescription" value={storeData.storeDescription} onChange={handleStoreChange} placeholder="Tell customers about your store..." className="glass-input" maxLength={500} rows={2} style={{ resize: 'none' }} />
              </div>
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider mb-2 items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <Globe size={14} style={{ color: 'hsl(var(--primary))' }} /> Website <span className="normal-case font-normal">(optional)</span>
                </label>
                <input type="url" name="website" value={storeData.website} onChange={handleStoreChange} placeholder="https://yourwebsite.com" className="glass-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex text-xs font-medium mb-1.5 items-center gap-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}><Instagram size={13} /> Instagram</label>
                  <input type="text" name="instagram" value={storeData.instagram} onChange={handleStoreChange} className="glass-input text-sm" placeholder="@handle" />
                </div>
                <div>
                  <label className="flex text-xs font-medium mb-1.5 items-center gap-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}><Facebook size={13} /> Facebook</label>
                  <input type="text" name="facebook" value={storeData.facebook} onChange={handleStoreChange} className="glass-input text-sm" placeholder="Page URL" />
                </div>
                <div>
                  <label className="flex text-xs font-medium mb-1.5 items-center gap-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}><Twitter size={13} /> Twitter / X</label>
                  <input type="text" name="twitter" value={storeData.twitter} onChange={handleStoreChange} className="glass-input text-sm" placeholder="@handle" />
                </div>
                <div>
                  <label className="flex text-xs font-medium mb-1.5 items-center gap-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}><Youtube size={13} /> YouTube</label>
                  <input type="text" name="youtube" value={storeData.youtube} onChange={handleStoreChange} className="glass-input text-sm" placeholder="Channel URL" />
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-3">
              <motion.button onClick={() => handleStep2Next(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
                Next: Verify WhatsApp <ArrowRight size={18} />
              </motion.button>
              <button onClick={() => handleStep2Next(true)}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-xl glass-button flex items-center justify-center gap-2"
                style={{ color: 'hsl(var(--muted-foreground))' }}>
                <SkipForward size={14} /> Skip store setup — verify WhatsApp
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: WhatsApp Verification (MANDATORY) */}
        {formStep === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 max-w-md mx-auto">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 40%), hsl(170, 70%, 38%))', color: '#fff' }}>
                <MessageCircle size={28} />
              </div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>Verify WhatsApp</h2>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Verify your WhatsApp number to activate your seller account
              </p>
            </div>

            {/* Show number with edit */}
            <div className="p-4 rounded-xl mb-4" style={{ background: 'hsla(220, 70%, 55%, 0.06)', border: '1px solid hsla(220, 70%, 55%, 0.15)' }}>
              {editingNumber ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Edit WhatsApp Number</label>
                  <PhoneField
                    value={formData.phoneNumber}
                    onChange={(v) => { setFormData(prev => ({ ...prev, phoneNumber: v || '' })); setWhatsappVerified(false); setWhatsappCodeSent(false); setWhatsappOtp(''); setOtpCountdown(0); }}
                    profileCountry={formData.country}
                    placeholder="WhatsApp number"
                  />
                  <button type="button" onClick={() => setEditingNumber(false)}
                    className="w-full py-2 rounded-lg text-xs font-medium glass-inner" style={{ color: 'hsl(var(--foreground))' }}>
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>WhatsApp Number</p>
                    <p className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>{formData.phoneNumber || '—'}</p>
                  </div>
                  <button type="button" onClick={() => { setEditingNumber(true); setWhatsappCodeSent(false); setWhatsappOtp(''); setOtpCountdown(0); setWhatsappError(''); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 glass-inner"
                    style={{ color: 'hsl(var(--primary))' }}>
                    <Edit3 size={12} /> Edit
                  </button>
                </div>
              )}
            </div>

            {whatsappVerified ? (
              /* Verified state */
              <div className="text-center">
                <div className="p-4 rounded-xl mb-4" style={{ background: 'hsla(150, 70%, 40%, 0.08)', border: '1px solid hsla(150, 70%, 40%, 0.2)' }}>
                  <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: 'hsl(150, 70%, 40%)' }} />
                  <p className="text-sm font-bold" style={{ color: 'hsl(150, 70%, 40%)' }}>WhatsApp Verified!</p>
                </div>
                <motion.button onClick={handleBecomeSeller} disabled={loading} whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full py-3 px-6 rounded-xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
                  {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Activating...</> : <><Store size={20} /> Activate Seller Account</>}
                </motion.button>
              </div>
            ) : whatsappCodeSent ? (
              /* OTP entry state */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Enter the 6-digit code sent to your WhatsApp
                  </label>
                  <input type="text" value={whatsappOtp} onChange={(e) => { setWhatsappOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setWhatsappError(''); }}
                    className="glass-input text-center text-2xl font-bold tracking-widest" placeholder="000000" maxLength={6} />
                </div>

                {/* Countdown timer */}
                {otpCountdown > 0 && (
                  <div className="text-center">
                    <p className="text-xs" style={{ color: otpCountdown <= 30 ? 'hsl(0, 72%, 55%)' : 'hsl(var(--muted-foreground))' }}>
                      Code expires in <span className="font-bold">{formatCountdown(otpCountdown)}</span>
                    </p>
                  </div>
                )}
                {otpCountdown === 0 && whatsappCodeSent && (
                  <div className="text-center">
                    <p className="text-xs font-medium" style={{ color: 'hsl(0, 72%, 55%)' }}>Code expired. Please request a new one.</p>
                  </div>
                )}

                {whatsappError && <p className="text-xs text-center" style={{ color: 'hsl(0, 72%, 55%)' }}>{whatsappError}</p>}

                <button type="button" onClick={handleVerifyWhatsApp} disabled={whatsappVerifying || whatsappOtp.length !== 6 || otpCountdown === 0}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  style={{ background: 'hsl(150, 70%, 40%)' }}>
                  {whatsappVerifying ? 'Verifying...' : <><CheckCircle2 size={16} /> Verify Code</>}
                </button>

                {/* Resend */}
                <div className="text-center">
                  {resendCooldown > 0 ? (
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Resend available in <span className="font-bold">{resendCooldown}s</span>
                    </p>
                  ) : (
                    <button type="button" onClick={handleSendWhatsAppOtp} disabled={whatsappSending}
                      className="text-xs font-medium underline disabled:opacity-50" style={{ color: 'hsl(var(--primary))' }}>
                      {whatsappSending ? 'Sending...' : 'Resend Code'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Initial state — send code button */
              <div className="space-y-3">
                <button type="button" onClick={handleSendWhatsAppOtp}
                  disabled={whatsappSending || !formData.phoneNumber || !isValidPhone(formData.phoneNumber)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(150, 70%, 40%), hsl(170, 70%, 38%))' }}>
                  <MessageCircle size={16} /> {whatsappSending ? 'Sending...' : 'Send Verification Code'}
                </button>
                {whatsappError && <p className="text-xs text-center" style={{ color: 'hsl(0, 72%, 55%)' }}>{whatsappError}</p>}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
