const NOME_FOGLIO = 'Risposte del modulo 1';
const DESTINATARIO = 'mau.molinari@gmail.com';

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'stato') {
    // Restituisce soltanto uno stato booleano, mai dati personali.
    const id = String(p.id || '');
    const callback = String(p.callback || '');
    if (!/^su_[a-zA-Z0-9_]{10,90}$/.test(id) || !/^branchCallback_[a-zA-Z0-9_]{1,80}$/.test(callback)) {
      return ContentService.createTextOutput('/* Richiesta non valida */').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    const salvato = PropertiesService.getScriptProperties().getProperty('conferma_' + id) === 'ok';
    const risultato = JSON.stringify({id: id, ok: salvato});
    return ContentService.createTextOutput(callback + '(' + risultato + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return HtmlService.createHtmlOutputFromFile('Modulo')
    .setTitle('Apri uno Sportello Utenze')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function inviaRichiesta(dati) {
  const campi = ['nome', 'telefono', 'email', 'citta', 'locale', 'esperienza'];
  if (!dati || campi.some(c => !String(dati[c] || '').trim()) || !(dati.privacy === true || dati.privacy === 'true')) {
    throw new Error('Compila tutti i campi obbligatori.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dati.email))) {
    throw new Error('Inserisci un indirizzo email valido.');
  }
  const opzioni = ['SÌ, HO GIÀ UN LOCALE', 'NO, DEVO ANCORA TROVARLO', 'VORREI PRIMA CONOSCERE MEGLIO IL PROGETTO'];
  if (!opzioni.includes(dati.locale)) throw new Error('Seleziona una risposta valida.');
  if (String(dati.nome).length > 150 || String(dati.telefono).length > 40 || String(dati.email).length > 200 || String(dati.citta).length > 150 || String(dati.esperienza).length > 3000) {
    throw new Error('Uno o più campi sono troppo lunghi.');
  }
  const foglio = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOME_FOGLIO);
  if (!foglio) throw new Error('Foglio delle risposte non trovato.');
  const sicuro = valore => {
    const testo = String(valore).trim();
    return /^[=+\-@]/.test(testo) ? "'" + testo : testo;
  };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    foglio.appendRow([
      new Date(), sicuro(dati.nome), sicuro(dati.telefono), sicuro(dati.email),
      sicuro(dati.citta), sicuro(dati.locale), sicuro(dati.esperienza),
      "Dichiaro di aver preso visione dell'informativa privacy relativa al trattamento dei miei dati personali."
    ]);
  } finally {
    lock.releaseLock();
  }
  // Il foglio è già aggiornato. Se la notifica non parte, non annulliamo la richiesta.
  try { inviaNotificaSportello(dati); }
  catch (errore) { console.error('Notifica email non inviata: ' + errore); }
  return 'Richiesta inviata correttamente!';
}

function doPost(e) {
  let ok = false;
  const p = (e && e.parameter) || {};
  try {
    if (p.sito_web) throw new Error('Richiesta non valida');
    inviaRichiesta({
      nome: p.nome, telefono: p.telefono, email: p.email, citta: p.citta,
      locale: p.locale, esperienza: p.esperienza, privacy: p.privacy
    });
    ok = true;
    const id = String(p.richiesta_id || '');
    if (/^su_[a-zA-Z0-9_]{10,90}$/.test(id)) {
      PropertiesService.getScriptProperties().setProperty('conferma_' + id, 'ok');
    }
  } catch (errore) {
    console.error('Invio modulo: ' + errore);
  }
  const messaggio = {type: 'sportello-branch-result', ok: ok};
  const html = '<!doctype html><html><body><script>window.top.postMessage(' +
    JSON.stringify(messaggio) + ',"https://maumolinari-ux.github.io");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html);
}

function inviaNotificaSportello(dati) {
  const oggetto = 'Nuova richiesta - Apri uno Sportello Utenze';
  const messaggio =
    'Hai ricevuto una nuova richiesta dal sito Sportello Utenze.\n\n' +
    'Nome: ' + dati.nome + '\n' +
    'Telefono: ' + dati.telefono + '\n' +
    'Email: ' + dati.email + '\n' +
    'Città: ' + dati.citta + '\n' +
    'Disponibilità locale: ' + dati.locale + '\n' +
    'Esperienza: ' + dati.esperienza + '\n\n' +
    'La richiesta è stata salvata nel Google Foglio.';
  MailApp.sendEmail(DESTINATARIO, oggetto, messaggio);
}
