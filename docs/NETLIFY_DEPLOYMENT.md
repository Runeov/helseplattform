# Netlify Deployment Guide - Helseplattform

## Forutsetninger

1. En Netlify-konto (gratis på [netlify.com](https://netlify.com))
2. Git repository (GitHub, GitLab, eller Bitbucket)
3. Supabase-prosjekt med database satt opp

---

## Steg 1: Forbered Prosjektet

### 1.1 Verifiser at prosjektet bygger lokalt

```bash
# Installer avhengigheter
npm install

# Test build
npm run build

# Verifiser at 'dist' mappen er opprettet
ls dist/
```

### 1.2 Sjekk at alle filer er committet

```bash
git status
git add .
git commit -m "Prepare for Netlify deployment"
git push
```

---

## Steg 2: Koble til Netlify

### 2.1 Via Netlify Dashboard

1. Gå til [app.netlify.com](https://app.netlify.com)
2. Klikk **"Add new site"** → **"Import an existing project"**
3. Velg din Git-leverandør (GitHub/GitLab/Bitbucket)
4. Autoriser Netlify til å få tilgang til ditt repository
5. Velg `helseplattform-skeleton` repository

### 2.2 Build-innstillinger

Netlify vil automatisk oppdage `netlify.toml`, men verifiser:

| Innstilling | Verdi |
|-------------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 18.x eller nyere |

---

## Steg 3: Konfigurer Miljøvariabler

### 3.1 I Netlify Dashboard

Gå til: **Site settings** → **Environment variables** → **Add a variable**

Legg til følgende variabler:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# ID-porten (for produksjon)
VITE_IDPORTEN_ISSUER=https://idporten.no
VITE_IDPORTEN_AUTH_ENDPOINT=https://idporten.no/authorize
VITE_IDPORTEN_TOKEN_ENDPOINT=https://idporten.no/token
VITE_IDPORTEN_USERINFO_ENDPOINT=https://idporten.no/userinfo
VITE_IDPORTEN_LOGOUT_ENDPOINT=https://idporten.no/endsession
VITE_IDPORTEN_CLIENT_ID=your-production-client-id
VITE_IDPORTEN_REDIRECT_URI=https://your-site.netlify.app/auth/callback
```

### 3.2 Viktig om VITE_ prefix

Alle miljøvariabler som skal være tilgjengelige i frontend **MÅ** ha `VITE_` prefix.

---

## Steg 4: Deploy

### 4.1 Automatisk Deploy

Etter oppsett vil Netlify automatisk deploye ved hver push til `main` branch.

### 4.2 Manuell Deploy

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Logg inn
netlify login

# Deploy preview
netlify deploy

# Deploy til produksjon
netlify deploy --prod
```

---

## Steg 5: Konfigurer Domene (Valgfritt)

### 5.1 Bruk Netlify-domene

Din side vil være tilgjengelig på: `https://your-site-name.netlify.app`

### 5.2 Egendefinert domene

1. Gå til **Site settings** → **Domain management**
2. Klikk **"Add custom domain"**
3. Følg instruksjonene for DNS-konfigurasjon

---

## Steg 6: Oppdater ID-porten Redirect URI

### For Test-miljø

Oppdater redirect URI i ID-porten test-portal:
```
https://your-site.netlify.app/auth/callback
```

### For Produksjon

Oppdater redirect URI i ID-porten produksjons-portal:
```
https://helseplattform.no/auth/callback
```

---

## Steg 7: Oppdater Supabase

### 7.1 Legg til Netlify-domene i Supabase

1. Gå til Supabase Dashboard → **Authentication** → **URL Configuration**
2. Legg til i **Site URL**: `https://your-site.netlify.app`
3. Legg til i **Redirect URLs**: `https://your-site.netlify.app/**`

---

## Feilsøking

### Problem: 404 på refresh

**Løsning:** Sjekk at `netlify.toml` og `public/_redirects` er korrekt konfigurert.

### Problem: Miljøvariabler ikke tilgjengelige

**Løsning:** 
1. Sjekk at variablene har `VITE_` prefix
2. Trigger en ny deploy etter å ha lagt til variabler

### Problem: Build feiler

**Løsning:**
```bash
# Sjekk Node-versjon
node --version  # Bør være 18.x eller nyere

# Slett node_modules og prøv igjen
rm -rf node_modules
npm install
npm run build
```

### Problem: Supabase-tilkobling feiler

**Løsning:**
1. Sjekk at Supabase URL og nøkkel er korrekte
2. Verifiser at Netlify-domenet er lagt til i Supabase

---

## Netlify-filer i Prosjektet

| Fil | Beskrivelse |
|-----|-------------|
| `netlify.toml` | Hovedkonfigurasjon for Netlify |
| `public/_redirects` | Backup for SPA-routing |
| `.env.example` | Mal for miljøvariabler |

---

## Deploy Checklist

- [ ] `npm run build` fungerer lokalt
- [ ] Alle endringer er pushet til Git
- [ ] Netlify er koblet til repository
- [ ] Miljøvariabler er satt i Netlify
- [ ] ID-porten redirect URI er oppdatert
- [ ] Supabase URL-konfigurasjon er oppdatert
- [ ] Test at siden fungerer på Netlify-URL
- [ ] Test innlogging med ID-porten
- [ ] Test database-operasjoner

---

## Nyttige Kommandoer

```bash
# Lokal utvikling
npm run dev

# Bygg for produksjon
npm run build

# Preview produksjons-build lokalt
npm run preview

# Deploy til Netlify (preview)
netlify deploy

# Deploy til Netlify (produksjon)
netlify deploy --prod

# Sjekk Netlify-status
netlify status

# Åpne Netlify dashboard
netlify open
```

---

## Kontakt

Ved problemer med deployment, kontakt:
- [Netlify Support](https://www.netlify.com/support/)
- [Supabase Support](https://supabase.com/support)

---

*Sist oppdatert: 28. november 2024*