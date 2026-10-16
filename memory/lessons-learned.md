# Lessons Learned

> This file records mistakes, failed approaches, and hard-won discoveries.
> Agents MUST read this before starting any task.
> Agents MUST write here when a task reveals a non-obvious constraint or failure mode.

---

## Format

```
## YYYY-MM-DD — Short title

- **What failed**: describe the mistake or failed approach
- **Why it failed**: root cause
- **What to do instead**: correct approach
- **Affects**: which agents / files / areas are impacted
```

---

<!-- New lessons go below this line -->

## 2026-07-16 — "Prati logiku" znači prati redosled operacija, ne tehnologiju

- **What failed**: Kada korisnik kaže "prati logiku sa web-shella", agent se fokusirao na tehnološke razlike (WebView vs Dialog, Monri Components JS SDK vs URL redirect) umesto na tačan redosled operacija. Implementacija je pozivala API pre otvaranja modala — suprotno od weba gde se modal otvara odmah na Pay klik, a API poziv se dešava unutar modala.
- **Why it failed**: Agent nije pažljivo pročitao sve relevantne fajlove pre pisanja koda (`monri-payment.tsx`, `second-step.tsx`, `provider-payments.tsx`, `first-step.tsx`). Da je to uradio, odmah bi video da web tok je: Pay klik → `setToggleDialog(true)` (odmah) → modal otvoren → `useEffect` unutar `SecondStep` → `getClientSecret` API. Umesto toga, agent je čitao parcijalno i pretpostavljao.
- **What to do instead**: Pre bilo kakve implementacije "prepiši logiku iz X u Y": (1) pročitaj SVE relevantne fajlove u izvornom toku, (2) napiši tačan redosled operacija kao listu, (3) tek onda implementiraj. Kada platforma ograničava tehnologiju (React Native nema DOM), samo zameni tehnologiju — redosled operacija ostaje identičan.
- **Affects**: Svi taskovi koji repliciraju tokove iz `apps/web-shell` u `apps/mobile-shell`.

## 2026-07-16 — transactions.service.ts: ALL (30-day) monthOffsets fetched 2 months instead of 1

- **What failed**: The `ALL` timePeriod branch (used for 30-day filter) fetched `[0, 1]` (current + previous month = 2 months), returning ~60 transactions. The `3_MONTHS` branch fetched `[0, 1, 2]` but returned only ~30 because those months had fewer entries. Result: 30-day showed more transactions than 3-month — logically inverted.
- **Why it failed**: `monthOffsets` ternary used `[0, 1]` as the fallback for `ALL`, incorrectly assuming 2 months covers "30 days". The 30-day filter is further narrowed client-side by `getStartAndEndDays`, so fetching only the current month `[0]` is sufficient and correct.
- **What to do instead**: `ALL` (30-day FE) must use `[0]` — only the current calendar month. `3_MONTHS` correctly uses `[0, 1, 2]`. This guarantees 3-month always returns >= 30-day results.
- **Affects**: `apps/mobile-shell/src/services/transactions.service.ts` line 110; any future changes to month-offset logic in this service.

## 2026-07-09 — Icon u mobile-shell mora imati color prop iz useMobileThemeColors

- **What failed**: Agent koristio `Icon` komponentu bez `color` propa — ikona se nije prikazivala ispravno jer tema boja nije primjenjena.
- **Why it failed**: U mobile-shell `Icon` komponenta ne reaguje na CSS klase (`text-foreground`) za boju na iOS u runtime — boja mora biti eksplicitno proslijeđena kroz `color` prop.
- **What to do instead**: Uvijek koristiti `useMobileThemeColors()` hook i proslijediti odgovarajuću boju kroz `color` prop. Primjer ispravnog koda:
  ```tsx
  const colors = useMobileThemeColors()
  <Icon as={ChevronLeft} className="text-foreground" size={16} color={colors.foreground} />
  ```
- **Affects**: Svi Private agent taskovi u `apps/mobile-shell` koji koriste `Icon` komponentu.

