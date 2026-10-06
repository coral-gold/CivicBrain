import { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api";

/** Maps server fieldErrors onto react-hook-form fields; returns a general message if nothing mapped. */
export function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>): string | null {
  if (!(e instanceof ApiError)) return "Something went wrong. Please try again.";
  let mapped = 0;
  for (const [field, message] of Object.entries(e.fieldErrors ?? {})) {
    setError(field as Path<T>, { type: "server", message });
    mapped++;
  }
  return mapped > 0 && e.code !== "RATE_LIMITED" ? null : e.message;
}
