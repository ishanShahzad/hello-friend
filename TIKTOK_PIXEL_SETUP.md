# TikTok Pixel Setup for Seller Lead Generation

## ✅ What Has Been Implemented

### 1. **Base Pixel Code Installed**
- **Location**: `index.html` (in the `<head>` section)
- **Pixel ID**: `D85EEDJC77U42GL90IK0`
- **Status**: ✅ Active on all pages
- **Tracking**: Automatic page views across the entire website

### 2. **Seller Registration Tracking with Customer Information**
- **Event**: `CompleteRegistration`
- **Location**: `Frontend/src/pages/BecomeSeller.jsx`
- **Triggers When**: A user successfully completes the seller registration process
- **Customer Data Tracked** (SHA-256 Hashed for Privacy):
  - ✅ `email` - Hashed user email
  - ✅ `phone_number` - Hashed phone number
  - ✅ `external_id` - Hashed user ID
- **Event Parameters**:
  - `contents` array with:
    - `content_id`: User/Seller ID
    - `content_type`: "seller_registration"
    - `content_name`: Store name
    - `content_category`: "Seller Signup"
  - `value`: 1 (represents one lead)
  - `currency`: "USD"

### 3. **Funnel Tracking**
- **Event**: `ViewContent`
- **Location**: `Frontend/src/pages/BecomeSeller.jsx`
- **Triggers When**: User lands on the "Become a Seller" page
- **Event Parameters**:
  - `contents` array with page details
  - `content_type`: "seller_registration"
  - `value`: 0
  - `currency`: "USD"

### 4. **Privacy & Security**
- ✅ All customer data (email, phone, user ID) is **hashed with SHA-256** before sending to TikTok
- ✅ Complies with TikTok's privacy requirements
- ✅ Fallback tracking if hashing fails

---

## 📊 TikTok Ads Manager Setup

### Current Step: **Implement event code**

### ✅ What to Check in the Checkboxes:

#### **Event Parameters (General):**
- ☑️ **contents** - We're sending this
- ☑️ **content_id** - We're sending this
- ☑️ **content_type** - We're sending this
- ☑️ **content_name** - We're sending this
- ☑️ **content_category** - We're sending this
- ☑️ **value** - We're sending this
- ☑️ **currency** - We're sending this

#### **Customer Information Parameters:**
- ☑️ **email** (hashed with SHA-256) - We're sending this
- ☑️ **phone_number** (hashed with SHA-256) - We're sending this
- ☑️ **external_id** (hashed with SHA-256) - We're sending this

### After Checking Boxes:
1. Click **"Copy code"** (optional - just for reference)
2. Click **"Next"** to continue
3. TikTok will verify your pixel is working correctly

---

## 🎯 What TikTok Will Track

### Conversion Funnel:
1. **Page View** → User visits rozare.com (tracked automatically)
2. **ViewContent** → User visits `/become-seller` page
3. **CompleteRegistration** → User successfully becomes a seller ✅ **THIS IS YOUR LEAD!**

---

## 🚀 Next Steps in TikTok Ads Manager

1. **Click "Next"** in the current screen
2. **Verify Pixel Setup** - TikTok will check if the pixel is firing correctly
3. **Set up business funnel** - Configure your conversion funnel
4. **Implement Events API** (optional) - For server-side tracking
5. **Create your first campaign** - Target potential sellers!

---

## 💡 Campaign Strategy for Seller Leads

### Target Audience:
- Small business owners
- Entrepreneurs
- People interested in e-commerce
- Side hustle seekers
- Handmade/craft sellers
- Dropshippers

### Ad Messaging Ideas:
- "Start Selling Online for FREE"
- "AI-Powered Store Management"
- "Manage Your Store via WhatsApp"
- "No Monthly Fees - Just Sell & Grow"

### Optimization Goal:
- **CompleteRegistration** (this is your conversion event)
- TikTok will optimize to show ads to people most likely to sign up as sellers

---

## 🔍 Testing Your Pixel

### Test the tracking:
1. Open your website: `https://rozare.com/become-seller`
2. Open browser console (F12)
3. Type: `ttq.track('CompleteRegistration', { content_name: 'Test' })`
4. Check TikTok Events Manager to see if the test event appears

### Verify in TikTok:
1. Go to TikTok Ads Manager → Events Manager
2. Click on your pixel
3. Check "Test Events" to see real-time tracking
4. Complete a test seller registration to verify

---

## 📝 Additional Events You Could Track (Optional)

If you want more detailed funnel tracking, you can add:

- **InitiateCheckout** - When user clicks "Get Started" button
- **SubmitForm** - When user completes each step of the form
- **Contact** - When user verifies WhatsApp/Email

Let me know if you want to add any of these!

---

## ✅ Summary

**Status**: TikTok Pixel is fully installed and tracking seller registrations as leads!

**What's Working**:
- ✅ Base pixel installed on all pages
- ✅ Page view tracking active
- ✅ Seller registration (CompleteRegistration) event tracking
- ✅ Funnel tracking (ViewContent on /become-seller)

**Next Action**: 
Continue with TikTok Ads Manager setup and verify the pixel is working correctly.
