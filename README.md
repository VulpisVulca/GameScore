# GameScores

Eine kleine deutsche Webanwendung für Brettspiel-Abrechnungen, zunächst Food Chain Magnate (Grundspiel, 2–5 Spieler). Ohne Backend, Konto, externe Schriftarten oder Laufzeitabhängigkeiten. Alle Buchungen und Eingaben bleiben auf dem gemeinsamen Gerät.

## Lokal starten

Node.js 24 oder neuer:

```sh
npm start
```

Dann http://127.0.0.1:4173 öffnen. Keine Installation erforderlich. Für Service Worker muss die Seite über localhost oder HTTPS geladen werden; direktes Öffnen als Datei reicht nicht.

Falls PowerShell `npm.ps1` aufgrund der Ausführungsrichtlinie blockiert, stattdessen `npm.cmd start` beziehungsweise `npm.cmd test` verwenden.

```sh
npm test
```

## GitHub Pages

1. Dateien in ein GitHub-Repository auf den Branch `main` pushen.
2. Unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** wählen.
3. Den Workflow „Deploy GameScores to GitHub Pages“ bei Bedarf unter Actions manuell starten.

Die Anwendung verwendet relative Pfade und funktioniert auch unter `https://name.github.io/repository/`. Der Workflow prüft zuerst die Abrechnungslogik und veröffentlicht ausschließlich die statischen Anwendungsdateien, lokalen Schriftarten und `.nojekyll`.

Repository: https://github.com/VulpisVulca/GameScore · GitHub Pages: https://vulpisvulca.github.io/GameScore/

## Spielablauf

- Spielauswahl → Setup mit Namen und eindeutigen Farben. Konten starten bei 0 $, die Bank bei 50 $ pro Spieler.
- Der kompakte Spieltisch zeigt Bank, Konten, Rundenstatus und direkt auswählbare Meilensteine. Noch keine Verkaufseingaben auf dieser Ansicht.
- **Verkaufsrunde öffnen** startet eine getrennte Ansicht mit vier festen Schritten: Häuser → Bedienungen & CFO → Löhne → Gesamtübersicht.
- Pro Haus den liefernden Spieler auswählen, verkaufte Burger, Pizza, Bier (braun), Limonade (gelb) und Softdrinks (rot) erfassen und „Ohne Garten“ oder „Mit Garten“ wählen. Eine Hausnummer oder Bezeichnung ist optional. „Haus übernehmen & nächstes“ fügt den Verkauf hinzu und öffnet eine leere Eingabe für das nächste Haus.
- Direkt unter den Spielerbuttons stehen aktive Meilensteine als kurze Tags; bei den Namen steht der aktuelle Stückpreis. Nach der Spielerwahl zeigt jede Ware den Erlös pro Stück inklusive Waren- und gegebenenfalls Gartenbonus, ohne CFO.
- Der Preisvergleich zeigt die Stückpreise aller Spieler und erlaubt das Anpassen der Basispreise vor dem −1-$-Meilenstein. Preisänderungen werden innerhalb der laufenden Runde für die nächsten Häuser des jeweiligen Spielers gemerkt. Der Vergleichspreis enthält den Preis-Meilenstein; Warenboni, CFO und Gartenbonus zählen nicht zum Vergleichspreis. Bereits gespeicherte Hausverkäufe behalten ihren ursprünglichen Preis. Es gibt keinen Entfernungszähler.
- Der Stückpreis je Haus (vor dem −1-$-Meilenstein) ist anpassbar, Standard 10 $. Ein Garten verdoppelt nur diesen Stückpreis, nicht die Meilensteinboni. Mitarbeiter werden nicht verwaltet.
- Nach den Häusern Bedienungen und CFO je Spieler erfassen. Der CFO ist durch den entsprechenden Meilenstein automatisch aktiv. Der 50-%-Bonus zählt einmal auf sämtliche Rundeneinnahmen einschließlich Trinkgeld und wird aufgerundet.
- Im dritten Schritt die tatsächliche Anzahl bezahlter Mitarbeiter eingeben (5 $ je Person). Rabatte werden von den Spielern vorher berücksichtigt. Eine laufende Rechnung zeigt bisherigen Stand, Einnahmen, Lohnausgaben und neuen Stand. Ungedeckte Lohnzahlungen sind nicht zulässig.
- In der Gesamtübersicht lassen sich einzelne Hausverkäufe bearbeiten, entfernen oder ergänzen; Bedienungen, CFO und Löhne bleiben über eigene Buttons erreichbar. Neben der Aufschlüsselung erscheinen die Spalten Einnahmen, Ausgaben/Löhne und neuer Kontostand pro Spieler. Erst „Runde bestätigen“ bucht Verkäufe und Löhne gemeinsam und kehrt zum Spieltisch zurück. Löhne fließen zurück in die Bank.
- Reicht die Bank für die Verkäufe nicht aus, werden im Lohnschritt die Reservekarten pro Spieler mit 100/200/300 $ abgefragt. Die Reserve wird zunächst für die Vorschau verwendet und erst mit der Runde gebucht. Bankbrüche werden vor den Lohnrückzahlungen geprüft; CEO-Slots verbleiben am physischen Tisch.
- Beim zweiten Bankbruch werden sämtliche Verkaufseinnahmen ausgezahlt. Die Partie endet vor der Lohnphase. Gleichstände löst die physische Spielreihenfolge auf.
- Den 100-$-Meilenstein manuell erst in der Folgerunde aktivieren; die App vergibt Meilensteine nicht selbst. Mehrere Spieler können denselben Meilenstein erhalten.

