"use server";
import { loadDashboard } from "./server";
export async function refreshDashboard() {
  return loadDashboard();
}
