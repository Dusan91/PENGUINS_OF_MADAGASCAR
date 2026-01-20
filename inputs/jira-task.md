Ovo je sve u web-shell projektu, nemoj prelaziti na mobile-shell
Refaktorisi da ima i mobile screen.
Implementirati KYC (Identity Verification) ekran u okviru Player Profile-a, sa kompletnim tokom: unos podataka → upload dokumenata → slanje verifikacije → pending/declined states → verified state.

UI / Layout (Mobile)
Ekran je u okviru Profile > Personal Information (breadcrumb na vrhu).

Sve sekcije su stacked (jedna ispod druge):

Rules and Description

Account Status (status + progress)

Document Verification (document type dropdown + upload blokovi)

Personal Information Form

CTA: Start verification (na dnu ekrana / dnu forme)

Flow / Stanja (Mobile) — prema screenshotovima
A) Step 1 — Not Verified (0%)
Account Status: Not Verified, 0%.

Document Verification: 4 upload blokova (Front, Back, Proof of Address, Photo of face).

Personal Info: prazna polja + Bank Account dropdown + PEP checkbox.

Start verification disabled dok nije validno.

B) Step 2 — Otvoren dropdown (Document type)
Dropdown se širi preko sadržaja i prikazuje opcije:

ID card (highlight)

Passport

Driving Licence

C) Step 3 — Uploadovani dokumenti (file rows)
Nakon upload-a, svaki dokument prikazuje “file row” sa:

naziv fajla

download ikona

delete ikona

(Na dizajnu se vidi da se nekad pojavljuju 3 “ID card” dokument bloka + selfie; implementacija treba da prati stvarni backend mapping, ali UI mora podržati listu uploadovanih item-a po tipu.)

D) Step 4 — Final ready to submit
Dokumenti uploadovani + forma popunjena (City/Street/Street Number/Occupation/Bank Account).

Start verification je aktivan (bright).

E) Pending Verification (75%)
Account Status: Pending Verification, 75%.

Document Verification panel:

“Waiting for document approval”

status za ID Card Front/Back/Face/Address (spinner)

timestamp

ETA (npr. 72h)

F) Pending + Declined kombinacije
Primeri varijante:

2 pending + 2 još “uploaded” (file row prikaz) + Start verification dugme vidljivo

2 success (green check) + 2 declined (Proof of Address + Face)

2 pending + 2 declined (uz ETA)

Declined kartice imaju:

Declined label + crveni ikon

red message (skraćeni naslov “Photo is not…” + tekst)

CTA: Try again (re-upload)

G) Verified (100%)
Account Status: Account Verified (ID Card), 100%.

Document Verification sekcija se ne prikazuje (ili je collapsed), ostaje Personal Info read-only.

Toast poruke (Mobile)
Pošto je desktop spec “bottom-right”, na mobile verziji:

Toast treba da bude pri dnu ekrana, iznad safe-area (i iznad footer-a ako postoji), širine koja odgovara mobile layout-u.

Isti sadržaj/stil kao desktop: ikona + title + description, auto-dismiss, stack više toastova.

Acceptance Criteria (Mobile)
Sekcije prikazane u mobile stacked layout-u.

Document type dropdown radi i overlay je uredan.

Upload polja imaju empty/filled/error stanje.

Pending state prikazuje status panel + ETA + timestamp.

Declined dokumenti imaju reason + Try again.

Verified state prikazuje 100% i zaključava formu.

Toast poruke rade i ne prekrivaju ključne CTA elemente.