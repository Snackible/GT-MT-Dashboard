// All backend access lives here so the data source can be swapped in one place.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxGLvZw0ICbRcE9IuOWpuDRN-2LVx_dFW7hMd5K3Yg-VZQ8s4Xc3W85tFiHy9HZmmly/exec";

export async function apiGet(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params });
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}
