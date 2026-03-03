import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Percent, Ban, Save, Loader2, Info } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function TaxConfiguration() {
  const { currency, convertPrice, convertToUSD, getCurrencySymbol } = useCurrency();
  const [taxType, setTaxType] = useState('none');
  const [taxValue, setTaxValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchTaxConfig(); }, []);

  const fetchTaxConfig = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/tax/config`);
      if (res.data.success) { setTaxType(res.data.taxConfig.type); setTaxValue(res.data.taxConfig.value); }
    } catch (error) { console.error('Error fetching tax config:', error); toast.error('Failed to load tax configuration'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (taxValue < 0) { toast.error('Tax value cannot be negative'); return; }
    if (taxType === 'percentage' && taxValue > 100) { toast.error('Percentage cannot exceed 100'); return; }
    setIsSaving(true);
    try {
      const token = localStorage.getItem('jwtToken');
      const res = await axios.put(`${import.meta.env.VITE_API_URL}api/tax/config`, { type: taxType, value: parseFloat(taxValue) }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) toast.success('Tax configuration updated successfully');
    } catch (error) { toast.error(error.response?.data?.msg || 'Failed to update tax configuration'); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(var(--primary))' }} /></div>;

  const taxOptions = [
    { type: 'none', icon: <Ban className="w-6 h-6" />, title: 'No Tax', description: 'No tax will be applied to orders', color: 'hsl(var(--muted-foreground))' },
    { type: 'percentage', icon: <Percent className="w-6 h-6" />, title: 'Percentage Based Tax', description: 'Tax calculated as percentage of subtotal', color: 'hsl(260, 60%, 55%)' },
    { type: 'fixed', icon: <DollarSign className="w-6 h-6" />, title: 'Fixed Amount Tax', description: 'Fixed tax amount added to all orders', color: 'hsl(150, 60%, 45%)' },
  ];

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="glass-panel p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>Tax Configuration</h1>
            <p className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Configure platform-wide tax settings for all orders</p>
          </div>

          <div className="space-y-4">
            {taxOptions.map(opt => (
              <motion.div key={opt.type} whileHover={{ y: -2 }}
                className={`glass-card p-6 cursor-pointer transition-all`}
                style={taxType === opt.type ? { borderColor: opt.color, borderWidth: '2px', boxShadow: `0 0 20px -8px ${opt.color}40` } : {}}
                onClick={() => { setTaxType(opt.type); if (opt.type === 'none') setTaxValue(0); }}>
                <div className="flex items-center gap-4">
                  <div className="glass-inner p-3 rounded-xl" style={{ color: taxType === opt.type ? opt.color : 'hsl(var(--muted-foreground))' }}>{opt.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{opt.title}</h3>
                    <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{opt.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center`} style={{ borderColor: taxType === opt.type ? opt.color : 'var(--glass-border-strong)' }}>
                    {taxType === opt.type && <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />}
                  </div>
                </div>

                {taxType === 'percentage' && opt.type === 'percentage' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Tax Percentage (0-100)</label>
                    <div className="relative">
                      <input type="number" min="0" max="100" step="0.1" value={taxValue} onChange={(e) => setTaxValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()} className="glass-input pr-10" placeholder="Enter percentage" />
                      <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    </div>
                  </motion.div>
                )}

                {taxType === 'fixed' && opt.type === 'fixed' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Tax Amount ({getCurrencySymbol()}) <span className="normal-case font-normal">in {currency}</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{getCurrencySymbol()}</span>
                      <input type="number" min="0" step="0.01" value={convertPrice(taxValue).toFixed(2)}
                        onChange={(e) => setTaxValue(convertToUSD(parseFloat(e.target.value) || 0))}
                        onClick={(e) => e.stopPropagation()} className="glass-input pl-10" placeholder={`Enter amount in ${currency}`} />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8">
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={isSaving}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(200, 80%, 50%))', boxShadow: '0 0 20px -4px hsl(220, 70%, 55%, 0.3)' }}>
              {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : <><Save className="w-5 h-5" /> Save Configuration</>}
            </motion.button>
          </div>

          {/* Preview */}
          <div className="mt-8 glass-inner rounded-xl p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}><Info size={16} /> Preview</h4>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {taxType === 'none' && 'No tax will be applied to orders.'}
              {taxType === 'percentage' && `${taxValue}% tax will be calculated on order subtotal.`}
              {taxType === 'fixed' && `${getCurrencySymbol()}${convertPrice(taxValue).toFixed(2)} tax will be added to all orders.`}
            </p>
            {taxType !== 'none' && (
              <div className="mt-3 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <p className="font-medium">Example (Subtotal: {getCurrencySymbol()}{convertPrice(100).toFixed(2)}):</p>
                <p>Tax: {getCurrencySymbol()}{taxType === 'percentage' ? convertPrice((100 * taxValue) / 100).toFixed(2) : convertPrice(taxValue).toFixed(2)}</p>
                <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  Total: {getCurrencySymbol()}{taxType === 'percentage' ? convertPrice(100 + (100 * taxValue) / 100).toFixed(2) : convertPrice(100 + parseFloat(taxValue || 0)).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
