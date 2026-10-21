# GameScores

[English](#english) · [Deutsch](#deutsch)

[Open the app / App öffnen](https://vulpisvulca.github.io/GameScore/) · [GitHub repository / Repository](https://github.com/VulpisVulca/GameScore)

## English

A small bilingual web app for board-game accounting, starting with Food Chain Magnate (base game or new milestones, 2–6 players; six players require the expansion). No backend, account, external services, or runtime dependencies. All entries stay on the shared device.

### Architecture

The app uses native modules with separate views, round state, input handling and storage. A shared accounting report supplies the table, ledger and statistics. See [Architecture](ARCHITECTURE.md) for module boundaries, offline packaging, tests and the rollback checkpoint.

### Run locally

Use Node.js 24 or newer:

```sh
npm start
```

Open http://127.0.0.1:4173. No dependency installation is required. Service workers require localhost or HTTPS; opening the HTML file directly is not sufficient.

If PowerShell blocks `npm.ps1` because of its execution policy, use `npm.cmd start` or `npm.cmd test` instead.

Run the tests with:

```sh
npm test
```

### GitHub Pages

1. Push the files to the `main` branch of a GitHub repository.
2. Under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. If needed, manually run the **Deploy GameScores to GitHub Pages** workflow under Actions.

The app uses relative paths and also works at `https://name.github.io/repository/`. The workflow runs the tests first, then publishes only the static application files, translations, local fonts, and `.nojekyll`.

### Playing a game

- Select a game, choose 2–6 players with the count buttons, enter names, and choose a color for each player. Colors assigned to someone else are disabled and gray; clicking your own selected color releases it. Player balances start at 0 $; the bank starts with 50 $ per player.
- The compact game table shows the bank, balances, round status, and selectable milestones. Sales are entered in a separate view.
- **Open sales round** starts a four-step flow: Houses → Waitresses & CFO → Salaries → Review.
- For each house, select the serving player and enter burgers, pizza, beer (brown), lemonade (yellow), and soft drinks (red). Choose **Without garden** or **With garden**. Choose a house number from the popup (1–19). Houses with native gardens automatically select the garden option. **Add house & next** saves that sale and opens an empty entry for the next house.
- Active milestones appear as tags below each player button, with the current unit price beside the name. Once a player is selected, each product shows earnings per item including product milestone and garden bonuses, excluding the CFO.
- The price comparison shows every player's unit price and lets you adjust base prices before the −1 $ milestone. Prices are remembered for that player's next houses within the round. The comparison includes the price milestone but excludes product bonuses, the CFO, and gardens. Existing house sales keep their original prices. There is no distance counter.
- The house picker uses purple tiles: no visible border for normal houses, a solid green border for native gardens (1, 3, 6, 9, 11, 14, 17, 19), and a dashed green border for built gardens. Adding a garden to another numbered house is saved for the rest of the game, including across reloads, undo, and JSON export/import. Starting a new game resets built gardens. To correct a mistaken garden, edit its construction round and choose **Without garden** for that house. Confirming the edited round removes the garden marker and recalculates later sales to that house; cancelling leaves confirmed entries unchanged. Native gardens cannot be removed. Construction rounds in older games are inferred from the first recorded garden sale.
- The default base price is 10 $. A garden doubles only the base unit price, not milestone bonuses. The app does not manage an employee roster.
- After entering houses, enter waitresses and the CFO for each player. The corresponding milestone activates the CFO automatically. The 50% bonus is calculated once on product earnings and tips, excluding marketing, and rounded up.
- In the salary step, enter the employees actually requiring payment, at 5 $ each ($3 with the new waitress milestone). In base games, account for discounts beforehand. With new milestones, enter all employees paid in cash before discounts, then enter unused recruiting actions separately for Recruiting Managers and HR Directors: each action deducts $5, even with $3 salaries. An entirely unused HR Director provides two such actions. Employees paid with goods are excluded from the cash count. A running calculation shows the previous balance, earnings, salaries, and new balance. Without the new Trainer milestone, salaries cannot exceed the player’s balance. With it, the app pays the lesser of the discounted salary bill and available cash; the remainder is waived without debt or elimination. Marketing still follows salary payment and cannot fund it.
- The review lets you edit, remove, or add house sales and revisit waitresses, the CFO, and salaries. It shows earnings, expenses/salaries, and new balances per player. **Confirm round** books sales and salaries together and returns to the table. Salaries go back into the bank.
- The bank is checked after each payment in house-number order, with coffee before the meal at the same house and Waitresses/CFO after all houses. The live bank preview opens the reserve-card selection immediately when needed, including during house entry. Choose each player’s 100/200/300 $ card using the amount buttons; the combined reserve is displayed. Preview changes are booked only when confirming the round. Salaries cannot replenish the bank before the dinner-stage bank-break check. CEO slots remain on the physical table.
- On the second bank break, all earnings are paid out and the game ends before salaries. Ties are resolved using the physical turn order.
- Activate the 100 $ milestone manually from the following round. The app does not award milestones automatically. Multiple players can receive the same milestone.

### Languages

Choose German or English before selecting a game. The preference is saved separately from the game under `gamescores.language` and remains active after reopening the app and offline. Return to game selection to change it anytime.

The language applies to the game flow, milestones, input hints, errors, log, statistics, achievements, and installation text. Numbers and dates follow the selected locale. Player names and saved house labels stay unchanged; exports retain the existing language-independent game data.

`i18n.js` provides `t()` for simple text and `html` for translatable templates. German source texts serve as translation keys; English translations are stored centrally in `locales/en.js`. Placeholders such as `{0}` may be reordered but must not be removed. Interpolated values are inserted after translation, so user text is never searched for German words. Add an English translation when introducing new UI text. Both languages and web app manifests are cached offline.

### Game end and analysis

At the second bank break, the salary step shows only the game-over notice. The final round review hides final balances. The winner and final balances are revealed only after **Confirm round**.

After the game, **Statistics** and **Achievements** appear alongside Results and Log. The round chart can show balances, round earnings, profit after salaries, or salaries; the values are also available as a table. Bars compare total earnings and salary payments. Pie charts break down income sources per player. The statistics header shows a colored percentage bar of final money distribution, with each player's share beside their balance.

Product revenue includes garden and product milestone bonuses; the CFO and tips are separate income sources. For older aggregate entries without individual houses, mixed garden revenue is allocated proportionally and marked as an estimate.

Achievements cover CFO and tip earnings, quantities and revenue for every product, total earnings, salaries paid, houses served, garden houses, product milestone bonuses, and the best rounds before and after salaries. All tied players receive an award; categories with no activity are omitted. New awards include the first sale (lowest house number in the earliest round with product sales), most tips earned, growth spurt (largest absolute increase in total earnings compared with the preceding round, including tips and CFO), regular customers (the same house served in the most distinct rounds, at least two), garden favorite (quantity of products sold to garden houses), and neighborhood favorite (distinct houses served). Photo finish recognizes winners whose lead over second place is at most 5% of their final balance (including tied wins). Comeback of the evening recognizes the eventual winner who overcame the largest round-end deficit to the leader after salaries. Staying power recognizes the longest streak of consecutive rounds in the lead by balance after salaries (at least two; shared leads count, all-zero standings do not). Largest cumulative discount totals the difference from the applicable base price per sold product, including the pricing milestone and double discounts at garden houses. Prices above that base do not offset discounts; product bonuses, tips and CFO are excluded. Older aggregate entries cannot establish the first individual sale; house-related awards use recorded house details only. All analysis is rebuilt from the log, includes corrections, and works offline without an external chart library.

### Expansion house options

Setup provides two independent switches. **New Districts** adds houses 21 and 22 without gardens and house 25 with a native garden. **Apartments** adds π and 9¾; apartments cannot have gardens. Both options can be combined with either milestone set. Selections are saved with the game and survive export/import and offline reloads. The house picker shows only enabled modules. Apartment identities and their order between houses 3–4 and 9–10 are respected in the achievements. Gardens built at houses 21 or 22 retain the usual construction-round correction. Older saves without module settings keep the 19-house base selection.

### Kimchi, Noodles, Sushi, Rural Marketeers and Ketchup

Enable each module independently during setup. **Kimchi** adds a green on/off button beside Coffee in the house form: one extra item for the meal’s seller, paid at their unit price with garden/park multipliers and CFO, without burger, pizza or drink milestone bonuses. It cannot be sold alone or attached to a coffee-only sale. **Noodles** adds a quantity counter and calculated unit-price display. Noodles replace the entire food/drink order, cannot be mixed with those items, and can be served with Kimchi and coffee. Their price uses the same player price and house modifiers; replaced products do not earn milestone bonuses. **Sushi** adds its own quantity counter for houses with a garden. It replaces the entire food/drink order and cannot be mixed with those items or Noodles. Kimchi and coffee remain possible. Use the seller’s price and garden/park multiplier, without bonuses for the replaced burgers, pizzas or drinks; Fry Chefs and CFO apply normally. Choose eligible sellers and resolve demand/stock on the board. **Rural Marketeers** adds the **Rural area** at the end of the house picker; it has neither garden nor park, can be served only once per round, and counts as one sale for Fry Chefs. **Ketchup** adds the “Someone sells your demand” milestone to either milestone set. Activate it from the next dinner after it is earned. Its −1 comparison bonus stacks with Marketeer’s −2; neither changes actual payment. Tags and the price comparison make this visible. Sushi, Noodles, Kimchi and Coffee share one row beneath ordinary goods, with short explanations below their controls; narrow screens wrap the row. Sushi is disabled until a garden house is selected. Entering Sushi or Noodles clears all replaced goods and the other replacement; entering ordinary goods clears both replacements. Removing the garden clears Sushi. Kimchi requires a complete meal and is cleared when the last meal item is removed. All new products appear in review, logs, charts and awards, and survive drafts, corrections, export/import and offline reloads.

### Negative prices

Player prices may range from −100 to 100 before the pricing milestone. Negative sales and negative CFO amounts pay cash back to the bank; gardens and parks still multiply the item price. Quantities and wages remain nonnegative. Cash is checked for every individual sale: a later house, Waitresses or CFO cannot fund an earlier payment. If a chain cannot pay, only its remaining cash returns to the bank. It is marked bankrupt with a zero balance, without recording debt. Subsequent sales must be removed or reassigned; salary and marketing payments stop, and future seller, coffee and employee controls are disabled for that chain. Historical corrections replay the payment sequence and can restore it. Round calculations, review and logs show signed amounts. Statistics reconcile any unpaid loss separately, show positive sources in pie charts and list negative amounts as bank payments. Night Shift remains manual: enter twice the number of affected Waitresses.

### Reserve Prices

Enable **Reserve Prices** (German: **Alternative Reservekarten**) during setup to replace the $100/$200/$300 cash cards with $5/$10/$20 base-price cards. At the first bank break, choose each player’s card using the buttons. The bank receives exactly $200 per player. The most frequent card determines the new base unit price; ties favor $20, then $5, then $10. The preview shows the fixed bank reserve and resulting price separately. The payment that breaks the bank keeps its price; all subsequent sales immediately use the new base, even within the same dinner. A break between coffees can therefore change the next coffee and the meal at that same house. Employee adjustments and the pricing milestone remain in effect, as do gardens, parks, bonuses and CFO. Each sale stores its own base-price snapshot. Historical corrections replay the exact bank-break boundary and adjust later sales and unfinished drafts while preserving employee adjustments. Discount Manager’s $3 threshold and the discount achievement use the applicable base price. A second bank break remains final even if later negative sales return money to the bank. Games without the module keep the original reserve cards.

### Lobbyist

Enable **Lobbyist** during setup to track parks beside houses and apartments. The **Adjacent park** button is independent of the garden selection: a park makes the base item price 2×, or 3× together with a garden. Multiple adjacent parks do not stack. Milestone bonuses, tips and Fry Chef bonuses are not multiplied; the CFO applies to total income as usual. Coffee uses the same house multiplier. Unit-price previews, recorded sales and statistics reflect the calculation. A small tree marks affected houses in the picker and sale cards. Parks persist for the game and survive offline reloads and export/import. Correct a mistaken park by editing the house in its construction round; later food and coffee sales are recalculated while gardens remain intact. Apartments can have an adjacent park but cannot have a garden. Roads and park adjacency are resolved on the physical board. The nonfinancial First Lobbyist Used milestone is not tracked.

### Fry Chef

Enable **Fry Chef** during setup. Below each player’s Waitresses, enter the number of active Fry Chefs using +/−. Each chef adds $10 per house or apartment served with food or drinks, regardless of item quantity. Gardens do not multiply this bonus, and coffee sales do not trigger it. The CFO includes the bonus once in the round total. For example, three burgers sold to one house with two Fry Chefs earn a $20 bonus. Set the count before entering houses using the shortcut in the house view: the bonus is paid at each house and can move the bank-break boundary. Changing the count recalculates the preview. The calculation, review, log and income charts show Fry Chef income separately. Drafts, export/import and historical corrections retain the entered counts. Salaries still use the actual employee count you enter. Games without this module keep their existing flow.

### Coffee

Enable **Coffee** during player setup. Use **Coffee** beneath the goods selection to open a compact popup with a quantity counter for each player. Apply the quantities, or cancel to discard changes. Expand **Coffee order** to arrange individual cups along the route using arrow buttons. This matters if the bank breaks between coffees: later cups and the house’s meal use the new reserve price. The selected order is saved with the house. Reopen the popup whenever needed, including when editing an earlier round. Confirmed quantities survive unfinished drafts and are saved with the meal. Each house card shows compact coffee summaries. Use its small Edit action beside the player name, then Coffee in the goods form, to change quantities. Set prices centrally in the price comparison; changing a player’s price also updates their existing coffee sales in the current round. Existing coffee entries are grouped automatically. The same chain may sell from another location, but the destination restaurant itself never sells coffee. Determine the route and eligible stocked locations on the physical board: use the shortest tile-distance route serving the most coffee; if tied, only locations common to all tied routes sell. Each passed location sells one coffee if available. The app records the resolved sales, without a map or stock tracker. Each seller’s price and pricing milestone apply, as does the house’s garden multiplier. Coffee gets no drink-marketing bonus and counts toward the once-per-round CFO calculation. The First Coffee Sold milestone has no financial effect and is not tracked. Coffee is shown separately in the review, log, charts and product awards. Garden corrections update coffee in later rounds too. Changing a house number or garden status carries its coffee sales along. Removing a house asks for confirmation and removes its associated coffee sales too. Historical entries preserve employee price adjustments; reserve-price changes are replayed at the individual payment boundary. Reducing quantity removes the most recently entered coffees first. Old saves and games without Coffee retain their usual flow.

### New milestone set

During setup, choose Base game or New milestones. New milestones replace the base set with five accounting controls: marketeer, waitress, beer, discount manager and trainer. The Trainer milestone keeps employees despite insufficient cash; pay all available cash up to the discounted salary bill. Available goods must still be used under the beer milestone: resolve these on the board and exclude those employees from the cash count. Demand-token counters in the salary step pay $5 per token after salaries, without CFO; this income cannot fund the same round’s wages. The waitress milestone sets cash wages to $3 per employee. Beer is display only: enter only employees who must actually be paid in cash. The marketeer’s −2 affects the house comparison, never the sale payment. A discount-manager milestone with the round’s base price at $7 or less removes $100 per qualifying player from the bank, even without sales. The summary and log show this explicitly, including the final round. Marketing can break the bank, but the second bank break ends the game only at the next Dinnertime. No salaries or marketing are resolved after final Dinnertime. Marketing appears separately in income statistics. Saved games without a milestone-set field remain base games.

### Corrections and storage

The log stores inputs including the unit price, milestones, and CFO for each round. Corrections recalculate the bank and all subsequent balances. Later milestone changes do not affect earlier entries. A historical milestone correction applies only to the edited sale; adjust later sales separately if needed. Changes causing unpaid salaries or entries after an earlier game end are rejected. Undo later rounds from the end before re-entering them.

New entries include individual house sales, expandable by player in the log. Existing games remain compatible: older entries without house data retain their aggregate editor. Their individual payment order cannot be reconstructed, so they use a compatible aggregate calculation instead of exact within-house bank-break timing. House order, the current input, and progress through the sales wizard are preserved when leaving or reloading.

New rounds are confirmed and undone together; sales and salaries remain separate, traceable ledger events. Editing a modern sale or salary opens the whole round. The preview shows the balance at the end of the edited round, and saving recalculates later rounds. Older games with booked house sales and pending salaries resume at the salary step without crediting sales twice.

The log groups sales and salaries into a compact row per round, newest first. Each player column shows earnings, salary expenses, and the balance at that time. **Details** expands products, bonuses, and house sales; **Edit** opens the round. On mobile, players are listed vertically within each round. The Log tab badge counts rounds.

Inputs for the current round are saved automatically in local storage. JSON export/import supports backups and manual device transfers. Import replaces the current game after confirmation. Only one game is stored at a time; export it before starting another.

Once **Ready offline** appears, the complete app has been cached locally. Offline play works in the same browser on the same device while cache and site data remain available. Private browsing is unsuitable for long-term storage. Each app release must increment `CACHE` in `sw.js`. The new cache activates after a complete download, and open pages use the new version after reloading. Games are stored separately from the app cache and survive updates. If an older view remains, wait a few seconds and reload again; do not clear site data.

Browser storage is specific to the website address. Games do not transfer automatically between domains; use export/import when changing addresses.

Simultaneous synchronization across devices is not implemented. It would require an additional service, such as a WebSocket or database backend. GitHub Pages only serves static files; local play needs no such service.

### Design and fonts

After game selection, setup and game views use a cream, coral, and teal theme with bold card borders, raised controls, and larger type. The game selection page has its own styling. The design is inspired by the [Lucky Duck Games Special Edition rulebook](https://luckyduckgames.com/usa/index.php?controller=attachment&id_attachment=1676); its illustrations are not copied.

`fcm-theme.css` scopes the game theme under `.fcm-theme`. Barlow and Lobster are loaded locally from `assets/fonts/` and cached offline with the app. Both fonts use the SIL Open Font License; license texts are in `assets/fonts/Barlow-OFL.txt` and `assets/fonts/Lobster-OFL.txt`. No external font services are contacted.

Rules reference: [Food Chain Magnate English base-game rulebook](https://splottercon.com/wp-content/uploads/2023/07/FCM_Rules_EN_v3.pdf). Independent fan project; no official game artwork is included.

---

## Deutsch

Eine kleine zweisprachige Webanwendung für Brettspiel-Abrechnungen, zunächst Food Chain Magnate (Grundspiel oder neue Meilensteine, 2–6 Spieler; zu sechst mit Erweiterung). Ohne Backend, Konto, externe Dienste oder Laufzeitabhängigkeiten. Alle Buchungen und Eingaben bleiben auf dem gemeinsamen Gerät.

### Architektur

Ansichten, Rundenstatus, Eingabesteuerung und Speicherung liegen in getrennten nativen Modulen. Ein gemeinsamer Abrechnungsbericht versorgt Spielerübersicht, Protokoll und Statistik. Details zu Modulen, Offline-Dateien, Tests und Rücksprungpunkt stehen in [Architektur](ARCHITECTURE.md#deutsch).

### Lokal starten

Node.js 24 oder neuer:

```sh
npm start
```

Dann http://127.0.0.1:4173 öffnen. Keine Installation erforderlich. Für Service Worker muss die Seite über localhost oder HTTPS geladen werden; direktes Öffnen als Datei reicht nicht.

Falls PowerShell `npm.ps1` aufgrund der Ausführungsrichtlinie blockiert, stattdessen `npm.cmd start` beziehungsweise `npm.cmd test` verwenden.

```sh
npm test
```

### GitHub Pages

1. Dateien in ein GitHub-Repository auf den Branch `main` pushen.
2. Unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** wählen.
3. Den Workflow „Deploy GameScores to GitHub Pages“ bei Bedarf unter Actions manuell starten.

Die Anwendung verwendet relative Pfade und funktioniert auch unter `https://name.github.io/repository/`. Der Workflow prüft zuerst die Abrechnungslogik und veröffentlicht ausschließlich die statischen Anwendungsdateien, lokalen Schriftarten und `.nojekyll`.


### Spielablauf

- Spielauswahl → Setup mit Buttons für 2–6 Spieler, leeren Namensfeldern und einzelnen Farbbuttons. Vergebene Farben sind bei anderen Spielern grau und gesperrt; erneutes Anklicken der eigenen Farbe gibt sie frei. Konten starten bei 0 $, die Bank bei 50 $ pro Spieler.
- Der kompakte Spieltisch zeigt Bank, Konten, Rundenstatus und direkt auswählbare Meilensteine. Noch keine Verkaufseingaben auf dieser Ansicht.
- **Verkaufsrunde öffnen** startet eine getrennte Ansicht mit vier festen Schritten: Häuser → Bedienungen & CFO → Löhne → Gesamtübersicht.
- Pro Haus den liefernden Spieler auswählen, verkaufte Burger, Pizza, Bier (braun), Limonade (gelb) und Softdrinks (rot) erfassen und „Ohne Garten“ oder „Mit Garten“ wählen. Die Hausnummer wird aus einem Popup mit den Nummern 1–19 gewählt. Bei Häusern mit vorhandenem Garten wird die Gartenoption automatisch gesetzt. „Haus übernehmen & nächstes“ fügt den Verkauf hinzu und öffnet eine leere Eingabe für das nächste Haus.
- Direkt unter den Spielerbuttons stehen aktive Meilensteine als kurze Tags; bei den Namen steht der aktuelle Stückpreis. Nach der Spielerwahl zeigt jede Ware den Erlös pro Stück inklusive Waren- und gegebenenfalls Gartenbonus, ohne CFO.
- Der Preisvergleich zeigt die Stückpreise aller Spieler und erlaubt das Anpassen der Basispreise vor dem −1-$-Meilenstein. Preisänderungen werden innerhalb der laufenden Runde für die nächsten Häuser des jeweiligen Spielers gemerkt. Der Vergleichspreis enthält den Preis-Meilenstein; Warenboni, CFO und Gartenbonus zählen nicht zum Vergleichspreis. Bereits gespeicherte Hausverkäufe behalten ihren ursprünglichen Preis. Es gibt keinen Entfernungszähler.
- In der Hausauswahl sind die Flächen lila: normale Häuser ohne sichtbaren Rahmen, vorhandene Gärten (1, 3, 6, 9, 11, 14, 17, 19) mit durchgezogenem grünem Rahmen und gebaute Gärten mit grün gestricheltem Rahmen. Ein nachträglich gewählter Garten bleibt für die Partie gespeichert, auch nach Neuladen, Rücknahme und Export/Import. Neue Partien beginnen ohne gebaute Gärten. Einen versehentlich gesetzten Garten kannst du in seiner Baurunde über **Bearbeiten → Ohne Garten** korrigieren. Erst das Bestätigen der bearbeiteten Runde entfernt die Gartenmarkierung und berechnet spätere Verkäufe dieses Hauses neu; beim Abbrechen bleiben bestätigte Buchungen unverändert. Vorgegebene Gärten lassen sich nicht entfernen. Bei älteren Partien wird die Baurunde aus dem ersten gespeicherten Gartenverkauf abgeleitet.
- Der Stückpreis je Haus (vor dem −1-$-Meilenstein) ist anpassbar, Standard 10 $. Ein Garten verdoppelt nur diesen Stückpreis, nicht die Meilensteinboni. Mitarbeiter werden nicht verwaltet.
- Nach den Häusern Bedienungen und CFO je Spieler erfassen. Der CFO ist durch den entsprechenden Meilenstein automatisch aktiv. Der 50-%-Bonus zählt einmal auf Warenumsatz und Trinkgeld, ohne Marketing und wird aufgerundet.
- Im dritten Schritt die tatsächliche Anzahl bezahlter Mitarbeiter eingeben (5 $ je Person, 3 $ mit neuem Bedienungsmeilenstein). Rabatte werden von den Spielern vorher berücksichtigt. Eine laufende Rechnung zeigt bisherigen Stand, Einnahmen, Lohnausgaben und neuen Stand. Ungedeckte Lohnzahlungen sind nicht zulässig.
- In der Gesamtübersicht lassen sich einzelne Hausverkäufe bearbeiten, entfernen oder ergänzen; Bedienungen, CFO und Löhne bleiben über eigene Buttons erreichbar. Neben der Aufschlüsselung erscheinen die Spalten Einnahmen, Ausgaben/Löhne und neuer Kontostand pro Spieler. Erst „Runde bestätigen“ bucht Verkäufe und Löhne gemeinsam und kehrt zum Spieltisch zurück. Löhne fließen zurück in die Bank.
- Die Bank wird nach jeder Zahlung in Hausnummern-Reihenfolge geprüft: Kaffee vor dem Essen desselben Hauses, Bedienungen und CFO nach allen Häusern. Die laufende Bankvorschau öffnet die Reservekartenauswahl sofort bei Bedarf, auch mitten in der Hauseingabe. Wählt die 100/200/300-$-Karte jedes Spielers per Betragsschaltfläche; die Gesamtsumme wird angezeigt. Erst die Rundenbestätigung bucht die Vorschau. Löhne können einen Bankbruch während der Essenszeit nicht verhindern. CEO-Slots bleiben auf dem physischen Spieltisch.
- Beim zweiten Bankbruch werden sämtliche Verkaufseinnahmen ausgezahlt. Die Partie endet vor der Lohnphase. Gleichstände löst die physische Spielreihenfolge auf.
- Den 100-$-Meilenstein manuell erst in der Folgerunde aktivieren; die App vergibt Meilensteine nicht selbst. Mehrere Spieler können denselben Meilenstein erhalten.

### Sprachen

Vor der Spielauswahl lässt sich zwischen Deutsch und Englisch wechseln. Die Auswahl wird unter `gamescores.language` unabhängig von der Partie auf dem Gerät gespeichert und gilt auch nach einem Neustart sowie offline. Über die Spielauswahl ist sie jederzeit wieder erreichbar.

Die Sprache gilt für Spielablauf, Meilensteine, Eingabehinweise, Fehlermeldungen, Protokoll, Statistiken, Achievements und Installationsbeschreibung. Zahlen und Datumsangaben werden mit dem jeweiligen Gebietsschema formatiert. Namen und gespeicherte Hausbezeichnungen bleiben unverändert; Exporte enthalten die bisherigen, sprachunabhängigen Spieldaten.

`i18n.js` stellt `t()` für einfache Texte und `html` für übersetzbare Vorlagen bereit. Deutsche Quelltexte dienen als Übersetzungsschlüssel; die englischen Texte liegen zentral in `locales/en.js`. Platzhalter wie `{0}` dürfen in Übersetzungen umgestellt, aber nicht entfernt werden. Eingesetzte Werte werden erst nach der Übersetzung eingefügt: Benutzertexte werden nicht nach deutschen Wörtern durchsucht. Bei neuen Oberflächentexten auch die englische Übersetzung ergänzen. Beide Sprachen und beide Web-App-Manifeste werden im Offline-Cache gespeichert.

### Spielende und Auswertungen

Beim zweiten Bankbruch zeigt der Lohnschritt ausschließlich die Spielende-Info. Die letzte Rundenübersicht enthält keine Endkontostände. Erst nach „Runde bestätigen“ erscheinen Gewinner und Endstände.

Nach Spielende stehen neben Ergebnis und Protokoll die Tabs „Statistiken“ und „Achievements“ bereit. Der Rundenverlauf lässt sich zwischen Kontostand, Rundeneinnahmen, Gewinn nach Löhnen und Löhnen umschalten; alle Werte sind zusätzlich als Tabelle verfügbar. Balken vergleichen Gesamteinnahmen und Lohnzahlungen, Kuchendiagramme zeigen die Einnahmequellen pro Spieler. Im Kopf der Statistik zeigt ein farbiger Prozentbalken die Verteilung des Endgeldes; neben jedem Kontostand steht der jeweilige Anteil. Warenumsätze enthalten Garten- und Waren-Meilensteinboni; CFO und Trinkgeld bleiben separate Einnahmequellen. Bei alten Summenbuchungen ohne einzelne Häuser werden gemischte Gartenumsätze anteilig verteilt und als Schätzung gekennzeichnet.

Achievements zeichnen unter anderem CFO- und Trinkgeldeinnahmen, Menge und Umsatz jeder Warenart, Gesamteinnahmen, Lohnzahlungen, belieferte Häuser, Gartenhäuser, Waren-Meilensteinboni sowie die besten Runden vor und nach Löhnen aus. Bei Gleichstand erhalten alle beteiligten Spieler die Auszeichnung; Kategorien ohne Leistung werden ausgelassen. Neu sind der erste Verkauf (kleinste Hausnummer der ersten Runde mit Warenverkäufen), das meiste Trinkgeld, Wachstumsschub (größter absoluter Zuwachs der Gesamteinnahmen zur Vorrunde inklusive Trinkgeld und CFO), Stammkundschaft (dasselbe Haus in den meisten verschiedenen Runden, mindestens zwei), Gartenliebling (Warenmenge an Gartenhäuser) und Liebling der Nachbarschaft (unterschiedliche belieferte Häuser). Fotofinish zeichnet Gewinner mit höchstens 5 % ihres Endvermögens Abstand zu Platz 2 aus (auch bei Gleichstand). Comeback des Abends erhält der spätere Gewinner mit dem größten aufgeholten Rückstand zum Führenden, gemessen am Rundenende nach Löhnen. Dauerbrenner zählt die längste Serie aufeinanderfolgender Runden an der Spitze nach Kontostand am Rundenende nach Löhnen (mindestens zwei; geteilte Führung zählt, reine Nullstände zählen nicht). Größter Preisnachlass summiert die Differenz zum jeweils gültigen Grundpreis je verkaufter Ware, inklusive Preis-Meilenstein und doppeltem Rabatt bei Gartenhäusern. Preise über diesem Grundpreis gleichen Rabatte nicht aus; Warenboni, Trinkgeld und CFO zählen nicht dazu. Bei älteren Summenbuchungen lässt sich der erste einzelne Verkauf nicht feststellen; hausbezogene Auszeichnungen verwenden nur erfasste Hausdetails. Alle Auswertungen werden aus dem Protokoll berechnet, berücksichtigen Korrekturen und funktionieren offline ohne externe Diagrammbibliothek.

### Zusätzliche Häuser

Im Setup gibt es zwei unabhängige Schalter. **Neue Bezirke** ergänzt die Häuser 21 und 22 ohne Garten sowie 25 mit festem Garten. **Apartments** ergänzt π und 9¾; Apartments können keinen Garten haben. Beide Optionen lassen sich mit jedem Meilensteinsatz kombinieren. Die Auswahl wird in der Partie gespeichert und bleibt bei Export/Import und Offline-Neuladen erhalten. Die Hausauswahl zeigt nur aktivierte Module. Apartments gelten für Achievements als eigene Häuser und werden zwischen 3–4 beziehungsweise 9–10 eingeordnet. Bei Haus 21 und 22 gebaute Gärten bleiben in ihrer Baurunde korrigierbar. Alte Spielstände ohne Moduleinstellungen behalten die 19 Häuser des Grundspiels.

### Lobbyist

Aktiviere **Lobbyist** bei der Spielerstellung, um Parks neben Häusern und Apartments zu erfassen. **Park angrenzend** ist unabhängig von der Gartenwahl: Mit Park gilt der 2-fache, mit Garten und Park der 3-fache Grundpreis. Mehrere angrenzende Parks bringen keinen weiteren Bonus. Meilensteinboni, Trinkgeld und Friteusenkoch-Boni werden nicht vervielfacht; der CFO gilt wie gewohnt für die gesamten Einnahmen. Kaffee verwendet denselben Hausfaktor. Stückpreisvorschau, Verkäufe und Statistik berücksichtigen die Berechnung. Ein kleiner Baum markiert betroffene Häuser in der Auswahl und den Verkaufskacheln. Parks bleiben für die Partie gespeichert, auch offline und nach Export/Import. Einen falsch gesetzten Park korrigierst du beim Bearbeiten des Hauses in seiner Baurunde; spätere Essens- und Kaffeeverkäufe werden neu berechnet, der Garten bleibt bestehen. Apartments können an einem Park liegen, aber keinen Garten haben. Straßen und die Nachbarschaft zu Parks bestimmt ihr am Brett. Der Meilenstein „Erster Lobbyist eingesetzt“ hat keine finanzielle Wirkung und wird nicht erfasst.

### Kimchi, Nudeln, Sushi, Landleben und Ketchup

Die Module sind bei der Spielerstellung einzeln aktivierbar. **Kimchi** ergänzt neben Kaffee einen grünen Ein-/Aus-Schalter: ein zusätzliches Stück für den Essensverkäufer, zum Stückpreis mit Garten-/Parkfaktor und CFO, ohne Burger-, Pizza- oder Getränkemeilenstein-Bonus. Kimchi kann weder allein noch als reiner Kaffeeverkauf erfasst werden. **Nudeln** erhalten einen Mengenzähler und eine Stückpreisanzeige. Sie ersetzen die gesamte Bestellung, dürfen nicht mit Burgern, Pizza oder Getränken gemischt werden und können zusammen mit Kimchi und Kaffee verkauft werden. Es gelten der Spielerpreis und die Hausfaktoren; ersetzte Waren lösen keine Meilensteinboni aus. **Sushi** ergänzt einen eigenen Mengenzähler für Häuser mit Garten. Es ersetzt die gesamte Essens-/Getränkebestellung und darf weder damit noch mit Nudeln gemischt werden. Kimchi und Kaffee sind weiterhin möglich. Es gelten Spielerpreis und Garten-/Parkfaktor, ohne Boni für ersetzte Burger, Pizza oder Getränke; Friteusenköche und CFO zählen wie gewohnt. Berechtigte Verkäufer, Nachfrage und Vorrat bestimmt ihr am Brett. **Landleben** ergänzt das **Ländliche Gebiet** am Ende der Hausauswahl: ohne Garten oder Park, einmal pro Runde belieferbar und für Friteusenköche ein eigener Verkauf. **Ketchup** ergänzt beide Meilensteinsätze um „Jemand verkauft deine Nachfrage“. Ab der nächsten Essenszeit aktivieren. Der −1-Vergleichsbonus addiert sich zu den −2 des Marketeers; beide verändern die Auszahlung nicht. Tags und Preisvergleich zeigen das an. Sushi, Nudeln, Kimchi und Kaffee stehen mit kurzen Erklärungen in einer Reihe unter den normalen Waren; auf schmalen Geräten wird die Reihe umgebrochen. Sushi ist ohne ausgewähltes Gartenhaus gesperrt. Sushi oder Nudeln löschen alle ersetzten Waren und das andere Ersatzprodukt; normale Waren löschen beide Ersatzprodukte. Ohne Garten wird Sushi entfernt. Kimchi ist nur zu einer vollständigen Bestellung wählbar und wird beim Entfernen der letzten Essensware ebenfalls entfernt. Die neuen Waren erscheinen in Übersicht, Protokoll, Diagrammen und Achievements und bleiben in Entwürfen sowie nach Korrekturen, Export/Import und Offline-Neuladen erhalten.

### Negative Preise

Spielerpreise dürfen vor dem Preis-Meilenstein zwischen −100 und 100 liegen. Negative Verkäufe und negative CFO-Beträge zahlen Geld an die Bank; Garten und Park vervielfachen weiterhin den Stückpreis. Mengen und Löhne bleiben nichtnegativ. Jede Zahlung wird einzeln geprüft: Ein späteres Haus, Trinkgeld oder CFO kann eine frühere Zahlung nicht finanzieren. Kann eine Kette nicht zahlen, geht nur ihr verbliebenes Bargeld an die Bank. Die Kette scheidet mit Kontostand null aus, ohne Schulden zu verbuchen. Spätere Verkäufe müssen entfernt oder neu zugeordnet werden; Löhne und Marketing entfallen, spätere Verkäufer-, Kaffee- und Mitarbeitereingaben werden gesperrt. Historische Korrekturen spielen die Zahlungsreihenfolge neu durch und können die Kette wiederherstellen. Abrechnung, Übersicht und Protokoll zeigen vorzeichenbehaftete Beträge. Statistiken weisen ungedeckte Verluste getrennt aus, zeigen positive Quellen im Kuchendiagramm und negative Beträge als Bankzahlungen. Night Shift bleibt manuell: Gebt die doppelte Zahl der betroffenen Bedienungen ein.

### Alternative Reservekarten

Aktiviere **Alternative Reservekarten** bei der Spielerstellung. Statt 100/200/300 $ wählt ihr beim ersten Bankbruch die verdeckten Grundpreis-Karten mit 5/10/20 $. Die Bank erhält immer genau 200 $ pro Spieler. Die häufigste Karte bestimmt den neuen Grundpreis; bei Gleichstand gilt 20 vor 5 vor 10 $. Die Vorschau zeigt Bankreserve und Grundpreis getrennt. Die auslösende Zahlung behält ihren Preis; alle folgenden Verkäufe verwenden sofort den neuen Grundpreis, auch innerhalb derselben Essenszeit. Ein Bankbruch zwischen Kaffees kann damit schon den nächsten Kaffee und das Essen desselben Hauses verteuern oder verbilligen. Mitarbeiter-Preisänderungen, Preis-Meilenstein, Gärten, Parks, Boni und CFO gelten weiterhin. Jeder Verkauf speichert seinen eigenen Grundpreis. Nachträgliche Korrekturen berechnen die genaue Bankbruchstelle neu und passen spätere Verkäufe sowie offene Entwürfe an; Mitarbeiter-Preisänderungen bleiben erhalten. Die 3-$-Schwelle des Discount Managers und das Rabatt-Achievement beziehen sich auf den jeweils gültigen Grundpreis. Ein zweiter Bankbruch bleibt endgültig, auch wenn danach negative Verkäufe Geld an die Bank zurückzahlen. Ohne Modul bleiben die ursprünglichen Reservekarten bestehen.

### Friteusenkoch

Aktiviere **Friteusenkoch** bei der Spielerstellung. Unter den Waitresses gibst du pro Spieler mit +/− die Anzahl aktiver Friteusenköche ein. Jeder Koch bringt 10 $ je Haus oder Apartment, das mit Essen oder Getränken beliefert wurde, unabhängig von der Warenmenge. Gärten verdoppeln diesen Bonus nicht; Kaffee löst ihn nicht aus. Der CFO berücksichtigt den Bonus einmal in der Rundensumme. Beispiel: Drei Burger an ein Haus bringen mit zwei Friteusenköchen 20 $ Bonus. Stellt die Anzahl über den Kurzbefehl in der Hausansicht vor den Verkäufen ein: Der Bonus wird direkt je Haus bezahlt und kann den Bankbruch verschieben. Eine Änderung berechnet die Vorschau neu. Berechnung, Übersicht, Protokoll und Einnahmendiagramme weisen den Bonus separat aus. Entwürfe, Export/Import und nachträgliche Korrekturen behalten die Anzahl bei. Bei den Löhnen gibst du weiterhin die tatsächlich zu bezahlende Mitarbeiterzahl ein. Partien ohne dieses Modul behalten ihren bisherigen Ablauf.

### Kaffee

Aktiviere **Kaffee** bei der Spielerstellung. Öffne über **Kaffee** unter der Warenauswahl ein kompaktes Popup mit einem Mengenzähler pro Spieler. Übernimm die Mengen oder verwirf Änderungen mit Abbrechen. Unter **Reihenfolge der Kaffees** lassen sich einzelne Kaffees entlang der Route per Pfeiltasten sortieren. Das ist bei einem Bankbruch zwischen Kaffees relevant: Spätere Kaffees und das Essen desselben Hauses verwenden den neuen Reservepreis. Die Reihenfolge wird mit dem Haus gespeichert. Das Popup lässt sich jederzeit erneut öffnen, auch beim Bearbeiten einer früheren Runde. Übernommene Mengen bleiben im Entwurf erhalten und werden zusammen mit dem Essen gespeichert. Jede Hauskachel zeigt die Kaffees kompakt an. Zum Ändern wählst du das kleine „Bearbeiten“ beim Spielernamen und anschließend „Kaffee“ in der Warenauswahl. Preise stellst du zentral im Preisvergleich ein; eine Preisänderung aktualisiert auch die bereits erfassten Kaffees dieses Spielers in der aktuellen Runde. Bereits gespeicherte Kaffeeverkäufe werden automatisch zusammengefasst. Dieselbe Kette kann an einer anderen Filiale Kaffee verkaufen, der Zielbetrieb selbst jedoch nicht. Route und berechtigte Filialen mit verfügbarem Kaffee bestimmt ihr am Brett: kürzeste Entfernung nach Kacheln mit möglichst vielen Kaffeeverkäufen; bei Gleichstand verkaufen nur Filialen, die auf allen gleichwertigen Routen liegen. Jede passierte Filiale verkauft höchstens einen Kaffee. Die App erfasst diese aufgelösten Verkäufe, ohne Karte oder Lagerverwaltung. Preis und Preis-Meilenstein des Verkäufers sowie der Gartenbonus des Hauses gelten. Kaffee erhält keinen Getränkemeilenstein-Bonus und zählt zum einmalig berechneten CFO. Der Meilenstein „Erster Kaffee verkauft“ hat keine Auswirkung auf die Abrechnung und wird nicht erfasst. Übersicht, Protokoll, Diagramme und Waren-Achievements weisen Kaffee separat aus. Gartenkorrekturen ändern auch spätere Kaffeeverkäufe. Änderungen an Hausnummer oder Gartenstatus übernehmen die zugehörigen Kaffeeverkäufe. Beim Entfernen eines Hauses werden nach Bestätigung auch dessen Kaffees entfernt. Mitarbeiter-Preisänderungen historischer Einträge bleiben erhalten; Änderungen durch Reservekarten werden an der einzelnen Zahlung neu berechnet; beim Verringern der Menge werden zuletzt eingegebene Kaffees zuerst entfernt. Alte Spielstände und Partien ohne Kaffee behalten ihren bisherigen Ablauf.

### Neuer Meilensteinsatz

Mit neuen Meilensteinen gebt ihr im Lohnschritt die Anzahl der mit Bargeld zu bezahlenden Mitarbeiter vor Rabatten ein. Ungenutzte Recruiting-Aktionen von Recruiting Managern und HR Directors werden getrennt erfasst: jede Aktion spart 5 $, auch bei 3-$-Löhnen; ein vollständig ungenutzter HR Director liefert zwei Aktionen. Die Rechnung zeigt Bruttolohn, Gesamtrabatt und Lohnbedarf. Bei Trainer-Meilenstein und Geldmangel werden tatsächliche Zahlung und entfallener Rest ausgewiesen. Protokoll, Rundensummen und Statistiken verwenden die tatsächlich gezahlten Löhne. Alle Eingaben bleiben in Entwürfen, Export/Import und historischen Korrekturen erhalten. Ältere neue-Meilenstein-Spielstände ohne Trainer-Feld bleiben kompatibel.

Im Setup wählt ihr Grundspiel oder Neue Meilensteine. Der neue Satz ersetzt die bisherigen durch fünf abrechnungsrelevante Schalter: Marketeer, Bedienung, Bier, Discount Manager und Trainer. Mit dem Trainer-Meilenstein dürfen Mitarbeiter trotz Geldmangel bleiben: Nach Lohnrabatten zahlt ihr höchstens das vorhandene Bargeld, der Rest entfällt ohne Schulden oder Insolvenz. Bei Bier-Meilenstein müssen verfügbare Waren weiterhin eingesetzt werden; am Brett abwickeln und die damit bezahlten Mitarbeiter von der Bargeldanzahl abziehen. Nachfragemarker werden im Lohnschritt mit +/− erfasst: 5 $ je Marker nach den Löhnen, ohne CFO und nicht zur Bezahlung derselben Lohnrunde verfügbar. Die Bedienung senkt Bargeldlöhne auf 3 $ je Mitarbeiter. Bier wird nur angezeigt: Gebt nur Mitarbeiter ein, die tatsächlich mit Bargeld bezahlt werden müssen. Die −2 des Marketeers gelten nur für den Hausvergleich, niemals für die Zahlung. Bei Discount-Manager-Meilenstein und Rundenbasispreis höchstens 7 $ verschwinden je berechtigtem Spieler 100 $ aus der Bank, auch ohne Verkauf. Übersicht und Protokoll weisen dies ausdrücklich aus, auch in der letzten Runde. Marketing kann die Bank brechen; ein zweiter Bankbruch beendet das Spiel erst in der nächsten Essenszeit. Nach der finalen Essenszeit entfallen Löhne und Marketing. Marketing wird in den Statistiken separat dargestellt. Alte Spielstände ohne Meilensteinsatz bleiben Grundspielpartien.

### Korrekturen und Speicherung

Das Protokoll speichert die Eingaben einschließlich Stückpreis, Meilensteinen und CFO der jeweiligen Runde. Korrekturen berechnen Bank und sämtliche Kontostände neu. Spätere Meilensteinänderungen verändern keine älteren Buchungen. Historische Meilensteinkorrekturen ändern nur den bearbeiteten Verkauf; spätere Verkäufe müssen bei Bedarf ebenfalls korrigiert werden. Änderungen, die ungedeckte Löhne oder Buchungen nach einem vorgezogenen Spielende verursachen, werden abgewiesen. Dazu spätere Buchungen vom Ende her zurücknehmen und neu erfassen.

Neue Buchungen enthalten sämtliche Hausverkäufe, die im Protokoll pro Spieler aufklappbar sind. Vorhandene Spielstände bleiben kompatibel: Alte Buchungen ohne Hausdaten werden weiterhin als Summeneingaben bearbeitet. Ihre einzelnen Zahlungen lassen sich nicht rekonstruieren; dafür bleibt eine kompatible Summenabrechnung statt exakter Bankbruch-Zeitpunkte innerhalb eines Hauses bestehen. Hausreihenfolge, aktuelle Eingabe und Fortschritt im Verkaufsassistenten werden auch beim Verlassen oder Neuladen erhalten.

Neue Runden werden gemeinsam bestätigt und zurückgenommen; Verkauf und Lohn bleiben als getrennte, nachvollziehbare Protokolleinträge erhalten. Beim Bearbeiten eines modernen Verkaufs- oder Lohneintrags öffnet sich die gesamte Rundenabrechnung. Die Vorschau zeigt den Kontostand am Ende der bearbeiteten Runde; spätere Runden werden beim Speichern ebenfalls neu berechnet. Bei älteren Partien mit bereits gebuchten Hausverkäufen und noch offenen Löhnen setzt der Assistent im Lohnschritt fort, ohne die Verkäufe doppelt gutzuschreiben.

Das Protokoll fasst Verkauf und Lohn in einer kompakten Zeile pro Runde zusammen, neueste Runde zuerst. Pro Spieler stehen Einnahmen, Lohnausgaben und damaliger Kontostand nebeneinander. „Details“ klappt Waren, Bonusberechnung und Hausverkäufe auf; „Bearbeiten“ öffnet die Runde. Auf dem Handy werden Spieler innerhalb jeder Runde untereinander dargestellt. Die Zahl am Protokoll-Tab zählt Runden.

Eingaben der laufenden Runde werden automatisch lokal gespeichert. Export/Import als JSON ermöglicht Backups und manuellen Gerätewechsel. Beim Import wird die bisherige Partie nach Bestätigung ersetzt. Nur eine Partie liegt gleichzeitig im lokalen Speicher; vor einer neuen Partie exportieren.

Nach Anzeige „Offline bereit“ ist die komplette App lokal gecacht. Offline-Betrieb funktioniert auf demselben Browser und Gerät, solange Cache und Website-Daten erhalten bleiben. Private Browserfenster sind nicht für dauerhafte Speicherung geeignet. Ein neues App-Release muss `CACHE` in `sw.js` erhöhen; nach vollständigem Download wird der neue Cache aktiviert. Geöffnete Seiten zeigen beim nächsten Neuladen die neue Version. Spielstände liegen getrennt vom App-Cache und bleiben bei Updates erhalten. Falls noch eine ältere Ansicht erscheint, nach einigen Sekunden erneut laden; keine Website-Daten löschen.

Browserspeicher ist an die Website-Adresse gebunden. Zwischen Domains werden Spielstände nicht automatisch übertragen; beim Wechsel Export/Import verwenden.

Gleichzeitige Synchronisierung mehrerer Geräte ist noch nicht implementiert. Dafür wäre z. B. ein separater WebSocket- oder Datenbankdienst nötig; GitHub Pages selbst dient nur statische Dateien aus. Der lokale Betrieb benötigt diesen Dienst nicht.

### Gestaltung und Schriftarten

Nach der Spielauswahl erhalten Setup und Spielansichten eine eigene Oberfläche in Creme, Korallrot und Türkis, mit kräftigen Kartenrändern, plastischen Schaltflächen und größerer Schrift. Die Spielauswahl bleibt unabhängig davon gestaltet. Die Gestaltung orientiert sich am [Special-Edition-Regelheft von Lucky Duck Games](https://luckyduckgames.com/usa/index.php?controller=attachment&id_attachment=1676); Illustrationen werden nicht aus dem Regelheft übernommen.

`fcm-theme.css` kapselt die Spielgestaltung unter `.fcm-theme`. Barlow und Lobster werden lokal aus `assets/fonts/` geladen und gemeinsam mit der Anwendung offline gespeichert. Beide Schriftarten stehen unter der SIL Open Font License; die Lizenztexte liegen unter `assets/fonts/Barlow-OFL.txt` und `assets/fonts/Lobster-OFL.txt`. Es gibt keine Abfragen an externe Font-Dienste.

Regelgrundlage: [Food Chain Magnate, englisches Grundspiel-Regelheft](https://splottercon.com/wp-content/uploads/2023/07/FCM_Rules_EN_v3.pdf). Unabhängiges Fanprojekt; keine offiziellen Spielgrafiken enthalten.
