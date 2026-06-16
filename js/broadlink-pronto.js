/**
 * Broadlink Base64 → Pronto Hex conversion.
 */

const PULSE_TICK_US = 32.84;
const IR_PACKET_TYPE = 0x26;
const RF_433_PACKET_TYPE = 0xb2;
const RF_315_PACKET_TYPE = 0xd7;
const PRONTO_FREQ_FACTOR = 0.241246;

/**
 * @param {string} base64 - Broadlink code (Base64)
 * @returns {string} Pronto hex string (space-separated, uppercase)
 */
export function broadlinkBase64ToProntoHex(base64) {
  const bytes = base64ToBytes(base64.trim());
  const packetType = bytes[0];

  if (packetType !== IR_PACKET_TYPE) {
    if (packetType === RF_433_PACKET_TYPE || packetType === RF_315_PACKET_TYPE) {
      throw new Error(
        "RF codes (433/315 MHz) cannot be converted to Pronto Hex (IR only)",
      );
    }
    throw new Error(
      `Unsupported Broadlink packet type 0x${packetType.toString(16)}`,
    );
  }

  const pulses = broadlinkBytesToMicroseconds(bytes);
  if (pulses.length === 0) {
    throw new Error("No IR pulses found in Broadlink packet");
  }
  return microsecondsToProntoHex(pulses);
}

function microsecondsToProntoHex(pulsesMicroseconds, carrierHz = 38000) {
  const freqWord = Math.round(1_000_000 / (carrierHz * PRONTO_FREQ_FACTOR));
  const safeFreqWord = freqWord > 0 ? freqWord : 0x006d;
  const actualCarrierHz = 1_000_000 / (safeFreqWord * PRONTO_FREQ_FACTOR);
  const introPairs = Math.ceil(pulsesMicroseconds.length / 2);

  const words = [
    "0000",
    safeFreqWord.toString(16).toUpperCase().padStart(4, "0"),
    introPairs.toString(16).toUpperCase().padStart(4, "0"),
    "0000",
  ];

  for (const micros of pulsesMicroseconds) {
    const prontoDur = Math.max(1, Math.round((micros * actualCarrierHz) / 1_000_000));
    words.push(prontoDur.toString(16).toUpperCase().padStart(4, "0"));
  }

  return words.join(" ");
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function broadlinkBytesToMicroseconds(data) {
  if (data.length < 4) {
    throw new Error("Broadlink packet too short");
  }

  const result = [];
  let index = 4;
  const end = Math.min(256 * data[0x03] + data[0x02] + 4, data.length);

  while (index < end) {
    let chunk = data[index];
    index += 1;

    if (chunk === 0) {
      if (index + 1 >= end) break;
      chunk = 256 * data[index] + data[index + 1];
      index += 2;
    }

    result.push(Math.round(chunk * PULSE_TICK_US));
  }

  return result;
}
