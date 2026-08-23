export type CategorySeed = {
  id: string;
  name: string;
  icon: string;
};

export const categories: CategorySeed[] = [
  { id: "celulares", name: "Celulares", icon: "smartphone" },
  { id: "tarjetas-graficas", name: "Tarjetas gráficas", icon: "gpu" },
  { id: "cpu-ram", name: "CPU/RAM", icon: "cpu" },
  { id: "monitores", name: "Monitores", icon: "monitor" },
  { id: "perifericos", name: "Periféricos", icon: "keyboard" },
  { id: "componentes", name: "Componentes", icon: "component" },
  { id: "consolas", name: "Consolas", icon: "gamepad" },
  { id: "accesorios", name: "Accesorios", icon: "headphones" },
];
