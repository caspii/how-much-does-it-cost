# Setting Up Custom Domain on Digital Ocean

## Steps to Connect Your Custom Domain

### 1. In Digital Ocean App Platform:

1. Go to your app: https://cloud.digitalocean.com/apps
2. Click on your app "how-much"
3. Go to **Settings** tab
4. Scroll to **Domains** section
5. Click **Add Domain**
6. Enter your custom domain (e.g., `howmuchdoesitcost.com`)
7. Click **Add Domain**

### 2. Configure DNS:

Digital Ocean will show you the required DNS records. You need to add these at your domain registrar:

#### Option A: Using CNAME (Recommended)
- Type: CNAME
- Name: @ (or www)
- Value: `lionfish-app-sgal8.ondigitalocean.app`

#### Option B: Using A Records
Digital Ocean will provide specific IP addresses to use.

### 3. Common Domain Registrars:

**Namecheap:**
1. Log in to Namecheap
2. Go to Domain List → Manage
3. Advanced DNS → Add New Record
4. Add CNAME record as shown above

**GoDaddy:**
1. Log in to GoDaddy
2. Go to My Products → DNS
3. Add → CNAME
4. Enter the values

**Google Domains:**
1. Log in to Google Domains
2. Select your domain
3. DNS → Manage custom records
4. Create new record

### 4. SSL Certificate:

Digital Ocean automatically provisions a Let's Encrypt SSL certificate for your custom domain. This process takes 10-15 minutes after DNS propagation.

### 5. DNS Propagation:

- DNS changes can take 5 minutes to 48 hours to propagate
- You can check propagation status at: https://dnschecker.org

## Multiple Domains:

You can add multiple domains:
- `howmuchdoesitcost.com`
- `www.howmuchdoesitcost.com`
- `pricechecker.app`
- etc.

## Troubleshooting:

1. **Domain not working after 24 hours:**
   - Check DNS records are correct
   - Ensure no conflicting records exist
   - Try clearing browser cache

2. **SSL Certificate Error:**
   - Wait 15 minutes for auto-provisioning
   - Check domain is correctly pointed to DO
   - Contact DO support if persists

3. **Redirect www to non-www (or vice versa):**
   - Add both domains in DO settings
   - Set one as primary
   - DO handles redirects automatically