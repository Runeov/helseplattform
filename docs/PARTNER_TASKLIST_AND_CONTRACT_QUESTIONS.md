# Helseplattform - Oppgaveliste og Kontraktsspørsmål

## Del 1: Oversikt over Implementert Funksjonalitet

### 1.1 Autentisering og Brukerregistrering

#### Implementerte funksjoner:
- **ID-porten integrasjon** - Sikker innlogging via norsk offentlig ID-løsning
- **To brukertyper**: 
  - Helsepersonell (arbeidstakere)
  - Kommune-representanter (arbeidsgivere)
- **Profilregistrering** med:
  - HPR-nummer validering for helsepersonell
  - Kommune- og avdelingsinformasjon for arbeidsgivere
  - Kostnadssted-kode for fakturering

#### Relevante filer:
- `src/pages/auth/Login.jsx` - Innloggingsside
- `src/pages/auth/Register.jsx` - Registreringsside
- `src/pages/auth/RegisterComplete.jsx` - Fullføring av registrering
- `src/api/idporten.js` - ID-porten integrasjon

---

### 1.2 Dashboard og Vakt-oversikt

#### For Kommune-ansatte (Arbeidsgivere):
- **Ledige vakter** - Oversikt over alle åpne vakter
- **Ventende søknader** - Søknader fra helsepersonell som venter på godkjenning
- **Kommende vakter** - Tildelte vakter som skal utføres
- **Historikk** - Fullførte vakter med vurderinger

#### For Helsepersonell (Arbeidstakere):
- **Ledige vakter** - Vakter de kan søke på
- **Mine søknader** - Status på innsendte søknader
- **Profil** - Personlig informasjon, HPR-nummer, timepris

#### Tekniske forbedringer gjort:
1. Fikset lasting av brukerdata fra session
2. Implementert korrekt UUID-håndtering for database-spørringer
3. Fikset data-tilgang for Supabase one-to-one relasjoner
4. Lagt til automatisk lasting av statistikk ved sideinnlasting

#### Relevante filer:
- `src/pages/dashboard/index.jsx` - Hovedoversikt
- `src/pages/profile/index.jsx` - Brukerprofil

---

### 1.3 Vakt-opprettelse og Søknadsprosess

#### Implementerte funksjoner:
- **Opprett vakt** med:
  - Dato og tidspunkt
  - Yrkeskategori (Sykepleier, Helsefagarbeider, Lege, Vernepleier)
  - Timelønn
  - Beskrivelse
  
- **Tilgjengelige arbeidstakere** - Viser matchende helsepersonell med:
  - Match-score basert på lønn, erfaring og vurderinger
  - Profilvisning med detaljert informasjon
  - Varslings-preferanser (e-post, SMS, push)

- **Søknadshåndtering**:
  - Arbeidstakere kan søke på vakter
  - Arbeidsgivere kan godkjenne/avslå søknader
  - Automatisk kontrakt-opprettelse ved godkjenning

#### Tekniske forbedringer gjort:
1. Fikset "Se profil"-knapp som trigget skjema-innsending
2. Implementert match-score med 10% intervaller
3. Fikset kontrast-problemer i brukergrensesnittet
4. Lagt til varslings-avkrysningsbokser for hver arbeider

#### Relevante filer:
- `src/pages/shifts/CreateShift.jsx` - Opprett vakt
- `src/pages/shifts/ShiftDetails.jsx` - Vaktdetaljer
- `src/components/shifts/EligibleWorkersList.jsx` - Liste over tilgjengelige arbeidere

---

### 1.4 Database-struktur

#### Hovedtabeller:
- `profiles` - Brukerdata (kobles til Supabase auth)
- `workers` - Helsepersonell-spesifikk data
- `departments` - Kommune/avdeling-data
- `shifts` - Vakter
- `shift_applications` - Søknader
- `contracts` - Kontrakter
- `reviews` - Vurderinger

