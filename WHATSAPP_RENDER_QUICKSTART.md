# ⚡ WhatsApp sur Render - Guide Ultra Rapide

## 🎯 Ce que tu dois faire MAINTENANT

### 1️⃣ Push le code (déjà fait ✅)

```bash
git push
```

### 2️⃣ Sur Render Dashboard

#### A. Active WhatsApp

1. Va sur [dashboard.render.com](https://dashboard.render.com)
2. Sélectionne ton service `eur-brl-telegram-bot`
3. Clique **"Environment"**
4. Trouve `WHATSAPP_ENABLED` et change à `true`
5. **Ajoute** (si pas déjà là) :
   ```
   ADMIN_PASSWORD=ton-mot-de-passe-secret
   ```
6. Clique **"Save Changes"**

#### B. Attends le déploiement

- Le service va redémarrer automatiquement
- ⏱️ **Attends 3-5 minutes**
- Va dans **"Logs"** pour suivre

#### C. Cherche cette ligne dans les logs

```
[WHATSAPP] 🌐 Go to: https://your-app.onrender.com/admin/whatsapp-qr
```

### 3️⃣ Scanne le QR Code

1. **Ouvre** : `https://TON-APP.onrender.com/admin/whatsapp-qr`
   - Remplace `TON-APP` par ton nom d'app Render
2. **Entre** le mot de passe admin
3. **Scanne** le QR code avec WhatsApp sur ton téléphone :
   - WhatsApp → Réglages → Appareils connectés → Connecter un appareil

### 4️⃣ Teste

Envoie un message WhatsApp au numéro que tu viens de connecter :

```
/start
```

Tu devrais recevoir le menu du bot ! 🎉

---

## 🔍 Vérifications

### Est-ce que ça marche ?

1. **Logs Render** : Cherche `[WHATSAPP] WhatsApp bot is ready!`
2. **Health check** : Va sur `https://TON-APP.onrender.com/health`
   ```json
   {
     "services": {
       "whatsapp": "ok"  ← Doit être "ok"
     }
   }
   ```
3. **Test message** : `/start` sur WhatsApp reçoit une réponse

---

## 🐛 Problèmes ?

### Le QR code ne s'affiche pas

- Attends que le build soit terminé (check les logs)
- Rafraîchis la page `/admin/whatsapp-qr`

### Build failed - "chromium not found"

- **Ton plan Render** : Doit être **Starter ($7/mois)** minimum
- Le **Free tier ne supporte PAS WhatsApp** (pas assez de RAM)

### Le bot ne répond pas

1. Vérifie `WHATSAPP_ENABLED=true` dans Environment
2. Check les logs : `[WHATSAPP]` tags
3. Health check : `/health` doit montrer whatsapp "ok"

---

## 📚 Documentation Complète

- **Guide détaillé** : `docs/WHATSAPP_RENDER_DEPLOYMENT.md`
- **Architecture WhatsApp** : `docs/WHATSAPP_INTEGRATION.md`
- **Quick start général** : `WHATSAPP_QUICKSTART.md`

---

## 💡 Points Importants

### ✅ Ce qui est déjà configuré

- Chromium auto-install dans render.yaml
- Persistent disk pour la session WhatsApp
- Endpoint `/admin/whatsapp-qr` pour scanner
- Password protection pour la sécurité

### ⚠️ Ce que TU dois configurer

- `WHATSAPP_ENABLED=true` dans Render
- `ADMIN_PASSWORD=xxx` dans Render
- Scanner le QR code (une seule fois)

### 💰 Coût Render

- **Free** : ❌ Ne marche PAS (pas assez de RAM)
- **Starter ($7/mois)** : ✅ Parfait pour WhatsApp + Telegram
- **Standard ($25/mois)** : ✅ Meilleure performance

---

## 🎯 Checklist Rapide

- [ ] Code pushé sur GitHub
- [ ] Render a pull le dernier code
- [ ] `WHATSAPP_ENABLED=true` sur Render
- [ ] `ADMIN_PASSWORD` configuré
- [ ] Build terminé (check logs)
- [ ] QR code scanné
- [ ] Test `/start` fonctionne

**Si tout est coché : C'est bon ! 🚀**

---

**Temps total estimé** : 10-15 minutes

**Questions ?** Lis le guide complet : `docs/WHATSAPP_RENDER_DEPLOYMENT.md`
