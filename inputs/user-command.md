# User Command
Low-cost Penguins.
Files:
- /Users/dusanmilenkovic/Desktop/Hermes/bet-admin-web/src/components/wh/registration/WhRegistrationConfiguratorPage.tsx
- /Users/dusanmilenkovic/Desktop/Hermes/bet-admin-web/src/components/wh/home-page/WhHomePageConfiguratorPage.tsx
- /Users/dusanmilenkovic/Desktop/Hermes/wh-cms-bff-service/src/main/java/com/wh/cms/bff/domain/WhRegistrationConfig.java
- /Users/dusanmilenkovic/Desktop/Hermes/wh-cms-bff-service/src/main/java/com/wh/cms/bff/domain/WhHomePageConfig.java
Task: `
U komponenti `WhRegistrationConfiguratorPage.tsx` na putanji `/Users/dusanmilenkovic/Desktop/Hermes/bet-admin-web/src/components/wh/registration/WhRegistrationConfiguratorPage.tsx` potrebno je dodati mogućnost uploadovanja slike.

Pre implementacije, istraži postojeći način skladištenja i povezivanja slika u projektu. Kao referencu koristi `WhHomePageConfiguratorPage.tsx` na putanji `src/components/wh/home-page/WhHomePageConfiguratorPage.tsx` i isprati postojeću implementaciju za upload, čuvanje i povezivanje slike sa konfiguracijom.

**Potrebne izmene:**

1. **Frontend:** Dodaj mogućnost uploadovanja slike u `WhRegistrationConfiguratorPage.tsx`, prateći postojeće obrasce i komponente koje se koriste za upload slika u `WhHomePageConfiguratorPage.tsx`.
2. **Backend:** Izmeni `WhRegistrationConfig.java` na putanji `/Users/dusanmilenkovic/Desktop/Hermes/wh-cms-bff-service/src/main/java/com/wh/cms/bff/domain/WhRegistrationConfig.java` tako da podrži čuvanje reference na uploadovanu sliku.
3. **Čuvanje reference:** Nakon uspešnog uploada, identifikator slike (ili odgovarajuću referencu koju koristi postojeći sistem) sačuvaj u registration konfiguraciji, po uzoru na implementaciju u `WhHomePageConfig.java`, koji se nalazi na putanji `/Users/dusanmilenkovic/Desktop/Hermes/wh-cms-bff-service/src/main/java/com/wh/cms/bff/domain/WhHomePageConfig.java`.
4. **Persistencija i učitavanje:** Osiguraj da se referenca na sliku pravilno čuva na backendu, vraća kroz API i učitava u konfiguratoru prilikom ponovnog otvaranja postojeće konfiguracije.

**Važno:**
- Pre implementacije istraži postojeći kod i isprati isti mehanizam za upload i skladištenje slika koji se već koristi u projektu.
- Ponovo iskoristi postojeće servise, API pozive, tipove i UI komponente gde god je to moguće.
- Izbegavaj nepotrebno dupliranje koda i izmene nepovezanih delova sistema.
- Obezbedi da postojeće funkcionalnosti registracionog konfiguratora ostanu nepromenjene.
`
Validation: grep/read only, no full lint
No audit unless required