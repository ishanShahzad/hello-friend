import React from "react";
import { motion } from "framer-motion";
import { LockKeyhole, ArrowLeft } from "lucide-react";

const Unauthorized = ({ onBack }) => {
    return (
        <div className="flex items-center justify-center h bg-gray-100">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="flex justify-center mb-6"
                >
                    <div className="bg-red-100 p-4 rounded-full">
                        <LockKeyhole className="w-12 h-12 text-red-600" />
                    </div>
                </motion.div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    Unauthorized Access
                </h1>
                <p className="text-gray-600 mb-6">
                    You don’t have permission to view this page.
                </p>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl shadow-md"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Go Back
                </motion.button>
            </motion.div>
        </div>
    );
};

export default Unauthorized;
