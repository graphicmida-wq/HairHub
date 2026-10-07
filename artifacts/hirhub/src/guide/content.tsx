import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Home, Calendar, Users, Scissors, Package2, ShoppingBag, Wallet, UserCog, Settings, LifeBuoy,
  type LucideIcon,
} from 'lucide-react';
import type { AppSection } from '@workspace/api-client-react';
import { Steps, Ui, Tip, Warn, List, Shot } from './ui';

/*
 * The user guide, chapter by chapter. A chapter tied to a section of the app
 * (`section`) is shown only to logins allowed to see that section; `adminOnly`
 * chapters and topics only to admins. Screenshots live in public/guida/.
 * When a screen changes, update its topic here (and retake the screenshot).
 */

export interface GuideTopic {
  id: string;
  title: string;
  adminOnly?: boolean;
  /** Extra words people might search for */
  keywords?: string;
  body: React.ReactNode;
}

export interface GuideChapter {
  id: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  section?: AppSection;
  adminOnly?: boolean;
  topics: GuideTopic[];
}

const P = ({ children }: { children: React.ReactNode }) => <p className="my-3 leading-relaxed">{children}</p>;
const To = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className="guide-link font-medium underline underline-offset-2" style={{ color: 'var(--color-on-page-link, var(--color-brand-primary))' }}>
    {children}
  </Link>
);

