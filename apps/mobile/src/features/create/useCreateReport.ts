import { useEffect, useReducer, useRef } from "react";
import { Linking } from "react-native";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import type { Prediction, Report, Upload } from "@bilcode/contracts";
import { api, json, message } from "../../lib/api";
import { haptic } from "../../lib/haptics";
import { refreshReports } from "../../lib/query";
import { permissionProblem, reportInput } from "../../state";
import { flowReducer, initialFlow, isDirty, photoBusy } from "./flow";
import {
  LocationProblem,
  currentLocation,
  preparePhoto,
  uploadPhoto,
} from "./media";

export function useCreateReport() {
  const [state, dispatch] = useReducer(flowReducer, undefined, () =>
    initialFlow(Crypto.randomUUID()),
  );
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const locks = useRef({ picking: false, submitting: false });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);

  /** Prepare, upload and classify; a newer photo aborts the older request. */
  async function analyze(
    uri: string,
    size?: { width: number; height: number },
    existing?: Upload | null,
  ) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const alive = () => mounted.current && !controller.signal.aborted;
    try {
      let upload = existing;
      if (!upload) {
        dispatch({ type: "photoPhase", phase: "preparing" });
        const prepared = await preparePhoto(uri, size, alive);
        if (!prepared || !alive()) return;
        dispatch({ type: "photoPrepared", uri: prepared });
        dispatch({ type: "photoPhase", phase: "uploading" });
        upload = await uploadPhoto(prepared, controller.signal);
        if (!alive()) return;
        dispatch({ type: "uploaded", upload });
      }
      dispatch({ type: "photoPhase", phase: "analyzing" });
      const prediction = await api.request<Prediction>("/predictions", {
        ...json("POST", { uploadId: upload.id }),
        signal: controller.signal,
      });
      if (!alive()) return;
      dispatch({ type: "predicted", prediction });
      haptic.success();
    } catch (error) {
      if (alive()) dispatch({ type: "photoFailed", error: message(error) });
    }
  }

  async function pick(camera: boolean) {
    if (locks.current.picking) return;
    locks.current.picking = true;
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      const problem = permissionProblem(
        permission.granted,
        camera ? "kamera" : "galeri",
      );
      if (problem)
        return dispatch({ type: "photoFailed", error: problem, denied: true });
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 1,
        exif: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !mounted.current) return;
      const asset = result.assets[0];
      dispatch({ type: "photoPicked", uri: asset.uri });
      await analyze(asset.uri, { width: asset.width, height: asset.height });
    } catch (error) {
      if (mounted.current)
        dispatch({ type: "photoFailed", error: message(error) });
    } finally {
      locks.current.picking = false;
    }
  }

  async function locate() {
    if (state.location.busy) return;
    dispatch({ type: "locating" });
    try {
      const location = await currentLocation();
      if (mounted.current) dispatch({ type: "located", location });
    } catch (error) {
      if (mounted.current)
        dispatch({
          type: "locateFailed",
          error: message(error),
          denied: error instanceof LocationProblem && error.denied,
        });
    }
  }

  async function submit() {
    if (locks.current.submitting) return;
    locks.current.submitting = true;
    dispatch({ type: "submitting" });
    try {
      // Same clientRequestId on every retry keeps the POST idempotent.
      const report = await api.request<Report>(
        "/reports",
        json("POST", reportInput(state.draft)),
      );
      void refreshReports();
      haptic.success();
      if (mounted.current) dispatch({ type: "submitted", report });
    } catch (error) {
      haptic.warning();
      if (mounted.current)
        dispatch({ type: "submitFailed", error: message(error) });
    } finally {
      locks.current.submitting = false;
    }
  }

  const { imageUri, upload } = state.draft;
  return {
    state,
    dispatch,
    busy: photoBusy(state),
    dirty: isDirty(state),
    pick: (camera: boolean) => void pick(camera),
    retry: () => {
      if (imageUri) void analyze(imageUri, undefined, upload);
    },
    chooseManual: () => {
      active.current?.abort();
      dispatch({ type: "manual" });
    },
    locate: () => void locate(),
    submit: () => void submit(),
    openSettings: () => void Linking.openSettings().catch(() => undefined),
  };
}

export type CreateFlow = ReturnType<typeof useCreateReport>;
