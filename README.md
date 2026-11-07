# ⚔️ ClashManager Pro — Elite Clan & War Command Center

A high-performance, real-time Clan Management and War Operations Dashboard for **Clash of Clans**. Designed for clan leaders, co-leaders, and competitive war clans.

---

## 🌟 Key Features

### 1. 🏰 Command Center (Overview Dashboard)
* **Real-time Clan Metrics:** Clan Points, Builder Base Trophies, War Record (Wins/Losses/Streak), Clan Capital Hall level, and War League.
* **Active War Teaser:** Live score, destruction %, and total attacks used at a glance.
* **Top Donators Podium:** Top 5 donors ranked with custom badges, donation numbers, and ratio health.
* **Clan Activity Health Radar:** Visual meter tracking healthy contributors vs low-activity members and donation leechers.

### 2. 👥 Interactive Clan Roster
* **Multi-Filter System:** Filter members by Role (*Leader, Co-Leaders, Elders, Members*), Town Hall level (*TH17 down to TH13*), and Donation Health (*Healthy, Low Ratio, Leech*).
* **Instant Search & Sort:** Search by member name or `#tag`. Sort by Trophies, Donations, Ratio, or Clan Rank.
* **Role & Town Hall Badges:** Visual indicators tailored to TH17, TH16, TH15, TH14, etc.
* **1-Click CSV Export:** Export the entire clan roster to Excel or Google Sheets.

### 3. ⚔️ War Room & Slacker Radar
* **Live War Duel Scoreboard:** Live comparison of stars, destruction %, and attack progress bars.
* **Live Countdown Timer:** Ticking clock to the end of battle day.
* **🚨 Slacker Radar:** Pinpoints players who have unspent war attacks (highlighting critical 2-attacks-remaining members) ordered by map position.
* **War Log History:** Inspect past wars, win/loss records, stars, and XP earned.

### 4. 👑 Leader Command Center (Discord & Clan Mail)
* **Discord War Ping:** Generates a pre-formatted Discord announcement tagging/listing all members who need to attack.
* **Donation Warning Notice:** Formats a formal Clan Mail or Discord message listing low-activity members.
* **Promotion Recommendations:** Automated audit highlighting members who have met the 3,000+ donation threshold and positive ratio for promotion.

### 5. 🤖 Discord Live Notifications & Broadcasts
* **Real-time War Attack Hits:** Notifies your Discord channel whenever a clan member lands an attack (with star count, destruction %, and triple badges).
* **War Phase Transitions:** Automatically posts embeds when War Preparation begins, when Battle Day starts, and the final War Victory/Defeat scoreboard.
* **Automated Slacker Reminders:** Automatically alerts your Discord with @here pings at 4 hours and 1 hour before battle day concludes listing members with unspent attacks.
* **1-Click Direct Broadcast:** Post custom announcements, donation warnings, or war pings straight to Discord with one click.

### 6. ⚡ Dual Operating Modes
* **Demo Mode (Default):** Pre-loaded with high-level active clan data (TH14–TH17, active war, war logs) so you can test all features with zero setup.
* **Live Supercell API Mode:** Connects directly to the official Supercell Clash of Clans API using your API token and Clan Tag.

---

## 🤖 Setting Up Discord Live Notifications

1. In Discord, right-click the text channel where you want notifications (e.g. `#clan-war-feed`).
2. Select **Edit Channel** -> **Integrations** -> **Webhooks** -> **New Webhook**.
3. Name it (e.g. `ClashManager Radar`) and click **Copy Webhook URL**.
4. Open the ClashManager Pro dashboard (`http://localhost:3000`).
5. Click **Clan & API Settings** in the top right.
6. Scroll down to the **Discord Live Notifications** section:
   * Paste your **Discord Webhook URL**.
   * Check **Enable Alerts**.
   * Click **Send Test** to verify a test notification appears in Discord!
   * Click **Save & Apply**.

---

## 🚀 Quick Start (Running the App)

### Option 1: One-Click Windows Launcher
Double-click `start.bat` in this folder:
```
C:\Users\SRB TrollersYT\.gemini\antigravity\scratch\coc-clan-manager\start.bat
```
This starts the local web server and opens the dashboard in your default browser at **http://localhost:3000**.

### Option 2: Command Line
Open your terminal inside this directory and run:
```bash
node server.js
```
Then open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔑 How to Connect to the Live Clash of Clans API

If you want to manage your **own clan** with live in-game data:

1. Go to the [Supercell Developer Portal](https://developer.clashofclans.com/) and register or log in.
2. Click on **My Account** -> **Create New Key**.
3. Fill in:
   * **Key Name:** `ClashManager Pro`
   * **Description:** `Clan Management Dashboard`
   * **Allowed IP Addresses:** Click the **Clan & API Settings** button in ClashManager Pro. It automatically detects and displays your current Public IP address! Copy that IP into Supercell's allowed IP box.
4. Copy the generated API Token.
5. In ClashManager Pro:
   * Click **Clan & API Settings** (top right).
   * Toggle **Operating Mode** to **Live**.
   * Enter your **Clan Tag** (e.g. `#2PP0LUR`).
   * Paste your **API Token**.
   * Click **Save & Apply**.

---

## 📁 Project Structure

```
coc-clan-manager/
├── server.js              # Native Node.js HTTP server & REST API proxy
├── package.json           # Package metadata and start script
├── start.bat              # Windows 1-click launcher
├── README.md              # Project documentation
├── data/
│   └── demoData.js        # Realistic mock clan, war, and roster data
└── public/
    ├── index.html         # Modern SPA dashboard layout
    ├── css/
    │   └── styles.css     # Clash-themed dark UI, animations & badges
    └── js/
        └── app.js         # Interactive filtering, war timer, & generators
```