export const GUIDE: GuideChapter[] = [
  // ── 1 ───────────────────────────────────────────────────────────────────────
  {
    id: 'primi-passi',
    title: 'Primi passi',
    icon: Compass,
    summary: "Entrare nell'app, muoversi tra le pagine, installarla sul telefono.",
    topics: [
      {
        id: 'cose-lumii',
        title: "Cos'è Lumii",
        keywords: 'introduzione panoramica gestionale',
        body: (
          <>
            <P>
              Lumii è il gestionale del salone: in un unico posto trovi l'agenda degli appuntamenti, le schede
              dei clienti con le loro formule, il listino dei servizi, il magazzino dei prodotti, le vendite e gli
              incassi.
            </P>
            <P>
              Funziona da computer, tablet e telefono. I dati sono salvati online: quello che inserisci da un
              dispositivo lo ritrovi su tutti gli altri.
            </P>
          </>
        ),
      },
      {
        id: 'accesso',
        title: "Entrare nell'app e uscire",
        keywords: 'login accedi password nome utente esci logout',
        body: (
          <>
            <Steps>
              <>Apri l'indirizzo del tuo salone nel browser (oppure l'icona di Lumii, se l'hai installata).</>
              <>Scrivi il tuo <Ui>Nome utente</Ui> e la tua <Ui>Password</Ui>.</>
              <>Tocca <Ui>Accedi</Ui>.</>
            </Steps>
            <Shot name="login" narrow alt="La schermata di accesso" />
            <P>
              L'app ti tiene dentro per una settimana su quel dispositivo, poi ti chiede di nuovo la password. Per uscire
              prima, tocca l'icona della porta con la freccia: sul computer è in basso a sinistra, sotto il tuo nome; sul
              telefono è in alto a destra.
            </P>
            <Tip title="Hai dimenticato la password?">
              Chiedi a un amministratore del salone: dalla pagina Team può darti una password nuova.
            </Tip>
          </>
        ),
      },
      {
        id: 'menu',
        title: 'Muoversi tra le pagine',
        keywords: 'menu barra navigazione pulsante più + aggiungere',
        body: (
          <>
            <P>
              Sul computer il menu è sulla sinistra: Dashboard, Agenda, Clienti, Servizi, Vendite, Incassi e
              Magazzino, e più in basso Guida, Team e Impostazioni.
            </P>
            <P>
              Sul telefono le pagine principali sono nella barra in basso: se non ci stanno tutte, scorri la barra di
              lato. Mentre scorri una pagina verso il basso la barra si rimpicciolisce, e torna grande appena risali.
              Guida, Team, Impostazioni e Esci sono le icone in alto a destra.
            </P>
            <P>
              Il pulsante rotondo <Ui>+</Ui> in basso a destra c'è in ogni pagina: toccalo per aggiungere al volo un
              cliente, un appuntamento, un servizio, un prodotto o una vendita, senza cambiare pagina.
            </P>
            <Shot name="menu" alt="Il menu a sinistra e il pulsante + aperto" caption="Il menu a sinistra e, in basso a destra, il pulsante + aperto." />
            <Tip>
              Vedi solo le voci che ti servono: se nel menu manca una sezione, è perché il tuo accesso non la
              comprende. Se ti serve, chiedi a un amministratore.
            </Tip>
          </>
        ),
      },
      {
        id: 'installare',
        title: 'Installare Lumii sul telefono o sul tablet',
        keywords: 'installa app icona schermata home iphone android',
        body: (
          <>
            <P>
              Installata, Lumii si apre da un'icona come le altre app, a tutto schermo e senza la barra del
              browser.
            </P>
            <P><strong>Su Android (o sul computer con Chrome):</strong></P>
            <Steps>
              <>Tocca <Ui>Installa l'app</Ui>: sul telefono è l'icona in alto, sul computer è in basso nel menu.</>
              <>Conferma con <Ui>Installa</Ui>.</>
            </Steps>
            <P><strong>Su iPhone e iPad (con Safari):</strong></P>
            <Steps>
              <>Tocca il pulsante <Ui>Condividi</Ui> di Safari (il quadrato con la freccia verso l'alto).</>
              <>Scegli <Ui>Aggiungi a Home</Ui> e poi <Ui>Aggiungi</Ui>.</>
            </Steps>
          </>
        ),
      },
      {
        id: 'aggiornamenti',
        title: 'Quando esce una nuova versione',
        keywords: 'aggiorna aggiornamento nuova versione',
        body: (
          <P>
            Quando Lumii viene migliorata, in basso compare il messaggio <Ui>Nuova versione disponibile</Ui>. Tocca{' '}
            <Ui>Aggiorna</Ui>: la pagina si ricarica in un attimo e non perdi nessun dato. Se in quel momento stai
            scrivendo qualcosa, finisci e salva prima di aggiornare.
          </P>
        ),
      },
      {
        id: 'usare-guida',
        title: 'Usare questa guida',
        keywords: 'aiuto cerca stampa pdf',
        body: (
          <>
            <P>
              La guida è sempre nel menu, alla voce <Ui>Guida</Ui>. In ogni pagina dell'app, accanto al titolo, il
              pulsante <Ui>Guida</Ui> apre direttamente il capitolo di quella pagina.
            </P>
            <List>
              <>Per trovare un argomento, scrivilo nella casella di ricerca in cima alla guida (per esempio «formula» o «sconto»).</>
              <>Tocca una schermata per vederla ingrandita.</>
              <>Con <Ui>Stampa o salva in PDF</Ui> ottieni tutta la guida su carta o in un file.</>
            </List>
          </>
        ),
      },
    ],
  },

  // ── 2 ───────────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    summary: 'Il riepilogo del mese e le cose da fare oggi, appena entri.',
    topics: [
      {
        id: 'panoramica',
        title: 'Cosa trovi nella Dashboard',
        keywords: 'home panoramica riepilogo mese riquadri',
        body: (
          <>
            <P>È la prima pagina che vedi quando entri. Dall'alto in basso:</P>
            <List>
              <><strong>I numeri del mese:</strong> fatturato, appuntamenti (con il confronto col mese scorso), percentuale di no-show e nuovi clienti. La piccola curva in ogni riquadro mostra l'andamento degli ultimi mesi.</>
              <><strong>Azioni rapide:</strong> nuovo cliente, nuovo prodotto, nuova vendita.</>
              <><strong>Prossimi appuntamenti:</strong> quelli ancora da fare oggi; finita la giornata, quelli del prossimo giorno con appuntamenti. Toccane uno per aprirlo in agenda.</>
              <><strong>Vendite del mese:</strong> pezzi venduti, incasso dei prodotti, confezioni usate nei servizi e i prodotti più venduti.</>
              <><strong>Servizi più richiesti</strong> del mese.</>
              <><strong>Attenzione Magazzino:</strong> compare solo quando qualche prodotto è sotto la scorta minima.</>
            </List>
            <Shot name="dashboard" alt="La Dashboard" />
            <Tip>
              Il fatturato conta gli appuntamenti <strong>completati</strong> e le vendite al banco. Se un
              appuntamento fatto non risulta, probabilmente non è ancora stato segnato come completato (vedi{' '}
              <To to="/guida/agenda#completare">Completare un appuntamento</To>).
            </Tip>
            <P>
              Chi entra con un accesso limitato vede solo i riquadri delle sezioni che gli sono permesse: per esempio,
              senza la sezione Incassi il fatturato non compare.
            </P>
          </>
        ),
      },
    ],
  },

  // ── 3 ───────────────────────────────────────────────────────────────────────
  {
    id: 'agenda',
    title: 'Agenda e appuntamenti',
    icon: Calendar,
    summary: "Vedere la giornata, prendere, spostare, completare e annullare gli appuntamenti.",
    section: 'agenda',
    topics: [
      {
        id: 'viste',
        title: 'Giorno e settimana',
        keywords: 'vista giornaliera settimanale colonne operatori filtro oggi frecce',
        body: (
          <>
            <P>
              In alto scegli <Ui>Giorno</Ui> o <Ui>Settimana</Ui>. Con le frecce vai avanti e indietro, con{' '}
              <Ui>Oggi</Ui> torni a oggi.
            </P>
            <P>
              Nella vista Giorno c'è una colonna per ogni persona del team, più la colonna <Ui>Non assegnato</Ui>{' '}
              per gli appuntamenti senza operatore. Sul telefono le colonne si sfogliano scorrendo di lato.
            </P>
            <Shot name="agenda-giorno" alt="L'agenda, vista Giorno con le colonne degli operatori" />
            <P>
              Sotto le date ci sono i nomi del team: tocca un nome per vedere solo i suoi appuntamenti, tocca{' '}
              <Ui>Tutti</Ui> per rivederli tutti. Se anche tu hai una colonna in agenda, quando entri l'agenda si apre
              già sulla tua.
            </P>
            <P>Nella vista Settimana tocca il nome di un giorno per aprirlo nella vista Giorno.</P>
            <Shot name="agenda-settimana" alt="L'agenda, vista Settimana" />
          </>
        ),
      },
      {
        id: 'leggere',
        title: "Leggere un appuntamento in agenda",
        keywords: 'colori anteprima barrato grigio servizio da inserire',
        body: (
          <>
            <List>
              <>Il <strong>bordo colorato</strong> a sinistra ha il colore del primo servizio dell'appuntamento.</>
              <>Gli appuntamenti <strong>completati</strong>, <strong>annullati</strong> e <strong>no-show</strong> sono in grigio; quelli annullati hanno anche il nome barrato.</>
              <>La scritta <strong>Servizio da inserire</strong> ricorda che l'appuntamento non ha ancora un servizio.</>
              <>Quando due appuntamenti si sovrappongono (per esempio durante la posa del colore) quello che inizia dopo è spostato un po' a destra, così si leggono tutti e due.</>
            </List>
            <P>
              <strong>Sul computer</strong> passa con il mouse su un appuntamento per vederne il riepilogo; cliccalo per
              aprirlo.
            </P>
            <Shot name="agenda-hover" alt="Il riepilogo che compare passando con il mouse su un appuntamento" />
            <P>
              <strong>Sul telefono</strong> il primo tocco mostra il riepilogo in basso (ora, cliente, servizi,
              operatore, note); toccalo di nuovo, oppure tocca <Ui>Apri appuntamento</Ui>, per aprirlo.
            </P>
            <Shot name="agenda-anteprima" alt="Il riepilogo di un appuntamento sul telefono" phone caption="Sul telefono: il riepilogo dopo il primo tocco." />
          </>
        ),
      },
      {
        id: 'nuovo',
        title: 'Prendere un appuntamento',
        keywords: 'nuovo appuntamento prenotare prenotazione aggiungere sconto prezzo durata',
        body: (
          <>
            <P>
              Tocca <Ui>Nuovo Appuntamento</Ui> (o il pulsante <Ui>+</Ui>). Più veloce ancora: tocca un orario
              libero nell'agenda, e data e ora sono già compilate.
            </P>
            <Steps>
              <>
                <strong>Cliente:</strong> tocca <Ui>Cerca cliente…</Ui> e scrivi parte del nome o del telefono. Se è
                una cliente nuova, tocca <Ui>+ Nuovo cliente</Ui>: bastano il nome e, se vuoi, il telefono. Il resto
                della scheda lo completi dopo.
              </>
              <>
                <strong>Servizi:</strong> scegli il servizio dall'elenco; per aggiungerne altri usa{' '}
                <Ui>+ Aggiungi altro servizio</Ui>. Accanto a ogni servizio c'è il prezzo: puoi cambiarlo (per
                esempio per uno sconto), sotto resta scritto il prezzo di listino.
              </>
              <>
                <strong>Data e orari:</strong> l'ora di fine si calcola da sola sommando la durata dei servizi. Se
                serve più o meno tempo, cambia l'<Ui>Ora fine</Ui>.
              </>
              <><strong>Operatore:</strong> chi farà il servizio. Se non lo sai ancora, lascia <Ui>Nessun operatore</Ui>.</>
              <><strong>Stato:</strong> lascia <Ui>Prenotato</Ui>.</>
              <>Tocca <Ui>Salva Appuntamento</Ui>.</>
            </Steps>
            <Shot name="appuntamento-nuovo" narrow alt="Il modulo Nuovo Appuntamento" />
            <Tip title="Non sai ancora cosa farà?">
              Puoi salvare l'appuntamento anche senza servizio: in agenda resta la scritta «Servizio da inserire»
              finché non lo aggiungi.
            </Tip>
            <Tip title="Allergie e formule a portata di mano">
              Dopo aver scelto la cliente, tocca <Ui>Info</Ui> accanto al suo nome: vedi allergie, note, formule e
              ultimi appuntamenti senza uscire dal modulo.
            </Tip>
          </>
        ),
      },
      {
        id: 'dettagli',
        title: 'Aprire un appuntamento',
        keywords: 'dettagli appuntamento info cliente totale',
        body: (
          <>
            <P>
              Aprendo un appuntamento vedi la cliente, i servizi con il prezzo applicato e quello di listino, il
              totale, la data, l'orario, le note e i prodotti usati o venduti. <Ui>Info cliente</Ui>, sotto il nome,
              apre il riepilogo della cliente.
            </P>
            <P>In fondo ci sono i tre pulsanti per completarlo, modificarlo o eliminarlo.</P>
            <Shot name="appuntamento-dettagli" narrow alt="I dettagli di un appuntamento" />
          </>
        ),
      },
      {
        id: 'modificare',
        title: 'Spostare o modificare un appuntamento',
        keywords: 'spostare cambiare orario data modifica operatore',
        body: (
          <>
            <Steps>
              <>Apri l'appuntamento e tocca <Ui>Modifica</Ui>.</>
              <>Cambia quello che serve: cliente, servizi e prezzi, data, orari, operatore o stato.</>
              <>Tocca <Ui>Salva Modifiche</Ui>.</>
            </Steps>
            <P>Per spostare un appuntamento a un altro giorno o a un'altra ora cambia la data e gli orari qui: in agenda non si trascina.</P>
          </>
        ),
      },
      {
        id: 'completare',
        title: 'Completare un appuntamento',
        keywords: 'completato chiudere cassa prodotti usati venduti magazzino formula conferma completamento',
        body: (
          <>
            <P>
              Quando la cliente ha finito, segna l'appuntamento come completato. È il passaggio più importante: solo
              gli appuntamenti completati contano negli incassi e scalano dal magazzino i prodotti usati.
            </P>
            <Steps>
              <>Apri l'appuntamento e tocca <Ui>Segna come Completato</Ui>.</>
              <><strong>Servizi e prezzi:</strong> controlla i prezzi e correggili se hai fatto uno sconto.</>
              <><strong>Note del servizio:</strong> scrivi quello che è utile ricordare per la prossima volta.</>
              <>
                <strong>Prodotti Utilizzati:</strong> cerca i prodotti usati e scrivi la quantità. Per i prodotti
                gestiti a grammi o millilitri (come i colori) scrivi i grammi o i ml; per gli altri, i pezzi.
              </>
              <><strong>Prodotti Venduti:</strong> se la cliente compra qualcosa, scrivi la quantità; il prezzo si può cambiare.</>
              <>Controlla il <strong>Totale finale</strong> e tocca <Ui>Conferma Completamento</Ui>.</>
            </Steps>
            <Shot name="appuntamento-completa" narrow alt="Il modulo Completa Appuntamento" />
            <P>
              <strong>Salvare la formula:</strong> se hai inserito dei prodotti usati, compare la voce{' '}
              <Ui>Formule per …</Ui>. Toccala, poi <Ui>Aggiungi formula</Ui>: dai un nome (per esempio «Colore
              radici»), spunta i prodotti della formula con le loro quantità e, se vuoi, una nota sui tempi di posa.
              La formula finisce nella scheda della cliente.
            </P>
            <Tip title="Completato per sbaglio?">
              Apri l'appuntamento, tocca <Ui>Modifica</Ui>, rimetti lo stato su <Ui>Prenotato</Ui> e salva: i
              prodotti tornano in magazzino e l'appuntamento esce dagli incassi.
            </Tip>
          </>
        ),
      },
      {
        id: 'annullare',
        title: 'Disdette e clienti che non si presentano',
        keywords: 'annullato disdetta no-show non si presenta stato',
        body: (
          <>
            <P>Meglio non eliminare un appuntamento disdetto: cambiane lo stato, così resta traccia.</P>
            <Steps>
              <>Apri l'appuntamento e tocca <Ui>Modifica</Ui>.</>
              <>Alla voce <Ui>Stato</Ui> scegli <Ui>Annullato</Ui> (disdetta) oppure <Ui>No Show</Ui> (non si è presentata).</>
              <>Tocca <Ui>Salva Modifiche</Ui>.</>
            </Steps>
            <P>In agenda l'appuntamento diventa grigio. I no-show entrano nella percentuale mostrata in Dashboard e negli Incassi.</P>
          </>
        ),
      },
      {
        id: 'eliminare',
        title: 'Eliminare un appuntamento',
        keywords: 'elimina cancella appuntamento',
        body: (
          <>
            <P>
              Apri l'appuntamento e tocca <Ui>Elimina</Ui>, poi conferma. Usalo per gli appuntamenti inseriti per
              errore.
            </P>
            <Warn>
              Un appuntamento eliminato sparisce del tutto, anche dallo storico della cliente e dagli incassi; se era
              completato, i suoi prodotti tornano in magazzino. Per una disdetta usa invece lo stato «Annullato».
            </Warn>
          </>
        ),
      },
    ],
  },

  // ── 4 ───────────────────────────────────────────────────────────────────────
  {
    id: 'clienti',
    title: 'Clienti',
    icon: Users,
    summary: 'Rubrica, scheda della cliente, storico delle visite e formule.',
    section: 'clienti',
    topics: [
      {
        id: 'elenco',
        title: "Trovare una cliente",
        keywords: 'cerca ricerca rubrica elenco ordina lettera',
        body: (
          <>
            <P>
              I clienti sono in ordine alfabetico, divisi per lettera. Per trovarne uno scrivi nella casella{' '}
              <Ui>Cerca per nome, cognome o telefono...</Ui>. Con <Ui>Ordina per</Ui> scegli se ordinare per nome o
              per cognome.
            </P>
            <P>Sul lato destro c'è l'alfabeto: tocca una lettera per saltare lì.</P>
            <Shot name="clienti" alt="L'elenco dei clienti" />
          </>
        ),
      },
      {
        id: 'nuovo',
        title: 'Aggiungere una cliente',
        keywords: 'nuovo cliente nuova cliente aggiungi allergie telefono',
        body: (
          <>
            <Steps>
              <>Tocca <Ui>Nuovo Cliente</Ui> (o il pulsante <Ui>+</Ui>).</>
              <>Scrivi <Ui>Nome</Ui> e <Ui>Cognome</Ui>. Il telefono è facoltativo, ma aiuta a ritrovarla e a non crearla due volte.</>
              <>Se li conosci, aggiungi data di nascita, email, <Ui>Allergie / Intolleranze</Ui> e note.</>
              <>Salva.</>
            </Steps>
            <Shot name="cliente-nuovo" narrow alt="Il modulo Nuovo Cliente" />
            <P>
              Se il numero di telefono appartiene già a un'altra cliente, l'app te lo dice e non crea il doppione.
              Mentre prendi un appuntamento puoi creare una cliente al volo con <Ui>+ Nuovo cliente</Ui> (vedi{' '}
              <To to="/guida/agenda#nuovo">Prendere un appuntamento</To>).
            </P>
          </>
        ),
      },
      {
        id: 'scheda',
        title: 'La scheda della cliente',
        keywords: 'scheda storico visite speso ultima visita acquisti compra di solito',
        body: (
          <>
            <P>Tocca una cliente per aprire la sua scheda. Trovi:</P>
            <List>
              <>telefono, email, data di nascita e note; le <strong>allergie</strong> sono in rosso, ben visibili;</>
              <>quante <strong>visite</strong> ha fatto, la data dell'<strong>ultima visita</strong> e quanto ha <strong>speso</strong> in tutto;</>
              <>i prodotti che <strong>compra di solito</strong>;</>
              <>lo <strong>storico</strong> di appuntamenti e acquisti, che puoi filtrare con <Ui>Tutto</Ui>, <Ui>Appuntamenti</Ui> e <Ui>Acquisti</Ui>;</>
              <>le sue <strong>formule</strong>.</>
            </List>
            <Shot name="cliente-scheda" alt="La scheda di una cliente" />
          </>
        ),
      },
      {
        id: 'formule',
        title: 'Le formule colore',
        keywords: 'formula colore ricetta tinta prodotti quantità grammi',
        body: (
          <>
            <P>
              Una formula ricorda prodotti e quantità usati per una cliente, così la prossima volta li ritrovi subito.
              Si può salvare in due modi: quando completi un appuntamento (vedi{' '}
              <To to="/guida/agenda#completare">Completare un appuntamento</To>), oppure dalla scheda della cliente:
            </P>
            <Steps>
              <>Nella scheda, alla voce Formule, tocca <Ui>Nuova Formula</Ui>.</>
              <>Scrivi il nome della formula e, se vuoi, il servizio a cui si riferisce.</>
              <>Scrivi la quantità dei prodotti che la compongono (lascia 0 quelli che non c'entrano).</>
              <>Aggiungi una nota se serve e tocca <Ui>Salva</Ui>.</>
            </Steps>
            <P>Con la matita accanto a una formula la modifichi, con il cestino la elimini.</P>
          </>
        ),
      },
      {
        id: 'modificare',
        title: 'Modificare o eliminare una cliente',
        keywords: 'modifica elimina cancella cliente',
        body: (
          <>
            <P>
              Nella scheda tocca la matita in alto a destra: si apre <Ui>Modifica Cliente</Ui>. Cambia i dati e salva.
              Da lì puoi anche eliminarla.
            </P>
            <Warn>
              Eliminando una cliente si cancellano anche tutti i suoi appuntamenti e le sue formule: spariscono
              dall'agenda, dallo storico e dagli incassi. Non si può annullare. Elimina solo clienti inserite per
              errore o doppie.
            </Warn>
          </>
        ),
      },
    ],
  },

  // ── 5 ───────────────────────────────────────────────────────────────────────
  {
    id: 'servizi',
    title: 'Servizi',
    icon: Scissors,
    summary: 'Il listino: durata, prezzo e colore di ogni servizio.',
    section: 'servizi',
    topics: [
      {
        id: 'listino',
        title: 'Il listino',
        keywords: 'servizi listino prezzi categorie',
        body: (
          <>
            <P>
              La pagina Servizi è il listino del salone, diviso per categoria (Taglio, Colore, Piega…). Di ogni
              servizio vedi la durata e il prezzo.
            </P>
            <Shot name="servizi" alt="Il listino dei servizi" />
          </>
        ),
      },
      {
        id: 'nuovo',
        title: 'Aggiungere un servizio',
        keywords: 'nuovo servizio categoria colore durata prezzo',
        body: (
          <>
            <Steps>
              <>Tocca <Ui>Nuovo Servizio</Ui> (o il pulsante <Ui>+</Ui>).</>
              <>Scrivi il nome, per esempio «Taglio + Piega».</>
              <>Scegli la <Ui>Categoria</Ui>; se manca, creala scrivendone il nome in fondo all'elenco.</>
              <>Scegli il <Ui>Colore</Ui>: è il colore con cui il servizio appare in agenda.</>
              <>Scrivi la durata in minuti e il prezzo.</>
              <>Tocca <Ui>Salva Servizio</Ui>.</>
            </Steps>
            <Shot name="servizio-nuovo" narrow alt="Il modulo Nuovo Servizio" />
          </>
        ),
      },
      {
        id: 'modificare',
        title: 'Cambiare prezzi e durate',
        keywords: 'modifica servizio aumento prezzo elimina',
        body: (
          <>
            <P>
              Tocca un servizio per modificarlo, poi salva. Il nuovo prezzo vale per i prossimi appuntamenti: quelli
              già presi o fatti tengono il prezzo che avevano.
            </P>
            <P>Da qui puoi anche eliminare un servizio che non fai più.</P>
          </>
        ),
      },
    ],
  },

  // ── 6 ───────────────────────────────────────────────────────────────────────
  {
    id: 'magazzino',
    title: 'Magazzino',
    icon: Package2,
    summary: 'Prodotti per marca, scorte, carichi della merce e prodotti in esaurimento.',
    section: 'magazzino',
    topics: [
      {
        id: 'marche',
        title: 'Trovare un prodotto',
        keywords: 'marche marca categorie sottocategorie cerca prodotto colore marca',
        body: (
          <>
            <P>
              Il magazzino si apre con l'elenco delle <strong>marche</strong>: per ognuna vedi quanti prodotti ci
              sono. Il pallino rosso con il punto esclamativo avvisa che qualche prodotto della marca sta finendo.
            </P>
            <Shot name="magazzino-marche" alt="Il magazzino diviso per marca" />
            <P>
              Tocca una marca per vederne i prodotti. In alto puoi filtrare per categoria e, sotto, per sottocategoria;
              la freccia a sinistra del nome della marca riporta all'elenco delle marche. Con il pulsante{' '}
              <Ui>Colore</Ui> scegli il colore della marca, che la rende riconoscibile in tutta l'app.
            </P>
            <P>Per cercare un prodotto di qualsiasi marca, scrivi nella casella di ricerca in alto.</P>
            <Shot name="magazzino-prodotti" alt="I prodotti di una marca" />
          </>
        ),
      },
      {
        id: 'quantita',
        title: 'Leggere le quantità',
        keywords: 'scorta minima soglia rosso grammi millilitri pezzi confezioni',
        body: (
          <>
            <List>
              <>Per la maggior parte dei prodotti la quantità è in <strong>pezzi</strong> (confezioni).</>
              <>Per i prodotti gestiti a <strong>grammi o millilitri</strong> (per esempio i tubetti di colore, usati un po' alla volta) vedi i grammi o ml rimasti e, sotto, a quante confezioni corrispondono.</>
              <>La quantità diventa <strong>rossa</strong> quando il prodotto scende alla scorta minima: è ora di riordinarlo. Gli stessi prodotti compaiono in Dashboard, in «Attenzione Magazzino».</>
            </List>
          </>
        ),
      },
      {
        id: 'nuovo',
        title: 'Aggiungere un prodotto',
        keywords: 'nuovo prodotto marca categoria prezzo soglia minima grammi ml',
        body: (
          <>
            <Steps>
              <>Tocca <Ui>Nuovo Prodotto</Ui> (o il pulsante <Ui>+</Ui>). Se sei dentro una marca, la marca è già scelta.</>
              <>Scrivi il nome e scegli <Ui>Marca</Ui> e <Ui>Categoria</Ui> (se mancano, le crei scrivendole). Se vuoi, aggiungi le sottocategorie.</>
              <>Scrivi il <Ui>Prezzo base</Ui>, cioè il prezzo di vendita alla cliente.</>
              <>Scrivi quante <Ui>Confezioni</Ui> hai e la <Ui>Soglia Minima</Ui>: sotto quel numero il prodotto viene segnalato in rosso.</>
              <>
                Per i prodotti usati un po' alla volta spunta <Ui>Traccia stock in grammi / ml</Ui> e scrivi quanto
                contiene una confezione (per esempio 60 ml). Lo stock in grammi o ml si calcola da solo.
              </>
              <>Tocca <Ui>Salva Prodotto</Ui>.</>
            </Steps>
            <Shot name="prodotto-nuovo" narrow alt="Il modulo Nuovo Prodotto" />
          </>
        ),
      },
      {
        id: 'carico',
        title: 'Caricare la merce arrivata o correggere una quantità',
        keywords: 'carico rifornimento ordine merce arrivata rettifica inventario reso danneggiato scaduto',
        body: (
          <>
            <Steps>
              <>Tocca il prodotto: si apre <Ui>Modifica Prodotto</Ui>.</>
              <>Cambia il numero di <Ui>Confezioni</Ui> (o lo stock in grammi o ml).</>
              <>
                Compare un riquadro giallo con la differenza: scegli il <Ui>Motivo</Ui> (Rifornimento, Reso,
                Rettifica inventario, Danneggiato / scaduto, Altro) e, se vuoi, una nota come il numero dell'ordine.
              </>
              <>Salva.</>
            </Steps>
            <Shot name="prodotto-modifica" narrow alt="Modifica Prodotto con il motivo della variazione" />
            <P>Ogni variazione resta registrata nei movimenti, con data, ora e chi l'ha fatta.</P>
          </>
        ),
      },
      {
        id: 'automatico',
        title: 'Cosa scala il magazzino da solo',
        keywords: 'scarico automatico appuntamento completato vendita',
        body: (
          <>
            <List>
              <>I prodotti <strong>usati</strong> e <strong>venduti</strong> in un appuntamento, quando lo segni come completato.</>
              <>Le <strong>vendite al banco</strong>.</>
            </List>
            <P>
              Se modifichi, riapri o elimini l'appuntamento, o annulli la vendita, i prodotti tornano in magazzino
              da soli. Non serve correggere a mano.
            </P>
          </>
        ),
      },
      {
        id: 'storico',
        title: 'Lo storico di un prodotto',
        keywords: 'movimenti storico vendite utilizzi',
        body: (
          <P>
            In <Ui>Modifica Prodotto</Ui> tocca <Ui>Vedi vendite, utilizzi e movimenti</Ui>: si apre la pagina
            Vendite con tutti i movimenti di quel prodotto (vendite, usi nei servizi, carichi e correzioni).
          </P>
        ),
      },
      {
        id: 'eliminare',
        title: 'Eliminare un prodotto',
        keywords: 'elimina prodotto storico',
        body: (
          <>
            <P>
              In <Ui>Modifica Prodotto</Ui> tocca <Ui>Elimina</Ui> e conferma. Gli amministratori possono scegliere di
              eliminare anche lo storico dei movimenti del prodotto: in quel caso le sue vendite al banco spariscono
              anche dagli incassi. I movimenti legati agli appuntamenti restano comunque.
            </P>
          </>
        ),
      },
    ],
  },

  // ── 7 ───────────────────────────────────────────────────────────────────────
  {
    id: 'vendite',
    title: 'Vendite',
    icon: ShoppingBag,
    summary: 'Vendite al banco, prodotti venduti e usati, movimenti del magazzino.',
    section: 'vendite',
    topics: [
      {
        id: 'nuova',
        title: 'Registrare una vendita al banco',
        keywords: 'nuova vendita banco vendere prodotto cliente',
        body: (
          <>
            <P>Per i prodotti venduti fuori da un appuntamento (se la cliente compra durante un appuntamento, inseriscili quando lo completi).</P>
            <Steps>
              <>Tocca <Ui>Nuova vendita</Ui> (o il pulsante <Ui>+</Ui>). Data e ora sono quelle di adesso.</>
              <>Se vuoi, scegli la cliente: la vendita finirà nel suo storico.</>
              <>Cerca i prodotti e aggiungili; con <Ui>−</Ui> e <Ui>+</Ui> cambi la quantità, e il prezzo si può modificare.</>
              <>Controlla il <strong>Totale</strong> e tocca <Ui>Registra vendita</Ui>.</>
            </Steps>
            <Shot name="vendita-nuova" narrow alt="Il modulo Nuova vendita" />
          </>
        ),
      },
      {
        id: 'pagina',
        title: 'Leggere la pagina Vendite',
        keywords: 'periodo giorno settimana mese anno grafico andamento movimenti filtro prodotto',
        body: (
          <>
            <P>
              In alto scegli il periodo: <Ui>Giorno</Ui>, <Ui>Settimana</Ui>, <Ui>Mese</Ui>, <Ui>Anno</Ui> o un{' '}
              <Ui>Periodo</Ui> a scelta; con le frecce vai al periodo prima o dopo.
            </P>
            <List>
              <>I riquadri dicono quanti pezzi hai <strong>venduto</strong>, l'<strong>incasso dei prodotti</strong> e quanto è stato <strong>usato nei servizi</strong>.</>
              <>Il grafico <strong>Andamento</strong> mette a confronto pezzi venduti e usati.</>
              <>La tabella <strong>Per prodotto</strong> mostra i numeri di ogni prodotto.</>
              <>In fondo, i <strong>Movimenti</strong> uno per uno; con <Ui>Vendite</Ui> e <Ui>Uso nei servizi</Ui> li filtri.</>
            </List>
            <P>Scrivi il nome di un prodotto nella ricerca e scegli <Ui>Vedi solo il prodotto</Ui> per i numeri di quel prodotto soltanto.</P>
            <Shot name="vendite" alt="La pagina Vendite" />
          </>
        ),
      },
      {
        id: 'annullare',
        title: 'Annullare una vendita (reso)',
        keywords: 'annulla vendita reso restituito',
        body: (
          <P>
            Se una cliente restituisce un prodotto, trova la vendita nei Movimenti e tocca <Ui>Annulla vendita</Ui>.
            I prodotti tornano in magazzino e la vendita resta nello storico come annullata.
          </P>
        ),
      },
      {
        id: 'eliminare',
        title: 'Eliminare una vendita o un movimento sbagliato',
        adminOnly: true,
        keywords: 'elimina vendita movimento errore sbagliato',
        body: (
          <>
            <P>
              Per una vendita o un carico inseriti per errore, nei Movimenti tocca <Ui>Elimina vendita</Ui> o{' '}
              <Ui>Elimina movimento</Ui> e conferma: sparisce dallo storico e dagli incassi, e la quantità in
              magazzino si corregge da sola.
            </P>
            <P>
              I movimenti di un appuntamento non si eliminano da qui: si correggono modificando l'appuntamento.
              Se la vendita è avvenuta davvero e la cliente ha reso il prodotto, usa invece <Ui>Annulla vendita</Ui>.
            </P>
          </>
        ),
      },
    ],
  },

  // ── 8 ───────────────────────────────────────────────────────────────────────
  {
    id: 'incassi',
    title: 'Incassi',
    icon: Wallet,
    summary: "Quanto ha incassato il salone, per periodo, servizio, operatore e cliente.",
    section: 'incassi',
    topics: [
      {
        id: 'leggere',
        title: 'Leggere gli incassi',
        keywords: 'incassi fatturato totale spesa media sconti operatore migliori clienti periodo confronto',
        body: (
          <>
            <P>Scegli il periodo in alto, come nella pagina Vendite. Poi trovi:</P>
            <List>
              <><strong>Totale incassato</strong>, diviso in servizi e prodotti, con il confronto con il periodo precedente;</>
              <>la <strong>spesa media per visita</strong>, le visite completate, i clienti, i no-show e gli <strong>sconti sui servizi</strong> (la differenza tra prezzo di listino e prezzo applicato);</>
              <>il grafico dell'<strong>andamento</strong>;</>
              <>gli incassi <strong>per servizio</strong> e <strong>per operatore</strong>;</>
              <>i <strong>giorni della settimana</strong> più movimentati e i <strong>migliori clienti</strong>.</>
            </List>
            <Shot name="incassi" alt="La pagina Incassi" />
          </>
        ),
      },
      {
        id: 'cosa-conta',
        title: 'Cosa entra negli incassi',
        keywords: 'completato conta incassi',
        body: (
          <>
            <List>
              <>Gli appuntamenti <strong>completati</strong>, con i prezzi effettivamente applicati e i prodotti venduti durante l'appuntamento.</>
              <>Le <strong>vendite al banco</strong>.</>
            </List>
            <P>
              Non entrano gli appuntamenti prenotati, annullati o no-show. Nella sezione per operatore non ci sono le
              vendite al banco, che non hanno un operatore.
            </P>
          </>
        ),
      },
    ],
  },

  // ── 9 ───────────────────────────────────────────────────────────────────────
  {
    id: 'team',
    title: 'Team',
    icon: UserCog,
    summary: "Le persone del salone: chi è in agenda, chi entra nell'app e cosa può vedere.",
    adminOnly: true,
    topics: [
      {
        id: 'persone',
        title: 'Persone, agenda e accessi',
        keywords: 'team persone operatori dipendenti accesso',
        body: (
          <>
            <P>Nella pagina Team c'è l'elenco delle persone del salone. Ognuna ha due cose indipendenti:</P>
            <List>
              <><strong>Compare in agenda:</strong> ha la sua colonna in agenda e le si possono assegnare appuntamenti.</>
              <><strong>Può entrare nell'app:</strong> ha un suo nome utente e una sua password.</>
            </List>
            <P>
              Per esempio: una dipendente che entra dal suo telefono ha tutte e due; una che non usa l'app ha solo
              l'agenda (gli appuntamenti li inserisci tu); chi gestisce il salone senza lavorare sui clienti ha solo
              l'accesso.
            </P>
            <Shot name="team" alt="La pagina Team" />
          </>
        ),
      },
      {
        id: 'aggiungere',
        title: 'Aggiungere una persona e darle l\'accesso',
        keywords: 'nuova persona dipendente operatore nome utente password livello',
        body: (
          <>
            <Steps>
              <>Tocca <Ui>Nuova persona</Ui>.</>
              <>Scrivi il nome, se vuoi la mansione (per esempio «Colorista»), e scegli il colore della sua colonna in agenda.</>
              <>Lascia spuntato <Ui>Compare in agenda</Ui> se riceve appuntamenti.</>
              <>
                Se deve entrare nell'app, spunta <Ui>Può entrare nell'app</Ui> e scegli nome utente e password (almeno 8
                caratteri). Comunicaglieli tu: potrà usarli da qualsiasi dispositivo.
              </>
              <>Scegli il livello e, per il livello Utente, cosa può vedere (vedi sotto).</>
              <>Tocca <Ui>Aggiungi persona</Ui>.</>
            </Steps>
            <Shot name="team-persona" narrow alt="Il modulo di una persona con l'accesso all'app" />
          </>
        ),
      },
      {
        id: 'livelli',
        title: 'Amministratore o Utente: cosa può vedere',
        keywords: 'livello permessi amministratore utente sezioni incassi vedere',
        body: (
          <>
            <List>
              <><strong>Amministratore:</strong> vede e gestisce tutto, comprese le pagine Team e Impostazioni, e può eliminare vendite e movimenti sbagliati.</>
              <><strong>Utente:</strong> vede solo le sezioni che spunti tra Agenda, Clienti, Servizi, Vendite, Incassi e Magazzino. La Dashboard la vede sempre, ma solo con i riquadri delle sezioni scelte.</>
            </List>
            <P>
              La sezione <strong>Incassi</strong> comprende anche il fatturato in Dashboard: toglila se non vuoi che una
              dipendente veda gli incassi del salone. Per un accesso nuovo è già tolta.
            </P>
          </>
        ),
      },
      {
        id: 'password',
        title: 'Cambiare una password',
        keywords: 'password dimenticata cambiare nuova password',
        body: (
          <Steps>
            <>Nella pagina Team tocca la persona.</>
            <>Scrivi la password nuova in <Ui>Nuova password</Ui> (almeno 8 caratteri).</>
            <>Tocca <Ui>Salva modifiche</Ui> e comunica la nuova password alla persona.</>
          </Steps>
        ),
      },
      {
        id: 'togliere',
        title: "Togliere l'accesso, togliere dall'agenda, eliminare",
        keywords: 'togli accesso licenziata ex dipendente elimina persona',
        body: (
          <>
            <List>
              <><strong>Togliere l'accesso:</strong> apri la persona, togli la spunta a <Ui>Può entrare nell'app</Ui> e salva. Esce subito da tutti i dispositivi.</>
              <><strong>Togliere dall'agenda:</strong> togli la spunta a <Ui>Compare in agenda</Ui>. La sua colonna sparisce, ma resta visibile nei giorni in cui ha ancora appuntamenti, e il suo nome resta su quelli passati.</>
              <><strong>Eliminare:</strong> con il cestino. I suoi appuntamenti restano, ma senza operatore. Per una persona che ha lavorato nel salone è meglio togliere agenda e accesso: il suo nome resta negli incassi per operatore.</>
            </List>
            <Tip>
              Non puoi togliere l'accesso a te stesso né cambiare il tuo livello, e nel salone resta sempre almeno un
              amministratore.
            </Tip>
          </>
        ),
      },
    ],
  },

  // ── 10 ──────────────────────────────────────────────────────────────────────
  {
    id: 'impostazioni',
    title: 'Impostazioni',
    icon: Settings,
    summary: "Dati del salone, dimensione del testo, aspetto, colori, marche e categorie.",
    adminOnly: true,
    topics: [
      {
        id: 'salone',
        title: 'I dati del salone',
        keywords: 'nome salone logo indirizzo telefono email',
        body: (
          <P>
            In <Ui>Informazioni Salone</Ui> scrivi nome, indirizzo, telefono ed email, e carica il logo. Il nome e il
            logo compaiono nel menu e nella schermata di accesso; con <Ui>Mostra nome del salone nell'header</Ui>{' '}
            scegli se mostrare anche il nome accanto al logo. Tocca <Ui>Salva informazioni</Ui>.
          </P>
        ),
      },
      {
        id: 'testo',
        title: 'Ingrandire il testo',
        keywords: 'testo piccolo grande ingrandire caratteri leggere vista',
        body: (
          <>
            <P>
              In <Ui>Dimensione del testo</Ui> scegli tra Piccolo, Normale, Grande e Molto grande: testi, pulsanti e
              icone si ingrandiscono in tutta l'app. Vale solo per il dispositivo che stai usando, così puoi avere il
              testo grande sul telefono e normale sul computer.
            </P>
            <Shot name="impostazioni-testo" alt="La scelta della dimensione del testo" />
          </>
        ),
      },
      {
        id: 'aspetto',
        title: "L'aspetto: scuro o chiaro",
        keywords: 'tema scuro chiaro classico premium aspetto',
        body: (
          <P>
            In <Ui>Aspetto</Ui> scegli <Ui>Premium scuro</Ui> oppure <Ui>Classico</Ui> (chiaro). Anche questa scelta
            vale solo per il dispositivo che stai usando.
          </P>
        ),
      },
      {
        id: 'colori',
        title: "I colori dell'app",
        keywords: 'colore principale sfondo personalizzato',
        body: (
          <P>
            In <Ui>Colori dell'app</Ui> scegli il colore principale di menu e pulsanti (tra quelli proposti o uno
            personalizzato) e il colore dello sfondo. L'anteprima mostra subito il risultato; tocca{' '}
            <Ui>Salva colori</Ui> per applicarli a tutti i dispositivi del salone.
          </P>
        ),
      },
      {
        id: 'catalogo',
        title: 'Marche e categorie',
        keywords: 'marche categorie sottocategorie rinomina unisci elimina colore marca',
        body: (
          <>
            <P>
              Qui c'è l'elenco da cui si scelgono marca e categoria di prodotti e servizi, diviso in <Ui>Marche</Ui>,{' '}
              <Ui>Categorie prodotti</Ui> e <Ui>Categorie servizi</Ui>, più le sottocategorie dei prodotti. Si possono
              anche creare al volo mentre inserisci un prodotto o un servizio.
            </P>
            <List>
              <><strong>Aggiungere:</strong> scrivi il nome nella casella e tocca <Ui>Aggiungi …</Ui> che compare sotto (o premi Invio).</>
              <><strong>Rinominare:</strong> tocca la matita. Se scrivi il nome di una voce che esiste già, l'app propone di unire le due (utile per i doppioni come «Loreal» e «L'Oréal»).</>
              <><strong>Eliminare:</strong> tocca il cestino. Se la voce è usata da qualche prodotto o servizio, prima scegli dove spostarli.</>
              <>Per le marche puoi anche scegliere il <strong>colore</strong>.</>
            </List>
            <Shot name="impostazioni-catalogo" alt="Marche e categorie" />
          </>
        ),
      },
    ],
  },

  // ── 11 ──────────────────────────────────────────────────────────────────────
  {
    id: 'domande',
    title: 'Domande frequenti',
    icon: LifeBuoy,
    summary: 'Le risposte rapide ai dubbi più comuni.',
    topics: [
      {
        id: 'appuntamento-sparito',
        title: 'Non trovo un appuntamento in agenda',
        keywords: 'sparito non vedo appuntamento filtro',
        body: (
          <List>
            <>Controlla che sotto le date sia selezionato <Ui>Tutti</Ui>: se è selezionato il nome di una persona, vedi solo i suoi appuntamenti.</>
            <>Controlla di essere sul giorno giusto (il pulsante <Ui>Oggi</Ui> riporta a oggi).</>
            <>Cerca la cliente in Clienti: nel suo storico trovi tutti i suoi appuntamenti, con la data.</>
          </List>
        ),
      },
      {
        id: 'non-negli-incassi',
        title: 'Un appuntamento fatto non risulta negli incassi',
        keywords: 'incassi mancante non conta completato',
        body: (
          <P>
            Negli incassi entrano solo gli appuntamenti completati. Aprilo e tocca <Ui>Segna come Completato</Ui> (vedi{' '}
            <To to="/guida/agenda#completare">Completare un appuntamento</To>).
          </P>
        ),
      },
      {
        id: 'completato-per-sbaglio',
        title: 'Ho completato un appuntamento per sbaglio',
        keywords: 'errore completato sbaglio riaprire',
        body: (
          <P>
            Aprilo, tocca <Ui>Modifica</Ui>, rimetti lo stato su <Ui>Prenotato</Ui> e salva: i prodotti tornano in
            magazzino e l'appuntamento esce dagli incassi.
          </P>
        ),
      },
      {
        id: 'quantita-sbagliata',
        title: 'La quantità di un prodotto non torna',
        keywords: 'magazzino sbagliato quantità errata inventario',
        body: (
          <P>
            Controlla lo storico del prodotto (in <Ui>Modifica Prodotto</Ui>, <Ui>Vedi vendite, utilizzi e
            movimenti</Ui>) per capire cosa l'ha cambiata. Poi correggi la quantità con il motivo{' '}
            <Ui>Rettifica inventario</Ui> (vedi <To to="/guida/magazzino#carico">Caricare la merce o correggere una quantità</To>).
          </P>
        ),
      },
      {
        id: 'manca-sezione',
        title: 'Nel menu manca una sezione',
        keywords: 'non vedo sezione menu permessi accesso',
        body: (
          <P>
            Il tuo accesso non la comprende. Chiedi a un amministratore del salone di aggiungerla nella pagina Team.
          </P>
        ),
      },
      {
        id: 'password-dimenticata',
        title: 'Ho dimenticato la password',
        keywords: 'password dimenticata non riesco ad accedere',
        body: (
          <P>
            Chiedi a un amministratore del salone: nella pagina Team può scriverti una password nuova. Se sei tu
            l'unico amministratore, rivolgiti a chi ti assiste con Lumii.
          </P>
        ),
      },
      {
        id: 'testo-piccolo',
        title: 'Il testo è troppo piccolo',
        keywords: 'testo piccolo ingrandire leggere',
        body: (
          <P>
            Un amministratore può ingrandirlo in Impostazioni, alla voce <Ui>Dimensione del testo</Ui>: la scelta vale
            per il dispositivo su cui la fa. Sul computer puoi anche usare lo zoom del browser (tasto Ctrl o ⌘ insieme
            a +).
          </P>
        ),
      },
      {
        id: 'telefono-non-aggiornato',
        title: "Sul telefono non vedo le ultime novità",
        keywords: 'aggiornamento vecchia versione telefono',
        body: (
          <P>
            Se compare <Ui>Nuova versione disponibile</Ui>, tocca <Ui>Aggiorna</Ui>. Altrimenti chiudi l'app del tutto
            e riaprila.
          </P>
        ),
      },
    ],
  },
];
