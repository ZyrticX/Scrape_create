# מדריך התקנה על Ubuntu Server

## שלב 1: התקנת תלויות בסיס

```bash
# עדכון המערכת
sudo apt update && sudo apt upgrade -y

# התקנת Node.js (גרסה 18+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# התקנת Git
sudo apt install -y git

# בדיקת גרסאות
node --version
npm --version
```

## שלב 2: העתקת הפרויקט לשרת

### אופציה 1: Clone מ-GitHub (מומלץ)
```bash
cd /home/your-username
git clone https://github.com/ZyrticX/ScrapeAndCreate.git
cd ScrapeAndCreate
```

### אופציה 2: העלאה ידנית
```bash
# במחשב המקומי:
scp -r C:\Users\Evgeniy\ Orel\Downloads\Scrape username@YOUR_SERVER_IP:/home/username/

# בשרת:
cd /home/username/Scrape
```

## שלב 3: התקנת Dependencies

```bash
npm install
```

## שלב 4: הגדרת משתני סביבה

```bash
# יצירת קובץ .env
cp .env.example .env

# עריכת הקובץ
nano .env
```

**הגדר את הערכים הבאים:**
```env
OPENROUTER_API_KEY=your_actual_api_key_here
PORT=3000
APP_URL=http://YOUR_SERVER_IP:3000
```

שמור עם `Ctrl+X`, `Y`, `Enter`

## שלב 5: התקנת Playwright Dependencies

```bash
# Playwright צריך ספריות נוספות ל-Ubuntu
npx playwright install
npx playwright install-deps
```

## שלב 6: פתיחת Firewall

```bash
# אם משתמש ב-UFW (Ubuntu Firewall)
sudo ufw allow 3000/tcp
sudo ufw status

# אם משתמש ב-iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save
```

## שלב 7: הרצה ראשונית (בדיקה)

```bash
npm start
```

השרת אמור להתחיל ולהדפיס:
```
Server running on http://0.0.0.0:3000
Access via: http://YOUR_SERVER_IP:3000
```

**בדוק בדפדפן:** `http://YOUR_SERVER_IP:3000`

לעצירת השרת: `Ctrl+C`

---

## שלב 8: הרצה כ-Service (Production)

### אופציה A: שימוש ב-PM2 (מומלץ)

PM2 מנהל תהליכים עבור Node.js ומאפשר:
- הרצה ברקע
- הפעלה מחדש אוטומטית אם השרת קורס
- הפעלה מחדש אוטומטית אחרי Reboot

```bash
# התקנת PM2 גלובלית
sudo npm install -g pm2

# הרצת האפליקציה עם PM2
pm2 start server.js --name "scrape-and-create"

# הצגת סטטוס
pm2 status

# הצגת לוגים
pm2 logs scrape-and-create

# הפעלה אוטומטית אחרי reboot
pm2 startup
pm2 save

# פקודות שימושיות נוספות:
pm2 stop scrape-and-create      # עצירת השרת
pm2 restart scrape-and-create   # הפעלה מחדש
pm2 delete scrape-and-create    # מחיקת התהליך מ-PM2
pm2 monit                        # מוניטור בזמן אמת
```

### אופציה B: שימוש ב-systemd

יצירת Service File:

```bash
sudo nano /etc/systemd/system/scrape-and-create.service
```

הכנס את התוכן הבא (שנה את הנתיבים בהתאם):

```ini
[Unit]
Description=Scrape and Create AI Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/ScrapeAndCreate
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

הפעלת ה-Service:

```bash
# טעינת ההגדרה החדשה
sudo systemctl daemon-reload

# הפעלת השרת
sudo systemctl start scrape-and-create

# הפעלה אוטומטית אחרי reboot
sudo systemctl enable scrape-and-create

# בדיקת סטטוס
sudo systemctl status scrape-and-create

# הצגת לוגים
sudo journalctl -u scrape-and-create -f
```

---

## שלב 9: הגדרת Nginx כ-Reverse Proxy (אופציונלי)

אם תרצה להריץ על פורט 80 (HTTP רגיל) במקום 3000:

```bash
# התקנת Nginx
sudo apt install -y nginx