- **What failed**: Agent importovao `useGifts`, `activateGift`, `useNotifications` iz `@wh-label/shared` u mobile-shell komponentama.
- **Why it failed**: `@wh-label/shared` nije u `package.json` od `apps/mobile-shell` — paket nije dostupan u mobile-shell kontekstu.
- **What to do instead**: Svaki servis koji treba u mobile-shell mora biti kreiran lokalno u `apps/mobile-shell/src/services/`. Koristiti `expo/fetch` + `EXPO_PUBLIC_CONFIG_URL` ili `EXPO_PUBLIC_API_BASE_URL` + `queryOptions` + `useQuery` pattern. Pogledaj `kyc.service.ts`, `gifts.service.ts`, `notifications.service.ts` kao uzore.
- **Affects**: Svi Private agent taskovi u `apps/mobile-shell`. Važi sve dok korisnik ne doda `@wh-label/shared` u mobile-shell dependencies.

## 2026-07-08 — "Prepisi" znači potpuna replika, ne parcijalna

- **What failed**: Kada korisnik kaže "prepisi" ili "implementiraj" komponentu iz web paketa u mobile-shell, agent je kreirao delimičnu repliku — propustio `showFreeBet` guard iz `useParams`, pogrešan uslov za prikaz iznosa (`showFreebetAmount ? freebetAmount : 0`), i hardkodovao string umesto translation key-a.
- **Why it failed**: Agent je prepisao samo "suštinu" logike a ne sve detalje originalne komponente. Tretirao je neke delove kao opcione.
- **What to do instead**: Kada se kaže "prepisi" ili "implementiraj po uzoru na", svaki logički detalj originala mora biti repliciran u native ekvivalentu: svi uslovi, svi computed values, svi labels (hardkodovani ako translation nije dostupan, ali identični originalnom stringu). Razlike treba eksplicitno nabrojati korisniku.
- **Affects**: Private agent, sve komponente koje se repliciraju iz `packages/betting` ili `packages/shared` u `apps/mobile-shell`.

## 2026-07-08 — U mobile-shell uvijek koristiti /ui/view i /ui/pressable

- **What failed**: Agent koristio `View` i `Pressable` direktno iz `react-native` u mobile-shell komponentama.
- **Why it failed**: Native `View` i `Pressable` iz react-native ne primjenjuju tema boje sa backenda — CSS varijable ne reaguju na iOS u runtime. `/ui/view` i `/ui/pressable` rješavaju ovo automatski kroz `useMobileThemeColors`.
- **What to do instead**: U `apps/mobile-shell` uvijek importovati `View` iz `@/components/ui/view` i `Pressable` iz `@/components/ui/pressable`. Nikad iz `react-native` direktno — osim unutar samih `ui/view.tsx` i `ui/pressable.tsx` fajlova.
- **Affects**: Svi Private agent taskovi u `apps/mobile-shell`. Važi sve dok korisnik ne kaže da prestane.

## 2026-09-25 — "Prepiši" zahteva potpunu bihevioralnu paritetnost

- **What failed**: Mobile filteri za custom komponente proglašeni su završenim i označeni kao PASS iako Providers nije prikazivao provajdere, a Search nije vraćao rezultate.
- **Why it failed**: Statičke provere i provere uslova samo čitanjem koda nisu obuhvatile ponašanje interakcija od početka do kraja.
- **What to do instead**: Pre implementacije nabrojati svako izvorno ponašanje, API poziv, promenu stanja, uslov renderovanja, loading/error/empty stanje, paginaciju, navigaciju, perzistenciju i prevod; napraviti matricu paritetnosti; implementirati sva primenljiva ponašanja; proveriti svaku korisničku interakciju od početka do kraja. Nikada ne proglašavati parcijalan rad završenim niti ga označavati kao PASS. Ako runtime validacija nije moguća, to eksplicitno navesti i ne tvrditi da je runtime ponašanje ispravno.
- **Affects**: Skipper, Rico, Private i Melman; svi zadaci replikacije sa weba na mobile ili replikacije komponenti, posebno filteri za custom komponente.

