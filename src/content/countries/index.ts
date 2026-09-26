export type City = { id: string; name: string; tint: number; districts: string[]; landmarks: string[] };
export type Country = { id: string; name: string; locale: string; currency: string; names: string[]; salaries: number; rent: number; food: number; transport: number; cities: City[] };

// Economías ficticias y balanceadas. Los valores existen para gameplay y no representan precios actuales.
const common = ['Casa', 'Trabajo', 'Plaza', 'Café', 'Supermercado', 'Gimnasio', 'Instituto', 'Parada', 'Hospital', 'Tienda'];

export const countries: Country[] = [
  {
    id: 'ar', name: 'Argentina', locale: 'es-AR', currency: 'ARS', names: ['Luz', 'Mateo', 'Sofía', 'Tomás', 'Valentina'], salaries: 4500, rent: 3000, food: 420, transport: 120,
    cities: [
      { id: 'san-juan', name: 'San Juan', tint: 0xe7aa75, districts: ['Centro', 'Barrio del Sol', 'Parque Oeste'], landmarks: [...common] },
      { id: 'buenos-aires', name: 'Buenos Aires', tint: 0x94b6be, districts: ['Microcentro', 'Palermo', 'Caballito', 'Costanera'], landmarks: [...common] },
      { id: 'cordoba', name: 'Córdoba', tint: 0xc89273, districts: ['Centro', 'Nueva Córdoba', 'General Paz', 'Alberdi'], landmarks: [...common] },
      { id: 'mendoza', name: 'Mendoza', tint: 0xb88b68, districts: ['Centro', 'Quinta Sección', 'Godoy Cruz', 'Parque'], landmarks: [...common] },
      { id: 'rosario', name: 'Rosario', tint: 0x83a6b5, districts: ['Centro', 'Pichincha', 'Echesortu', 'Ribera'], landmarks: [...common] },
    ],
  },
  {
    id: 'mx', name: 'México', locale: 'es-MX', currency: 'MXN', names: ['Ana', 'Diego', 'Mariana', 'Emilio', 'Renata'], salaries: 520, rent: 350, food: 48, transport: 15,
    cities: [
      { id: 'cdmx', name: 'Ciudad de México', tint: 0xa5b98c, districts: ['Centro', 'Roma', 'Coyoacán', 'Reforma'], landmarks: [...common] },
      { id: 'guadalajara', name: 'Guadalajara', tint: 0xc49d75, districts: ['Centro', 'Americana', 'Providencia'], landmarks: [...common] },
      { id: 'monterrey', name: 'Monterrey', tint: 0xb49b86, districts: ['Centro', 'Obispado', 'San Jerónimo'], landmarks: [...common] },
    ],
  },
  {
    id: 'es', name: 'España', locale: 'es-ES', currency: 'EUR', names: ['Lucía', 'Pablo', 'Nora', 'Hugo', 'Carmen'], salaries: 110, rent: 72, food: 10, transport: 3,
    cities: [
      { id: 'madrid', name: 'Madrid', tint: 0xd6aa8c, districts: ['Centro', 'Malasaña', 'Retiro', 'Chamberí'], landmarks: [...common] },
      { id: 'barcelona', name: 'Barcelona', tint: 0x8db3b2, districts: ['Eixample', 'Gràcia', 'Poblenou', 'Gòtic'], landmarks: [...common] },
      { id: 'valencia', name: 'Valencia', tint: 0xd1af7c, districts: ['Ciutat Vella', 'Ruzafa', 'Benimaclet'], landmarks: [...common] },
    ],
  },
  {
    id: 'us', name: 'Estados Unidos', locale: 'en-US', currency: 'USD', names: ['Alex', 'Jordan', 'Taylor', 'Sam', 'Morgan'], salaries: 125, rent: 86, food: 12, transport: 4,
    cities: [
      { id: 'miami', name: 'Miami', tint: 0x85c4bb, districts: ['Downtown', 'Little Havana', 'Wynwood', 'Beach'], landmarks: [...common] },
      { id: 'new-york', name: 'Nueva York', tint: 0x8da0b5, districts: ['Midtown', 'Brooklyn', 'Queens', 'Harlem'], landmarks: [...common] },
      { id: 'los-angeles', name: 'Los Ángeles', tint: 0xc2a27f, districts: ['Downtown', 'Hollywood', 'Venice', 'Silver Lake'], landmarks: [...common] },
    ],
  },
];

export const countryById = (id: string) => countries.find(c => c.id === id) ?? countries[0];
export const cityById = (country: Country, id: string) => country.cities.find(c => c.id === id) ?? country.cities[0];
