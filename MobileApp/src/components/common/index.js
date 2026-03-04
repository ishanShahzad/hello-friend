/**
 * Common Components Index
 * Export all reusable components from a single entry point
 */

// Loader components
export { default as Loader, InlineLoader, LoadingOverlay } from './Loader';

// Empty state components
export { 
  default as EmptyState,
  EmptyCart,
  EmptyWishlist,
  EmptyOrders,
  EmptyProducts,
  EmptyStores,
  EmptySearch,
  EmptyNotifications,
  ErrorState,
  OfflineState,
  LoginRequired,
} from './EmptyState';

// Dashboard components
export { 
  default as StatCard,
  RevenueStatCard,
  OrdersStatCard,
  ProductsStatCard,
  UsersStatCard,
  StoresStatCard,
  PendingOrdersStatCard,
} from './StatCard';

export { 
  default as ActionCard,
  StoreOverviewAction,
  ProductManagementAction,
  OrderManagementAction,
  StoreSettingsAction,
  ShippingConfigAction,
  UserManagementAction,
  TaxConfigAction,
  StoreVerificationAction,
  AdminProductsAction,
  AdminOrdersAction,
  AdminStoresAction,
} from './ActionCard';

export { 
  default as OrderCard,
  CompactOrderCard,
} from './OrderCard';

export { 
  default as StoreCard,
  CompactStoreCard,
  StoreListItem,
} from './StoreCard';

// Glass design system
export { default as GlassBackground } from './GlassBackground';
export { default as GlassPanel } from './GlassPanel';
