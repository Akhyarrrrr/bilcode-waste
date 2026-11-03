import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import * as Location from "expo-location";
import { MAX_IMAGE_BYTES, type Upload } from "@bilcode/contracts";
import { api } from "../../lib/api";
import { permissionProblem } from "../../state";

type Size = { width: number; height: number };
const imageSize = (uri: string) =>
  new Promise<Size>((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );

/**
 * Resize to 1600 px and step JPEG quality down until the file fits the API limit.
 * Returns null when the caller went stale mid-way.
 */
export async function preparePhoto(
  uri: string,
  size: Size | undefined,
  alive: () => boolean,
): Promise<string | null> {
  const { width, height } = size ?? (await imageSize(uri));
  const actions: ImageManipulator.Action[] =
    Math.max(width, height) > 1600
      ? [{ resize: width >= height ? { width: 1600 } : { height: 1600 } }]
      : [];
  const bytes = (result: ImageManipulator.ImageResult) =>
    ((result.base64?.length ?? Infinity) * 3) / 4;
  for (const compress of [0.8, 0.6, 0.4, 0.25]) {
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!alive()) return null;
    if (bytes(result) <= MAX_IMAGE_BYTES) return result.uri;
  }
  throw new Error(
    "Foto masih melebihi 3 MiB. Pilih foto lain atau ambil foto dengan resolusi lebih rendah.",
  );
}

export function uploadPhoto(uri: string, signal: AbortSignal) {
  const form = new FormData();
  form.append("file", new File(uri));
  return api.request<Upload>("/uploads", {
    method: "POST",
    body: form,
    signal,
  });
}

export class LocationProblem extends Error {
  constructor(
    message: string,
    public denied: boolean,
  ) {
    super(message);
  }
}

/** Current GPS fix; never invents coordinates. Times out after 30 s. */
export async function currentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  const problem = permissionProblem(permission.granted, "lokasi");
  if (problem) throw new LocationProblem(problem, true);
  if (!(await Location.hasServicesEnabledAsync()))
    throw new LocationProblem(
      "Layanan lokasi perangkat belum aktif. Aktifkan GPS lalu coba kembali.",
      true,
    );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new LocationProblem(
                "GPS belum menemukan lokasi. Coba di area terbuka lalu ambil lokasi kembali.",
                false,
              ),
            ),
          30000,
        );
      }),
    ]);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
