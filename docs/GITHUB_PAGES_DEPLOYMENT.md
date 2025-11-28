# GitHub Pages Deployment Guide - Helseplattform

## Oversikt

Prosjektet er konfigurert for automatisk deployment til GitHub Pages via GitHub Actions.

**Live URL:** https://runeov.github.io/helseplattform/

---

## Automatisk Deployment

Hver gang du pusher til `main` branch, vil GitHub Actions automatisk:
1. Bygge prosjektet med `npm run build`
2. Kopiere `index.html` til `404.html` for SPA-routing
3. Deploye til GitHub Pages

---

## Oppsett (Første gang)

### Steg 1: Aktiver GitHub Pages

1. Gå til repository på GitHub
2. Klikk **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source:** GitHub Actions
4. Klikk **Save**

### Steg 2: Legg til Secrets (Valgfritt)

For å bruke Supabase i produksjon:

1. Gå til **Settings** → **Secrets and variables** → **Actions**
2. Klikk **New repository secret**
3. Legg til:
   - `VITE_SUPABASE_URL` - Din Supabase URL
   - `VITE_SUPABASE_ANON_KEY` - Din Supabase anon key

### Steg 3: Trigger Første Deploy

Push en endring til `main` branch, eller:
1. Gå til **Actions** tab
2. Velg "Deploy to GitHub Pages" workflow
3. Klikk **Run workflow**

---

## Konfigurasjonsfiler

### `vite.config.js`
```javascript
export default defineConfig({
  base: '/helseplattform/',  // Repository navn
  // ...
})
```

### `src/main.jsx`
```javascript
const basename = import.meta.env.BASE_URL
<BrowserRouter basename={basename}>
```

### `.github/workflows/deploy.yml`
GitHub Actions workflow som bygger og deployer automatisk.

---

## SPA Routing

GitHub Pages støtter ikke server-side routing. Løsningen:
- `404.html` er en kopi av `index.html`
- Når en rute ikke finnes, serverer GitHub `404.html`
- React Router tar over og viser riktig side

---

## Feilsøking

### Problem: Blank side etter deploy

**Årsak:** Base path er feil
**Løsning:** Sjekk at `base` i `vite.config.js` matcher repository-navnet

### Problem: Routing fungerer ikke

**Årsak:** `basename` mangler i BrowserRouter
**Løsning:** Sjekk `src/main.jsx`

### Problem: Assets lastes ikke

**Årsak:** Relative paths
**Løsning:** Bruk `import` for assets, ikke relative URLs

### Problem: Build feiler i Actions

**Løsning:**
1. Sjekk Actions-loggen for feilmeldinger
2. Test lokalt med `npm run build`
3. Sjekk at alle dependencies er i `package.json`

---

## Lokal Testing av Produksjons-build

```bash
# Bygg prosjektet
npm run build

# Preview med riktig base path
npm run preview
```

Åpne http://localhost:4173/helseplattform/

---

## Manuell Deploy (Alternativ)

Hvis du ikke vil bruke GitHub Actions:

```bash
# Installer gh-pages
npm install --save-dev gh-pages

# Legg til i package.json scripts:
# "deploy": "gh-pages -d dist"

# Bygg og deploy
npm run build
npm run deploy
```

---

## Miljøvariabler

| Variabel | Beskrivelse | Påkrevd |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase prosjekt URL | Ja (for database) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Ja (for database) |
| `VITE_MOCK_AUTH` | Bruk mock autentisering | Nei (default: true) |

---

## Oppdatere Deployment

Bare push til `main`:

```bash
git add .
git commit -m "Din commit melding"
git push
```

GitHub Actions vil automatisk bygge og deploye.

---

*Sist oppdatert: 28. november 2024*