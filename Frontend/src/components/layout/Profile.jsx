import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Edit3, Save, X, Loader as LucideLoader, Camera, User as UserIcon } from 'lucide-react';
import Loader from '../common/Loader';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } } };
const cardVariants = { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 100 } } };

const UserProfile = () => {
  const { currentUser, fetchAndUpdateCurrentUser } = useAuth();
  const [userData, setUserData] = useState(currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ username: userData.username, email: userData.email, currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwtToken');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/user/single`, { headers: { Authorization: `Bearer ${token}` } });
      setUserData(res.data?.user);
      fetchAndUpdateCurrentUser();
    } catch (error) { console.error(error); }
    finally { setIsWaiting(false); setLoading(false); }
  };

  useEffect(() => { fetchUser(); }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('profileImage', file);
        const token = localStorage.getItem('jwtToken');
        await axios.post(`${import.meta.env.VITE_API_URL}api/upload/profile-image`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
        setIsWaiting(true);
        fetchUser();
      } catch (error) { console.error(error); toast.error('Failed to upload profile picture.'); }
      finally { setIsUploading(false); }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (userData.username === formData.username) return toast.error('Username is same as before!');
    try {
      const token = localStorage.getItem('jwtToken');
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}api/user/update`, { username: formData.username }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res?.data?.msg || 'Username updated successfully');
      fetchUser();
    } catch (error) { console.error(error); toast.error(error.response?.data?.msg || 'Server error'); }
    setIsEditing(false);
  };

  const handleCancel = () => { setFormData({ username: userData.username, email: userData.email, currentPassword: '', newPassword: '', confirmPassword: '' }); setIsEditing(false); setShowPasswordFields(false); };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('jwtToken');
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}api/password/change`, { currentPassword: formData.currentPassword, newPassword: formData.newPassword, confirmPassword: formData.confirmPassword }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data?.msg || 'Password updated successfully.');
      setShowPasswordFields(false);
    } catch (error) { console.error(error); toast.error(error.response?.data?.msg || 'Server error'); }
  };

  const GlassButton = ({ children, variant = 'primary', ...props }) => {
    const styles = variant === 'primary'
      ? { background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }
      : variant === 'success'
        ? { background: 'rgba(16, 185, 129, 0.15)', color: 'hsl(150, 60%, 40%)', border: '1px solid rgba(16, 185, 129, 0.25)' }
        : { background: 'rgba(255,255,255,0.08)', color: 'hsl(var(--foreground))', border: '1px solid var(--glass-border)' };
    return (
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="flex items-center justify-center px-4 py-2 text-sm rounded-xl font-semibold transition-all" style={styles} {...props}>
        {children}
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <motion.div className="max-w-4xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="flex items-center justify-between mb-8" variants={itemVariants}>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>Profile Settings</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Manage your account information</p>
          </div>
        </motion.div>

        {loading ? (
          <div className='w-full flex justify-center items-center h-[250px]'><Loader /></div>
        ) : (
          <>
            {/* Profile Card */}
            <motion.form onSubmit={handleSave} variants={cardVariants} className="glass-panel p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Personal Information</h2>
                {!isEditing ? (
                  <GlassButton variant="primary" type="button" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Edit Username</span><span className="sm:hidden">Edit</span>
                  </GlassButton>
                ) : (
                  <div className="flex gap-2">
                    <GlassButton variant="success" type="submit"><Save className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Save</span></GlassButton>
                    <GlassButton variant="ghost" type="button" onClick={handleCancel}><X className="h-4 w-4 mr-1" /> Cancel</GlassButton>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    {(userData.avatar || userData.profilePicture) ? (
                      <>
                        <div className={`flex ${isWaiting || isUploading ? 'flex' : 'hidden'} glass-inner z-1 flex-col justify-center items-center absolute top-0 left-0 w-32 h-32 rounded-full`}>
                          <LucideLoader className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                          <p className='text-xs mt-1' style={{ color: 'hsl(var(--muted-foreground))' }}>Updating</p>
                        </div>
                        <img src={userData.avatar || userData.profilePicture || 'https://res.cloudinary.com/dus5sac8g/image/upload/v1756983317/Profile_Picture_dxq4w8.jpg'} alt="Profile" className="w-32 h-32 rounded-full object-cover" style={{ border: '3px solid var(--glass-border-strong)' }} />
                      </>
                    ) : (
                      <div className="w-32 h-32 rounded-full glass-inner flex items-center justify-center" style={{ border: '3px solid var(--glass-border-strong)' }}>
                        <UserIcon className="h-16 w-16" style={{ color: 'hsl(var(--muted-foreground))' }} />
                      </div>
                    )}
                    <label htmlFor="profile-upload" className="absolute z-2 bottom-0 right-0 p-2 rounded-full cursor-pointer shadow-md" style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }}>
                      {isUploading ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="h-5 w-5" />}
                      <input id="profile-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                    </label>
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Click camera to upload</p>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <User className="h-3.5 w-3.5" /> Username
                    </label>
                    {isEditing ? (
                      <input type="text" name="username" value={formData.username} onChange={handleInputChange} required className="glass-input" />
                    ) : (
                      <p className="px-4 py-2 glass-inner rounded-xl text-sm" style={{ color: 'hsl(var(--foreground))' }}>{userData.username}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <Mail className="h-3.5 w-3.5" /> Email Address
                    </label>
                    <p className="px-4 py-2 glass-inner rounded-xl text-sm" style={{ color: 'hsl(var(--foreground))' }}>{userData.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Account Role</label>
                    <p className="px-4 py-2 glass-inner rounded-xl text-sm capitalize" style={{ color: 'hsl(var(--foreground))' }}>{userData.role}</p>
                  </div>
                </div>
              </div>
            </motion.form>

            {/* Password Card */}
            <motion.form onSubmit={handlePasswordUpdate} variants={cardVariants} className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Password Settings</h2>
                {!showPasswordFields ? (
                  <GlassButton variant="primary" type="button" onClick={() => setShowPasswordFields(true)}>
                    <Lock className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Change Password</span><span className="sm:hidden">Change</span>
                  </GlassButton>
                ) : (
                  <div className="flex gap-2">
                    <GlassButton variant="success" type="submit"><Save className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Update</span></GlassButton>
                    <GlassButton variant="ghost" type="button" onClick={() => { setShowPasswordFields(false); setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' })); }}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </GlassButton>
                  </div>
                )}
              </div>

              {showPasswordFields && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                  {[
                    { label: 'Current Password', name: 'currentPassword', show: showCurrentPassword, toggle: () => setShowCurrentPassword(!showCurrentPassword) },
                    { label: 'New Password', name: 'newPassword', show: showNewPassword, toggle: () => setShowNewPassword(!showNewPassword) },
                    { label: 'Confirm New Password', name: 'confirmPassword', show: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword) },
                  ].map(field => (
                    <div key={field.name}>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{field.label}</label>
                      <div className="relative">
                        <input type={field.show ? "text" : "password"} name={field.name} value={formData[field.name]} onChange={handleInputChange} required className="glass-input pr-10" />
                        <button type="button" onClick={field.toggle} className="absolute inset-y-0 right-0 pr-3 flex items-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {field.show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default UserProfile;
