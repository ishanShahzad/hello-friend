# Bulk Discount Feature - UI Flow

## Visual Guide to the New Feature

### 1️⃣ Product Management Page (Normal Mode)

```
┌─────────────────────────────────────────────────────────────┐
│  Product Management                                          │
│                                                              │
│  [Select Products] [Add Product]                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search...          [Filter ▼]                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                   │
│  │ Prod │  │ Prod │  │ Prod │  │ Prod │                   │
│  │  1   │  │  2   │  │  3   │  │  4   │                   │
│  │ $100 │  │ $200 │  │ $150 │  │ $300 │                   │
│  └──────┘  └──────┘  └──────┘  └──────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 2️⃣ Product Management Page (Selection Mode)

```
┌─────────────────────────────────────────────────────────────┐
│  Product Management                                          │
│                                                              │
│  [Bulk Operations (2)] [Cancel Select] [Add Product]        │
│      ↑ Green button                                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search...    [Filter ▼]    [Select All]          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                   │
│  │☑️Prod│  │☑️Prod│  │☐ Prod│  │☐ Prod│                   │
│  │  1   │  │  2   │  │  3   │  │  4   │                   │
│  │ $100 │  │ $200 │  │ $150 │  │ $300 │                   │
│  └──────┘  └──────┘  └──────┘  └──────┘                   │
│    ↑ Selected        ↑ Not selected                         │
└─────────────────────────────────────────────────────────────┘
```

### 3️⃣ Bulk Operations Modal - Apply Discount Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Bulk Operations                                        [X]  │
│  2 product(s) selected                                       │
├─────────────────────────────────────────────────────────────┤
│  [Apply Discount] [Update Prices] [Remove Discount]         │
│   ↑ Active tab                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Discount Type:                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ % Percentage │  │ $ Fixed      │                        │
│  │   (Active)   │  │              │                        │
│  └──────────────┘  └──────────────┘                        │
│                                                              │
│  Discount Value:                                             │
│  ┌──────────────────────────────────────┐                  │
│  │ 20                                 % │                  │
│  └──────────────────────────────────────┘                  │
│  Enter percentage to discount (e.g., 20 for 20% off)        │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │      [Apply Discount]                │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 4️⃣ Bulk Operations Modal - Update Prices Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Bulk Operations                                        [X]  │
│  2 product(s) selected                                       │
├─────────────────────────────────────────────────────────────┤
│  [Apply Discount] [Update Prices] [Remove Discount]         │
│                    ↑ Active tab                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Update Type:                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │    %     │  │    $     │  │   Set    │                 │
│  │Percentage│  │  Fixed   │  │  Price   │                 │
│  │ (Active) │  │          │  │          │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                              │
│  Change Value:                                               │
│  ┌──────────────────────────────────────┐                  │
│  │ 10                                 % │                  │
│  └──────────────────────────────────────┘                  │
│  Positive to increase, negative to decrease                  │
│  (e.g., 10 for +10%, -10 for -10%)                          │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │      [Update Prices]                 │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 5️⃣ Bulk Operations Modal - Remove Discount Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Bulk Operations                                        [X]  │
│  2 product(s) selected                                       │
├─────────────────────────────────────────────────────────────┤
│  [Apply Discount] [Update Prices] [Remove Discount]         │
│                                   ↑ Active tab               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️ Warning Box:                                             │
│  This will remove all discounts from the selected           │
│  products and reset their discounted price to $0.           │
│                                                              │
│  Selected Products:                                          │
│  ┌──────────────────────────────────────┐                  │
│  │ Product 1              $80.00        │                  │
│  │ Product 2              $160.00       │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │   [Remove All Discounts]             │                  │
│  │        (Red button)                  │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 6️⃣ Success Notification

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ✅ Bulk discount applied successfully to 2 products│    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Product Management                                          │
│                                                              │
│  [Select Products] [Add Product]                            │
│                                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                   │
│  │ Prod │  │ Prod │  │ Prod │  │ Prod │                   │
│  │  1   │  │  2   │  │  3   │  │  4   │                   │
│  │ $100 │  │ $200 │  │ $150 │  │ $300 │                   │
│  │ $80  │  │ $160 │  │      │  │      │                   │
│  │ 20%↓ │  │ 20%↓ │  │      │  │      │                   │
│  └──────┘  └──────┘  └──────┘  └──────┘                   │
│    ↑ Updated with discount                                   │
└─────────────────────────────────────────────────────────────┘
```

## Button States & Colors

### Normal Mode:
- **"Select Products"** - Purple button with checkbox icon
- **"Add Product"** - Blue button with plus icon

### Selection Mode:
- **"Bulk Operations (X)"** - Green button with tag icon (appears when products selected)
- **"Cancel Select"** - Gray button with square icon
- **"Select All"** - Light blue button in filter bar

### Modal Buttons:
- **"Apply Discount"** - Blue button
- **"Update Prices"** - Blue button
- **"Remove All Discounts"** - Red button (warning style)

### Product Cards:
- **Unselected** - White checkbox background
- **Selected** - Blue checkbox background with white checkmark

## Animations

✨ **Smooth transitions** when entering/exiting selection mode
✨ **Scale effects** on button hover (1.02x) and tap (0.98x)
✨ **Fade in/out** for modal appearance
✨ **Checkbox animations** when selecting products
✨ **Toast notifications** slide in from top

## Responsive Design

📱 **Mobile**: Buttons stack vertically, modal adjusts to screen size
💻 **Tablet**: 2-3 products per row, full functionality
🖥️ **Desktop**: 4 products per row, optimal layout

## Color Scheme

- **Primary Blue**: #2563EB (main actions)
- **Success Green**: #16A34A (bulk operations)
- **Warning Red**: #DC2626 (delete/remove)
- **Purple**: #9333EA (select mode)
- **Gray**: #6B7280 (cancel/secondary)
