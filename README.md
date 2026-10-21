# GameScores

[English](#english) · [Deutsch](#deutsch)

[Open the app / App öffnen](https://vulpisvulca.github.io/GameScore/) · [GitHub repository / Repository](https://github.com/VulpisVulca/GameScore)

## English

A small bilingual web app for board-game accounting, starting with Food Chain Magnate (base game or new milestones, 2–6 players; six players require the expansion). No backend, account, external services, or runtime dependencies. All entries stay on the shared device.

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
- In the salary step, enter the employees actually requiring payment, at 5 $ each ($3 with the new waitress milestone). Players account for discounts beforehand. A running calculation shows the previous balance, earnings, salaries, and new balance. Salaries cannot exceed the player's balance.
- The review lets you edit, remove, or add house sales and revisit waitresses, the CFO, and salaries. It shows earnings, expenses/salaries, and new balances per player. **Confirm round** books sales and salaries together and returns to the table. Salaries go back into the bank.
- If the bank cannot cover sales, the salary step asks for each player's 100/200/300 $ reserve card using amount buttons and shows the combined reserve. The reserve initially applies to the preview and is booked with the round. Bank breaks are checked before salaries return to the bank. CEO slots remain on the physical table.
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

Achievements cover CFO and tip earnings, quantities and revenue for every product, total earnings, salaries paid, houses served, garden houses, product milestone bonuses, and the best rounds before and after salaries. All tied players receive an award; categories with no activity are omitted. New awards include the first sale (lowest house number in the earliest round with product sales), most tips earned, growth spurt (largest absolute increase in total earnings compared with the preceding round, including tips and CFO), regular customers (the same house served in the most distinct rounds, at least two), garden favorite (quantity of products sold to garden houses), and neighborhood favorite (distinct houses served). Photo finish recognizes winners whose lead over second place is at most 5% of their final balance (including tied wins). Comeback of the evening recognizes the eventual winner who overcame the largest round-end deficit to the leader after salaries. Staying power recognizes the longest streak of consecutive rounds in the lead by balance after salaries (at least two; shared leads count, all-zero standings do not). Largest cumulative discount totals the difference from $10 per sold product, including the pricing milestone and double discounts at garden houses. Prices above $10 do not offset discounts; product bonuses, tips and CFO are excluded. Older aggregate entries cannot establish the first individual sale; house-related awards use recorded house details only. All analysis is rebuilt from the log, includes corrections, and works offline without an external chart library.

### Expansion house options

Setup provides two independent switches. **New Districts** adds houses 21 and 22 without gardens and house 25 with a native garden. **Apartments** adds π and 9¾; apartments cannot have gardens. Both options can be combined with either milestone set. Selections are saved with the game and survive export/import and offline reloads. The house picker shows only enabled modules. Apartment identities and their order between houses 3–4 and 9–10 are respected in the achievements. Gardens built at houses 21 or 22 retain the usual construction-round correction. Older saves without module settings keep the 19-house base selection.

### Coffee

Enable **Coffee** during player setup. Use **Coffee** beneath the goods selection to open a compact popup with a quantity counter for each player. Apply the quantities, or cancel to discard changes. Reopen the popup whenever needed, including when editing an earlier round. Confirmed quantities survive unfinished drafts and are saved with the meal. Each house card shows compact coffee summaries. Use its small Edit action beside the player name, then Coffee in the goods form, to change quantities. Set prices centrally in the price comparison; changing a player’s price also updates their existing coffee sales in the current round. Existing coffee entries are grouped automatically. The same chain may sell from another location, but the destination restaurant itself never sells coffee. Determine the route and eligible stocked locations on the physical board: use the shortest tile-distance route serving the most coffee; if tied, only locations common to all tied routes sell. Each passed location sells one coffee if available. The app records the resolved sales, without a map or stock tracker. Each seller’s price and pricing milestone apply, as does the house’s garden multiplier. Coffee gets no drink-marketing bonus and counts toward the once-per-round CFO calculation. The First Coffee Sold milestone has no financial effect and is not tracked. Coffee is shown separately in the review, log, charts and product awards. Garden corrections update coffee in later rounds too. Changing a house number or garden status carries its coffee sales along. Removing a house asks for confirmation and removes its associated coffee sales too. Older entries with different saved prices retain those prices until explicitly edited; reducing quantity removes the most recently entered coffees first. Old saves and games without Coffee retain their usual flow.

### New milestone set

During setup, choose Base game or New milestones. New milestones replace the base set with four accounting controls: marketeer, waitress, beer and discount manager. Demand-token counters in the salary step pay $5 per token after salaries, without CFO; this income cannot fund the same round’s wages. The waitress milestone sets cash wages to $3 per employee. Beer is display only: enter only employees who must actually be paid in cash. The marketeer’s −2 affects the house comparison, never the sale payment. A discount-manager milestone with the round’s base price at $7 or less removes $100 per qualifying player from the bank, even without sales. The summary and log show this explicitly, including the final round. Marketing can break the bank, but the second bank break ends the game only at the next Dinnertime. No salaries or marketing are resolved after final Dinnertime. Marketing appears separately in income statistics. Saved games without a milestone-set field remain base games.

### Corrections and storage

The log stores inputs including the unit price, milestones, and CFO for each round. Corrections recalculate the bank and all subsequent balances. Later milestone changes do not affect earlier entries. A historical milestone correction applies only to the edited sale; adjust later sales separately if needed. Changes causing unpaid salaries or entries after an earlier game end are rejected. Undo later rounds from the end before re-entering them.

New entries include individual house sales, expandable by player in the log. Existing games remain compatible: older entries without house data retain their aggregate editor. House order, the current input, and progress through the sales wizard are preserved when leaving or reloading.

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
- Reicht die Bank für die Verkäufe nicht aus, werden im Lohnschritt die Reservekarten pro Spieler mit 100/200/300 $ abgefragt. Die Reserve wird zunächst für die Vorschau verwendet und erst mit der Runde gebucht. Bankbrüche werden vor den Lohnrückzahlungen geprüft; CEO-Slots verbleiben am physischen Tisch.
- Beim zweiten Bankbruch werden sämtliche Verkaufseinnahmen ausgezahlt. Die Partie endet vor der Lohnphase. Gleichstände löst die physische Spielreihenfolge auf.
- Den 100-$-Meilenstein manuell erst in der Folgerunde aktivieren; die App vergibt Meilensteine nicht selbst. Mehrere Spieler können denselben Meilenstein erhalten.

### Sprachen

Vor der Spielauswahl lässt sich zwischen Deutsch und Englisch wechseln. Die Auswahl wird unter `gamescores.language` unabhängig von der Partie auf dem Gerät gespeichert und gilt auch nach einem Neustart sowie offline. Über die Spielauswahl ist sie jederzeit wieder erreichbar.

Die Sprache gilt für Spielablauf, Meilensteine, Eingabehinweise, Fehlermeldungen, Protokoll, Statistiken, Achievements und Installationsbeschreibung. Zahlen und Datumsangaben werden mit dem jeweiligen Gebietsschema formatiert. Namen und gespeicherte Hausbezeichnungen bleiben unverändert; Exporte enthalten die bisherigen, sprachunabhängigen Spieldaten.

`i18n.js` stellt `t()` für einfache Texte und `html` für übersetzbare Vorlagen bereit. Deutsche Quelltexte dienen als Übersetzungsschlüssel; die englischen Texte liegen zentral in `locales/en.js`. Platzhalter wie `{0}` dürfen in Übersetzungen umgestellt, aber nicht entfernt werden. Eingesetzte Werte werden erst nach der Übersetzung eingefügt: Benutzertexte werden nicht nach deutschen Wörtern durchsucht. Bei neuen Oberflächentexten auch die englische Übersetzung ergänzen. Beide Sprachen und beide Web-App-Manifeste werden im Offline-Cache gespeichert.

### Spielende und Auswertungen

Beim zweiten Bankbruch zeigt der Lohnschritt ausschließlich die Spielende-Info. Die letzte Rundenübersicht enthält keine Endkontostände. Erst nach „Runde bestätigen“ erscheinen Gewinner und Endstände.

Nach Spielende stehen neben Ergebnis und Protokoll die Tabs „Statistiken“ und „Achievements“ bereit. Der Rundenverlauf lässt sich zwischen Kontostand, Rundeneinnahmen, Gewinn nach Löhnen und Löhnen umschalten; alle Werte sind zusätzlich als Tabelle verfügbar. Balken vergleichen Gesamteinnahmen und Lohnzahlungen, Kuchendiagramme zeigen die Einnahmequellen pro Spieler. Im Kopf der Statistik zeigt ein farbiger Prozentbalken die Verteilung des Endgeldes; neben jedem Kontostand steht der jeweilige Anteil. Warenumsätze enthalten Garten- und Waren-Meilensteinboni; CFO und Trinkgeld bleiben separate Einnahmequellen. Bei alten Summenbuchungen ohne einzelne Häuser werden gemischte Gartenumsätze anteilig verteilt und als Schätzung gekennzeichnet.

Achievements zeichnen unter anderem CFO- und Trinkgeldeinnahmen, Menge und Umsatz jeder Warenart, Gesamteinnahmen, Lohnzahlungen, belieferte Häuser, Gartenhäuser, Waren-Meilensteinboni sowie die besten Runden vor und nach Löhnen aus. Bei Gleichstand erhalten alle beteiligten Spieler die Auszeichnung; Kategorien ohne Leistung werden ausgelassen. Neu sind der erste Verkauf (kleinste Hausnummer der ersten Runde mit Warenverkäufen), das meiste Trinkgeld, Wachstumsschub (größter absoluter Zuwachs der Gesamteinnahmen zur Vorrunde inklusive Trinkgeld und CFO), Stammkundschaft (dasselbe Haus in den meisten verschiedenen Runden, mindestens zwei), Gartenliebling (Warenmenge an Gartenhäuser) und Liebling der Nachbarschaft (unterschiedliche belieferte Häuser). Fotofinish zeichnet Gewinner mit höchstens 5 % ihres Endvermögens Abstand zu Platz 2 aus (auch bei Gleichstand). Comeback des Abends erhält der spätere Gewinner mit dem größten aufgeholten Rückstand zum Führenden, gemessen am Rundenende nach Löhnen. Dauerbrenner zählt die längste Serie aufeinanderfolgender Runden an der Spitze nach Kontostand am Rundenende nach Löhnen (mindestens zwei; geteilte Führung zählt, reine Nullstände zählen nicht). Größter Preisnachlass summiert die Differenz zu 10 $ je verkaufter Ware, inklusive Preis-Meilenstein und doppeltem Rabatt bei Gartenhäusern. Preise über 10 $ gleichen Rabatte nicht aus; Warenboni, Trinkgeld und CFO zählen nicht dazu. Bei älteren Summenbuchungen lässt sich der erste einzelne Verkauf nicht feststellen; hausbezogene Auszeichnungen verwenden nur erfasste Hausdetails. Alle Auswertungen werden aus dem Protokoll berechnet, berücksichtigen Korrekturen und funktionieren offline ohne externe Diagrammbibliothek.

### Zusätzliche Häuser

Im Setup gibt es zwei unabhängige Schalter. **Neue Bezirke** ergänzt die Häuser 21 und 22 ohne Garten sowie 25 mit festem Garten. **Apartments** ergänzt π und 9¾; Apartments können keinen Garten haben. Beide Optionen lassen sich mit jedem Meilensteinsatz kombinieren. Die Auswahl wird in der Partie gespeichert und bleibt bei Export/Import und Offline-Neuladen erhalten. Die Hausauswahl zeigt nur aktivierte Module. Apartments gelten für Achievements als eigene Häuser und werden zwischen 3–4 beziehungsweise 9–10 eingeordnet. Bei Haus 21 und 22 gebaute Gärten bleiben in ihrer Baurunde korrigierbar. Alte Spielstände ohne Moduleinstellungen behalten die 19 Häuser des Grundspiels.

### Kaffee

Aktiviere **Kaffee** bei der Spielerstellung. Öffne über **Kaffee** unter der Warenauswahl ein kompaktes Popup mit einem Mengenzähler pro Spieler. Übernimm die Mengen oder verwirf Änderungen mit Abbrechen. Das Popup lässt sich jederzeit erneut öffnen, auch beim Bearbeiten einer früheren Runde. Übernommene Mengen bleiben im Entwurf erhalten und werden zusammen mit dem Essen gespeichert. Jede Hauskachel zeigt die Kaffees kompakt an. Zum Ändern wählst du das kleine „Bearbeiten“ beim Spielernamen und anschließend „Kaffee“ in der Warenauswahl. Preise stellst du zentral im Preisvergleich ein; eine Preisänderung aktualisiert auch die bereits erfassten Kaffees dieses Spielers in der aktuellen Runde. Bereits gespeicherte Kaffeeverkäufe werden automatisch zusammengefasst. Dieselbe Kette kann an einer anderen Filiale Kaffee verkaufen, der Zielbetrieb selbst jedoch nicht. Route und berechtigte Filialen mit verfügbarem Kaffee bestimmt ihr am Brett: kürzeste Entfernung nach Kacheln mit möglichst vielen Kaffeeverkäufen; bei Gleichstand verkaufen nur Filialen, die auf allen gleichwertigen Routen liegen. Jede passierte Filiale verkauft höchstens einen Kaffee. Die App erfasst diese aufgelösten Verkäufe, ohne Karte oder Lagerverwaltung. Preis und Preis-Meilenstein des Verkäufers sowie der Gartenbonus des Hauses gelten. Kaffee erhält keinen Getränkemeilenstein-Bonus und zählt zum einmalig berechneten CFO. Der Meilenstein „Erster Kaffee verkauft“ hat keine Auswirkung auf die Abrechnung und wird nicht erfasst. Übersicht, Protokoll, Diagramme und Waren-Achievements weisen Kaffee separat aus. Gartenkorrekturen ändern auch spätere Kaffeeverkäufe. Änderungen an Hausnummer oder Gartenstatus übernehmen die zugehörigen Kaffeeverkäufe. Beim Entfernen eines Hauses werden nach Bestätigung auch dessen Kaffees entfernt. Unterschiedliche gespeicherte Preise älterer Einträge bleiben bis zur ausdrücklichen Preisänderung erhalten; beim Verringern der Menge werden zuletzt eingegebene Kaffees zuerst entfernt. Alte Spielstände und Partien ohne Kaffee behalten ihren bisherigen Ablauf.

### Neuer Meilensteinsatz

Im Setup wählt ihr Grundspiel oder Neue Meilensteine. Der neue Satz ersetzt die bisherigen durch vier abrechnungsrelevante Schalter: Marketeer, Bedienung, Bier und Discount Manager. Nachfragemarker werden im Lohnschritt mit +/− erfasst: 5 $ je Marker nach den Löhnen, ohne CFO und nicht zur Bezahlung derselben Lohnrunde verfügbar. Die Bedienung senkt Bargeldlöhne auf 3 $ je Mitarbeiter. Bier wird nur angezeigt: Gebt nur Mitarbeiter ein, die tatsächlich mit Bargeld bezahlt werden müssen. Die −2 des Marketeers gelten nur für den Hausvergleich, niemals für die Zahlung. Bei Discount-Manager-Meilenstein und Rundenbasispreis höchstens 7 $ verschwinden je berechtigtem Spieler 100 $ aus der Bank, auch ohne Verkauf. Übersicht und Protokoll weisen dies ausdrücklich aus, auch in der letzten Runde. Marketing kann die Bank brechen; ein zweiter Bankbruch beendet das Spiel erst in der nächsten Essenszeit. Nach der finalen Essenszeit entfallen Löhne und Marketing. Marketing wird in den Statistiken separat dargestellt. Alte Spielstände ohne Meilensteinsatz bleiben Grundspielpartien.

### Korrekturen und Speicherung

Das Protokoll speichert die Eingaben einschließlich Stückpreis, Meilensteinen und CFO der jeweiligen Runde. Korrekturen berechnen Bank und sämtliche Kontostände neu. Spätere Meilensteinänderungen verändern keine älteren Buchungen. Historische Meilensteinkorrekturen ändern nur den bearbeiteten Verkauf; spätere Verkäufe müssen bei Bedarf ebenfalls korrigiert werden. Änderungen, die ungedeckte Löhne oder Buchungen nach einem vorgezogenen Spielende verursachen, werden abgewiesen. Dazu spätere Buchungen vom Ende her zurücknehmen und neu erfassen.

Neue Buchungen enthalten sämtliche Hausverkäufe, die im Protokoll pro Spieler aufklappbar sind. Vorhandene Spielstände bleiben kompatibel: Alte Buchungen ohne Hausdaten werden weiterhin als Summeneingaben bearbeitet. Hausreihenfolge, aktuelle Eingabe und Fortschritt im Verkaufsassistenten werden auch beim Verlassen oder Neuladen erhalten.

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
