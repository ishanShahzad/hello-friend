import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';

const VerifiedBadge = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: {
            icon: 18
        },
        md: {
            icon: 20
        },
        lg: {
            icon: 24
        }
    };

    const currentSize = sizes[size] || sizes.md;

    return (
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
            title="Verified Store"
        >
            <BadgeCheck 
                size={currentSize.icon} 
                className="text-white fill-blue-600"
                strokeWidth={2}
            />
        </motion.div>
    );
};

export default VerifiedBadge;
