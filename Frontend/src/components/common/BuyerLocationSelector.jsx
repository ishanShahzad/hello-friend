import { useState } from 'react';
import { MapPin, Crosshair, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { useBuyerLocation } from '../../contexts/BuyerLocationContext';

const inputStyle = {
  background: 'var(--glass-bg-strong)',
  border: '1px solid var(--glass-border)',
  color: 'hsl(var(--foreground))',
};

const BuyerLocationSelector = ({ compact = false }) => {
  const {
    buyerLocation,
    detecting,
    updateBuyerLocation,
    resetBuyerLocation,
    useCurrentPosition,
  } = useBuyerLocation();
  const [open, setOpen] = useState(!compact);
  const [locating, setLocating] = useState(false);

  const summary = buyerLocation.town
    || buyerLocation.city
    || buyerLocation.region
    || buyerLocation.country
    || 'Select area';

  const handleCurrentPosition = async () => {
    try {
      setLocating(true);
      await useCurrentPosition();
      toast.success('Location enabled for radius-based stores.');
    } catch (error) {
      toast.error(error.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-3 sm:p-4"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow-soft)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="glass-inner p-2 rounded-xl shrink-0">
            <MapPin size={17} style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Shopping Area
            </p>
            <p className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>
              {detecting ? 'Detecting area...' : summary}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCurrentPosition}
            disabled={locating}
            className="glass-button px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
          >
            <Crosshair size={14} />
            {locating ? 'Locating...' : 'Use GPS'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            className="glass-button px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? 'Close' : 'Change'}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Country</label>
            <input
              value={buyerLocation.country}
              onChange={(e) => updateBuyerLocation({ country: e.target.value })}
              placeholder="Pakistan"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>State/Province</label>
            <input
              value={buyerLocation.region}
              onChange={(e) => updateBuyerLocation({ region: e.target.value })}
              placeholder="Punjab"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>City</label>
            <input
              value={buyerLocation.city}
              onChange={(e) => updateBuyerLocation({ city: e.target.value })}
              placeholder="Lahore"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Town/Area</label>
            <input
              value={buyerLocation.town}
              onChange={(e) => updateBuyerLocation({ town: e.target.value })}
              placeholder="Gulberg"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              GPS is only needed for sellers who use a custom radius.
            </span>
            <button
              type="button"
              onClick={resetBuyerLocation}
              className="ml-auto glass-button px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerLocationSelector;
