import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobal } from '../../contexts/GlobalContext';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function WishlistDropdown() {

    const { currentUser } = useAuth();
    const { fetchWishlist, wishlistItems,
        handleDeleteFromWishlist,
    } = useGlobal();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // // Fetch wishlist on mount
    // useEffect(() => {
    //     fetchWishlist();
    // }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const dropdownVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.3, ease: 'easeOut' },
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95,
            transition: { duration: 0.2, ease: 'easeIn' },
        },
    };

    return (
        <div className="relative inline-block text-left w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-pink-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-2xl shadow hover:bg-pink-600 transition text-sm sm:text-base relative"
            >
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className='hidden sm:flex'>Wishlist</span>

                {/* ✅ Wishlist count badge */}
                <span className="absolute -top-1 -right-1 bg-white text-pink-600 text-[10px] sm:text-xs font-bold px-1.5 py-[1px] sm:px-2 sm:py-[2px] rounded-full shadow-sm">
                    {wishlistItems.length}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute z-2 right-0 mt-2 w-64 sm:w-72 max-w-[90vw] rounded-2xl bg-white shadow-lg border border-gray-200 overflow-hidden"
                    >
                        <div className="p-3 sm:p-4 border-b border-gray-100 text-black font-semibold text-sm sm:text-base">
                            My Wishlist
                        </div>
                        <div className="max-h-56 sm:max-h-64 overflow-y-auto">
                            {
                                wishlistItems.length == 0 ? (<p className='ml-4 text-gray-500 p-2'>No items added yet</p>) :
                                    wishlistItems.map((item) => (
                                        <div key={item.id} className="relative flex items-center gap-3 p-2 sm:p-3 hover:bg-gray-50 transition">
                                            <img src={item.image} alt={item.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                                            <div className="flex-1 ">
                                                <p className="text-xs sm:text-sm font-medium text-gray-800 mr-3">{item.name}</p>
                                                <p className="font-semibold text-base text-gray-500">${item.discountedPrice !== 0 ? item.discountedPrice : item.price}</p>
                                                <motion.button
                                                    whileHover={{scale: 1.1}}
                                                    whileTap={{scale: 0.9}}
                                                    className='absolute cursor-pointer top-2 right-2 p-1'
                                                    onClick={() => { handleDeleteFromWishlist(item._id) }}>
                                                    <Trash2 color='black' size={20} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    ))}
                        </div>
                        {/* <div className="p-2 sm:p-3 border-t border-gray-100 text-center">
                            <button className="w-full bg-pink-500 text-white py-1.5 sm:py-2 rounded-xl hover:bg-pink-600 transition text-sm sm:text-base">
                                View Wishlist
                            </button>
                        </div> */}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
