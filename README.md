# Maison & Co. catalogue

A catalogue with a password-protected admin panel and shared server-side product storage. It requires Python 3.9 or later; there are no third-party dependencies.

## Run locally
1. Set a long, unique admin password in the server environment. For example, on macOS/Linux:
   `export ADMIN_PASSWORD='replace-with-a-long-random-password'`
2. Run `python3 server.py` and open `http://localhost:8002`.
3. Use **Admin** in the header to sign in, then add, edit or delete products. Visitors see the shared catalogue; enquiry selections are stored only in their own browser.

The password is verified on the server, not in the webpage. Authenticated admin sessions expire after eight hours or on server restart. Product changes persist in `data/catalogue.sqlite3` on the server. Back up this database and use persistent storage when deploying; it is ignored by Git. The initial example data is loaded only on the first run. Browser-local products created by earlier versions are not automatically transferred to the shared catalogue.

## Public deployment
This is a server-based app, not a static GitHub Pages website. Deploy `server.py` on a Python-capable host with persistent disk storage and HTTPS, set `ADMIN_PASSWORD` securely as an environment variable, and use a TLS-terminating reverse proxy. `PORT` and `CATALOGUE_DATA_DIR` are optional environment variables. Never commit your password or database. For a production business deployment, arrange professional security review, backups, monitoring and robust distributed login rate limiting.

WhatsApp enquiries go to +91 79920 81882, set in `script.js`. Customers must press Send in WhatsApp. The 80 initial products, prices and photos are examples. Third-party sample photos may require permission; replace them with your own before commercial use.

### Static website hosting
The storefront can also be hosted on GitHub Pages or another static host. In that case, it displays the 80 example products from the checked-in `products.json` and their images. The admin dashboard cannot sign in or save changes on static hosting, because static hosts do not run `server.py` or provide a database. To use the password-protected admin dashboard and share product updates with visitors, run the Python server on a Python-capable host with persistent storage and HTTPS as described above. Editing products in a separate temporary preview does not update the GitHub Pages snapshot automatically.
