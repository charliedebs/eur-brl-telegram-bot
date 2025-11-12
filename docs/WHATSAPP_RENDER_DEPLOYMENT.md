# 🚀 WhatsApp Deployment Guide for Render

## Guide Complet pour Activer WhatsApp sur Render.com

Ce guide te permet d'activer WhatsApp sur ton bot déployé sur Render en **5 étapes simples**.

---

## 📋 Prérequis

- ✅ Bot déjà déployé sur Render
- ✅ Accès admin au dashboard Render
- ✅ Un numéro WhatsApp (perso ou business)
- ✅ Ton téléphone avec WhatsApp installé

---

## 🎯 Étape 1 : Activer WhatsApp dans Render

### 1.1 Va sur le Dashboard Render

1. Ouvre [dashboard.render.com](https://dashboard.render.com)
2. Sélectionne ton service `eur-brl-telegram-bot`
3. Clique sur **"Environment"** dans le menu de gauche

### 1.2 Ajoute/Modifie la variable `WHATSAPP_ENABLED`

1. Cherche `WHATSAPP_ENABLED` dans la liste
2. Change sa valeur de `false` à `true`
3. Clique sur **"Save Changes"**

```
WHATSAPP_ENABLED=true
```

### 1.3 Le service va redémarrer automatiquement

- Render va redéployer ton app
- ⏱️ Attends environ **2-3 minutes**
- Le build va installer Chromium (nécessaire pour WhatsApp Web)

---

## 🔐 Étape 2 : Configure le Password Admin (si pas encore fait)

### 2.1 Dans Environment Variables

Ajoute/vérifie que tu as :

```
ADMIN_PASSWORD=ton-mot-de-passe-secret-123
```

⚠️ **Important** : Note ce mot de passe, tu en auras besoin pour accéder au QR code !

---

## 📱 Étape 3 : Scanner le QR Code

### 3.1 Attends que le déploiement soit terminé

- Va dans **"Logs"** sur Render
- Cherche cette ligne :

```
[WHATSAPP] QR Code generated and ready for display
[WHATSAPP] 🌐 Go to: https://your-app.onrender.com/admin/whatsapp-qr
```

### 3.2 Ouvre l'URL du QR Code

1. Ouvre ton navigateur
2. Va sur : `https://TON-APP.onrender.com/admin/whatsapp-qr`
   - Remplace `TON-APP` par le nom de ton app Render
   - Exemple : `https://eur-brl-telegram-bot.onrender.com/admin/whatsapp-qr`

### 3.3 Entre le mot de passe admin

- Entre le `ADMIN_PASSWORD` que tu as configuré
- Clique sur "🔓 View QR Code"

### 3.4 Scanne le QR Code avec ton téléphone

1. **Ouvre WhatsApp** sur ton téléphone
2. Va dans **"Réglages"** → **"Appareils connectés"**
3. Tape sur **"Connecter un appareil"**
4. **Scanne le QR code** affiché sur ton navigateur

### 3.5 Attends la confirmation

- Tu verras "✅ WhatsApp Connected!" dans le navigateur
- Dans les logs Render : `[WHATSAPP] WhatsApp bot is ready!`

---

## ✅ Étape 4 : Teste ton Bot WhatsApp

### 4.1 Envoie un message de test

Sur WhatsApp, envoie un message au numéro que tu viens de connecter :

```
/start
```

### 4.2 Tu devrais recevoir

```
🤖 Bienvenue sur le bot EUR/BRL !

📱 Menu:
1. Comparer EUR → BRL
2. Voir le guide complet
3. Créer une alerte
4. Activer Premium

💬 Digite o número da opção desejada
```

### 4.3 Teste une conversion

Envoie :

```
1000
```

Tu devrais voir la comparaison des taux de change !

---

## 🔧 Étape 5 : Vérification et Monitoring

### 5.1 Vérifie le Health Check

Va sur : `https://TON-APP.onrender.com/health`

Tu devrais voir :

```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "telegram": "ok",
    "whatsapp": "ok",  ← Doit être "ok"
    "server": "ok"
  }
}
```

### 5.2 Surveille les logs

Dans Render → Logs, cherche :

```
✅ WhatsApp bot is connected and ready!
[WHATSAPP] Processing message: userId=5521999999999
```

---

## 🎛️ Configuration Avancée

### Persistent Disk (déjà configuré)

Le `render.yaml` inclut déjà un persistent disk pour sauvegarder la session WhatsApp :

```yaml
disk:
  name: whatsapp-session
  mountPath: /opt/render/project/src/.wwebjs_auth
  sizeGB: 1
```

**Avantages :**
- ✅ Pas besoin de re-scanner le QR après chaque redémarrage
- ✅ Session WhatsApp persiste entre les déploiements
- ✅ Déconnexion uniquement si tu supprimes manuellement l'appareil

### Variables d'environnement complètes

```bash
# WhatsApp
WHATSAPP_ENABLED=true

# Puppeteer (pour Chromium)
PUPPETEER_SKIP_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Admin access
ADMIN_PASSWORD=ton-mot-de-passe-secret
```

---

## 🐛 Troubleshooting

### Problème : "QR Code not available"

**Solution :**
1. Vérifie les logs : `[WHATSAPP]` tags
2. Le bot est peut-être déjà connecté
3. Va sur `/admin/whatsapp-qr` - si déjà connecté, tu verras "✅ WhatsApp Connected!"

### Problème : "Session expired"

**Solution :**
```bash
# Option 1 : Re-scanner le QR code
# Va sur /admin/whatsapp-qr et scanne à nouveau

# Option 2 : Reset la session (via Render Shell)
cd /opt/render/project/src
rm -rf .wwebjs_auth/
# Puis redémarre le service et re-scanne
```

### Problème : Build failed - "chromium-browser not found"

**Solution :**

Le render.yaml est configuré pour installer Chromium automatiquement. Si ça échoue :

1. Vérifie que tu utilises **Render Standard ou Plus** (pas Free tier)
2. Le Free tier peut ne pas supporter les apt-get install

**Alternative pour Free tier** : Utilise l'authentification locale d'abord, puis upload la session

### Problème : "Out of memory"

**Solution :**

WhatsApp + Chromium utilisent ~500MB RAM.

1. Upgrade ton plan Render à **Standard** (512MB) minimum
2. Ou désactive WhatsApp et garde seulement Telegram :
   ```
   WHATSAPP_ENABLED=false
   ```

### Problème : Le bot ne répond pas sur WhatsApp

**Checklist :**
1. ✅ `WHATSAPP_ENABLED=true` ?
2. ✅ Logs montrent `[WHATSAPP] WhatsApp bot is ready!` ?
3. ✅ `/health` montre `"whatsapp": "ok"` ?
4. ✅ Tu envoies bien au bon numéro (celui que tu as connecté) ?
5. ✅ Pas de messages dans des groupes (désactivés par défaut)

### Problème : QR Code expire trop vite

**Solution :**

Le QR code WhatsApp expire après ~60 secondes.

1. Prépare ton téléphone AVANT d'ouvrir la page
2. Ouvre WhatsApp → Appareils connectés
3. Puis ouvre rapidement `/admin/whatsapp-qr`
4. Scanne immédiatement

Si le QR expire :
- Rafraîchis simplement la page (F5)
- Un nouveau QR sera généré

---

## 📊 Architecture sur Render

```
┌─────────────────────────────────────────┐
│         Render Web Service              │
│  ┌───────────────────────────────────┐  │
│  │  Node.js App (src/server.js)     │  │
│  │  ├─ Telegram Bot (webhook)       │  │
│  │  ├─ WhatsApp Bot (puppeteer)     │  │
│  │  └─ Express Server               │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  Chromium Browser                 │  │
│  │  (WhatsApp Web automation)        │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │  Persistent Disk (1GB)            │  │
│  │  /opt/render/project/src/         │  │
│  │    .wwebjs_auth/                  │  │
│  │  (Session WhatsApp sauvegardée)   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────────┐
│  /admin/whatsapp-qr     │  ← Tu vas ici pour scanner
│  (Protected by password)│
└─────────────────────────┘
```

---

## 💰 Coûts Render

### Free Tier
- ❌ **Ne supporte PAS WhatsApp** (pas assez de RAM/CPU)
- ✅ Telegram seul fonctionne bien

### Starter ($7/mois)
- ✅ **Support WhatsApp + Telegram**
- ✅ 512MB RAM (suffisant)
- ✅ Persistent disk inclus (jusqu'à 1GB)
- ✅ Recommandé pour production

### Standard ($25/mois)
- ✅ Meilleure performance
- ✅ 2GB RAM
- ✅ Autoscaling

---

## 🔄 Maintenance

### Re-scanner le QR Code

**Quand ?**
- Tous les ~14 jours (WhatsApp déconnecte automatiquement)
- Si tu déconnectes manuellement l'appareil dans WhatsApp
- Si tu supprimes le persistent disk

**Comment ?**
1. Va sur `/admin/whatsapp-qr`
2. Scanne le nouveau QR code
3. C'est tout !

### Désactiver WhatsApp temporairement

```bash
# Dans Render Environment Variables
WHATSAPP_ENABLED=false

# Le bot Telegram continuera de fonctionner normalement
```

### Logs à surveiller

```bash
# Connexion réussie
[WHATSAPP] WhatsApp bot is ready!

# Message reçu
[WHATSAPP] Processing message: userId=...

# Erreur d'auth
[WHATSAPP] Authentication failure

# Déconnexion
[WHATSAPP] WhatsApp disconnected
```

---

## 📞 Support

### Problèmes persistants ?

1. **Vérifie les logs Render** : Dashboard → Logs
2. **Health check** : `https://TON-APP.onrender.com/health`
3. **GitHub Issues** : [Ouvre un ticket](https://github.com/charliedebs/eur-brl-telegram-bot/issues)

### Documentation supplémentaire

- [Guide général WhatsApp](./WHATSAPP_INTEGRATION.md)
- [Quick Start WhatsApp](../WHATSAPP_QUICKSTART.md)
- [Render Docs](https://render.com/docs)

---

## ✅ Checklist Finale

Avant de considérer que WhatsApp est opérationnel :

- [ ] `WHATSAPP_ENABLED=true` dans Render Environment
- [ ] `ADMIN_PASSWORD` configuré
- [ ] Déploiement Render terminé (logs OK)
- [ ] QR Code scanné avec succès
- [ ] Page `/admin/whatsapp-qr` montre "✅ WhatsApp Connected"
- [ ] Health check montre `"whatsapp": "ok"`
- [ ] Test message `/start` reçu et répondu
- [ ] Test conversion `1000` fonctionne

**Si tous les points sont cochés : Félicitations ! 🎉**

Ton bot EUR/BRL est maintenant live sur Telegram ET WhatsApp !

---

**Last Updated:** November 12, 2025
**Version:** 1.0.0
