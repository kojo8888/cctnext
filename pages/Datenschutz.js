import HeaderComponent from "../components/header";
import FooterComponent from "../components/footer";
import Link from "next/link";
import { useRouter } from "next/router";
// import LocaleSwitcher from "../components/locale-switcher";

export default function Datenschutz({ products }) {
  const router = useRouter();
  const { locale, locales, defaultLocale } = router;

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-3xl px-10">
      <Head>
        <title>Datenschutz</title>
      </Head>
      <HeaderComponent></HeaderComponent>
      <div className="text-justify font-mono">
        <p>
          Der Schutz deiner persönlichen Daten liegt uns am Herzen. Gemäß der
          Datenschutz-Grundverordnung (DSGVO) der Europäischen Union verfahren
          wir nach dem Grundsatz:
          <em>So viele Daten wie nötig, so wenig Daten wie möglich.</em> Darum
          haben wir folgende Maßnahmen umgesetzt:
        </p>
        <p className="font-bold pt-3">Verantwortlicher</p>
        <p>
          Für den Datenschutz auf dieser Internetpräsenz verantwortlich ist:
        </p>
        <p>
          Konstantin Mair, Lachnerstraße 30,80639 Munich, Deutschland, E-Mail:
          customcyclingtracks@gmx.net
        </p>
        <p className="font-bold pt-3">Kontaktformular</p>
        <p>
          Zur Kontaktaufnahme bieten wir ein Kontaktformular an. Die per
          Kontaktformular übermittelten Daten (Name, E-Mail-Adresse, Nachricht)
          werden von uns gespeichert, um deine Anfrage bearbeiten und
          beantworten zu können.
        </p>
        <p>
          Die Verarbeitung dieser Daten geschieht auf Grundlage deiner
          Einwilligung. Du kannst deine Einwilligung jederzeit widerrufen, dazu
          genügt eine formlose E-Mail. Wir speichern die über das
          Kontaktformular übermittelten Daten bis keine Notwendigkeit mehr
          besteht oder du deine Einwilligung zur Speicherung widerrufst. Wir
          geben diese Daten nicht an Dritte weiter.
        </p>
        <p className="font-bold pt-3">Newsletter</p>
        <p>
          Unser E-Mail-Newsletter informiert regelmäßig über Nachrichten aus der
          Welt des Zugreisens. Um den Newsletter zu erhalten, kannst du dich mit
          deiner E-Mail-Adresse in unseren Verteiler eintragen. Um
          sicherzustellen, dass du der Inhaber der E-Mail-Adresse bist und dass
          du den Newsletter wirklich erhalten möchtest, schicken wir dir nach
          der Anmeldung eine E-Mail mit einem Bestätigungslink. Deine Anmeldung
          ist erst nach dem Klick auf diesen Bestätigungslink aktiv.
        </p>
        <p>
          Um den Versand des Newsletter technisch zu ermöglichen, erheben wir
          deine E-Mail-Adresse sowie deine Zustimmung zum Newsletterversand.
          Weitere Daten werden nicht erhoben. Eine Verarbeitung oder Weitergabe
          an Dritte erfolgt nicht.
        </p>
        <p>
          Du kannst deine Einwilligung zum Newsletterversand und zur Speicherung
          deiner Daten jederzeit widerrufen.
        </p>
        <p className="font-bold pt-3">Server-Log-Dateien</p>
        <p>
          Der Provider unserer Internetpräsenz, die Host Europe GmbH,
          Hansestrasse 111, 51149 Köln, Deutschland, erhebt und speichert
          automatisch bestimmte Informationen, die dein Browser automatisch an
          unseren Server übermittelt, in so genannten Server-Log-Dateien. Es
          handelt sich dabei um folgende Daten:
        </p>
        <ul>
          <li>Datum und Uhrzeit des Zugriffs</li>
          <li>HTTP-Anfrage des Browsers</li>
          <li>Antwort des Webservers</li>
          <li>Art und Version des Browsers</li>
          <li>Art und Version des Betriebssystems</li>
          <li>Referrer</li>
        </ul>
        <p>
          Die Daten werden pseudonymisiert von der Host Europe GmbH erhoben und
          nicht mit anderen Datenquellen zusammengeführt. Die Daten in den
          Server-Log-Dateien werden nach maximal 60 Tagen automatisch gelöscht.
          Die Rechtmäßigkeit der Verarbeitung gemäß Art. 6 DSGVO ist gegeben
          durch die Erfüllung eines Vertrags zwischen der Host Europe GmbH und
          dem Verantwortlichen.
        </p>
        <p className="font-bold pt-3">Cookies</p>
        <p>
          Bei „Cookies“ handelt es sich um kleine Textdateien, die vom Browser
          auf deinem Rechner gespeichert werden. Der Zweck von Cookies ist es,
          bestimmte Prozesse im Zusammenhang mit der Internetpräsenz für die
          Nutzer zu vereinfachen.
        </p>
        <p>
          <em>Temporäre Cookies</em> (auch „Session-Cookies“) werden gelöscht,
          sobald du die Website verlässt oder das Browserfenster schließt. Sie
          dienen zum Beispiel dazu, den Login-Status in einer Community zwischen
          einzelnen Seitenaufrufen zu speichern. Im Gegensatz dazu bleiben{" "}
          <em>persistente Cookies</em> auch nach Ablauf der Sitzung gespeichert.
          Sie dienen beispielsweise dazu, sich den Login-Status dauerhaft zu
          merken, so dass der Nutzer sich bei wiederholten Besuchen nicht erneut
          einloggen muss. Auf unserer Internetpräsenz können sowohl temporäre,
          als auch persistente Cookies zum Einsatz kommen, worüber wir dich
          hiermit aufklären.
        </p>
        <p>
          Falls du ein Konto hast und dich auf dieser Website anmeldest, werden
          wir ein temporäres Cookie setzen, um festzustellen, ob dein Browser
          Cookies akzeptiert. Dieses Cookie enthält keine personenbezogenen
          Daten und wird verworfen, wenn du deinen Browser schließt.
        </p>
        <p>
          Wenn du dich anmeldest, werden wir einige Cookies einrichten, um deine
          Anmeldeinformationen und Anzeigeoptionen zu speichern. Anmelde-Cookies
          verfallen nach zwei Tagen und Cookies für die Anzeigeoptionen nach
          einem Jahr. Falls du bei der Anmeldung „Angemeldet bleiben“ auswählst,
          wird deine Anmeldung zwei Wochen lang aufrechterhalten. Mit der
          Abmeldung aus deinem Konto werden die Anmelde-Cookies gelöscht.
        </p>
        <p>
          Wenn du einen Artikel bearbeitest oder veröffentlichst, wird ein
          zusätzlicher Cookie in deinem Browser gespeichert. Dieser Cookie
          enthält keine personenbezogenen Daten und verweist nur auf die
          Beitrags-ID des Artikels, den du gerade bearbeitet hast. Der Cookie
          verfällt nach einem Tag.
        </p>
        <p className="font-bold pt-3">Webanalyse-Software Matomo</p>
        <p>
          Wir möchten unsere Internetpräsenz stetig verbessern, um dir ein
          optimales Nutzererlebnis zu ermöglichen. Gemäß Art. 6 DSGVO haben wir
          daher ein berechtigtes Interesse, Zugriffsdaten, die deinen Besuch auf
          unserer Website betreffen, zu statistischen Zwecken zu erheben. Zur
          Verarbeitung dieser Daten verwenden wir die quelloffene
          Webanalyse-Software „Matomo“ des Anbieters InnoCraft Ltd., 150 Willis
          St, 6011 Wellington, Neuseeland.
        </p>
        <p>
          Matomo ist eine DSGVO-konforme und freie Alternative zu Google
          Analytics. Dass wir Matomo benutzen hat für dich einen großen Vorteil:
          Alle deine Daten bleiben auf unserem Server und wir haben die volle
          Kontrolle über sie. Außerdem speichern wir deine IP-Adresse
          anonymisiert, so dass keine Rückschlüsse auf deine Person möglich
          sind.
        </p>
        <p>
          Unter <a href="https://demo.matomo.org">demo.matomo.org</a> findest du
          eine Demoversion von Matomo. Damit kannst du dir ein eigenes Bild
          davon machen, wie die Software funktioniert.
        </p>
        <p>Durch Matomo erheben und verarbeiten wir folgende Daten:</p>
        <ul>
          <li>Datum und Uhrzeit des Zugriffs</li>
          <li>Herkunftsland</li>
          <li>Art und Version des Browsers</li>
          <li>Art und Version des Betriebssystems</li>
          <li>Bildschirmauflösung</li>
          <li>Besuchte Seiten</li>
          <li>Verweildauer</li>
          <li>Betätigte Links</li>
        </ul>
        <p>
          Durch Klick auf den untenstehenden Link kannst du der Erhebung von
          anonymisierten Zugriffsdaten durch Matomo jederzeit widersprechen.
          Bitte beachte, dass dein Browser zu diesem Zweck ein so genanntes
          Opt-Out-Cookie speichert. Das Opt-Out-Cookie teilt Matomo mit, keine
          Sitzungsdaten mehr auf deinem Endgerät zu erheben.
        </p>
        <p>
          src="https://traintracks.eu/piwik/index.php?module=CoreAdminHome&amp;action=optOut&amp;language=de&amp;backgroundColor=&amp;fontColor=&amp;fontSize=&amp;fontFamily="
        </p>
        <p className="font-bold pt-3">AWeber</p>
        <p>
          Wir verwenden auf unserer Website AWeber, ein Dienst für unser
          E-Mail-Marketing. Dienstanbieter ist das amerikanische Unternehmen
          AWeber Systems, Inc. 1100 Manor Drive Chalfont, PA 18914, USA.{" "}
        </p>
        <p>
          AWeber verarbeitet Daten von Ihnen u.a. auch in den USA. Wir weisen
          darauf hin, dass nach Meinung des Europäischen Gerichtshofs derzeit
          kein angemessenes Schutzniveau für den Datentransfer in die USA
          besteht. Dies kann mit verschiedenen Risiken für die Rechtmäßigkeit
          und Sicherheit der Datenverarbeitung einhergehen.
        </p>
        <p>
          Als Grundlage der Datenverarbeitung bei Empfängern mit Sitz in
          Drittstaaten (außerhalb der Europäischen Union, Island, Liechtenstein,
          Norwegen, also insbesondere in den USA) oder einer Datenweitergabe
          dorthin verwendet AWeber sogenannte Standardvertragsklauseln (= Art.
          46. Abs. 2 und 3 DSGVO). Standardvertragsklauseln (Standard
          Contractual Clauses – SCC) sind von der EU-Kommission bereitgestellte
          Mustervorlagen und sollen sicherstellen, dass Ihre Daten auch dann den
          europäischen Datenschutzstandards entsprechen, wenn diese in
          Drittländer (wie beispielsweise in die USA) überliefert und dort
          gespeichert werden. Durch diese Klauseln verpflichtet sich AWeber, bei
          der Verarbeitung Ihrer relevanten Daten, das europäische
          Datenschutzniveau einzuhalten, selbst wenn die Daten in den USA
          gespeichert, verarbeitet und verwaltet werden. Diese Klauseln basieren
          auf einem Durchführungsbeschluss der EU-Kommission. Sie finden den
          Beschluss und die entsprechenden Standardvertragsklauseln u.a. hier:
          https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj?locale=de
        </p>
        <p>
          Die Datenverarbeitungsbedingung (Data Processing), welche den
          Standardvertragsklauseln entspricht, finden Sie unter
          https://www.aweber.com/dpst.htm.
        </p>
        <p>
          Mehr über die Daten, die durch die Verwendung von AWeber verarbeitet
          werden, erfahren Sie in der Privacy Policy auf
          https://www.aweber.com/privacy.htm.
        </p>
        <p className="font-bold pt-3">Stripe</p>
        <p>
          Wir bieten die Möglichkeit, den Zahlungsvorgang über den
          Zahlungsdienstleister Stripe, ℅ Legal Process, 510,Townsend St., San
          Francisco, CA 94103 (Stripe) abzuwickeln. Dies entspricht unserem
          berechtigten Interesse, eine effiziente und sichere Zahlungsmethode
          anzubieten (Art. 6 Abs. 1 lit. f DSGVO). In dem Zusammenhang geben wir
          folgende Daten an Stripe weiter, soweit es für die Vertragserfüllung
          erforderlich ist (Art. 6 Abs. 1 lit b. DSGVO).
        </p>
        <p>
          Name des Karteninhabers, E-Mail-Adresse, Kundennummer, Bestellnummer,
          Bankverbindung, Kreditkartendaten, Gültigkeitsdauer der Kreditkarte,
          Prüfnummer der Kreditkarte (CVC), Datum und Uhrzeit der Transaktion,
          Transaktionssumme, Name des Anbieters, Ort.
        </p>
        <p>
          Die Verarbeitung der unter diesem Abschnitt angegebenen Daten ist
          weder gesetzlich noch vertraglich vorgeschrieben. Ohne die
          Übermittlung Ihrer personenbezogenen Daten können wir eine Zahlung
          über Stripe nicht durchführen. [Es besteht für Sie die Möglichkeit,
          eine andere Zahlungsmethode zu wählen.]
        </p>
        <p>
          Stripe nimmt bei Datenverarbeitungstätigkeiten eine Doppelrolle als
          Verantwortlicher und Auftragsverarbeiter ein. Als Verantwortlicher
          verwendet Stripe Ihre übermittelten Daten zur Erfüllung
          regulatorischer Verpflichtungen. Dies entspricht dem berechtigten
          Interesse Stripes (gem. Art. 6 Abs. 1 lit. f DSGVO) und dient der
          Vertragsdurchführung (gem. Art. 6 Abs. 1 lit. b DSGVO). Wir haben auf
          diesen Prozess keinen Einfluss.
        </p>
        <p>
          Als Auftragsverarbeiter fungiert Stripe, um Transaktionen innerhalb
          der Zahlungsnetzwerke abschließen zu können. Im Rahmen des
          Auftragsverarbeitungsverhältnisses wird Stripe ausschließlich nach
          unserer Weisung tätig und wurde im Sinne des Art. 28 DSGVO vertraglich
          verpflichtet, die datenschutzrechtlichen Bestimmungen einzuhalten.
        </p>
        <p>
          Stripe hat Compliance-Maßnahmen für internationale Datenübermittlungen
          umgesetzt. Diese gelten für alle weltweiten Aktivitäten, bei denen
          Stripe personenbezogene Daten von natürlichen Personen in der EU
          verarbeitet. Diese Maßnahmen basieren auf den
          EU-Standardvertragsklauseln (SCCs).
        </p>
        <p>
          Weitere Informationen zu Widerspruchs- und Beseitigungsmöglichkeiten
          gegenüber Stripe finden Sie unter:
          https://stripe.com/privacy-center/legal
        </p>
        <p>
          Ihre Daten werden von uns bis zum Abschluss der Zahlungsabwicklung
          gespeichert. Dazu zählt auch der Zeitraum der für die Bearbeitung von
          Rückerstattungen, Forderungsmanagement und Betrugsprävention
          erforderlich ist. [Für uns gilt gemäß [§ 147 AO / § 257 HGB] eine
          gesetzliche Aufbewahrungsfrist von [X] Jahren für folgende Dokumente:
          [ ]]
        </p>
        <p>
          Rechtliche Hinweise Adresse: Stripe Payments Europe Limited 1 Grand
          Canal, Street Lower, Grand Canal Dock, Dublin, D02, H210, Ireland
          Attention: Stripe Legal.
        </p>
        <p className="font-bold pt-3">Welche Rechte du an deinen Daten hast</p>
        <p>
          Du hast das Recht, dir die dich betreffenden von uns erhobenen Daten
          aushändigen zu lassen. Die Übertragung der Daten kann auch an Dritte
          erfolgen, zum Beispiel eine andere Internetpräsenz. Wir händigen die
          Daten unentgeltlich sowie in einem strukturierten, gängigen und
          maschinenlesbaren Format aus.
        </p>
        <p>
          Du hast das Recht auf Auskunft über die dich betreffenden
          gespeicherten Daten. Wir informieren dich über Art, Zweck, Umfang,
          Kategorien und Empfänger der Daten, sowie die Dauer, für die sie
          gespeichert werden. Darüber hinaus hast du das Recht auf Berichtigung
          oder Löschung der dich betreffenden Daten. Für Auskünfte zu den
          gespeicherten Daten kannst du dich jederzeit an die im Impressum
          angegeben Adresse wenden.
        </p>
        <p>
          Einige Daten erheben und verarbeiten wir nur mit deiner ausdrücklichen
          Einwilligung. Du kannst eine bereits erteilte Einwilligung jederzeit
          widerrufen. Dazu genügt eine formlose Mitteilung per E-Mail.
        </p>
        <p>
          Solltest du einen Verstoß gegen die Richtlinien der DSGVO bemerken,
          hast du das Recht, dich bei der zuständigen Aufsichtsbehörde zu
          beschweren. Dabei handelt es sich um den für den Wohnsitz des
          Verantwortlichen zuständigen Landesbeauftragten für den Datenschutz.
        </p>
        <p>
          Du hast das Recht, der weiteren Verarbeitung deiner Daten gemäß Art.
          21 DSGVO jederzeit zu widersprechen. Dazu genügt eine formlose
          Mitteilung per E-Mail.
        </p>
      </div>

      <FooterComponent></FooterComponent>
    </div>
  );
}
