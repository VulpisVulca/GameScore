# Architecture / Architektur

## English

The app remains buildless: native JavaScript modules, static CSS and a service worker. There are no runtime packages, backend or external font requests. `npm start` and `npm test` work without installing dependencies.

| Area | Responsibility |
| --- | --- |
| `app.js` | Startup only: recover the session, bind events, render and register offline support. |
| `events.js` | Bind browser events and dispatch named actions to their controllers. |
| `state.js` | Current UI session: selected screen, setup, editor and loaded game. |
| `storage.js` | Existing JSON format, validation, reading/writing and draft snapshots. No DOM access. |
| `persistence.js` | Connect storage results to session state and save/error notices. |
| `round-state.js` | Rounds, pending house inputs, garden/park correction previews and settlement requests. No DOM access. |
| `round-controller.js`, `controllers/` | Browser input handling and mutations triggered by user actions; separate setup, round and game-file actions. |
| `ui/` | Home/setup, table, house sales, employees, salaries, review, reserve cards, ledger and legacy forms. Views do not own cash accounting. |
| `rules.js` | Unit prices, product bonuses, salary rules and chronological cash replay. |
| `accounting.js` | Shared sale breakdowns and round reports from actual replayed payments. |
| `statistics.js`, `statistics-view.js` | Aggregate the shared reports into statistics/awards and render them. |
| `selection.js`, `houses.js` | Compatible product selection and persistent house improvements. |
| `i18n.js`, `locales/` | Translate source text independently of player-entered values. HTML indentation is normalized before translation. |
| `style.css`, `fcm-theme.css` | Common layout and game theme. Media queries and state-specific overrides remain intentional; obsolete rules and overwritten declarations are removed. |

### Accounting contract

`replayGame` is the authority for money moving between players and the bank. It processes coffee/house order, bank breaks, actual salary payments, marketing and insolvency. `roundSettlement` uses that same replay for drafts, confirmation and historical corrections.

`gameReport` groups actual sale, salary and marketing payments into rounds. The table and ledger use these reports directly; statistics reuse their net results and balances. `saleBreakdown` shares the product breakdown with review and employee previews. `houseUnitPrice` supplies the same product prices to the house form and income-source analysis.

Agreed product revenue and an unpaid negative payment are kept separate. Their sum, including tips, Fry Chefs, CFO and the unpaid adjustment, must equal the actual sale payment. Old aggregate-only entries retain their explicitly estimated allocation of garden revenue.

### Storage and deployment

The save key remains `gamescores.fcm.v1`, with the existing version-1 schema. This refactor requires no migration. Draft recovery can discard an invalid unfinished input while retaining confirmed rounds. Historical edits stay outside the stored game until confirmed.

The Pages workflow copies root runtime modules and the complete `ui/` and `controllers/` directories. The service worker explicitly caches every imported module. Tests check the import graph for cycles and missing offline/deployment files, and check report consistency, draft recovery and existing game rules. Browser checks also compare the principal screens at five viewport widths.

The optional Prettier configuration preserves HTML whitespace semantics. A formatter is not required to run or deploy the app.

### Rollback checkpoint

Before this refactor: commit `37904a0`, tag `before-architecture-refactor-2026-10-22`. To inspect the old state without changing a branch, use `git switch --detach before-architecture-refactor-2026-10-22`. To roll back a published change, revert its refactor commit and push the resulting commit; existing local game data keeps the same format.

## Deutsch

Die App läuft weiterhin ohne Build-Schritt und ohne Laufzeit-Abhängigkeiten. `app.js` startet nur noch die Anwendung. Speicherung, Sitzung, Rundenstatus, Eingabesteuerung und Ansichten sind getrennt. `storage.js`, `round-state.js` und `accounting.js` benötigen kein Browser-DOM.

Geldbewegungen werden ausschließlich in `rules.js` chronologisch berechnet. `accounting.js` stellt daraus gemeinsame Verkaufs- und Rundenberichte bereit. Spielerübersicht, Protokoll und Statistik verwenden dieselben tatsächlichen Zahlungen und Rundensalden. Hausvorschau und Warenanalyse teilen die Stückpreisberechnung. Lohnrabatte und Trainer-Teilzahlungen werden in allen Ansichten aus derselben Abrechnung übernommen.

Das Spielstandformat und der Schlüssel `gamescores.fcm.v1` bleiben erhalten; eine Migration ist nicht erforderlich. Ein fehlerhafter Entwurf darf verworfen werden, ohne bestätigte Buchungen zu überschreiben. Historische Änderungen werden erst nach Bestätigung gespeichert.

Die CSS-Dateien sind lesbar formatiert; ungenutzte Regeln und überschriebene Deklarationen wurden entfernt. Bewusste Unterschiede für Bildschirmbreiten und aktive/deaktivierte Bedienelemente bleiben bestehen. Die Darstellung wird zusätzlich anhand von 65 Kombinationen aus Ansichten und Bildschirmbreiten mit dem alten Stand verglichen.

GitHub Pages veröffentlicht alle Laufzeitmodule einschließlich `ui/` und `controllers/`; der Service Worker speichert sie offline. Tests prüfen diese Dateiliste, zirkuläre Importe, Abrechnungsgleichheit, Speicherfehler, Entwürfe und die bisherigen Spielregeln.

Der Rücksprungpunkt ist Commit `37904a0` mit dem Tag `before-architecture-refactor-2026-10-22`. Ein veröffentlichter Umbau kann durch einen Revert-Commit zurückgenommen werden; gespeicherte Partien verwenden weiterhin dasselbe Format.
