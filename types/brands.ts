/**
 * Schema pentru pagina /modele-compatibile.
 * Data trăiește în data/brands.ts — acest fișier definește doar forma.
 */

export interface CarModel {
  /** Nume afișat, ex. "Model 3", "ID.4", "Ioniq 5" */
  name: string;
  /** Anul de start al producției (opțional — folosit pentru etichete "din YYYY") */
  yearStart?: number;
  /** Anul final de producție (omis dacă modelul e încă fabricat) */
  yearEnd?: number;
  /** true = acoperit integral de pachetul Premium (telemetrie Smartcar + scoring complet) */
  supported: boolean;
}

export interface BrandInfo {
  /** Slug unic, lowercase, ex. "tesla", "vw", "mercedes-benz" */
  id: string;
  /** Nume de afișare, ex. "Tesla", "Volkswagen" */
  name: string;
  /** Culoarea de accent a brandului, acordată cu fundalul Deep-Tech (#0A0E17) */
  accentColor: string;
  /** Versiune rgba() transparentă a accentColor — folosită pentru glow/halo */
  glowColor: string;
  /** Lista de modele EV relevante pentru brand */
  models: CarModel[];
}
