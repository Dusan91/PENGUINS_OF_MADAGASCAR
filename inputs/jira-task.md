Implementirati desktop stranu User Account → Notifications sa listom notifikacija (različiti tipovi: success/error/info) i “empty state” prikazom kada nema poruka. !!!Poruke koje mogu da stignu proveriti sa Necom, kao i trajanje poruka (koliko ostaju na Page-u)!!! Tolgee prevod za naslov strane, kao i kratak text koji je predvidjen kao opis strane, “No messages received” i secondary tekst.



1) Layout & navigacija (Desktop)
Levo sidebar “User Account”; stavka Notifications je aktivna (zeleni highlight).

Centralni sadržaj:

Naslov: Notifications

Subtitle: “Here you can see all your notifications”

Ispod: lista Notifications kartica (vertical stack) sa razmakom između.

2) Notifications list (UI)
Svaki item u listi je “card/row” sa:

Obavezni elementi
Title (bold) npr.:

“Ticket successfully paid”

“Ticket Payment Failed”

Status dot pored naslova:

Success = zelena tačka

Error = crvena tačka

(opciono) Info = siva/neutral

Short description (manji tekst ispod naslova), npr. “Ticket successfully processed. Transaction value = …”

Date desno (npr. 31.07.2025)

Vizuelna pravila
Clickable area može biti ceo red - kao “read-only list”. Click otvara detalje poruke (zavisi od tipa poruke, proveriti sa Necom. npr. uplacen ticket klik vodi do ticket detalja kao popup)

3) Stanja stranice
A) Normal state (ima notifikacija)
Renderuje se lista itema kao gore.

Lista treba da podrži scroll u okviru stranice (ako ima mnogo notifikacija).

B) Empty state (nema poruka)
Umesto liste, prikazati centralno poruku:

“No messages received”

Secondary tekst: “You will receive your first message after a successful action”

Pozadina ima diskretan pattern/placeholder (kao na Figma design-u).

C) Loading state (preporuka)
Skeleton ili placeholder linije dok se učitava lista.

D) Error state (preporuka)
Ako API vrati grešku: prikazati poruku “Failed to load notifications” + “Retry”.

4) Funkcionalna pravila (proveriti sa Necom)
Notifikacije se prikazuju sortirane po datumu (najnovije na vrhu).

Podržati minimalna polja u modelu:

id

type (success/error/info)

title

message (kratak opis)

createdAt (datum)

(opciono) isRead za budući read/unread styling (nije na dizajnu, ali korisno)

Acceptance Criteria (Desktop)
Notifications stavka je dostupna u sidebar-u i pravilno highlightovana kada je aktivna.

Prikazuju se naslov “Notifications” + subtitle.

Lista itema prikazuje: title, status dot (success/error), opis i datum desno.

Prazno stanje prikazuje “No messages received” + dodatni tekst (kao na dizajnu).

Lista je scrollable i sortira se po datumu (DESC). (virtual scroll??, ne paginacija)