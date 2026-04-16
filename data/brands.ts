/**
 * Bază de date dummy (statică, internă) cu branduri EV acoperite de platformă.
 * Folosită de pagina /modele-compatibile pentru:
 *   - randare BentoCard-uri (Etapa 2)
 *   - Smart Search (brand + model, case-insensitive)
 *
 * Culorile de accent sunt culorile oficiale ale brandurilor, ajustate să rămână
 * lizibile pe fundalul Deep-Tech (#0A0E17) — evităm tonurile prea închise care
 * s-ar pierde în bg. glowColor este varianta rgba() folosită la halo/glassmorphism.
 */

import type { BrandInfo } from '@/types/brands';

export const BRANDS: BrandInfo[] = [
  {
    id: 'tesla',
    name: 'Tesla',
    accentColor: '#E82127',
    glowColor: 'rgba(232, 33, 39, 0.25)',
    models: [
      { name: 'Model S', yearStart: 2012, supported: true },
      { name: 'Model 3', yearStart: 2017, supported: true },
      { name: 'Model X', yearStart: 2015, supported: true },
      { name: 'Model Y', yearStart: 2020, supported: true },
      { name: 'Cybertruck', yearStart: 2023, supported: true },
    ],
  },
  {
    id: 'vw',
    name: 'Volkswagen',
    accentColor: '#00B0F0',
    glowColor: 'rgba(0, 176, 240, 0.25)',
    models: [
      { name: 'ID.3', yearStart: 2019, supported: true },
      { name: 'ID.4', yearStart: 2020, supported: true },
      { name: 'ID.5', yearStart: 2021, supported: true },
      { name: 'ID.7', yearStart: 2023, supported: true },
      { name: 'ID. Buzz', yearStart: 2022, supported: true },
      { name: 'e-Golf', yearStart: 2014, yearEnd: 2020, supported: true },
    ],
  },
  {
    id: 'audi',
    name: 'Audi',
    accentColor: '#F50537',
    glowColor: 'rgba(245, 5, 55, 0.25)',
    models: [
      { name: 'e-tron', yearStart: 2018, yearEnd: 2023, supported: true },
      { name: 'e-tron GT', yearStart: 2020, supported: true },
      { name: 'Q4 e-tron', yearStart: 2021, supported: true },
      { name: 'Q6 e-tron', yearStart: 2024, supported: true },
      { name: 'Q8 e-tron', yearStart: 2023, supported: true },
    ],
  },
  {
    id: 'bmw',
    name: 'BMW',
    accentColor: '#1C69D4',
    glowColor: 'rgba(28, 105, 212, 0.25)',
    models: [
      { name: 'i3', yearStart: 2013, yearEnd: 2022, supported: true },
      { name: 'i4', yearStart: 2021, supported: true },
      { name: 'i5', yearStart: 2023, supported: true },
      { name: 'i7', yearStart: 2022, supported: true },
      { name: 'iX', yearStart: 2021, supported: true },
      { name: 'iX1', yearStart: 2022, supported: true },
      { name: 'iX3', yearStart: 2020, supported: true },
    ],
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    accentColor: '#00AAD2',
    glowColor: 'rgba(0, 170, 210, 0.25)',
    models: [
      { name: 'Ioniq 5', yearStart: 2021, supported: true },
      { name: 'Ioniq 6', yearStart: 2022, supported: true },
      { name: 'Kona Electric', yearStart: 2018, supported: true },
    ],
  },
  {
    id: 'kia',
    name: 'Kia',
    accentColor: '#E4002B',
    glowColor: 'rgba(228, 0, 43, 0.25)',
    models: [
      { name: 'EV6', yearStart: 2021, supported: true },
      { name: 'EV9', yearStart: 2023, supported: true },
      { name: 'e-Niro', yearStart: 2018, supported: true },
      { name: 'Soul EV', yearStart: 2014, supported: true },
    ],
  },
  {
    id: 'mercedes-benz',
    name: 'Mercedes-Benz',
    accentColor: '#00ADEF',
    glowColor: 'rgba(0, 173, 239, 0.25)',
    models: [
      { name: 'EQA', yearStart: 2021, supported: true },
      { name: 'EQB', yearStart: 2021, supported: true },
      { name: 'EQC', yearStart: 2019, yearEnd: 2024, supported: true },
      { name: 'EQE', yearStart: 2022, supported: true },
      { name: 'EQS', yearStart: 2021, supported: true },
      { name: 'EQV', yearStart: 2020, supported: true },
    ],
  },
  {
    id: 'porsche',
    name: 'Porsche',
    accentColor: '#D5001C',
    glowColor: 'rgba(213, 0, 28, 0.25)',
    models: [
      { name: 'Taycan', yearStart: 2019, supported: true },
      { name: 'Macan Electric', yearStart: 2024, supported: true },
    ],
  },
  {
    id: 'renault',
    name: 'Renault',
    accentColor: '#FFCC33',
    glowColor: 'rgba(255, 204, 51, 0.25)',
    models: [
      { name: 'Zoe', yearStart: 2012, yearEnd: 2024, supported: true },
      { name: 'Megane E-Tech', yearStart: 2022, supported: true },
      { name: 'Scenic E-Tech', yearStart: 2024, supported: true },
    ],
  },
  {
    id: 'nissan',
    name: 'Nissan',
    accentColor: '#C3002F',
    glowColor: 'rgba(195, 0, 47, 0.25)',
    models: [
      { name: 'Leaf', yearStart: 2010, supported: true },
      { name: 'Ariya', yearStart: 2022, supported: true },
    ],
  },
  {
    id: 'polestar',
    name: 'Polestar',
    accentColor: '#FFFFFF',
    glowColor: 'rgba(255, 255, 255, 0.15)',
    models: [
      { name: 'Polestar 2', yearStart: 2020, supported: true },
      { name: 'Polestar 3', yearStart: 2023, supported: true },
      { name: 'Polestar 4', yearStart: 2024, supported: true },
    ],
  },
  {
    id: 'volvo',
    name: 'Volvo',
    accentColor: '#1D428A',
    glowColor: 'rgba(29, 66, 138, 0.4)',
    models: [
      { name: 'XC40 Recharge', yearStart: 2020, supported: true },
      { name: 'C40 Recharge', yearStart: 2021, supported: true },
      { name: 'EX30', yearStart: 2023, supported: true },
      { name: 'EX90', yearStart: 2024, supported: true },
    ],
  },
  {
    id: 'ford',
    name: 'Ford',
    accentColor: '#1700F4',
    glowColor: 'rgba(23, 0, 244, 0.3)',
    models: [
      { name: 'Mustang Mach-E', yearStart: 2020, supported: true },
      { name: 'F-150 Lightning', yearStart: 2022, supported: true },
    ],
  },
  {
    id: 'skoda',
    name: 'Škoda',
    accentColor: '#4BA82E',
    glowColor: 'rgba(75, 168, 46, 0.25)',
    models: [
      { name: 'Enyaq iV', yearStart: 2020, supported: true },
      { name: 'Enyaq Coupé iV', yearStart: 2022, supported: true },
    ],
  },
  {
    id: 'peugeot',
    name: 'Peugeot',
    accentColor: '#97C11E',
    glowColor: 'rgba(151, 193, 30, 0.25)',
    models: [
      { name: 'e-208', yearStart: 2019, supported: true },
      { name: 'e-2008', yearStart: 2020, supported: true },
      { name: 'e-3008', yearStart: 2024, supported: true },
    ],
  },
];

/** Lookup rapid pe id-ul slug al brandului. */
export const BRANDS_BY_ID: Record<string, BrandInfo> = BRANDS.reduce(
  (acc, brand) => {
    acc[brand.id] = brand;
    return acc;
  },
  {} as Record<string, BrandInfo>
);
