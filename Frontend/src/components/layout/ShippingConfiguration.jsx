import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Zap, Gift, Save, Loader2, Clock, DollarSign, Info } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useCurrency } from '../../contexts/CurrencyContext';
import Loader from '../common/Loader';

export default function ShippingConfiguration() {
  const { currency, convertPrice, convertToUSD, getCurrencySymbol } = useCurrency();
  const [methods, setMethods] = useState([
    { type: 'free', cost: 0, deliveryDays: 5, isActive: true },
    { type: 'standard', cost: 5.99, deliveryDays: 5, isActive: false },
    { type: 'fast', cost: 12.99, deliveryDays: 2, isActive: false }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchShippingMethods(); }, []);

  const fetchShippingMethods = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) { toast.error('User not found. Please login again.'); setIsLoading(false); return; }
      const user = JSON.parse(userStr);
      const userId = user._id || user.id;
      if (!userId) { toast.error('Invalid user data.'); setIsLoading(false); return; }
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/shipping/seller/${userId}`);
      if (res.data.success && res.data.shippingMethods.methods.length > 0) setMethods(res.data.shippingMethods.methods);
    } catch (error) { console.error('Error fetching shipping methods:', error); toast.error('Failed to load shipping methods'); }
    finally { setIsLoading(false); }
  };

  const handleMethodChange = (type, field, value) => {
    setMethods(methods.map(method => {
      if (method.type === type) {
        if (type === 'free' && field === 'cost') return method;
        return { ...method, [field]: value };
      }
      return method;
    }));
  };

  const handleSave = async () => {
    const activeMethodsCount = methods.filter(m => m.isActive).length;
    if (activeMethodsCount === 0) { toast.error('At least one shipping method must be active'); return; }
    for (const method of methods) {
      if (method.isActive) {
        if (method.type === 'free' && method.cost !== 0) { toast.error('Free shipping must have 0 cost'); return; }
        if (method.type !== 'free' && method.cost <= 0) { toast.error('Paid shipping must have cost > 0'); return; }
        if (method.deliveryDays < 1) { toast.error('Delivery days must be at least 1'); return; }
      }
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem('jwtToken');
      const res = await axios.put(`${import.meta.env.VITE_API_URL}api/shipping/methods`, { methods }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) toast.success('Shipping methods updated successfully');
    } catch (error) { toast.error(error.response?.data?.msg || 'Failed to update'); }
    finally { setIsSaving(false); }
  };

  const getMethodIcon = (type) => {
    switch (type) {
      case 'free': return <Gift className="w-6 h-6" />;
      case 'standard': return <Truck className="w-6 h-6" />;
      case 'fast': return <Zap className="w-6 h-6" />;
      default: return <Truck className="w-6 h-6" />;
    }
  };

  const getMethodTitle = (type) => ({ free: 'Free Shipping', standard: 'Standard Shipping', fast: 'Fast Shipping' }[type] || type);
  const getMethodDescription = (type) => ({ free: 'No cost shipping option for customers', standard: 'Regular delivery with standard rates', fast: 'Express delivery for urgent orders' }[type] || '');
  const getMethodColor = (type) => ({ free: 'hsl(150, 60%, 45%)', standard: 'hsl(220, 70%, 55%)', fast: 'hsl(30, 90%, 50%)' }[type] || 'hsl(var(--primary))');

  if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader text="Loading shipping methods..." /></div>;

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="glass-panel p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>Shipping Methods Configuration</h1>
            <p className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Configure shipping options for your products</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {methods.map((method) => (
              <motion.div key={method.type} whileHover={{ y: -4 }}
                className={`glass-card p-6 transition-all ${method.isActive ? '' : 'opacity-50'}`}
                style={method.isActive ? { borderColor: getMethodColor(method.type), borderWidth: '2px', boxShadow: `0 0 20px -8px ${getMethodColor(method.type)}40` } : {}}>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="glass-inner p-3 rounded-xl" style={{ color: method.isActive ? getMethodColor(method.type) : 'hsl(var(--muted-foreground))' }}>
                    {getMethodIcon(method.type)}
                  </div>
                  <label className="flex items-center cursor-pointer gap-2">
                    <div className="relative">
                      <input type="checkbox" checked={method.isActive} onChange={(e) => handleMethodChange(method.type, 'isActive', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={{ background: method.isActive ? getMethodColor(method.type) : 'rgba(255,255,255,0.15)', border: '1px solid var(--glass-border)' }}>
                        <div className={`absolute top-[2px] ${method.isActive ? 'left-[22px]' : 'left-[2px]'} w-5 h-5 rounded-full bg-white shadow transition-all`} />
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Enable</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{getMethodTitle(method.type)}</h3>
                  {method.type === 'free' && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'hsl(150, 60%, 40%)' }}>Recommended</span>
                  )}
                </div>
                <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>{getMethodDescription(method.type)}</p>

                {/* Cost Input */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <DollarSign className="w-3.5 h-3.5" /> Shipping Cost ({getCurrencySymbol()})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{getCurrencySymbol()}</span>
                    <input type="number" min="0" step="0.01"
                      value={method.type === 'free' ? 0 : convertPrice(method.cost).toFixed(2)}
                      onChange={(e) => { const c = parseFloat(e.target.value) || 0; handleMethodChange(method.type, 'cost', convertToUSD(c)); }}
                      disabled={!method.isActive || method.type === 'free'}
                      className="glass-input pl-9 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="0.00" />
                  </div>
                </div>

                {/* Delivery Days */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Clock className="w-3.5 h-3.5" /> Delivery Days
                  </label>
                  <input type="number" min="1" value={method.deliveryDays}
                    onChange={(e) => handleMethodChange(method.type, 'deliveryDays', parseInt(e.target.value) || 1)}
                    disabled={!method.isActive}
                    className="glass-input disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Enter days" />
                </div>

                {/* Preview */}
                {method.isActive && (
                  <div className="mt-4 glass-inner rounded-xl p-3">
                    <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Preview:</p>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {getCurrencySymbol()}{convertPrice(method.cost).toFixed(2)} · {method.deliveryDays} {method.deliveryDays === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8">
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={isSaving}
              className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
              {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : <><Save className="w-5 h-5" /> Save Shipping Methods</>}
            </motion.button>
          </div>

          {/* Info Box */}
          <div className="mt-6 glass-inner rounded-xl p-4" style={{ borderLeft: '3px solid hsl(220, 70%, 55%)' }}>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}><Info size={16} /> Important Notes</h4>
            <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <li>At least one shipping method must be active</li>
              <li>Free shipping must have {getCurrencySymbol()}0.00 cost</li>
              <li>Standard and Fast shipping must have cost greater than {getCurrencySymbol()}0</li>
              <li>Delivery days must be at least 1</li>
              <li>Customers will see these options at checkout</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
