// utils/koko.client.js
import axios from "axios";
import querystring from "querystring";
import { signWithPrivateKey } from "./rsa.util.js";

const KOKO_BASE = process.env.KOKO_API_BASE_URL || "https://qaapi.paykoko.com/api/merchants";
const MERCHANT_ID = process.env.KOKO_MERCHANT_ID;
const API_KEY = process.env.KOKO_API_KEY;
const PLUGIN_NAME = process.env.KOKO_PLUGIN_NAME || "customapi";
const PLUGIN_VERSION = process.env.KOKO_PLUGIN_VERSION || "1.0.0";

/**
 * POST to KOKO orderView endpoint to fetch status. Signs the data string as required.
 * Returns axios response.data
 */
export async function kokoOrderView(orderId) {
  const endpoint = `${KOKO_BASE}/orderView`;
  // Data string per docs: MerchantID + PluginName + PluginVersion + OrderID + APIKey
  const dataString = `${MERCHANT_ID}${PLUGIN_NAME}${PLUGIN_VERSION}${orderId}${API_KEY}`;

  const signature = signWithPrivateKey(process.env.KOKO_PRIVATE_KEY, dataString);

  // KOKO expects application/x-www-form-urlencoded
  const body = {
    _mId: MERCHANT_ID,
    _pluginName: PLUGIN_NAME,
    _pluginVersion: PLUGIN_VERSION,
    api_key: API_KEY,
    _orderId: orderId,
    signature,
  };

  const res = await axios.post(endpoint, querystring.stringify(body), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return res.data;
}
