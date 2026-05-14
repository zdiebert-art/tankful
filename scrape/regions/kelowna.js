// Kelowna region config. lat/lng are intentionally null on first ship —
// the distance feature ("X.X km away") will appear as soon as a geocoding
// pass populates them. Everything else (zone filter, price ranking, score,
// tips) works without lat/lng.
//
// Zones were chosen to match how locals navigate the city, not strict
// postal-code boundaries. A handful of stations sit on edges where another
// reasonable assignment exists — see the table reviewed with the owner.

export default {
  id: "kelowna",
  name: "Kelowna",
  postalCodes: ["V1Y", "V1W", "V1V", "V1P", "V1X"],
  zones: [
    { id: "downtown",       name: "Downtown / Capri" },
    { id: "mission",        name: "Mission / South" },
    { id: "glenmore",       name: "Glenmore / UBCO" },
    { id: "rutland",        name: "Rutland" },
    { id: "rutland-north",  name: "Rutland N / Airport" },
  ],
  stations: [
    // ----- Downtown / Capri (10) -----
    { id: "kelowna-ethel-1189",       address: "1189 Ethel St",       number: "1189",  streetKey: "ETHEL",       lat: null, lng: null, zone: "downtown",      fuelBrand: "Canco",        cstoreBrand: "One Stop" },
    { id: "kelowna-harvey-1575",      address: "1575 Harvey Ave",     number: "1575",  streetKey: "HARVEY",      lat: null, lng: null, zone: "downtown",      fuelBrand: "CO-OP" },
    { id: "kelowna-harvey-1890",      address: "1890 Harvey Ave",     number: "1890",  streetKey: "HARVEY",      lat: null, lng: null, zone: "downtown",      fuelBrand: "Chevron",      cstoreBrand: "On the Run" },
    { id: "kelowna-harvey-1901",      address: "1901 Harvey Ave",     number: "1901",  streetKey: "HARVEY",      lat: null, lng: null, zone: "downtown",      fuelBrand: "Esso",         cstoreBrand: "7-Eleven" },
    { id: "kelowna-springfield-2189", address: "2189 Springfield Rd", number: "2189",  streetKey: "SPRINGFIELD", lat: null, lng: null, zone: "downtown",      fuelBrand: "Shell",        cstoreBrand: "Circle K" },
    { id: "kelowna-baron-2203",       address: "2203 Baron Rd",       number: "2203",  streetKey: "BARON",       lat: null, lng: null, zone: "downtown",      fuelBrand: "Costco" },
    { id: "kelowna-harvey-375",       address: "375 Harvey Ave",      number: "375",   streetKey: "HARVEY",      lat: null, lng: null, zone: "downtown",      fuelBrand: "Chevron",      cstoreBrand: "On the Run" },
    { id: "kelowna-harvey-634",       address: "634 Harvey Ave",      number: "634",   streetKey: "HARVEY",      lat: null, lng: null, zone: "downtown",      fuelBrand: "Shell" },
    { id: "kelowna-harvey-715",       address: "715 Harvey Ave",      number: "715",   streetKey: "HARVEY",      lat: null, lng: null, zone: "downtown",      fuelBrand: "Petro-Canada" },
    { id: "kelowna-lakeshore-3100",   address: "3100 Lakeshore Rd",   number: "3100",  streetKey: "LAKESHORE",   lat: null, lng: null, zone: "downtown",      fuelBrand: "Shell" },

    // ----- Mission / South (6) -----
    { id: "kelowna-klo-1850",         address: "1850 KLO Rd",         number: "1850",  streetKey: "KLO",         lat: null, lng: null, zone: "mission",       fuelBrand: "Shell" },
    { id: "kelowna-gordon-2315",      address: "2315 Gordon Dr",      number: "2315",  streetKey: "GORDON",      lat: null, lng: null, zone: "mission",       fuelBrand: "Chevron",      cstoreBrand: "On the Run" },
    { id: "kelowna-gordon-3135",      address: "3135 Gordon Dr",      number: "3135",  streetKey: "GORDON",      lat: null, lng: null, zone: "mission",       fuelBrand: "Esso",         cstoreBrand: "7-Eleven" },
    { id: "kelowna-gordon-3802",      address: "3802 Gordon Dr",      number: "3802",  streetKey: "GORDON",      lat: null, lng: null, zone: "mission",       fuelBrand: "Canco",        cstoreBrand: "One Stop" },
    { id: "kelowna-lakeshore-3950",   address: "3950 Lakeshore Dr",   number: "3950",  streetKey: "LAKESHORE",   lat: null, lng: null, zone: "mission",       fuelBrand: "Petro-Canada" },
    { id: "kelowna-lakeshore-3968",   address: "3968 Lakeshore Dr",   number: "3968",  streetKey: "LAKESHORE",   lat: null, lng: null, zone: "mission",       fuelBrand: "Esso",         cstoreBrand: "7-Eleven" },

    // ----- Glenmore / UBCO (1) -----
    { id: "kelowna-glenmore-395",     address: "395 Glenmore Rd",     number: "395",   streetKey: "GLENMORE",    lat: null, lng: null, zone: "glenmore",      fuelBrand: "Petro-Canada" },

    // ----- Rutland (8) -----
    { id: "kelowna-bc33w-1155",       address: "1155 BC-33 W",        number: "1155",  streetKey: "33",          lat: null, lng: null, zone: "rutland",       fuelBrand: "Shell" },
    { id: "kelowna-bc33e-125",        address: "125 BC-33 E",         number: "125",   streetKey: "33",          lat: null, lng: null, zone: "rutland",       fuelBrand: "Esso",         cstoreBrand: "7-Eleven" },
    { id: "kelowna-bc33w-1435",       address: "1435 BC-33 W",        number: "1435",  streetKey: "33",          lat: null, lng: null, zone: "rutland",       fuelBrand: "Super Save" },
    { id: "kelowna-bc33e-1799",       address: "1799 BC-33 E",        number: "1799",  streetKey: "33",          lat: null, lng: null, zone: "rutland",       fuelBrand: "Canco",        cstoreBrand: "One Stop" },
    { id: "kelowna-rutland-2115",     address: "2115 Rutland Rd",     number: "2115",  streetKey: "RUTLAND",     lat: null, lng: null, zone: "rutland",       fuelBrand: "CO-OP" },
    { id: "kelowna-bc33w-340",        address: "340 BC-33 W",         number: "340",   streetKey: "33",          lat: null, lng: null, zone: "rutland",       fuelBrand: "Centex",       cstoreBrand: "GOmarket" },
    { id: "kelowna-bc33w-365",        address: "365 BC-33 W",         number: "365",   streetKey: "33",          lat: null, lng: null, zone: "rutland",       fuelBrand: "Petro-Canada" },
    { id: "kelowna-bc33w-720",        address: "720 BC-33 W",         number: "720",   streetKey: "33",          lat: null, lng: null, zone: "rutland",       fuelBrand: "Canco",        cstoreBrand: "One Stop" },

    // ----- Rutland N / Airport (12) -----
    { id: "kelowna-adams-105",        address: "105 Adams Rd",        number: "105",   streetKey: "ADAMS",       lat: null, lng: null, zone: "rutland-north", fuelBrand: "Chevron",      cstoreBrand: "On the Run" },
    { id: "kelowna-edwards-150",      address: "150 Edwards Rd",      number: "150",   streetKey: "EDWARDS",     lat: null, lng: null, zone: "rutland-north", fuelBrand: "Husky" },
    { id: "kelowna-underhill-1836",   address: "1836 Underhill St",   number: "1836",  streetKey: "UNDERHILL",   lat: null, lng: null, zone: "rutland-north", fuelBrand: "Petro-Canada" },
    { id: "kelowna-underhill-1849",   address: "1849 Underhill St",   number: "1849",  streetKey: "UNDERHILL",   lat: null, lng: null, zone: "rutland-north", fuelBrand: "Mobil",        cstoreBrand: "Superstore" },
    { id: "kelowna-bc97n-2380",       address: "2380 BC-97 N",        number: "2380",  streetKey: "97",          lat: null, lng: null, zone: "rutland-north", fuelBrand: "Esso",         cstoreBrand: "Smart Stop 24/7" },
    { id: "kelowna-bc97n-2403",       address: "2403 BC-97 N",        number: "2403",  streetKey: "97",          lat: null, lng: null, zone: "rutland-north", fuelBrand: "Canadian Tire" },
    { id: "kelowna-bc97n-2491",       address: "2491 BC-97 N",        number: "2491",  streetKey: "97",          lat: null, lng: null, zone: "rutland-north", fuelBrand: "Chevron",      cstoreBrand: "On the Run" },
    { id: "kelowna-bc97n-2693",       address: "2693 BC-97 N",        number: "2693",  streetKey: "97",          lat: null, lng: null, zone: "rutland-north", fuelBrand: "Petro-Canada" },
    { id: "kelowna-sexsmith-3491",    address: "3491 Sexsmith Rd",    number: "3491",  streetKey: "SEXSMITH",    lat: null, lng: null, zone: "rutland-north", fuelBrand: "CO-OP" },
    { id: "kelowna-bc97n-3650",       address: "3650 BC-97 N",        number: "3650",  streetKey: "97",          lat: null, lng: null, zone: "rutland-north", fuelBrand: "Esso",         cstoreBrand: "On the Run" },
    { id: "kelowna-airport-5538",     address: "5538 Airport Way",    number: "5538",  streetKey: "AIRPORT",     lat: null, lng: null, zone: "rutland-north", fuelBrand: "Canco",        cstoreBrand: "One Stop" },
    { id: "kelowna-innovation-1708",  address: "1708 Innovation Dr",  number: "1708",  streetKey: "INNOVATION",  lat: null, lng: null, zone: "rutland-north", fuelBrand: "Canco",        cstoreBrand: "One Stop" },
  ],
};
