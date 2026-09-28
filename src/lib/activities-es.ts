/** Castilian Spanish (es-ES) copy for the activity catalog. English stays the fallback. */

export type ActivityCopy = {
  title: string;
  description: string;
  materials: string[];
  steps: string[];
};

export const esActivityCopy: Record<string, ActivityCopy> = {
  "sensory-rice-bin": {
    title: "Bandeja sensorial de arroz",
    description: "Una actividad sensorial tranquila con arroz de colores para explorar texturas.",
    materials: ["Arroz seco", "Colorante alimentario", "Bandeja poco profunda", "Cucharones y vasos"],
    steps: [
      "Tiñe el arroz con unas gotas de colorante y déjalo secar.",
      "Viértelo en una bandeja poco profunda y añade cucharones y vasitos.",
      "Siéntate al lado de tu hijo o hija y nombra las texturas que notáis.",
    ],
  },
  "tape-rescue": {
    title: "Rescate con cinta",
    description: "Actividad de motricidad fina: despegar cinta de los juguetes.",
    materials: ["Cinta de carrocero", "Juguetes pequeños favoritos"],
    steps: [
      "Pega unos juguetes a una mesa o bandeja con cinta.",
      "Invita a tu hijo o hija a liberarlos despegando la cinta.",
      "Celebra cada rescate con un choque de manos.",
    ],
  },
  "mirror-emotions": {
    title: "Emociones en el espejo",
    description: "Aprender a reconocer y copiar expresiones de la cara.",
    materials: ["Un espejo"],
    steps: [
      "Sentaos juntos delante de un espejo.",
      "Pon una cara y di en voz alta qué emoción es.",
      "Turnaos para copiar las expresiones del otro.",
    ],
  },
  "deep-pressure-sandwich": {
    title: "Sándwich de presión profunda",
    description: "Presión profunda con cojines para ayudar a regularse.",
    materials: ["Dos cojines grandes"],
    steps: [
      "Pide a tu hijo o hija que se tumbe entre dos cojines.",
      "Presiona con suavidad y de forma uniforme, preguntando cómo va.",
      "Para en cuanto lo pida y contad juntos los apretones.",
    ],
  },
  "story-time-props": {
    title: "Cuento con objetos",
    description: "Usar objetos para dar vida a un cuento.",
    materials: ["Libro ilustrado", "Juguetes u objetos de casa que encajen"],
    steps: [
      "Elige un cuento corto y conocido.",
      "Da a tu hijo o hija un objeto por cada personaje.",
      "Haz una pausa y deja que diga la frase siguiente.",
    ],
  },
  "rhyming-match": {
    title: "Parejas que riman",
    description: "Juego para notar sonidos parecidos al final de las palabras.",
    materials: ["Tarjetas con dibujos"],
    steps: [
      "Coloca seis tarjetas en tres parejas que rimen.",
      "Di cada palabra despacio y alarga el sonido final.",
      "Deja que empareje las que suenan igual.",
    ],
  },
  "puppet-conversation": {
    title: "Conversación con marioneta",
    description: "Animar a hablar a través de un muñeco.",
    materials: ["Marioneta de calcetín o peluche"],
    steps: [
      "Presenta la marioneta con una voz divertida.",
      "Que la marioneta haga preguntas sencillas.",
      "Deja que tu hijo o hija conteste a la marioneta, no a ti.",
    ],
  },
  "interactive-bubble-chase": {
    title: "Perseguir pompas",
    description: "Atención compartida y turnos con pompas de jabón.",
    materials: ["Mezcla de pompas", "Varita"],
    steps: [
      "Sopla unas pompas y espera el contacto visual.",
      "Para hasta que tu hijo o hija pida más.",
      "Cambiad el turno y deja que intente soplar.",
    ],
  },
  "shadow-puppets": {
    title: "Sombras chinescas",
    description: "Explorar luz y sombra para imaginar.",
    materials: ["Linterna", "Pared lisa"],
    steps: [
      "Baja la luz y apunta la linterna a la pared.",
      "Haced formas de animales y adivinad la sombra del otro.",
      "Inventad un cuento corto con dos personajes de sombra.",
    ],
  },
  "zip-loc-bag-painting": {
    title: "Pintura en bolsa",
    description: "Pintura sensorial sin manchar.",
    materials: ["Bolsa con cierre", "Dos colores de pintura", "Cinta"],
    steps: [
      "Echa pintura en la bolsa y ciérrala bien.",
      "Pégala a una ventana o a la mesa.",
      "Deja que aplaste y mezcle los colores.",
    ],
  },
  "color-matching-hunt": {
    title: "Búsqueda de colores",
    description: "Buscar por casa objetos que coincidan con una tarjeta de color.",
    materials: ["Cuadrados de papel de colores", "Cesta"],
    steps: [
      "Da una sola tarjeta de color cada vez.",
      "Buscad por la habitación objetos de ese color.",
      "Al final, agrupad lo encontrado por colores.",
    ],
  },
  "calming-glitter-bottle": {
    title: "Botella de purpurina para calmarse",
    description: "Una herramienta de regulación que tu hijo o hija ayuda a preparar.",
    materials: ["Botella transparente", "Agua templada", "Cola con purpurina", "Purpurina"],
    steps: [
      "Llena la botella con agua templada y cola con purpurina.",
      "Añade purpurina, cierra el tapón y agita.",
      "Úsala como reloj de arena para respirar con calma.",
    ],
  },
  "obstacle-course": {
    title: "Circuito en el salón",
    description: "Planificación motora gruesa con cojines y túneles.",
    materials: ["Cojines", "Manta", "Cinta de carrocero"],
    steps: [
      "Monta tres estaciones: gatear, saltar y equilibrarse.",
      "Recorred el circuito juntos, despacio, una vez.",
      "Cronometrad cada vuelta y celebrad la llegada.",
    ],
  },
  "dressing-race": {
    title: "Carrera de vestirse",
    description: "Practicar vestirse solo, de forma jugada.",
    materials: ["Ropa holgada", "Temporizador"],
    steps: [
      "Deja una prenda fácil cada vez.",
      "Pon un temporizador suave y anímale.",
      "Terminad mirándoos juntos en el espejo.",
    ],
  },
  "turn-taking-tower": {
    title: "Torre por turnos",
    description: "Construir una torre de bloques, un turno cada uno.",
    materials: ["Bloques de madera"],
    steps: [
      "Di «mi turno» y coloca un bloque.",
      "Di «tu turno» y espera con calma.",
      "Tirad la torre juntos como premio.",
    ],
  },
  "stringing-beads": {
    title: "Ensartar cuentas",
    description: "Pasar cuentas por un cordón para la motricidad fina.",
    materials: ["Cuentas grandes", "Cordón de zapato o limpiapipas"],
    steps: [
      "Sujeta el cordón para que no se mueva.",
      "Enseña a empujar la cuenta a lo largo del cordón.",
      "Al terminar, haced una pulsera o un collar.",
    ],
  },
  "playdough-pinch": {
    title: "Pellizcar plastilina",
    description: "Fortalecer los dedos pellizcando y haciendo bolitas.",
    materials: ["Plastilina", "Cortadores de galletas"],
    steps: [
      "Haz bolitas con la plastilina.",
      "Pellizca cada bolita entre el pulgar y el índice.",
      "Aplástala con un cortador y nombra la forma.",
    ],
  },
  "clothespin-drop": {
    title: "Pinzas y pompones",
    description: "Apretar pinzas para soltar pompones en un bote.",
    materials: ["Pinzas de la ropa", "Pompones", "Bote o vaso"],
    steps: [
      "Pon los pompones en un plato poco hondo.",
      "Usa una pinza para coger cada uno.",
      "Suéltalos en el bote y contad juntos.",
    ],
  },
  "scooping-and-pouring": {
    title: "Coger y verter",
    description: "Pasar agua o arroz de un recipiente a otro.",
    materials: ["Dos cuencos", "Cucharón o vaso", "Agua o arroz"],
    steps: [
      "Llena un cuenco de agua o de arroz.",
      "Coge del cuenco lleno y pásalo al vacío.",
      "Vierte despacio y para cuando llegue arriba.",
    ],
  },
  "threading-pasta": {
    title: "Ensartar pasta",
    description: "Pasar tubos de pasta por un cordón para coordinar mano y vista.",
    materials: ["Pasta en tubo", "Cordón", "Cinta en el extremo"],
    steps: [
      "Pon cinta en un extremo del cordón para que quede rígido.",
      "Enseña a empujar la pasta por el cordón.",
      "Cuelga la tira terminada como adorno.",
    ],
  },
  "sticker-peel": {
    title: "Despegar y pegar gomets",
    description: "Quitar y colocar gomets con precisión fina.",
    materials: ["Gomets", "Papel con formas dibujadas"],
    steps: [
      "Levanta un poco el borde de cada gomet.",
      "Pega uno dentro de cada forma dibujada.",
      "Contad cuántos gomets habéis usado.",
    ],
  },
  "cutting-practice": {
    title: "Tiras para recortar",
    description: "Práctica segura de tijeras con tiras de papel grueso.",
    materials: ["Tijeras infantiles", "Tiras de papel grueso", "Bandeja"],
    steps: [
      "Dibuja líneas rectas en las tiras.",
      "Sujeta el papel con una mano y corta con la otra.",
      "Deja los recortes en una bandeja.",
    ],
  },
  "balance-beam": {
    title: "Caminar sobre la línea",
    description: "Andar por una línea baja o de cinta para practicar el equilibrio.",
    materials: ["Cinta de carrocero", "Espacio en el suelo"],
    steps: [
      "Marca una línea recta en el suelo con cinta.",
      "Camina talón con punta a lo largo de la línea.",
      "Abre los brazos o lleva un juguete pequeño.",
    ],
  },
  "animal-walks": {
    title: "Caminar como animales",
    description: "Moverse como animales para el tronco y la coordinación.",
    materials: ["Suelo despejado"],
    steps: [
      "Anda como un oso, con manos y pies.",
      "Anda como un cangrejo, con la tripa hacia arriba.",
      "Salta como una rana por la habitación.",
    ],
  },
  "bean-bag-toss": {
    title: "Lanzar saquitos",
    description: "Apuntar y lanzar a un objetivo.",
    materials: ["Saquitos o calcetines enrollados", "Caja o cubo"],
    steps: [
      "Coloca el objetivo a unos pasos.",
      "Lanza por debajo y mira dónde cae.",
      "Acerca o aleja el objetivo.",
    ],
  },
  "jumping-jacks": {
    title: "Saltos de tijera contando",
    description: "Contar mientras se hacen saltos de tijera, con ritmo y conciencia del cuerpo.",
    materials: ["Espacio libre"],
    steps: [
      "Empieza con los brazos pegados al cuerpo.",
      "Salta abriendo brazos y piernas mientras cuentas.",
      "Intentad llegar a diez juntos.",
    ],
  },
  "simon-says": {
    title: "Simón dice",
    description: "Seguir órdenes de movimiento para escuchar y controlarse.",
    materials: ["Espacio libre"],
    steps: [
      "Di «Simón dice: tócatelos dedos de los pies».",
      "Añade alguna orden sin el «Simón dice».",
      "Cambiad el turno para que dirija tu hijo o hija.",
    ],
  },
  "yoga-poses": {
    title: "Posturas de yoga para niños",
    description: "Posturas sencillas para estirar y calmar el cuerpo.",
    materials: ["Esterilla o toalla", "Espacio libre"],
    steps: [
      "Prueba la postura del árbol, con un pie en el otro tobillo.",
      "Mantén el perro boca abajo contando despacio hasta cinco.",
      "Termina en postura del niño, con respiraciones profundas.",
    ],
  },
  "tweezer-transfer": {
    title: "Pasar con pinzas",
    description: "Mover objetos pequeños con pinzas para la fuerza de pinza.",
    materials: ["Pinzas", "Pompones pequeños", "Molde de magdalenas"],
    steps: [
      "Pon un pompón en cada hueco del molde.",
      "Usa las pinzas para pasarlos al otro lado.",
      "Si hay varios colores, clasifícalos.",
    ],
  },
  "rolling-tunnel": {
    title: "Túnel para gatear",
    description: "Gatear por un túnel hecho con sillas y una manta.",
    materials: ["Dos sillas", "Una manta"],
    steps: [
      "Coloca la manta sobre las sillas para hacer un túnel.",
      "Gatea de un lado al otro.",
      "Deja un juguete al final como premio.",
    ],
  },
  "hopscotch": {
    title: "Rayuela",
    description: "Saltar y equilibrarse en una cuadrícula numerada.",
    materials: ["Tiza", "Patio o cinta en el suelo"],
    steps: [
      "Dibuja una cuadrícula del 1 al 10.",
      "Salta a la pata coja en las casillas simples.",
      "Cae con los dos pies en las casillas dobles.",
    ],
  },
  "stacking-cups": {
    title: "Apilar vasos",
    description: "Apilar y encajar vasos para controlar la mano.",
    materials: ["Vasos de plástico"],
    steps: [
      "Apila los vasos en una torre.",
      "Tíralos con cuidado.",
      "Vuelve a encajarlos unos dentro de otros.",
    ],
  },
  "hole-punch": {
    title: "Perforar papel",
    description: "Hacer agujeros en papel para fortalecer la mano.",
    materials: ["Perforadora de un agujero", "Papel", "Bandeja"],
    steps: [
      "Dibuja puntos en el papel como dianas.",
      "Perfora un agujero en cada punto.",
      "Recoge los circulitos en una bandeja.",
    ],
  },
  "target-throwing": {
    title: "Lanzar a la diana",
    description: "Lanzar pelotas blandas a un objetivo para practicar la puntería.",
    materials: ["Pelotas blandas", "Diana o aro"],
    steps: [
      "Coloca el objetivo en el suelo.",
      "Ponte detrás de una línea y lanza por debajo.",
      "Aleja la línea después de cada ronda.",
    ],
  },
  "dancing-freeze": {
    title: "Baile y estatua",
    description: "Moverse con música y quedarse quieto cuando para.",
    materials: ["Reproductor de música"],
    steps: [
      "Pon música y bailad juntos.",
      "Para la música de golpe.",
      "Quedaos en la postura más divertida que podáis aguantar.",
    ],
  },
  "textured-walk": {
    title: "Camino de texturas",
    description: "Andar descalzo sobre superficies distintas.",
    materials: ["Toalla", "Plástico de burbujas", "Alfombra", "Esterilla de espuma"],
    steps: [
      "Prepara un camino con texturas distintas.",
      "Andad despacio y describid cada sensación.",
      "Deja que tu hijo o hija elija la textura siguiente.",
    ],
  },
  "scented-playdough": {
    title: "Plastilina con olor",
    description: "Oler y apretar masa con aromas que calman.",
    materials: ["Plastilina", "Esencia de vainilla o cítricos"],
    steps: [
      "Añade una gota de esencia a la masa.",
      "Cerrad los ojos y adivinad el olor.",
      "Amasad y apretad mientras respiráis despacio.",
    ],
  },
  "water-pouring": {
    title: "Estación de verter agua",
    description: "Verter agua entre jarras para un juego calmado y atento.",
    materials: ["Jarritas", "Agua", "Colorante alimentario", "Bandeja"],
    steps: [
      "Echa agua de color en una jarra.",
      "Viértela con cuidado en la otra.",
      "Para antes de que se derrame y comparad los niveles.",
    ],
  },
  "sensory-bottle": {
    title: "Botella sensorial",
    description: "Ver cómo se mueven despacio los objetos dentro de una botella cerrada.",
    materials: ["Botella", "Agua", "Cuentas pequeñas", "Purpurina"],
    steps: [
      "Llena la botella de agua y objetos pequeños.",
      "Cierra el tapón con cinta, bien fuerte.",
      "Inclínala y agítala, y mira cómo se asienta todo.",
    ],
  },
  "kinetic-sand": {
    title: "Arena cinética",
    description: "Apretar y dar forma a arena moldeable.",
    materials: ["Arena cinética", "Moldes pequeños", "Bandeja"],
    steps: [
      "Vierte la arena en una bandeja poco honda.",
      "Presiónala en los moldes y levántalos despacio.",
      "Aprieta puñados y deja que caiga entre los dedos.",
    ],
  },
  "noise-shakers": {
    title: "Maracas caseras",
    description: "Hacer sonajeros y explorar sonidos fuertes y suaves.",
    materials: ["Botes pequeños", "Arroz", "Alubias", "Cuentas"],
    steps: [
      "Llena dos botes con rellenos distintos.",
      "Agita cada uno y comparad el sonido.",
      "Haced juntos un patrón fuerte-suave.",
    ],
  },
  "sound-matching": {
    title: "Emparejar sonidos",
    description: "Emparejar botes ocultos que suenan igual.",
    materials: ["Botes pequeños cerrados", "Arroz", "Alubias", "Monedas"],
    steps: [
      "Prepara parejas de botes que suenen igual.",
      "Agita uno y escucha con atención.",
      "Encuentra el bote que suena igual.",
    ],
  },
  "labeling-hunt": {
    title: "Búsqueda de nombres",
    description: "Encontrar y nombrar objetos de la habitación.",
    materials: ["Tarjetas con dibujos o etiquetas"],
    steps: [
      "Muestra una tarjeta o una etiqueta.",
      "Buscad por la habitación el objeto que coincide.",
      "Decid el nombre juntos cuando lo encontréis.",
    ],
  },
  "copycat-words": {
    title: "Palabras de eco",
    description: "Repetir cadenas de sonidos para imitar el habla.",
    materials: ["No hace falta material"],
    steps: [
      "Di una palabra sencilla, como «pop».",
      "Pide a tu hijo o hija que te copie.",
      "Haced una cadena de tres palabras y turnaos.",
    ],
  },
  "story-sequencing": {
    title: "Ordenar el cuento",
    description: "Ordenar tarjetas para volver a contar un cuento conocido.",
    materials: ["Tarjetas del cuento"],
    steps: [
      "Leed primero el cuento.",
      "Mezclad las tarjetas y extendedlas.",
      "Ponedlas en orden y volved a contar el cuento.",
    ],
  },
  "matching-pairs": {
    title: "Parejas iguales",
    description: "Juego de memoria: dar la vuelta a las cartas para encontrar dibujos iguales.",
    materials: ["Tarjetas con dibujos"],
    steps: [
      "Baraja y coloca las cartas boca abajo.",
      "Da la vuelta a dos cartas cada vez.",
      "Quédate la pareja si coinciden.",
    ],
  },
  "pattern-building": {
    title: "Seguir un patrón",
    description: "Continuar patrones de color o forma con bloques.",
    materials: ["Bloques o cuentas de colores"],
    steps: [
      "Empieza un patrón sencillo: rojo, azul, rojo, azul.",
      "Pregunta qué viene después.",
      "Deja que tu hijo o hija invente su propio patrón.",
    ],
  },
  "memory-cards": {
    title: "Juego de memoria",
    description: "Recordar dónde están las cartas para encontrar parejas.",
    materials: ["Juego de cartas de memoria"],
    steps: [
      "Coloca las cartas boca abajo en una cuadrícula.",
      "Da la vuelta a dos cartas en cada turno.",
      "Gana quien junte más parejas.",
    ],
  },
  "sorting-size": {
    title: "Ordenar por tamaño",
    description: "Ordenar objetos del más pequeño al más grande.",
    materials: ["Tres objetos parecidos de distinto tamaño"],
    steps: [
      "Mezcla los objetos.",
      "Encuentra el más pequeño y ponlo el primero.",
      "Alineadlos de pequeño a grande.",
    ],
  },
  "pass-the-ball": {
    title: "Pasar la pelota",
    description: "Rodar una pelota de ida y vuelta para compartir el espacio.",
    materials: ["Pelota blanda"],
    steps: [
      "Sentaos uno frente al otro.",
      "Rueda la pelota y di «tu turno».",
      "Espera a que vuelva antes de lanzarla otra vez.",
    ],
  },
  "greeting-circle": {
    title: "Círculo de saludos",
    description: "Practicar el hola y la mirada en un círculo.",
    materials: ["Espacio en el suelo"],
    steps: [
      "Sentaos en círculo, mirándoos.",
      "Saluda con la mano a quien tienes al lado.",
      "Añade un choque de manos o di su nombre.",
    ],
  },
  "sharing-basket": {
    title: "Cesta para compartir",
    description: "Turnarse para elegir cosas de una cesta común.",
    materials: ["Cesta", "Juguetes pequeños"],
    steps: [
      "Pon unos juguetes en la cesta.",
      "Turnaos para elegir uno.",
      "Di gracias cuando te toque el turno.",
    ],
  },
  "button-frame": {
    title: "Marco de botones",
    description: "Pasar botones por ojales de tela para vestirse.",
    materials: ["Camisa vieja o tela", "Botones grandes", "Aguja e hilo"],
    steps: [
      "Cose los botones en un lado de la tela.",
      "Haz ojales en el otro lado.",
      "Practica a pasar cada botón por su ojal.",
    ],
  },
  "shoe-lacing": {
    title: "Practicar los cordones",
    description: "Pasar cordones por un zapato o una tarjeta de práctica.",
    materials: ["Zapato o tarjeta de cartón", "Cordón"],
    steps: [
      "Pasa el cordón hacia arriba por cada agujero.",
      "Cruza los cordones y tira.",
      "Haz dos lazadas y crúzalas para un lazo.",
    ],
  },
  "setting-table": {
    title: "Poner la mesa",
    description: "Colocar plato y cubiertos en su sitio.",
    materials: ["Plato", "Vaso", "Tenedor", "Cuchara"],
    steps: [
      "Pon el plato en el centro.",
      "El tenedor a la izquierda y la cuchara a la derecha.",
      "Coloca el vaso encima del plato.",
    ],
  },
  "hand-washing": {
    title: "Pasos para lavarse las manos",
    description: "Seguir una rutina de lavado de manos, paso a paso.",
    materials: ["Lavabo", "Jabón", "Toalla"],
    steps: [
      "Mójate las manos y añade jabón.",
      "Frota palmas, dorsos y entre los dedos mientras cuentas.",
      "Aclara y sécate con la toalla.",
    ],
  },
  "finger-paint": {
    title: "Pintura de dedos",
    description: "Hacer marcas con los dedos para explorar color y movimiento.",
    materials: ["Pintura de dedos lavable", "Papel", "Toallitas"],
    steps: [
      "Mete un dedo en la pintura.",
      "Haz puntos, líneas y círculos en el papel.",
      "Nombrad juntos los colores y las formas.",
    ],
  },
  "brushing-hair": {
    title: "Practicar el cepillado",
    description: "Cepillar a un muñeco o el propio pelo con pasadas suaves.",
    materials: ["Cepillo", "Muñeco o espejo"],
    steps: [
      "Empieza por las puntas y sujeta el pelo por encima de los nudos.",
      "Cepilla con suavidad de abajo hacia arriba.",
      "Miraos al espejo y practicad una sonrisa.",
    ],
  },
  "balloon-tap": {
    title: "Tocar el globo",
    description: "Mantener un globo en el aire con toques suaves.",
    materials: ["Globo"],
    steps: [
      "Infla un globo y suéltalo con suavidad.",
      "Usa las manos para empujarlo hacia arriba antes de que caiga.",
      "Contad cuántos toques conseguís juntos.",
    ],
  },
  "face-parts-game": {
    title: "Partes de la cara",
    description: "Colocar los rasgos en una cara en blanco.",
    materials: ["Contorno de cara en papel", "Gomets o recortes de ojos, nariz y boca"],
    steps: [
      "Señala dónde van los ojos, la nariz y la boca.",
      "Pega los rasgos en la cara.",
      "Nombra cada parte y poned la misma cara.",
    ],
  },
  "puzzle-time": {
    title: "Hora del puzle",
    description: "Completar puzles sencillos para resolver problemas.",
    materials: ["Puzle adecuado a la edad"],
    steps: [
      "Pon todas las piezas con el dibujo hacia arriba.",
      "Busca primero las esquinas y los bordes.",
      "Une colores y formas para rellenar el centro.",
    ],
  },
  "emotional-cards": {
    title: "Tarjetas de emociones",
    description: "Relacionar palabras de emoción con expresiones de la cara.",
    materials: ["Tarjetas de emociones", "Espejo"],
    steps: [
      "Muestra una tarjeta y lee la emoción.",
      "Pon esa cara en el espejo.",
      "Hablad de un momento en el que os sentisteis así.",
    ],
  },
};
