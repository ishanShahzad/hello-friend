import React, { useMemo } from 'react';

const GlassBackground = () => {
    const bubbles = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => ({
            id: i,
            size: Math.random() * 20 + 6,
            left: Math.random() * 100,
            opacity: Math.random() * 0.25 + 0.06,
            duration: Math.random() * 16 + 14,
            delay: Math.random() * 15,
            drift: (Math.random() - 0.5) * 60,
        }));
    }, []);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ contain: 'strict' }}>
            {/* Orbs — reduced to 2 */}
            <div className="orb orb-blue" style={{ width: 500, height: 500, top: '-10%', left: '-5%', animationDelay: '0s' }} />
            <div className="orb orb-purple" style={{ width: 400, height: 400, top: '20%', right: '-8%', animationDelay: '5s' }} />

            {/* Bubbles — reduced to 5 */}
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
