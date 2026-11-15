/* =========================================================================
   TRASH MAN 3D - INVENTORY & PETS CATALOG
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.Items = [
  // CABEZA
  { id: 'cap_green', category: 'head', name: 'Gorra Verde Guardián', rarity: 'comun', icon: '🧢', desc: 'Gorra clásica de algodón reciclado con el logo eco.', color: 0x22c55e },
  { id: 'helmet_cyber', category: 'head', name: 'Casco Bio-Cyber', rarity: 'raro', icon: '🪖', desc: 'Casco con filtros purificadores de aire tóxico y visor HUD.', color: 0x06b6d4 },
  { id: 'visor_holo', category: 'head', name: 'Visor Holográfico Eco', rarity: 'epico', icon: '🥽', desc: 'Resalta basura reciclable a distancia mediante escaneo térmico.', color: 0xa855f7 },
  { id: 'crown_leaf', category: 'head', name: 'Corona de Hojas Doradas', rarity: 'legendario', icon: '👑', desc: 'Corona ceremonial para los salvadores legendarios de la Tierra.', color: 0xf59e0b },

  // TORSO
  { id: 'jacket_eco', category: 'torso', name: 'Chaqueta Eco-Resistente', rarity: 'comun', icon: '🧥', desc: 'Tejido impermeable hecho de 40 botellas plásticas recicladas.', color: 0x16a34a },
  { id: 'jacket_cyber', category: 'torso', name: 'Sudadera Neón Ciudad', rarity: 'raro', icon: '🦺', desc: 'Bordes reflectantes visibles en tormentas de smog y niebla tóxica.', color: 0x0284c7 },
  { id: 'hazmat_suit_torso', category: 'torso', name: 'Pechera Hazmat Pesada', rarity: 'epico', icon: '🎽', desc: 'Protección militar blindada contra radiación y residuos corrosivos.', color: 0xd97706 },
  { id: 'armor_titan_torso', category: 'torso', name: 'Coraza Bio-Titán', rarity: 'legendario', icon: '🛡️', desc: 'Forjada con polímeros reciclados ultraligeros e indestructibles.', color: 0x10b981 },

  // PANTALÓN
  { id: 'pants_camo', category: 'legs', name: 'Pantalón Cargo Forestal', rarity: 'comun', icon: '👖', desc: 'Bolsillos múltiples reforzados para almacenar muestras y herramientas.', color: 0x334155 },
  { id: 'pants_cyber', category: 'legs', name: 'Pantalón Táctico Cyber', rarity: 'raro', icon: '🩳', desc: 'Resistencia a fluidos corrosivos, espinas y lodo contaminado.', color: 0x0f172a },
  { id: 'pants_bio', category: 'legs', name: 'Pantalón Bio-Aislante', rarity: 'epico', icon: '👖', desc: 'Aumenta la velocidad de recolección un 15% mediante servos ligeros.', color: 0x7c3aed },

  // ZAPATILLAS
  { id: 'boots_orange', category: 'feet', name: 'Botas de Trabajo Eco', rarity: 'comun', icon: '🥾', desc: 'Suela antideslizante fabricada con caucho de neumáticos reciclados.', color: 0xea580c },
  { id: 'sneakers_cyber', category: 'feet', name: 'Zapatillas Anti-Gravedad', rarity: 'raro', icon: '👟', desc: 'Impulsores de salto que permiten esquivar charcos de ácido.', color: 0x38bdf8 },
  { id: 'boots_titan', category: 'feet', name: 'Botas Magnéticas Titán', rarity: 'legendario', icon: '👢', desc: 'Firmeza absoluta contra las ondas expansivas de los monstruos.', color: 0xf59e0b },

  // ARMAS & HERRAMIENTAS
  { id: 'claw_basic', category: 'weapon', name: 'Pinza Recolectora de Acero', rarity: 'comun', icon: '🥢', desc: 'Pinza mecánica básica con garra magnética para levantar residuos sin tocarlos.', color: 0x94a3b8 },
  { id: 'broom_laser', category: 'weapon', name: 'Escoba Láser Bio-Luz', rarity: 'epico', icon: '🧹', desc: 'Barre microplásticos y dispara ráfagas de plasma fotónico concentrado.', color: 0x38bdf8 },
  { id: 'cannon_vacuum', category: 'weapon', name: 'Cañón Bio-Aspirador 3000', rarity: 'legendario', icon: '🌀', desc: 'Succiona basura a gran distancia en vórtice y lanza proyectiles eco.', color: 0x10b981 },
  { id: 'herramienta_pala_t1_basica', category: 'weapon', name: 'Pala básica', rarity: 'comun', icon: '⛏️', desc: 'Pala ligera para recoger residuos sueltos.', color: 0x8b8172 },
  { id: 'herramienta_pala_t2_reciclada', category: 'weapon', name: 'Pala reciclada', rarity: 'raro', icon: '⛏️', desc: 'Pala reforzada fabricada con metal recuperado.', color: 0x64766e },
  { id: 'herramienta_pala_t3_titanio', category: 'weapon', name: 'Pala de titanio', rarity: 'epico', icon: '⛏️', desc: 'Pala de titanio para residuos compactados.', color: 0x9ca3af },
  { id: 'herramienta_rastrillo_t1_basico', category: 'weapon', name: 'Rastrillo básico', rarity: 'comun', icon: '🧹', desc: 'Rastrillo de campo para hojas y basura ligera.', color: 0x8b8172 },
  { id: 'herramienta_rastrillo_t2_reciclado', category: 'weapon', name: 'Rastrillo reciclado', rarity: 'raro', icon: '🧹', desc: 'Rastrillo reforzado para limpiar áreas amplias.', color: 0x64766e },
  { id: 'herramienta_rastrillo_t3_titanio', category: 'weapon', name: 'Rastrillo de titanio', rarity: 'epico', icon: '🧹', desc: 'Rastrillo industrial de titanio.', color: 0x9ca3af },
  { id: 'herramienta_pinza_t1_basica', category: 'weapon', name: 'Pinza básica', rarity: 'comun', icon: '🗜️', desc: 'Pinza de alcance corto para recoger objetos.', color: 0x8b8172 },
  { id: 'herramienta_pinza_t2_reciclada', category: 'weapon', name: 'Pinza reciclada', rarity: 'raro', icon: '🗜️', desc: 'Pinza reforzada con mayor alcance.', color: 0x64766e },
  { id: 'herramienta_pinza_t3_electrica', category: 'weapon', name: 'Pinza eléctrica', rarity: 'epico', icon: '🗜️', desc: 'Pinza eléctrica para atraer residuos metálicos.', color: 0x38bdf8 },
  { id: 'herramienta_red_rio', category: 'weapon', name: 'Red de río', rarity: 'raro', icon: '🥅', desc: 'Red para retirar residuos flotantes.', color: 0x38bdf8 },
  { id: 'herramienta_iman_chatarra', category: 'weapon', name: 'Imán de chatarra', rarity: 'epico', icon: '🧲', desc: 'Imán industrial para atraer piezas metálicas.', color: 0x10b981 },
  { id: 'herramienta_aspiradora_residuos', category: 'weapon', name: 'Aspiradora de residuos', rarity: 'legendario', icon: '🌀', desc: 'Aspiradora compacta para extraer residuos a distancia.', color: 0x10b981 },
];

TrashGame.Pets = [
  { id: 'ecobot', name: 'Eco-Bot 3000', rarity: 'raro', icon: '🤖', bonus: '+15% Monedas por basura', desc: 'Pequeño androide flotante que escanea y compacta residuos.', color: 0x06b6d4 },
  { id: 'froggy', name: 'Ranita Bio-Limpiadora', rarity: 'epico', icon: '🐸', bonus: 'Inmunidad a charcos tóxicos', desc: 'Criatura anfibia purificadora de agua con loto aerodeslizador.', color: 0x22c55e },
  { id: 'drone_bee', name: 'Dron Polinizador', rarity: 'epico', icon: '🐝', bonus: 'Detecta basura oculta', desc: 'Micro-dron autónomo con hélices holográficas de alta velocidad.', color: 0xf59e0b },
  { id: 'otter_clean', name: 'Nutria de Río', rarity: 'legendario', icon: '🦦', bonus: '+30% Velocidad en agua', desc: 'Navegante acuática experta que recolecta plásticos en rápidos.', color: 0xa855f7 },
];
