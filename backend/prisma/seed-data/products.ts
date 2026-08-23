export type ProductSpecSeed = {
  label: string;
  value: string;
};

export type ProductSeed = {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand: string;
  priceGTQ: number;
  priceUSD: number | null;
  discountPercent: number | null;
  shortSpecs: string[];
  fullSpecs: ProductSpecSeed[];
  images: string[];
  stock: number;
  hasRgbLighting: boolean;
};

export const products: ProductSeed[] = [
  {
    id: "prod-phone-aura-x1",
    slug: "aura-x1",
    name: "Aura X1",
    category: "celulares",
    brand: "artech-mobile",
    priceGTQ: 6499,
    priceUSD: 835,
    discountPercent: null,
    shortSpecs: ["6.7 pulgadas OLED", "256GB almacenamiento", "12GB RAM"],
    fullSpecs: [
      { label: "Pantalla", value: "6.7 pulgadas OLED" },
      { label: "Almacenamiento", value: "256GB" },
      { label: "Memoria", value: "12GB RAM" },
      { label: "Cámara", value: "Triple lente" },
      { label: "Carga", value: "USB-C rápida" },
    ],
    images: [
      "/assets/products/desktops/aura-x1.png",
      "/placeholders/productos/aura-x1-lateral.png",
      "/placeholders/productos/aura-x1-detalle.png",
    ],
    stock: 12,
    hasRgbLighting: false,
  },
  {
    id: "prod-gpu-rtx-5080",
    slug: "rtx-5080",
    name: "RTX 5080 Nova",
    category: "tarjetas-graficas",
    brand: "nvidia-placeholder",
    priceGTQ: 10999,
    priceUSD: 1410,
    discountPercent: 10,
    shortSpecs: ["16GB GDDR7", "256-bit", "Iluminación RGB"],
    fullSpecs: [
      { label: "Memoria", value: "16GB GDDR7" },
      { label: "Bus", value: "256-bit" },
      { label: "Iluminación", value: "RGB" },
      { label: "Conectores", value: "3 DisplayPort · 1 HDMI" },
      { label: "Fuente recomendada", value: "850W" },
    ],
    images: [
      "/assets/products/gpu/rtx-5080.png",
      "/placeholders/productos/rtx-5080-nova-lateral.png",
      "/placeholders/productos/rtx-5080-nova-backplate.png",
    ],
    stock: 6,
    hasRgbLighting: true,
  },
  {
    id: "prod-ram-ddr5-32",
    slug: "memoria-ddr5-32gb",
    name: "Memoria DDR5 32GB",
    category: "cpu-ram",
    brand: "artech-components",
    priceGTQ: 1299,
    priceUSD: 167,
    discountPercent: 15,
    shortSpecs: ["32GB kit dual channel", "6000MHz", "Perfil bajo"],
    fullSpecs: [
      { label: "Capacidad", value: "32GB" },
      { label: "Velocidad", value: "6000MHz" },
      { label: "Formato", value: "DIMM" },
      { label: "Canales", value: "Dual channel" },
      { label: "Perfil", value: "Bajo" },
    ],
    images: [
      "/assets/products/ram/ddr5-32gb-2x16gb.png",
      "/placeholders/productos/memoria-ddr5-32gb-kit.png",
      "/placeholders/productos/memoria-ddr5-32gb-detalle.png",
    ],
    stock: 18,
    hasRgbLighting: false,
  },
  {
    id: "prod-monitor-vision-27",
    slug: "vision-27-4k",
    name: "Vision 27 4K",
    category: "monitores",
    brand: "artech-display",
    priceGTQ: 3799,
    priceUSD: 487,
    discountPercent: null,
    shortSpecs: ["27 pulgadas", "Resolución 4K", "USB-C"],
    fullSpecs: [
      { label: "Tamaño", value: "27 pulgadas" },
      { label: "Resolución", value: "3840 x 2160" },
      { label: "Conectividad", value: "USB-C" },
      { label: "Panel", value: "IPS" },
      { label: "Frecuencia", value: "144Hz" },
    ],
    images: [
      "/assets/products/monitors/vision-27-4k.png",
      "/placeholders/productos/vision-27-4k-lateral.png",
      "/placeholders/productos/vision-27-4k-puertos.png",
    ],
    stock: 0,
    hasRgbLighting: false,
  },
  {
    id: "prod-cpu-ryzen-9",
    slug: "ryzen-9-pro",
    name: "Ryzen 9 Pro",
    category: "cpu-ram",
    brand: "amd-placeholder",
    priceGTQ: 4599,
    priceUSD: 590,
    discountPercent: null,
    shortSpecs: ["12 núcleos", "24 hilos", "Socket AM5"],
    fullSpecs: [
      { label: "Núcleos", value: "12" },
      { label: "Hilos", value: "24" },
      { label: "Socket", value: "AM5" },
      { label: "Arquitectura", value: "Zen" },
      { label: "Gráficos integrados", value: "Sí" },
    ],
    images: [
      "/assets/products/cpu/ryzen-9-pro.png",
      "/placeholders/productos/ryzen-9-pro-caja.png",
      "/placeholders/productos/ryzen-9-pro-detalle.png",
    ],
    stock: 9,
    hasRgbLighting: false,
  },
  {
    id: "prod-console-core",
    slug: "console-core",
    name: "Console Core",
    category: "consolas",
    brand: "console-placeholder",
    priceGTQ: 4999,
    priceUSD: 641,
    discountPercent: 8,
    shortSpecs: ["1TB SSD", "4K HDR", "Control incluido"],
    fullSpecs: [
      { label: "Almacenamiento", value: "1TB SSD" },
      { label: "Video", value: "4K HDR" },
      { label: "Accesorios", value: "Control incluido" },
      { label: "Conectividad", value: "Wi-Fi · Bluetooth" },
      { label: "Formato", value: "Sobremesa" },
    ],
    images: [
      "/assets/products/consoles/console-core-1tb.png",
      "/placeholders/productos/console-core-control.png",
      "/placeholders/productos/console-core-puertos.png",
    ],
    stock: 4,
    hasRgbLighting: false,
  },
  {
    id: "prod-headphones-air",
    slug: "air-sound-pro",
    name: "Air Sound Pro",
    category: "accesorios",
    brand: "artech-audio",
    priceGTQ: 899,
    priceUSD: 115,
    discountPercent: null,
    shortSpecs: ["Cancelación de ruido", "Bluetooth", "Estuche de carga"],
    fullSpecs: [
      { label: "Conectividad", value: "Bluetooth" },
      { label: "Audio", value: "Cancelación de ruido" },
      { label: "Carga", value: "Estuche incluido" },
      { label: "Micrófono", value: "Integrado" },
      { label: "Autonomía", value: "Hasta 24 horas" },
    ],
    images: [
      "/placeholders/productos/air-sound-pro-frontal.png",
      "/placeholders/productos/air-sound-pro-estuche.png",
      "/placeholders/productos/air-sound-pro-detalle.png",
    ],
    stock: 20,
    hasRgbLighting: false,
  },
  {
    id: "prod-keyboard-slim",
    slug: "teclado-slim-mech",
    name: "Teclado Slim Mech",
    category: "perifericos",
    brand: "artech-peripherals",
    priceGTQ: 749,
    priceUSD: 96,
    discountPercent: null,
    shortSpecs: ["Mecánico compacto", "USB-C", "Español latinoamericano"],
    fullSpecs: [
      { label: "Formato", value: "Compacto" },
      { label: "Conexión", value: "USB-C" },
      { label: "Distribución", value: "Español latinoamericano" },
      { label: "Switches", value: "Mecánicos" },
      { label: "Construcción", value: "Perfil delgado" },
    ],
    images: [
      "/placeholders/productos/teclado-slim-mech-frontal.png",
      "/placeholders/productos/teclado-slim-mech-perfil.png",
      "/placeholders/productos/teclado-slim-mech-detalle.png",
    ],
    stock: 0,
    hasRgbLighting: false,
  },
];
