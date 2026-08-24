export function validarRut(rut: string): boolean {
  if (!rut?.trim()) return false;
  const clean = rut.replace(/[.\s]/g, '').toUpperCase();
  const match = clean.match(/^(\d+)-([0-9K])$/);
  if (!match) return false;
  const body = match[1];
  const dv = match[2];
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return dv === expectedDv;
}

export function formatRutInput(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (clean.length === 0) return '';
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  if (body.length === 0) return clean;
  let formatted = '';
  const reversed = body.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) formatted = '.' + formatted;
    formatted = reversed[i] + formatted;
  }
  return formatted + '-' + dv;
}

export function validarTelefono(telefono: string): boolean {
  if (!telefono?.trim()) return true;
  const clean = telefono.replace(/[\s+\-().]/g, '');
  return /^\d{8,15}$/.test(clean);
}

export function formatTelefonoInput(val: string): string {
  return val.replace(/[^\d\s+\-().]/g, '');
}

export function formatRutEmpresaInput(raw: string): string {
  return formatRutInput(raw);
}

export function validarEmail(email: string): boolean {
  if (!email?.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validarPatente(patente: string): boolean {
  if (!patente?.trim()) return false;
  const clean = patente.trim().toUpperCase().replace(/\s/g, '');
  // Mínimo 5 alfanum, máximo 6 alfanum (sin guión): ABC-12, ABCD-12, AB-1234, AB-123
  const alfanum = clean.replace('-', '');
  if (alfanum.length < 5 || alfanum.length > 6) return false;
  return /^[A-Z]{2,4}-\d{2,4}$/.test(clean);
}

export function formatPatenteInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const letras = clean.replace(/\d/g, '');
  const numeros = clean.replace(/[A-Z]/g, '');
  if (!letras && !numeros) return '';
  if (numeros.length > 0) return letras + '-' + numeros;
  return letras;
}
