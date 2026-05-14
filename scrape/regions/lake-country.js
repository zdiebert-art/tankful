// Lake Country region config — used by scrape/fetch-prices.js to fetch +
// match stations, and surfaced in the manifest the frontend reads to
// populate the region picker.
//
// Field reference:
//   id          — region slug used in file paths (data/{id}-prices.json) + the URL hash
//   name        — display label in the region picker
//   postalCodes — GasBuddy search terms to sweep; results de-duped across them
//   zones       — null when the region is small enough to skip a zone filter
//   stations    — known stations. Scraper matches a parsed entry to a station by
//                 (number + streetKey-uppercase-prefix). Public fields (fuelBrand,
//                 cstoreBrand, logoBrand, discount, zone) are passed through into
//                 the prices JSON for the frontend.

export default {
  id: "lake-country",
  name: "Lake Country",
  postalCodes: ["V4V 1W2"],
  zones: null,
  stations: [
    {
      id: "canco",
      name: "Canco Woodsdale",
      address: "11470 Bottom Wood Lake Rd",
      number: "11470", streetKey: "BOTTOM",
      lat: 50.0760, lng: -119.3995,
      fuelBrand: "Canco", cstoreBrand: "One Stop",
      discount: { type: "card", amount: 2.0, label: "with Canco card" },
    },
    {
      id: "petrocan",
      name: "Petro-Canada · 7-Eleven",
      address: "9724 BC-97",
      number: "9724", streetKey: "97",
      lat: 50.0432, lng: -119.4093,
      fuelBrand: "Petro-Canada", cstoreBrand: "7-Eleven",
    },
    {
      id: "petrocan-n",
      name: "Petro-Canada North",
      address: "9855 BC-97 N",
      number: "9855", streetKey: "97",
      lat: 50.0479, lng: -119.4078,
      fuelBrand: "Petro-Canada",
    },
    {
      id: "husky",
      name: "Husky Hwy 97",
      address: "10550 BC-97",
      number: "10550", streetKey: "97",
      lat: 50.0599, lng: -119.4007,
      fuelBrand: "Husky", cstoreBrand: "CO-OP",
    },
    {
      id: "supersave",
      name: "Super Save Lake Country",
      address: "11751 BC-97",
      number: "11751", streetKey: "97",
      lat: 50.0918, lng: -119.3850,
      fuelBrand: "Super Save",
    },
    {
      id: "parkway",
      name: "Parkway (Shell)",
      address: "11891 BC-97",
      number: "11891", streetKey: "97",
      lat: 50.0930, lng: -119.3835,
      fuelBrand: "Parkway", logoBrand: "Shell",  // Parkway pumps Shell fuel
    },
    {
      id: "shell-lc",
      name: "Shell Lake Country",
      address: "9531 BC-97",
      number: "9531", streetKey: "97",
      lat: 50.0407, lng: -119.4108,
      fuelBrand: "Shell",
    },
    {
      id: "chevron",
      name: "Chevron Lake Country",
      address: "9450 BC-97",
      number: "9450", streetKey: "97",
      lat: 50.0395, lng: -119.4115,
      fuelBrand: "Chevron", cstoreBrand: "On the Run",
    },
  ],
};
