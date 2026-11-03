export interface Credentials {
  name: string;
  email: string;
  password: string;
}
export type CredentialErrors = Partial<Record<keyof Credentials, string>>;

/** Field-level errors shown under each input before the request is sent. */
export function validateCredentials(
  values: Credentials,
  register: boolean,
): CredentialErrors {
  const errors: CredentialErrors = {};
  if (register && values.name.trim().length < 2)
    errors.name = "Nama minimal 2 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Tuliskan alamat email yang valid.";
  if (values.password.length < 8)
    errors.password = "Kata sandi minimal 8 karakter.";
  return errors;
}