# יצירת קובץ הגדרה
sudo nano /etc/nginx/sites-available/scrape-and-create
```

הוסף את התוכן הבא:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # או YOUR_DOMAIN.com

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

הפעלת ההגדרה:

```bash
# יצירת קישור סימבולי
sudo ln -s /etc/nginx/sites-available/scrape-and-create /etc/nginx/sites-enabled/

# בדיקת תקינות ההגדרה
sudo nginx -t

# הפעלה מחדש של Nginx
sudo systemctl restart nginx

# פתיחת פורט 80
sudo ufw allow 80/tcp
```

עכשיו תוכל לגשת ב-`http://YOUR_SERVER_IP` (ללא 3000)

---

## שלב 10: הגדרת HTTPS עם Let's Encrypt (אופציונלי)

אם יש לך דומיין:

```bash
# התקנת Certbot
sudo apt install -y certbot python3-certbot-nginx

# קבלת תעודת SSL
sudo certbot --nginx -d yourdomain.com

# חידוש אוטומטי (Certbot מגדיר את זה אוטומטית)
sudo certbot renew --dry-run
```

---

## בעיות נפוצות ופתרונות

### 1. השרת לא נגיש מבחוץ

**בדוק:**
```bash
# בדוק שהשרת רץ
pm2 status
# או
sudo systemctl status scrape-and-create

# בדוק שהפורט פתוח
sudo netstat -tulpn | grep :3000

# בדוק firewall
sudo ufw status
```

**אם בענן (AWS/DigitalOcean/GCP):**
- בדוק Security Groups / Firewall Rules בפאנל הניהול
- ודא שפורט 3000 (או 80) פתוח

### 2. Playwright לא עובד

```bash
# התקנת תלויות נוספות
sudo apt install -y \
    libgbm1 \
    libnss3 \
    libnspr4 \
    libasound2 \
    libxss1 \
    libxtst6

# התקנת browsers מחדש
npx playwright install chromium
npx playwright install-deps chromium
```

### 3. אין זיכרון

Playwright צורך הרבה זיכרון. מינימום מומלץ: 2GB RAM

```bash
# בדיקת זיכרון
free -h

# אם צריך, הוסף SWAP:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. בעיות הרשאות

```bash
# ודא שהמשתמש שלך הבעלים של הקבצים
sudo chown -R $USER:$USER /home/your-username/ScrapeAndCreate

# הרשאות לתיקיות
chmod 755 ~/ScrapeAndCreate
chmod -R 755 ~/ScrapeAndCreate/templates
chmod -R 755 ~/ScrapeAndCreate/variants
chmod -R 755 ~/ScrapeAndCreate/output
```

---

## פקודות שימושיות

```bash
# צפייה בלוגים (PM2)
pm2 logs scrape-and-create --lines 100

# צפייה בלוגים (systemd)
sudo journalctl -u scrape-and-create -f

# בדיקת שימוש במשאבים
pm2 monit
# או
htop

# עדכון הקוד מ-Git
git pull origin main
npm install
pm2 restart scrape-and-create

# גיבוי
tar -czf scrape-backup-$(date +%Y%m%d).tar.gz \
    ~/ScrapeAndCreate/templates \
    ~/ScrapeAndCreate/variants \
    ~/ScrapeAndCreate/.env
```

---

## טיפים ל-Production

1. **גיבויים**: גבה את התיקיות `templates/`, `variants/`, `.env`
2. **מוניטורינג**: השתמש ב-`pm2 monit` או הגדר התראות
3. **עדכונים**: עדכן את Node.js והספריות באופן קבוע
4. **אבטחה**: 
   - אל תשתף את ה-`.env` עם אף אחד
   - השתמש ב-HTTPS בייצור
   - הגבל גישה ל-SSH (השתמש ב-SSH keys)
5. **ביצועים**: שקול להשתמש ב-nginx לקבצים סטטיים

---

## תמיכה

אם נתקלת בבעיה:
1. בדוק את הלוגים: `pm2 logs`
2. ודא שכל התלויות מותקנות
3. בדוק שה-firewall מוגדר נכון
4. ודא שיש מספיק זיכרון ומקום דיסק

**בהצלחה! 🚀**