## Sprachen

Vor der Spielauswahl lässt sich zwischen Deutsch und Englisch wechseln. Die Auswahl wird unter `gamescores.language` unabhängig von der Partie auf dem Gerät gespeichert und gilt auch nach einem Neustart sowie offline. Über die Spielauswahl ist sie jederzeit wieder erreichbar.

Die Sprache gilt für Spielablauf, Meilensteine, Eingabehinweise, Fehlermeldungen, Protokoll, Statistiken, Achievements und Installationsbeschreibung. Zahlen und Datumsangaben werden mit dem jeweiligen Gebietsschema formatiert. Namen und gespeicherte Hausbezeichnungen bleiben unverändert; Exporte enthalten die bisherigen, sprachunabhängigen Spieldaten.

`i18n.js` stellt `t()` für einfache Texte und `html` für übersetzbare Vorlagen bereit. Deutsche Quelltexte dienen als Übersetzungsschlüssel; die englischen Texte liegen zentral in `locales/en.js`. Platzhalter wie `{0}` dürfen in Übersetzungen umgestellt, aber nicht entfernt werden. Eingesetzte Werte werden erst nach der Übersetzung eingefügt: Benutzertexte werden nicht nach deutschen Wörtern durchsucht. Bei neuen Oberflächentexten auch die englische Übersetzung ergänzen. Beide Sprachen und beide Web-App-Manifeste werden im Offline-Cache gespeichert.

## Spielende und Auswertungen

Beim zweiten Bankbruch zeigt der Lohnschritt ausschließlich die Spielende-Info. Die letzte Rundenübersicht enthält keine Endkontostände. Erst nach „Runde bestätigen“ erscheinen Gewinner und Endstände.

Nach Spielende stehen neben Ergebnis und Protokoll die Tabs „Statistiken“ und „Achievements“ bereit. Der Rundenverlauf lässt sich zwischen Kontostand, Rundeneinnahmen, Gewinn nach Löhnen und Löhnen umschalten; alle Werte sind zusätzlich als Tabelle verfügbar. Balken vergleichen Gesamteinnahmen und Lohnzahlungen, Kuchendiagramme zeigen die Einnahmequellen pro Spieler. Warenumsätze enthalten Garten- und Waren-Meilensteinboni; CFO und Trinkgeld bleiben separate Einnahmequellen. Bei alten Summenbuchungen ohne einzelne Häuser werden gemischte Gartenumsätze anteilig verteilt und als Schätzung gekennzeichnet.

Achievements zeichnen unter anderem CFO- und Trinkgeldeinnahmen, Menge und Umsatz jeder Warenart, Gesamteinnahmen, Lohnzahlungen, belieferte Häuser, Gartenhäuser, Waren-Meilensteinboni sowie die besten Runden vor und nach Löhnen aus. Bei Gleichstand erhalten alle beteiligten Spieler die Auszeichnung; Kategorien ohne Leistung werden ausgelassen. Alle Auswertungen werden aus dem Protokoll berechnet, berücksichtigen Korrekturen und funktionieren offline ohne externe Diagrammbibliothek.

## Korrekturen und Speicherung

Das Protokoll speichert die Eingaben einschließlich Stückpreis, Meilensteinen und CFO der jeweiligen Runde. Korrekturen berechnen Bank und sämtliche Kontostände neu. Spätere Meilensteinänderungen verändern keine älteren Buchungen. Historische Meilensteinkorrekturen ändern nur den bearbeiteten Verkauf; spätere Verkäufe müssen bei Bedarf ebenfalls korrigiert werden. Änderungen, die ungedeckte Löhne oder Buchungen nach einem vorgezogenen Spielende verursachen, werden abgewiesen. Dazu spätere Buchungen vom Ende her zurücknehmen und neu erfassen.

