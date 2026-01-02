export interface DollarRate {
  type: string;
  buyPrice: number;
  sellPrice: number;
}

export async function fetchDolarApi(): Promise<DollarRate[]> {
  const res = await fetch("https://dolarapi.com/v1/dolares", {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`DolarAPI error: ${res.status}`);
  }

  const data = await res.json();

  return data.map((d: { casa: string; compra: number; venta: number }) => ({
    type: d.casa,
    buyPrice: d.compra,
    sellPrice: d.venta,
  }));
}

// Fallback to Bluelytics if DolarAPI fails
export async function fetchBluelytics(): Promise<DollarRate[]> {
  const res = await fetch("https://api.bluelytics.com.ar/v2/latest", {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Bluelytics API error: ${res.status}`);
  }

  const data = await res.json();

  const rates: DollarRate[] = [];

  if (data.oficial) {
    rates.push({
      type: "oficial",
      buyPrice: data.oficial.value_buy,
      sellPrice: data.oficial.value_sell,
    });
  }

  if (data.blue) {
    rates.push({
      type: "blue",
      buyPrice: data.blue.value_buy,
      sellPrice: data.blue.value_sell,
    });
  }

  return rates;
}

export async function fetchDollarRates(): Promise<DollarRate[]> {
  try {
    return await fetchDolarApi();
  } catch (error) {
    console.warn("DolarAPI failed, falling back to Bluelytics:", error);
    return await fetchBluelytics();
  }
}