#### Relevante filer:
- `database/schema.sql` - Komplett database-skjema
- `database/realistic_test_data.sql` - Testdata

---

## Del 2: E-post til Partner om Arbeidskontrakter

---

**Emne: Forespørsel om arbeidskontrakter og juridiske avklaringer - Helseplattform**

Kjære [Partner/Juridisk rådgiver],

Vi utvikler en digital plattform som kobler kommuner direkte med kvalifisert helsepersonell for vikariater og ekstravakter. I den forbindelse har vi behov for juridisk veiledning og utarbeidelse av arbeidskontrakter som er i samsvar med gjeldende norsk lovverk.

### Bakgrunn

Plattformen fungerer slik:
1. Kommuner publiserer ledige vakter med spesifiserte krav og lønn
2. Helsepersonell søker på vakter som passer deres kompetanse
3. Ved godkjenning opprettes en arbeidskontrakt digitalt
4. Etter utført arbeid kan arbeidsgiver gi vurdering

### Kritiske spørsmål vi trenger avklaring på:

#### 1. Kontraktsform og arbeidsforhold

**Spørsmål:**
- Skal kontrakten være en **tilkallings-/behovskontrakt** eller en **midlertidig ansettelse** per vakt?
- Hvem er formelt arbeidsgiver - kommunen direkte eller plattformen som bemanningsbyrå?
- Hvilke krav stiller **Arbeidsmiljøloven § 14-6** til skriftlig arbeidsavtale for korte oppdrag?

**Referanse til lovverk:**
- Arbeidsmiljøloven § 14-5 (Krav om skriftlig arbeidsavtale)
- Arbeidsmiljøloven § 14-6 (Minimumskrav til innholdet i den skriftlige avtalen)
- Arbeidsmiljøloven § 14-9 (Midlertidig ansettelse)

---

#### 2. Situasjon: Arbeidstaker møter ikke opp

**Scenario:** En helsepersonell har akseptert en vakt og kontrakt er signert, men møter ikke opp på avtalt arbeidssted.

**Spørsmål:**
- Hvilke sanksjoner kan iverksettes?
- Kan arbeidsgiver kreve erstatning for merkostnader ved å skaffe vikar?
- Hvordan skal dette reguleres i kontrakten?
- Skal det være en karanteneperiode på plattformen?

**Referanse til lovverk:**
- Arbeidsmiljøloven § 15-14 (Avskjed)
- Skadeserstatningsloven § 2-1 (Arbeidsgiveransvar)

---

#### 3. Situasjon: Arbeidet finnes ikke / Vakt kanselleres

**Scenario:** Arbeidstaker møter opp, men vakten er kansellert uten varsel, eller arbeidsstedet eksisterer ikke.

**Spørsmål:**
- Har arbeidstaker krav på lønn for oppmøte?
- Hva er minimumsvarsel for kansellering av vakt?
- Hvordan beregnes eventuell kompensasjon?
- Skal det være en "no-show fee" for arbeidsgivere?

**Referanse til lovverk:**
- Arbeidsmiljøloven § 14-15 (Utbetaling av lønn)
- Arbeidsmiljøloven § 10-3 (Arbeidsplan)

---

#### 4. Situasjon: Tvist om utført arbeid

**Scenario:** Uenighet mellom partene om arbeidet er utført tilfredsstillende.

**Spørsmål:**
- Hvordan skal tvister løses?
- Skal det være en klagenemnd eller voldgift?
- Hvordan dokumenteres utført arbeid?
- Kan arbeidsgiver holde tilbake lønn ved påstått mangelfull utførelse?

**Referanse til lovverk:**
- Arbeidsmiljøloven § 14-15 (Utbetaling av lønn og feriepenger)
- Arbeidstvistloven

---

#### 5. Helsepersonell-spesifikke krav

**Spørsmål:**
- Hvordan verifiseres HPR-nummer og autorisasjon?
- Hva skjer hvis autorisasjon tilbakekalles mellom kontraktsinngåelse og vaktstart?
- Hvem har ansvar for å sjekke at helsepersonell har gyldig autorisasjon?
- Hvordan håndteres taushetsplikt og pasientdata?