Neue Buchungen enthalten sämtliche Hausverkäufe, die im Protokoll pro Spieler aufklappbar sind. Vorhandene Spielstände bleiben kompatibel: Alte Buchungen ohne Hausdaten werden weiterhin als Summeneingaben bearbeitet. Hausreihenfolge, aktuelle Eingabe und Fortschritt im Verkaufsassistenten werden auch beim Verlassen oder Neuladen erhalten.

Neue Runden werden gemeinsam bestätigt und zurückgenommen; Verkauf und Lohn bleiben als getrennte, nachvollziehbare Protokolleinträge erhalten. Beim Bearbeiten eines modernen Verkaufs- oder Lohneintrags öffnet sich die gesamte Rundenabrechnung. Die Vorschau zeigt den Kontostand am Ende der bearbeiteten Runde; spätere Runden werden beim Speichern ebenfalls neu berechnet. Bei älteren Partien mit bereits gebuchten Hausverkäufen und noch offenen Löhnen setzt der Assistent im Lohnschritt fort, ohne die Verkäufe doppelt gutzuschreiben.

Das Protokoll fasst Verkauf und Lohn in einer kompakten Zeile pro Runde zusammen, neueste Runde zuerst. Pro Spieler stehen Einnahmen, Lohnausgaben und damaliger Kontostand nebeneinander. „Details“ klappt Waren, Bonusberechnung und Hausverkäufe auf; „Bearbeiten“ öffnet die Runde. Auf dem Handy werden Spieler innerhalb jeder Runde untereinander dargestellt. Die Zahl am Protokoll-Tab zählt Runden.

Eingaben der laufenden Runde werden automatisch lokal gespeichert. Export/Import als JSON ermöglicht Backups und manuellen Gerätewechsel. Beim Import wird die bisherige Partie nach Bestätigung ersetzt. Nur eine Partie liegt gleichzeitig im lokalen Speicher; vor einer neuen Partie exportieren.

Nach Anzeige „Offline bereit“ ist die komplette App lokal gecacht. Offline-Betrieb funktioniert auf demselben Browser und Gerät, solange Cache und Website-Daten erhalten bleiben. Private Browserfenster sind nicht für dauerhafte Speicherung geeignet. Ein neues App-Release muss `CACHE` in `sw.js` erhöhen; nach vollständigem Download wird der neue Cache aktiviert. Geöffnete Seiten zeigen beim nächsten Neuladen die neue Version. Spielstände liegen getrennt vom App-Cache und bleiben bei Updates erhalten. Falls noch eine ältere Ansicht erscheint, nach einigen Sekunden erneut laden; keine Website-Daten löschen.

Gleichzeitige Synchronisierung mehrerer Geräte ist noch nicht implementiert. Dafür wäre z. B. ein separater WebSocket- oder Datenbankdienst nötig; GitHub Pages selbst dient nur statische Dateien aus. Der lokale Betrieb benötigt diesen Dienst nicht.

## Gestaltung und Schriftarten

Nach der Spielauswahl erhalten Setup und Spielansichten eine eigene Oberfläche in Creme, Korallrot und Türkis, mit kräftigen Kartenrändern, plastischen Schaltflächen und größerer Schrift. Die Spielauswahl bleibt unabhängig davon gestaltet. Die Gestaltung orientiert sich am [Special-Edition-Regelheft von Lucky Duck Games](https://luckyduckgames.com/usa/index.php?controller=attachment&id_attachment=1676); Illustrationen werden nicht aus dem Regelheft übernommen.

`fcm-theme.css` kapselt die Spielgestaltung unter `.fcm-theme`. Barlow und Lobster werden lokal aus `assets/fonts/` geladen und gemeinsam mit der Anwendung offline gespeichert. Beide Schriftarten stehen unter der SIL Open Font License; die Lizenztexte liegen unter `assets/fonts/Barlow-OFL.txt` und `assets/fonts/Lobster-OFL.txt`. Es gibt keine Abfragen an externe Font-Dienste.

Regelgrundlage: [Food Chain Magnate, englisches Grundspiel-Regelheft](https://splottercon.com/wp-content/uploads/2023/07/FCM_Rules_EN_v3.pdf). Unabhängiges Fanprojekt; keine offiziellen Spielgrafiken enthalten.
