import React, { useState } from "react";
import { motion } from "framer-motion";
import { Home, Users, ShoppingCart, PieChart } from "lucide-react";

// -----------------------------------------------------------------------------
// Minimal Viable Product (MVP) Admin Dashboard
// - Clean, small, functional, modern design
// - KPI cards + sample table only
// - Tailwind CSS for styling
// - No backend integration
// -----------------------------------------------------------------------------

export default function AdminDashboardMVP() {
    const [kpis] = useState({
        revenue: 48230,
        orders: 1281,
        customers: 932,
        conversion: 3.7,
    });

    const recentOrders = [
        { id: "#3421", name: "Aisha", amount: "$120", status: "Delivered" },
        { id: "#3420", name: "Bilal", amount: "$320", status: "Processing" },
        { id: "#3419", name: "Sara", amount: "$75", status: "Canceled" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard title="Revenue" value={`$${kpis.revenue.toLocaleString()}`} icon={<Home size={18} />} />
                <KpiCard title="Orders" value={kpis.orders} icon={<ShoppingCart size={18} />} />
                <KpiCard title="Customers" value={kpis.customers} icon={<Users size={18} />} />
                <KpiCard title="Conversion" value={`${kpis.conversion}%`} icon={<PieChart size={18} />} />
            </div>

            {/* RECENT ORDERS */}
            <div className="bg-white border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
                <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500">
                        <tr>
                            <th className="pb-2">Order ID</th>
                            <th className="pb-2">Customer</th>
                            <th className="pb-2">Amount</th>
                            <th className="pb-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {recentOrders.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="py-3">{row.id}</td>
                                <td className="py-3">{row.name}</td>
                                <td className="py-3">{row.amount}</td>
                                <td className="py-3">
                                    <StatusBadge>{row.status}</StatusBadge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon }) {
    return (
        <motion.div whileHover={{ y: -4 }} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500">{title}</div>
                    <div className="text-xl font-semibold mt-1">{value}</div>
                </div>
                <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center">{icon}</div>
            </div>
        </motion.div>
    );
}

function StatusBadge({ children }) {
    const color =
        children === "Delivered"
            ? "bg-green-100 text-green-700"
            : children === "Processing"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700";
    return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{children}</span>;
}
