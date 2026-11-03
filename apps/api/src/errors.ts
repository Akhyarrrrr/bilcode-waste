export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const notFound = () =>
  new HttpError(404, "NOT_FOUND", "Data tidak ditemukan.");
export const conflict = () =>
  new HttpError(
    409,
    "CONFLICT",
    "Data telah berubah. Muat ulang lalu coba kembali.",
  );
