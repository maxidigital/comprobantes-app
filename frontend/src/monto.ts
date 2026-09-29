/**
 * Sanitiza el campo mientras se tipea: solo dígitos y, como mucho, UN
 * separador decimal (el primer "," o "." que aparece — cualquier otro
 * separador que venga después, sea coma o punto, se ignora). Así nunca
 * pueden convivir coma y punto en el mismo valor, no hace falta adivinar si
 * es separador de miles o decimal, y no importa qué tecla muestre el
 * teclado numérico del celular.
 */
export function formatMontoInput(raw: string): string {
  let parteEntera = '';
  let parteDecimal = '';
  let vioSeparador = false;

  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      if (vioSeparador) {
        if (parteDecimal.length < 2) parteDecimal += ch;
      } else {
        parteEntera += ch;
      }
    } else if ((ch === ',' || ch === '.') && !vioSeparador) {
      vioSeparador = true;
    }
  }

  return vioSeparador ? `${parteEntera}.${parteDecimal}` : parteEntera;
}

/** El campo ya llega saneado por formatMontoInput, así que solo hace falta convertirlo. */
export function parseMonto(raw: string): number {
  const limpio = raw.trim();
  return limpio ? Number(limpio) : NaN;
}
