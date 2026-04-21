---
name: Mobile Deep Linking
description: Universal links (https://tortrose.com) + custom scheme (tortrose://) configured on NavigationContainer; push notification taps route via useNotifications hook
type: feature
---
Deep linking is configured in `MobileApp/App.js` on `NavigationContainer linking={linking}`. Prefixes: `tortrose://`, `https://tortrose.com`, `http://tortrose.com`. Routes map nested tab screens (Home/Stores/Cart/Wishlist/Account) and modal/stack screens (ProductDetail with `:productId`, Store with `:storeSlug`, OrderDetail with `:orderId`, etc.).

iOS associated domains and Android intent filters are set in `MobileApp/app.json` (`associatedDomains: applinks:tortrose.com`, Android autoVerify intent filter on host `tortrose.com`).

Push notification taps are handled by `MobileApp/src/hooks/useNotifications.js` which subscribes to `Notifications.addNotificationResponseReceivedListener` and routes by `data.type` (NotificationTypes enum) to the right screen. The hook is mounted inside `NavigationContainer` via `NotificationInitializer`.
