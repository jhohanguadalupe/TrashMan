/* =========================================================================
   TRASH MAN 3D - MAPS & ENVIRONMENTS CONFIGURATION
   Vibrant Tropical Sky, Realistic Atmospheres & Precise Fog Distances
   ========================================================================= */

window.TrashGame = window.TrashGame || {};

TrashGame.MapsData = {
  playa: {
    id: 'playa',
    title: 'Playa Cristalina',
    subtitle: 'Nivel 1 • Costas Tropicales',
    icon: '🏖️',
    skyColor: 0x38bdf8,     // Bright Tropical Blue Sky
    fogColor: 0x7dd3fc,     // Horizon Sky Blend
    fogNear: 75,            // Starts far away so foreground is 100% crisp & vibrant
    fogFar: 260,
    hasSun: true,
    sunColor: 0xfff7ed,
    sunPosition: { x: 45, y: 55, z: -55 },
    ambientColor: 0xffedd5,
    ambientIntensity: 0.65,
    sunIntensity: 1.25,
    groundColor: 0xd99b45,
    recyclingStation: { x: -3.2, z: 7.5 },
    totalTrash: 25,
    rewardCoins: 350,
    rewardXp: 500,
    description: 'Costa tropical caribeña bajo un sol radiante, palmeras y mar turquesa cristalino.',
    ambientAudioType: 'ocean'
  },
  bosque: {
    id: 'bosque',
    title: 'Bosque Profundo',
    subtitle: 'Nivel 2 • Vegetación Frondosa',
    icon: '🌲',
    skyColor: 0x60a5fa,     // Daylight Sky through Canopy
    fogColor: 0x14532d,     // Deep Woodland Horizon
    fogNear: 60,
    fogFar: 240,
    hasSun: true,
    sunColor: 0xfef08a,
    sunPosition: { x: 30, y: 60, z: 20 },
    ambientColor: 0xdcfce7,
    ambientIntensity: 0.6,
    sunIntensity: 1.15,
    groundColor: 0x166534,
    recyclingStation: { x: 4.2, z: 6.5 },
    totalTrash: 30,
    rewardCoins: 500,
    rewardXp: 750,
    description: 'Suelo de tierra fértil y hierba viva con árboles milenarios bajo rayos de sol filtrados.',
    ambientAudioType: 'forest'
  },
  rio: {
    id: 'rio',
    title: 'Río Turbio',
    subtitle: 'Nivel 3 • Aguas Dulces',
    icon: '🌊',
    skyColor: 0x38bdf8,
    fogColor: 0x0284c7,
    fogNear: 65,
    fogFar: 250,
    hasSun: true,
    sunColor: 0xffedd5,
    sunPosition: { x: -40, y: 50, z: -40 },
    ambientColor: 0xe0f2fe,
    ambientIntensity: 0.6,
    sunIntensity: 1.2,
    groundColor: 0x475569,
    recyclingStation: { x: 14.5, z: 7.0 },
    playerSpawn: { x: 9.5, z: 0 },
    totalTrash: 35,
    rewardCoins: 750,
    rewardXp: 1000,
    description: 'Riberas pedregosas con cauce de agua en movimiento y juncos naturales.',
    ambientAudioType: 'river'
  },
  ciudad: {
    id: 'ciudad',
    title: 'Ciudad Vertedero',
    subtitle: 'Nivel 4 • Metrópolis Crepuscular',
    icon: '🏙️',
    skyColor: 0x090d16,     // Dark Twilight Sky
    fogColor: 0x090d16,
    fogNear: 60,
    fogFar: 240,
    hasSun: false,
    ambientColor: 0x1e293b,
    ambientIntensity: 0.5,
    sunIntensity: 0.8,
    groundColor: 0x0f172a,
    recyclingStation: { x: 4.0, z: 7.5 },
    totalTrash: 40,
    rewardCoins: 1200,
    rewardXp: 1500,
    description: 'Asfalto oscuro con charcos reflectantes, rascacielos con ventanas iluminadas y farolas.',
    ambientAudioType: 'city'
  },
  boss_arena: {
    id: 'boss_arena',
    title: 'Arena del Vertedero Colosal',
    subtitle: 'Combate de Jefes 3D',
    icon: '👹',
    skyColor: 0x150d24,     // Dark Storm Sky
    fogColor: 0x150d24,
    fogNear: 55,
    fogFar: 220,
    hasSun: false,
    ambientColor: 0x2e1065,
    ambientIntensity: 0.55,
    sunIntensity: 0.9,
    groundColor: 0x18181b,
    bossHp: 2500,
    rewardCoins: 1000,
    rewardXp: 2000,
    description: 'Cráter industrial rodeado de chatarra con cielo tormentoso y núcleo tóxico.',
    ambientAudioType: 'boss'
  }
};
