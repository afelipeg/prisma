export interface CoffeeProduct {
  id: string;
  name: string;
  origin: string;
  description: string;
  price: number;
  roast: 'light' | 'medium' | 'dark';
  stock: number;
  tags: string[];
  imageUrl: string;
  weightGrams: number;
  rating: number;
}

export const seed: CoffeeProduct[] = [
  {
    id: 'oaxaca-negro',
    name: 'Oaxaca Negro',
    origin: 'Oaxaca',
    description:
      'Un espresso oscuro y aterciopelado cultivado en las montañas de la Sierra Juárez. Notas de chocolate amargo, nuez de macadamia y un final largo con toque de piloncillo.',
    price: 350,
    roast: 'dark',
    stock: 42,
    tags: ['espresso', 'chocolate', 'piloncillo', 'sierra-juárez'],
    imageUrl:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800',
    weightGrams: 250,
    rating: 4.8,
  },
  {
    id: 'chiapas-luz',
    name: 'Chiapas Luz de Mañana',
    origin: 'Chiapas',
    description:
      'Cosechado en las fincas de altura de Tapachula. Perfil ligero y floral con acidez brillante. Recuerda a durazno, jazmín y miel de abeja negra.',
    price: 380,
    roast: 'light',
    stock: 28,
    tags: ['pour-over', 'floral', 'durazno', 'tapachula'],
    imageUrl:
      'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800',
    weightGrams: 250,
    rating: 4.6,
  },
  {
    id: 'veracruz-medio',
    name: 'Veracruz Altura',
    origin: 'Veracruz',
    description:
      'Café de sombra cultivado bajo el dosel de la selva de Xico. Cuerpo redondo y equilibrado con notas de caramelo, cereza roja y ligero toque cítrico.',
    price: 280,
    roast: 'medium',
    stock: 65,
    tags: ['sombra', 'equilibrado', 'caramelo', 'xico'],
    imageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    weightGrams: 250,
    rating: 4.4,
  },
  {
    id: 'guerrero-honey',
    name: 'Guerrero Honey Process',
    origin: 'Guerrero',
    description:
      'Proceso honey de la región de Atoyac. La pulpa seca le da una dulzura única de mango, uva pasa y melaza. Ideal para aeropress o moka.',
    price: 420,
    roast: 'medium',
    stock: 15,
    tags: ['honey-process', 'mango', 'uva-pasa', 'atoyac'],
    imageUrl:
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800',
    weightGrams: 200,
    rating: 4.9,
  },
];