## 2026-09-25 — Više komponenti mora biti podeljeno u zasebne fajlove po postojećim standardima

- **What failed**: Replikacija koja je sadržala više komponenti smeštena je u jedan veliki fajl umesto u zasebne fajlove komponenti.
- **Why it failed**: Implementacija je optimizovana za brzinu i minimalan broj fajlova umesto da prati postojeću strukturu komponenti i granice odgovornosti.
- **What to do instead**: Pre implementacije pregledati konvencije obližnjih foldera i fajlova. Kreirati zaseban fajl za svaku logičku komponentu kada izvor ili referenca sadrži više komponenti ili odgovornosti. Kontejner/dispatcher, filtere/pretragu/listu provajdera, listu/karticu igara, paginaciju i druge odvojene UI odgovornosti držati zasebno kada projektni obrasci tako nalažu. Ponovo koristiti postojeće komponente i ne spajati komponente samo radi smanjenja broja fajlova. Uključiti sve potrebne fajlove u scope/plan i zatražiti proširenje scope-a pre pisanja ako je potrebno. Revieweri moraju proveriti podelu komponenti i fajlova prema konvencijama repozitorijuma i odbiti monolitne implementacije koje ih krše.
- **Affects**: Skipper, Rico, Kowalski, Private i Melman; svi zadaci replikacije komponenti i prenosa sa weba na mobile.

## 2026-09-29 — URLSearchParams vrednosti ne treba unapred kodirati

- **What failed**: Trimovane vrednosti query parametara prosleđene su kroz `encodeURIComponent` pre dodavanja u `URLSearchParams`, pa su razmaci postali dvostruko kodirani kao `%2520` umesto `%20`.
- **Why it failed**: `URLSearchParams` već obavlja percent-encoding, pa je prethodno kodiranje ponovo kodirano.
- **What to do instead**: U `URLSearchParams` proslediti sirove trimovane vrednosti i prepustiti mu kodiranje query stringa.
- **Affects**: Izgradnja game route query stringa u `apps/mobile-shell/src/features/casino/components/sections/custom-component-filters-section.tsx` i sva buduća upotreba `URLSearchParams`.

## 2026-09-29 — Native room-preview measurement and layering must be branch-invariant

- **What failed**: Arrow paging used a missing or unrelated layout width in conditional ScrollView branches, while background and hero media risked obscuring or intercepting interactive content.
- **Why it failed**: One-row and multi-row branches did not consistently attach the same viewport `onLayout` measurement, and decorative image layers were not treated uniformly as non-interactive background layers.
- **What to do instead**: Attach the same viewport `onLayout` measurement used by arrow paging to every ScrollView render branch; keep background and hero images absolute, non-interactive, and below content.
- **Affects**: Native room-preview hero/background layering and horizontal paging in `apps/mobile-shell/src/features/casino/components/sections/room-preview-section.tsx`.

## 2026-09-30 — Validate banner jackpot behavior against an exact API payload

- **What failed**: Prior validation falsely passed after reasoning from inferred banner and jackpot shapes. In the concrete response, pure widget slides were dropped before render, so the jackpot never reached the banner component.
- **Why it failed**: Validation did not trace one concrete API fixture through every mapper and null guard. It also misread contract details: `dualsoft` uses the standard jackpot path, `widget.config.levelConfigs` must become root `tiers`, autoplay is nested at `options.autoplayIntervalSeconds`, and `backgroundStyle: 'image'` is a display mode rather than a color value.
- **What to do instead**: Validate a concrete fixture end to end through normalization, widget retention, section synthesis, jackpot routing, tier normalization, query inputs, and render guards. Explicitly list the expected tier IDs; for the verified payload they are `321`, `322`, `323`, and `324`.
- **Affects**: Rico, Private, Melman, and Skipper; mobile `banner-carousel/v1` jackpot mapping and validation in `casino-page-mapper.ts`, `banner-carousel-section.tsx`, and `jackpot-standard-section.tsx`.
