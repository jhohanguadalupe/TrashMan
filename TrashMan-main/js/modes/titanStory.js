/* Illustrated, step-by-step prologue for the Titan boss encounter. */
window.TrashGame = window.TrashGame || {};

TrashGame.TitanStory = {
  page: 0,
  pages: [
    {
      kicker: 'PRÓLOGO · ÓRBITA TERRESTRE', title: 'La basura del espacio',
      image: 'assets/story/cosmic-impact.jpg', alt: 'La Tierra bajo una lluvia de residuos espaciales',
      text: 'Cuando la Tierra se quedó sin espacio para sus desechos, los gobiernos lanzaron toneladas de basura al espacio. Durante años, los satélites de desperdicios dieron vueltas alrededor del planeta, lejos de todos.'
    },
    {
      kicker: 'CAPÍTULO 01 · LA TORMENTA', title: 'Algo despertó entre las estrellas',
      image: 'assets/story/solar-storm.jpg', alt: 'Una tormenta solar alcanza los residuos que rodean la Tierra',
      text: 'Hasta que una tormenta solar los alcanzó. La radiación cubrió las bolsas, las latas y los restos de máquinas. La basura comenzó a retorcerse y a unirse: botellas con dientes, cables como tentáculos y montañas de metal que caminaban solas.'
    },
    {
      kicker: 'CAPÍTULO 02 · PLAYA CRISTALINA', title: 'La caída de los monstruos',
      image: 'assets/story/crystal-beach.jpg', alt: 'Restos espaciales y criaturas invaden Playa Cristalina',
      text: 'Los monstruos descendieron a la Tierra dentro de una lluvia de fuego y cayeron sobre la Playa Cristalina. Abraham y Sasha fueron los primeros en llegar. Con sus herramientas de limpieza, intentaron recoger los residuos, pero las bolsas mutantes se lanzaron contra ellos.'
    },
    {
      kicker: 'CAPÍTULO 03 · PRIMER CONTACTO', title: 'El secreto del núcleo',
      image: 'assets/story/titan-awakening.jpg', alt: 'Eco-Bot y los guardianes se enfrentan a un monstruo de chatarra',
      text: 'Entonces apareció Eco-Bot 3000. Escaneó a las criaturas y descubrió que cada monstruo tenía un núcleo radiactivo escondido en su interior. —¡No podemos dejar que lleguen a la ciudad! —gritó Sasha.'
    },
    {
      kicker: 'CAPÍTULO 04 · RÍO TURBIO', title: 'Una alianza inesperada',
      image: 'assets/story/murky-river.jpg', alt: 'El equipo rescata a una nutria de un monstruo en el río',
      text: 'El equipo siguió las huellas de basura hasta el Bosque Profundo y luego hasta el Río Turbio. Allí encontraron a Diego, que protegía a una nutria de una criatura hecha de redes y botellas. Juntos separaron sus piezas y extrajeron el núcleo. El monstruo se desarmó en residuos comunes.'
    },
    {
      kicker: 'CAPÍTULO 05 · CIUDAD VERTEDERO', title: 'El Titán del Vertedero',
      image: 'assets/story/titan-awakening.jpg', alt: 'El gigantesco Titán del Vertedero amenaza la ciudad',
      text: 'Pero los demás seguían creciendo. En Ciudad Vertedero, la basura del espacio se había unido para formar un gigante: el Titán del Vertedero. Cada golpe suyo levantaba nubes tóxicas y hacía que más desperdicios se pegaran a su cuerpo.'
    },
    {
      kicker: 'CAPÍTULO 06 · PLAN DE CONTENCIÓN', title: 'Abrir una brecha',
      image: 'assets/story/battle-for-the-core.jpg', alt: 'El equipo combate al Titán para exponer su núcleo radiactivo',
      text: 'Lucía encontró la solución: limpiar y separar las piezas del Titán para exponer su núcleo. Marcus lo distrajo mientras Kenji preparaba el cañón bioaspirador. Sasha y Diego guiaron a las criaturas pequeñas lejos de la ciudad. Abraham apuntó al pecho del gigante y activó la aspiradora. El remolino arrancó latas, cables y plásticos.'
    },
    {
      kicker: 'CAPÍTULO 07 · EL ÚLTIMO GOLPE', title: 'El núcleo queda al descubierto',
      image: 'assets/story/battle-for-the-core.jpg', alt: 'El núcleo rojo del Titán queda expuesto durante el combate',
      text: 'Bajo la última capa de chatarra apareció una esfera roja que palpitaba con radiación. Eco-Bot se lanzó sobre ella y la selló en una cápsula. El Titán cayó. Su cuerpo se deshizo por toda la plaza, pero esta vez la basura no volvió a mezclarse: el equipo la clasificó para reciclarla.'
    },
    {
      kicker: 'EPÍLOGO · LA VIGILANCIA CONTINÚA', title: 'Aún brillan luces rojas',
      image: 'assets/story/city-after-battle.jpg', alt: 'El equipo protege la ciudad y asegura el núcleo radiactivo',
      text: 'La cápsula radiactiva quedó bajo custodia y la ciudad pudo respirar de nuevo. Desde entonces, Trash Man y sus amigos vigilan el cielo. Porque, muy lejos, entre los satélites apagados, todavía brillan algunas luces rojas.'
    }
  ],

  open() {
    this.page = 0;
    const adventure = document.getElementById('modal-aventura');
    if (adventure) adventure.classList.add('hidden');
    const screen = document.getElementById('titan-story');
    if (!screen) return;
    screen.classList.remove('hidden');
    document.body.classList.add('titan-story-open');
    this.render();
    if (TrashGame.Sound) TrashGame.Sound.playClick();
  },

  render() {
    const data = this.pages[this.page];
    if (!data) return;
    const art = document.getElementById('titan-story-art');
    art.src = data.image;
    art.alt = data.alt;
    document.getElementById('titan-story-kicker').textContent = data.kicker;
    document.getElementById('titan-story-count').textContent = `${String(this.page + 1).padStart(2, '0')} / ${String(this.pages.length).padStart(2, '0')}`;
    document.getElementById('titan-story-title').textContent = data.title;
    document.getElementById('titan-story-text').textContent = data.text;
    const label = document.getElementById('titan-story-next-label');
    label.textContent = this.page === this.pages.length - 1 ? 'Comenzar combate' : 'Continuar';
    const button = document.getElementById('titan-story-next');
    button.setAttribute('aria-label', this.page === this.pages.length - 1 ? 'Comenzar combate contra el Titán' : 'Continuar la historia');
    const dots = document.getElementById('titan-story-dots');
    dots.replaceChildren(...this.pages.map((_, index) => {
      const dot = document.createElement('span');
      dot.className = `titan-story__dot${index === this.page ? ' is-current' : ''}${index < this.page ? ' is-read' : ''}`;
      dot.setAttribute('aria-hidden', 'true');
      return dot;
    }));
  },

  next() {
    if (this.page < this.pages.length - 1) {
      this.page += 1;
      this.render();
      if (TrashGame.Sound) TrashGame.Sound.playClick();
      return;
    }
    this.startBattle();
  },

  skip() { this.startBattle(); },

  startBattle() {
    const screen = document.getElementById('titan-story');
    if (screen) screen.classList.add('hidden');
    document.body.classList.remove('titan-story-open');
    TrashGame.Main.startSession('boss', 'golem');
  },

  close() {
    const screen = document.getElementById('titan-story');
    if (screen) screen.classList.add('hidden');
    document.body.classList.remove('titan-story-open');
    const adventure = document.getElementById('modal-aventura');
    if (adventure) adventure.classList.remove('hidden');
    if (TrashGame.Sound) TrashGame.Sound.playClick();
  }
};

window.addEventListener('keydown', (event) => {
  const story = document.getElementById('titan-story');
  if (!story || story.classList.contains('hidden')) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopImmediatePropagation();
    TrashGame.TitanStory.next();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    TrashGame.TitanStory.close();
  }
});
