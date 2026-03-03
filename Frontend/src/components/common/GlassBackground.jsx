import React, { useMemo } from 'react';

const GlassBackground = () => {
    const bubbles = useMemo(() => {
        return Array.from({ length: 25 }, (_, i) => ({
            id: i,
            size: Math.random() * 20 + 6,
            left: Math.random() * 100,
            opacity: Math.random() * 0.35 + 0.08,
            duration: Math.random() * 12 + 10,
            delay: Math.random() * 15,
            drift: (Math.random() - 0.5) * 80,
        }));
    }, []);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Orbs */}
            <div className="orb orb-blue" style={{ width: 500, height: 500, top: '-10%', left: '-5%', animationDelay: '0s' }} />
            <div className="orb orb-purple" style={{ width: 400, height: 400, top: '20%', right: '-8%', animationDelay: '5s' }} />
            <div className="orb orb-cyan" style={{ width: 350, height: 350, bottom: '10%', left: '15%', animationDelay: '10s' }} />
            <div className="orb orb-pink" style={{ width: 300, height: 300, bottom: '-5%', right: '20%', animationDelay: '3s' }} />
            <div className="orb orb-green" style={{ width: 250, height: 250, top: '50%', left: '50%', animationDelay: '8s' }} />
            <div className="orb orb-indigo" style={{ width: 450, height: 450, top: '-15%', right: '30%', animationDelay: '12s' }} />

            {/* Bubbles */}
            {bubbles.map((b) => (
                <div
                    key={b.id}
                    className="bubble"
                    style={{
                        width: b.size,
                        height: b.size,
                        left: `${b.left}%`,
                        '--bubble-opacity': b.opacity,
                        '--bubble-duration': `${b.duration}s`,
                        '--bubble-delay': `${b.delay}s`,
                        '--bubble-drift': `${b.drift}px`,
                        animationDuration: `${b.duration}s`,
                        animationDelay: `${b.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};

export default React.memo(GlassBackground);
