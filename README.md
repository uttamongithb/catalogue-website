# Maison & Co. catalogue

A responsive catalogue built with HTML, CSS and vanilla JavaScript. Run with a static server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.

## Manage products
Click **Manage products** in the header or footer. Add a name, category, price, optional description and photo. Edit or delete existing products in the same panel. The example products can all be edited or deleted. Product photos are resized and stored in the browser.

Products and enquiry selections are saved in **localStorage in this browser on this device**, not in a shared server database. They persist on reload but can be cleared with browser data, are limited by browser storage, and will not appear on other devices or in other browsers. The manager is not password protected; anyone using this browser can edit its local catalogue. To share products with customers across devices, a server/database and authenticated admin are needed.

Customers can add multiple products to the enquiry list and open a pre-filled WhatsApp message. The configured WhatsApp number is +91 79920 81882 (`BUSINESS_WHATSAPP` in `script.js`). The customer must press Send in WhatsApp.

The sample business name, copy, prices and products are examples. Replace the sample photos before commercial use: they come from third-party listings and may require permission. The hero image is AI-generated.

The default catalogue now contains 80 example products, 20 per category. Names and prices are illustrative, not verified inventory. Product photos include third-party search results and may not match actual items or be licensed for commercial use; replace them with your own product photos and details before publishing. Existing locally saved catalogues receive the newly added examples once on this device; previously deleted original products stay deleted.
