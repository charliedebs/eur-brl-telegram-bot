# 🚀 GUIDE DE MIGRATION - Multi-Platform Architecture

## ⚠️ IMPORTANT: À Faire Avant Déploiement

### 1. Migration Base de Données (OBLIGATOIRE)

La migration `002_add_platform_support.sql` doit être exécutée sur Supabase.

#### Option A: Via Supabase Dashboard (Recommandé)

1. Ouvre ton projet Supabase: https://app.supabase.com
2. Va dans **SQL Editor**
3. Crée une nouvelle query
4. Copie-colle le contenu de `migrations/002_add_platform_support.sql`
5. Clique sur **Run**

#### Option B: Via psql

```bash
psql $DATABASE_URL -f migrations/002_add_platform_support.sql
```

#### Vérification de la Migration

Après exécution, vérifie que les colonnes ont été ajoutées:

```sql
-- Dans Supabase SQL Editor
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Tu devrais voir:
-- platform (character varying, default: 'telegram')
-- platform_user_id (character varying)
```

Vérifie la contrainte unique:

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
  AND constraint_name = 'users_platform_user_unique';

-- Tu devrais voir une ligne avec constraint_type = 'UNIQUE'
```

---

### 2. Tests du Bot Telegram (CRITIQUE)

Le bot Telegram **devrait** fonctionner exactement comme avant, mais teste les flows principaux:

#### Tests Manuels Requis

1. **Démarrage:**
   ```
   /start
   ```
   ✅ Vérifie: Menu de langues s'affiche

2. **Comparaison:**
   ```
   /convert 1000
   ```
   ✅ Vérifie: Choix route (EUR→BRL / BRL→EUR)
   ✅ Vérifie: Affichage comparaison avec calculs corrects

3. **Guide On-Chain:**
   - Clique sur "🧭 Guide on-chain"
   - Navigue entre les steps (1.1 → 1.2 → ...)
   - Clique sur "📍 Navigation"
   ✅ Vérifie: Tous les steps accessibles

4. **Alertes (si Premium):**
   ```
   /alert
   ```
   ✅ Vérifie: Flow création alerte fonctionne
   ✅ Vérifie: Liste alertes fonctionne

5. **Premium:**
   ```
   /premium
   ```
   ✅ Vérifie: Affichage pricing ou status premium

6. **Changement de langue:**
   - Choisis FR ou EN
   ✅ Vérifie: Interface change de langue
   ✅ Vérifie: Contexte restauré (si dans comparaison)

#### Tests Automatiques (Optionnel)

Si tu as accès à un environment de test:

```bash
# Test syntax (déjà fait)
node --check src/core/bot-engine.js
node --check src/services/database.js
node --check src/core/handlers/*.js
node --check src/platforms/telegram/adapter.js

# Test database connection
node -e "import('./src/services/database.js').then(m => {
  const db = new m.DatabaseService();
  db.getUserByPlatform('telegram', 'test_id').then(console.log);
})"
```

---

### 3. Déploiement

Une fois la migration exécutée et les tests passés:

#### Option A: Déploiement Direct

Si tu déploies directement depuis cette branche:

```bash
# La branche actuelle contient tout
git log --oneline -5
# Tu devrais voir:
# e034cb0 refactor: Phase 2 - Telegram platform separation
# b98f5b8 refactor: Phase 1 - Multi-platform architecture foundation
```

Déploie normalement avec ton processus habituel.

#### Option B: Merge vers Main

Si tu veux merger vers ta branche principale:

```bash
# 1. Teste d'abord localement
npm start  # ou ton script de démarrage

# 2. Si tout fonctionne, merge
git checkout main
git merge claude/finalize-bot-suu-011CV499kgQHKtCb1AQ4fsHs
git push origin main
```

---

## 📋 CHECKLIST AVANT PRODUCTION

- [ ] Migration SQL exécutée sur Supabase
- [ ] Migration vérifiée (colonnes + contrainte existent)
- [ ] Tests manuels Telegram passés (6 tests ci-dessus)
- [ ] Logs vérifiés (pas d'erreurs au démarrage)
- [ ] Environment variables à jour (si changements)
- [ ] Backup base de données fait (recommandé)

---

## 🐛 Troubleshooting

### Erreur: "column platform does not exist"

**Cause:** Migration SQL pas exécutée

**Solution:** Exécute `migrations/002_add_platform_support.sql` sur Supabase

---

### Erreur: "Cannot find module './keyboards.js'"

**Cause:** Import path pas à jour

**Solution:** Vérifie que `src/bot/index.js` ligne 3 contient:
```javascript
import { buildKeyboards } from '../platforms/telegram/keyboards.js';
```

---

### Bot ne répond plus

**Cause possible:** Erreur dans handlers

**Debug:**
1. Vérifie les logs Supabase
2. Vérifie les logs de ton hosting
3. Teste localement avec `npm start`

```bash
# Mode debug
DEBUG=* npm start
```

---

### Users existants ne fonctionnent plus

**Cause:** Migration pas exécutée correctement

**Vérification:**
```sql
-- Tous les users existants devraient avoir platform='telegram'
SELECT telegram_id, platform, platform_user_id
FROM users
LIMIT 10;

-- Si platform est NULL, la migration n'a pas fonctionné
```

**Fix:**
```sql
-- Backfill manuel si nécessaire
UPDATE users
SET
  platform = 'telegram',
  platform_user_id = telegram_id
WHERE platform IS NULL;
```

---

## 📞 Support

Si tu rencontres des problèmes:

1. Vérifie les logs Supabase (SQL errors)
2. Vérifie les logs application (JavaScript errors)
3. Vérifie que la migration s'est bien exécutée
4. Teste avec un user de test en premier

---

## ✅ APRÈS LA MIGRATION

Une fois tout testé et déployé:

1. **Monitoring:** Vérifie les logs pendant les premières 24h
2. **Backup:** Garde un backup de la DB pré-migration
3. **Rollback plan:** Si problème majeur, tu peux:
   - Revenir au commit précédent
   - Restore la DB depuis backup
   - Redéployer l'ancienne version

---

## 🎯 PROCHAINES ÉTAPES (Après Migration Réussie)

Une fois le bot Telegram fonctionnel avec la nouvelle architecture:

### Option 1: Activer WhatsApp (5-8 heures estimé)
- Implémenter WhatsApp adapter complet
- Tester cross-platform
- Déployer WhatsApp

### Option 2: Améliorations Qualité (Audit recommendations)
- Fix error handling (4-6h)
- Fix race conditions alertes (3-4h)
- Memory leak sessions (1-2h)
- Input validation (2-3h)

Décision à prendre après tests! 🚀
