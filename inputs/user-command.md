
# User Command
Low-cost Penguins.
Files:
- apps/mobile-shell/src/app/ticket.tsx
Task: `
 Ukoliko je igrač označio opciju „Prihvatam promene“, nakon prikazivanja i potvrđivanja poruke o promeni kvote, kvota na tiketu trebalo bi automatski da se ažurira i omogući uplatu tiketa bez dodatnih intervencija igrača.

Ukoliko opcija „Prihvatam promene“ nije označena, nakon prikazivanja poruke o promeni kvote, vrednost kvote na tiketu ostaje nepromenjena.

Nezavisno od statusa opcije „Prihvatam promene“, ukoliko igrač sa tiketa ode u specijal meča, kvota bi trebalo automatski da se ažurira na svim relevantnim mestima. Prilikom povratka na tiket potrebno je da ažurirana vrednost kvote ostane sačuvana.

Ovakav scenario je relativno redak pri uobičajenom načinu odigravanja tiketa. Može se simulirati odabirom prematch tipova i čekanjem određenog vremena dok ne dođe do promene kvota.

**Pregled očekivanog ponašanja**

**1. Opcija „Prihvatam promene“ nije označena:**

- Igraču se prikazuje poruka o promeni kvote, dok vrednost kvote na tiketu ostaje nepromenjena.
- Ukoliko igrač otvori specijal meča, kvota se automatski ažurira na svim relevantnim mestima, a povratkom na tiket omogućava se njegova uplata.
- Ukoliko igrač naknadno označi opciju „Prihvatam promene“, sve kvote na tiketu automatski se ažuriraju, čime se omogućava uplata tiketa.

**2. Opcija „Prihvatam promene“ je označena:**

- Ukoliko prilikom pokušaja uplate tiketa dođe do promene kvote, igraču se prikazuje odgovarajuća poruka. Nakon potvrde poruke klikom na „OK“, kvota se automatski ažurira i tiket je moguće odmah uplatiti.
- Ukoliko se kvota promeni pre pokušaja uplate tiketa, a servis za praćenje promena kvota je aktivan, kvota u betslipu automatski se ažurira. Promena se vizuelno označava odgovarajućom bojom i indikatorom smera promene, na isti način kao kod live klađenja. U tom slučaju tiket je moguće uplatiti bez dodatne poruke o promeni kvote.

**Napomena:**

U određenim slučajevima servis za praćenje promena kvota u prematch klađenju nije aktivan. Tada se informacija o promeni kvote dobija direktno od backend servisa prilikom pokušaja uplate tiketa, nakon čega se primenjuje odgovarajuća logika u zavisnosti od statusa opcije „Prihvatam promene“.

Ukoliko postoje odstupanja trenutne implementacije od opisanog očekivanog ponašanja, možemo se dodatno konsultovati, analizirati postojeće rešenje i utvrditi da li su potrebne korekcije.
`

No audit unless required