**Referanse til lovverk:**
- Helsepersonelloven § 48 (Helsepersonellregisteret)
- Helsepersonelloven § 21 (Hovedregel om taushetsplikt)
- Helsepersonelloven § 57 (Tilbakekall av autorisasjon)

---

#### 6. Forsikring og ansvar

**Spørsmål:**
- Hvem har yrkesskadeforsikring for arbeidstaker under oppdraget?
- Hvem er ansvarlig ved pasientskade?
- Trenger plattformen egen ansvarsforsikring?

**Referanse til lovverk:**
- Yrkesskadeforsikringsloven
- Pasientskadeloven
- Helsepersonelloven § 4 (Forsvarlighet)

---

#### 7. Skatt og avgifter

**Spørsmål:**
- Hvem er ansvarlig for skattetrekk og arbeidsgiveravgift?
- Hvordan rapporteres til A-meldingen?
- Skal helsepersonell fakturere som selvstendig næringsdrivende eller være ansatt?

**Referanse til lovverk:**
- Skattebetalingsloven
- Folketrygdloven

---

### Ønsket leveranse

Vi ber om:

1. **Juridisk vurdering** av plattformens forretningsmodell
2. **Mal for arbeidskontrakt** som dekker:
   - Korte oppdrag (enkeltvakter)
   - Lengre vikariater
   - Tilkallingsbasis
3. **Vilkår og betingelser** for plattformen
4. **Personvernerklæring** i henhold til GDPR
5. **Prosedyrer** for håndtering av tvister og avvik

### Tidslinje

Vi ønsker å lansere plattformen i Q1 2025 og trenger derfor:
- Første utkast til kontrakter: [dato]
- Juridisk gjennomgang fullført: [dato]
- Endelig godkjenning: [dato]

### Kontaktinformasjon

[Navn]
[Stilling]
[E-post]
[Telefon]

Vi ser frem til et godt samarbeid og ber om et møte for å diskutere disse spørsmålene nærmere.

Med vennlig hilsen,

[Signatur]
Helseplattform AS

---

## Del 3: Sjekkliste for Juridisk Gjennomgang

### Arbeidsmiljøloven
- [ ] § 14-5: Krav om skriftlig arbeidsavtale
- [ ] § 14-6: Minimumskrav til innhold
- [ ] § 14-9: Midlertidig ansettelse
- [ ] § 14-15: Utbetaling av lønn
- [ ] § 10-3: Arbeidsplan
- [ ] § 15-14: Avskjed

### Helsepersonelloven
- [ ] § 4: Forsvarlighet
- [ ] § 21: Taushetsplikt
- [ ] § 48: Helsepersonellregisteret
- [ ] § 57: Tilbakekall av autorisasjon

### Andre lover
- [ ] Yrkesskadeforsikringsloven
- [ ] Pasientskadeloven
- [ ] Skattebetalingsloven
- [ ] Folketrygdloven
- [ ] GDPR / Personopplysningsloven
- [ ] Arbeidstvistloven

---

## Del 4: Tekniske Oppgaver som Gjenstår

### Høy prioritet
- [ ] Implementere digital signering av kontrakter
- [ ] Integrere med HPR-registeret for autorisasjonssjekk
- [ ] Implementere varslinger (e-post, SMS, push)
- [ ] Legge til betalingsløsning

### Medium prioritet
- [ ] Implementere chat/meldingssystem
- [ ] Legge til kalenderintegrasjon
- [ ] Implementere rapportering og statistikk
- [ ] Legge til eksport av data (PDF, Excel)

### Lav prioritet
- [ ] Mobilapp
- [ ] Integrasjon med kommunale systemer
- [ ] Avansert matching-algoritme
- [ ] AI-baserte anbefalinger

---

*Dokument opprettet: 28. november 2024*
*Sist oppdatert: 28. november 2024*