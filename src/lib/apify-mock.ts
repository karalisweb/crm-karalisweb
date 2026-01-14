/**
 * Mock data per testing senza token Apify
 * Genera dati realistici per sviluppo e testing locale
 */

import type { GoogleMapsResult } from "@/types";

// Database di aziende mock per categoria
const MOCK_BUSINESSES: Record<string, Partial<GoogleMapsResult>[]> = {
  ristoranti: [
    {
      title: "Trattoria Da Mario",
      address: "Via Roma 123, Milano",
      phone: "+39 02 1234567",
      website: "https://trattoriadamario.it",
      totalScore: 4.2,
      reviewsCount: 156,
      categoryName: "Ristorante italiano",
    },
    {
      title: "Pizzeria Napoli",
      address: "Corso Buenos Aires 45, Milano",
      phone: "+39 02 7654321",
      website: "https://pizzerianapoli.com",
      totalScore: 4.5,
      reviewsCount: 312,
      categoryName: "Pizzeria",
    },
    {
      title: "Osteria del Borgo",
      address: "Via Dante 78, Milano",
      phone: "+39 02 9876543",
      website: null, // Test senza website
      totalScore: 4.0,
      reviewsCount: 89,
      categoryName: "Osteria",
    },
    {
      title: "Ristorante La Pergola",
      address: "Piazza Duomo 12, Milano",
      phone: "+39 02 5555555",
      website: "https://lapergola-milano.it",
      totalScore: 3.8,
      reviewsCount: 45,
      categoryName: "Ristorante",
    },
    {
      title: "Sushi Zen",
      address: "Via Torino 90, Milano",
      phone: "+39 02 4444444",
      website: "https://sushizen.it",
      totalScore: 4.7,
      reviewsCount: 523,
      categoryName: "Ristorante giapponese",
    },
  ],
  hotel: [
    {
      title: "Hotel Milano Centro",
      address: "Via Manzoni 50, Milano",
      phone: "+39 02 1111111",
      website: "https://hotelmilanocentro.it",
      totalScore: 4.3,
      reviewsCount: 892,
      categoryName: "Hotel",
    },
    {
      title: "B&B La Casa Blu",
      address: "Via Garibaldi 22, Milano",
      phone: "+39 02 2222222",
      website: "https://lacasablu.com",
      totalScore: 4.6,
      reviewsCount: 234,
      categoryName: "Bed & Breakfast",
    },
    {
      title: "Albergo Sempione",
      address: "Corso Sempione 100, Milano",
      phone: "+39 02 3333333",
      website: null,
      totalScore: 3.5,
      reviewsCount: 67,
      categoryName: "Albergo",
    },
  ],
  dentisti: [
    {
      title: "Studio Dentistico Dr. Rossi",
      address: "Via Montenapoleone 15, Milano",
      phone: "+39 02 6666666",
      website: "https://studiorossi.it",
      totalScore: 4.8,
      reviewsCount: 178,
      categoryName: "Dentista",
    },
    {
      title: "Centro Odontoiatrico Milano",
      address: "Via Vittorio Emanuele 80, Milano",
      phone: "+39 02 7777777",
      website: "https://centroodontoiatrico.it",
      totalScore: 4.1,
      reviewsCount: 95,
      categoryName: "Centro dentistico",
    },
    {
      title: "Dental Clinic",
      address: "Viale Certosa 45, Milano",
      phone: "+39 02 8888888",
      website: "https://dentalclinic-mi.it",
      totalScore: 3.9,
      reviewsCount: 42,
      categoryName: "Clinica dentale",
    },
  ],
  palestre: [
    {
      title: "Fitness Club Milano",
      address: "Via Padova 200, Milano",
      phone: "+39 02 9999999",
      website: "https://fitnessclubmilano.it",
      totalScore: 4.4,
      reviewsCount: 567,
      categoryName: "Palestra",
    },
    {
      title: "CrossFit Box",
      address: "Via Ripamonti 150, Milano",
      phone: "+39 02 0000000",
      website: "https://crossfitbox-mi.it",
      totalScore: 4.9,
      reviewsCount: 234,
      categoryName: "CrossFit",
    },
  ],
  default: [
    {
      title: "Azienda Demo 1",
      address: "Via Test 1, Milano",
      phone: "+39 02 1234000",
      website: "https://aziendademo1.it",
      totalScore: 4.0,
      reviewsCount: 50,
      categoryName: "Attività commerciale",
    },
    {
      title: "Azienda Demo 2",
      address: "Via Test 2, Milano",
      phone: "+39 02 1234001",
      website: "https://aziendademo2.it",
      totalScore: 3.5,
      reviewsCount: 25,
      categoryName: "Attività commerciale",
    },
    {
      title: "Azienda Demo 3",
      address: "Via Test 3, Milano",
      phone: "+39 02 1234002",
      website: null,
      totalScore: 4.5,
      reviewsCount: 100,
      categoryName: "Attività commerciale",
    },
  ],
};

/**
 * Genera un placeId univoco mock
 */
function generateMockPlaceId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Trova la categoria più simile alla query
 */
function findCategory(query: string): string {
  const queryLower = query.toLowerCase();

  if (queryLower.includes("ristorante") || queryLower.includes("pizzeria") || queryLower.includes("trattoria")) {
    return "ristoranti";
  }
  if (queryLower.includes("hotel") || queryLower.includes("albergo") || queryLower.includes("b&b")) {
    return "hotel";
  }
  if (queryLower.includes("dentist") || queryLower.includes("odontoiatr")) {
    return "dentisti";
  }
  if (queryLower.includes("palestra") || queryLower.includes("fitness") || queryLower.includes("crossfit")) {
    return "palestre";
  }

  return "default";
}

/**
 * Genera risultati mock per una ricerca
 */
export function generateMockResults(
  query: string,
  location: string,
  limit: number = 50
): GoogleMapsResult[] {
  const category = findCategory(query);
  const templates = MOCK_BUSINESSES[category] || MOCK_BUSINESSES.default;

  const results: GoogleMapsResult[] = [];

  // Genera risultati fino al limite richiesto
  for (let i = 0; i < Math.min(limit, templates.length * 3); i++) {
    const template = templates[i % templates.length];
    const suffix = i >= templates.length ? ` ${Math.floor(i / templates.length) + 1}` : "";

    // Modifica location nell'indirizzo se specificata
    let address = template.address || "Via Esempio 1, Milano";
    if (location && !address.includes(location)) {
      address = address.replace(/Milano$/, location);
    }

    results.push({
      title: (template.title || "Attività Demo") + suffix,
      address,
      phone: template.phone || null,
      website: template.website ?? null,
      totalScore: template.totalScore || null,
      reviewsCount: template.reviewsCount || null,
      placeId: generateMockPlaceId(),
      url: `https://maps.google.com/?cid=${generateMockPlaceId()}`,
      categoryName: template.categoryName || query,
    });
  }

  return results;
}

/**
 * Simula un delay per rendere l'esperienza più realistica
 */
export async function simulateApiDelay(ms: number = 2000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifica se siamo in modalità mock
 */
export function isMockMode(): boolean {
  return !process.env.APIFY_TOKEN || process.env.APIFY_TOKEN.trim() === "";
}
