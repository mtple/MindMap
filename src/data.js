// Mind Map — static game data: realms, connections, enemies and dialogue.
// The realm layout mirrors the original Java text adventure: the Self sits at
// the centre, the Ego lies north-east (leading on to the Personal Subconscious)
// and the Shadow lies south-west (leading on to the Collective Unconscious).

export const REALMS = {
  self: {
    id: 'self',
    name: 'The Self',
    desc: 'You are in the Self. This is the sum total of your psyche.',
    center: [0, 0],
    radius: 16,
    color: 0xffc860,
    fog: 0x2b1f3d,
    fogDensity: 0.018,
    sky: 0x5a4380,
    ground: 0x6b4f1f,
    drone: 110,
  },
  ego: {
    id: 'ego',
    name: 'The Ego',
    desc: 'You are in the Ego, where your conscious awareness resides.',
    center: [45, -45],
    radius: 20,
    color: 0x9fd8ff,
    fog: 0xaec6dc,
    fogDensity: 0.014,
    sky: 0xe8f2ff,
    ground: 0x8899aa,
    drone: 164.8,
  },
  personal: {
    id: 'personal',
    name: 'The Personal Subconscious',
    desc: 'You are in the Personal Subconscious, where you store thoughts and experiences that you are not aware of.',
    center: [45, -122],
    radius: 24,
    color: 0xd28cff,
    fog: 0x3b2a5c,
    fogDensity: 0.03,
    sky: 0x8a5cc0,
    ground: 0x2a1640,
    drone: 130.8,
  },
  shadow: {
    id: 'shadow',
    name: 'The Shadow',
    desc: 'You are in the Shadow, which is made up of the traits you dislike in yourself.',
    center: [-45, 45],
    radius: 22,
    color: 0xff3a2a,
    fog: 0x140608,
    fogDensity: 0.034,
    sky: 0x501018,
    ground: 0x080203,
    drone: 73.4,
  },
  collective: {
    id: 'collective',
    name: 'The Collective Unconscious',
    desc: 'You are in the Collective Unconscious, the part of the psyche derived from ancestral memory and common to all humankind.',
    center: [-45, 128],
    radius: 32,
    color: 0x5fe0ff,
    fog: 0x050818,
    fogDensity: 0.01,
    sky: 0x2a3a80,
    ground: 0x050510,
    drone: 55,
  },
};

// Pairs of realms joined by a walkable bridge.
export const BRIDGES = [
  ['self', 'ego'],
  ['ego', 'personal'],
  ['self', 'shadow'],
  ['shadow', 'collective'],
];
export const BRIDGE_HALF_WIDTH = 3;

// Complexes: autonomous clusters of feeling that roam the unconscious. They are
// never killed. Insight integrates them, and the psyche keeps producing more.
export const ENEMY_TYPES = {
  memory: {
    name: 'Repressed Memory', hp: 34, speed: 3.6, damage: 8, xp: 18,
    radius: 0.7, height: 1.4, aggro: 16, attackCd: 1.2, color: 0xc77dff,
  },
  wisp: {
    name: 'Shadow Wisp', hp: 50, speed: 5.2, damage: 12, xp: 28,
    radius: 0.7, height: 1.2, aggro: 18, attackCd: 1.1, color: 0xff2222,
  },
  complex: {
    name: 'Archaic Complex', hp: 95, speed: 3.4, damage: 16, xp: 48,
    radius: 1.0, height: 1.8, aggro: 24, attackCd: 1.4, color: 0xffa040,
    ranged: { cd: 2.6, speed: 17, damage: 13, range: 22 },
  },
  // Your Shadow cannot be beaten by force. Every attack only feeds it.
  shadowBoss: {
    name: 'Your Shadow', hp: 1, speed: 4.6, damage: 18, xp: 0,
    radius: 1.4, height: 3.6, aggro: 30, attackCd: 1.3, color: 0xff1a1a,
    ranged: { cd: 2.4, speed: 15, damage: 12, range: 30, volley: 5 },
  },
};

// Conversations: each figure cycles through its talks, one per visit.
export const TALKS = {
  philemon: [
    [
      ['Philemon', 'Ah, you are dreaming again. Welcome to your own psyche, traveller.'],
      ['Philemon', 'I am Philemon. Jung met me in his own active imagination, an old man with the horns of a bull and the wings of a kingfisher. Here I keep the centre.'],
      ['Philemon', 'There is nothing here to win. The psyche is not a puzzle to be solved. It is a landscape to be lived in.'],
      ['Philemon', 'North-east lie the Ego and, beyond it, the Personal Subconscious. South-west lie the Shadow and the deep Collective Unconscious.'],
      ['Philemon', 'Write down what you find in your Red Book (press J). Cast Insight with a click, and press F for Radiance when the complexes crowd you.'],
      ['Philemon', 'And if you are overwhelmed, do not fear. You will only wake here, at the centre, as dreamers always do.'],
    ],
    [
      ['Philemon', 'You think your thoughts belong to you. But thoughts are like animals in a forest, or people in a room. They come and go as they please.'],
    ],
    [
      ['Philemon', 'The Self is not something you reach. It is something you circle around, again and again, the way a mandala circles its centre.'],
    ],
    [
      ['Philemon', 'Do not be so quick to banish what frightens you. A complex that you understand stops having power over you.'],
    ],
    [
      ['Philemon', 'Look for coincidences that mean something. When the outer world answers the inner one, Jung called it synchronicity. Watch for the golden beetle.'],
    ],
  ],
  persona: [
    [
      ['The Persona', 'Hello, hello! Have you come to admire me? Everyone does. I am the face you show the world.'],
      ['The Persona', 'The mirrors around this hall show you exactly as other people would like to see you. Lovely, aren\'t they?'],
      ['The Persona', 'Of course, you could break them. But then who would you be?'],
    ],
    [
      ['The Persona', 'A mask is not a lie, darling. It is a compromise between who you are and what the world expects of you.'],
    ],
    [
      ['The Persona', 'The danger is not in wearing me. The danger is forgetting that I come off.'],
    ],
  ],
  anima: [
    [
      ['The Anima', 'You have come so far down. Few people ever wander into these violet halls.'],
      ['The Anima', 'I am the soul-image, the other within you. Jung saw me as a woman in a man\'s psyche and as a man, the Animus, in a woman\'s. Here I am simply your guide inward.'],
      ['The Anima', 'Memories drift through this place. Gather them if you like. Some of them may ache.'],
    ],
    [
      ['The Anima', 'Every face you have fallen in love with was partly mine. You were never only looking at them.'],
    ],
    [
      ['The Anima', 'Moods are my weather. When a feeling seizes you from nowhere, I was probably passing by.'],
    ],
  ],
  shadowMeet: [
    ['Your Shadow', 'So. You finally came down here.'],
    ['Your Shadow', 'I am the anger you swallowed, the envy you denied, the strength you were too afraid to use.'],
    ['Your Shadow', 'Strike me if you like. Everything you push away only makes me larger.'],
  ],
  shadowAngry: [
    ['Your Shadow', 'You see? Violence is just another way of running from me.'],
  ],
  shadowEmbrace: [
    ['You', 'I will not fight you any more. You are part of me.'],
    ['Your Shadow', '...No one has ever said that to me.'],
    ['Your Shadow', 'Then I will walk beside you, not behind you. Wherever you go in this psyche, I will go too.'],
  ],
  shadowCompanion: [
    [['Your Shadow', 'The light looks different when I am standing next to you, doesn\'t it?']],
    [['Your Shadow', 'That irritation you felt back there? That was mine. Ours. Notice it next time.']],
    [['Your Shadow', 'Do you know what people hate most in others? Whatever they cannot see in themselves.']],
  ],
};

export const ARCHETYPES = {
  mother: { name: 'The Great Mother', symbol: '☾', color: '#9fffcf',
    line: 'I am the womb and the grave, the nourishing earth and the devouring sea. Every child of humankind remembers me.' },
  hero: { name: 'The Hero', symbol: '⚔', color: '#ffd27a',
    line: 'I am the one who leaves home, descends into the darkness and returns changed. Every myth tells my story again.' },
  trickster: { name: 'The Trickster', symbol: '☿', color: '#ff9fe0',
    line: 'Ha! I turn order into chaos so that something new can be born. Watch your step. The floor may not be where you left it.' },
  child: { name: 'The Divine Child', symbol: '✦', color: '#9fd8ff',
    line: 'I am what has not happened yet, the future self waiting to be born. I am small, and I am the beginning of everything.' },
};

// Dream symbols scattered across the realms. Each one adds a page to the Red Book.
export const SYMBOLS = [
  { id: 'sun', realm: 'ego', at: [0.55, 2.2], glyph: '☉', color: 0xffe066, title: 'Sol, the Sun',
    text: 'In alchemy the sun is consciousness: clear, masculine, ordering. It lights up everything except what stands directly behind it.' },
  { id: 'key', realm: 'personal', at: [0.7, 4.0], glyph: '⚿', color: 0xff9fe0, title: 'The Key',
    text: 'A key in a dream points to a door you have locked yourself. What waits behind it is usually a part of you that you once had to hide.' },
  { id: 'serpent', realm: 'shadow', at: [0.6, 0.8], glyph: '§', color: 0x80ff80, title: 'The Serpent',
    text: 'The snake is the oldest image of instinct: cold, wise and dangerous. It sheds its skin, and in the same way the psyche renews itself by letting go of old forms.' },
  { id: 'ouroboros', realm: 'collective', at: [0.75, 5.3], glyph: '◯', color: 0x5fe0ff, title: 'Ouroboros',
    text: 'The serpent that eats its own tail. Beginning and end are one, and the psyche feeds on itself to stay whole. Jung found it in alchemy, in Gnostic texts and in his patients\' drawings.' },
  { id: 'stone', realm: 'self', at: [0.75, 3.9], glyph: '◆', color: 0xffc860, title: 'The Philosopher\'s Stone',
    text: 'The alchemists searched their whole lives for the lapis, the stone that turns lead into gold. Jung realised that what they were really seeking was the Self.' },
  { id: 'tree', realm: 'collective', at: [0.45, 2.0], glyph: '♣', color: 0x9fffcf, title: 'The World Tree',
    text: 'Roots in the underworld, branches in heaven. The tree grows slowly and without effort, which is how Jung pictured individuation.' },
];

export const MEMORIES = [
  { title: 'A Buried Memory: The Garden', text: 'Afternoon light through leaves. Someone calling your name from the house. You did not answer. You never told anyone why.' },
  { title: 'A Buried Memory: The Mirror', text: 'You practised a smile in the bathroom mirror until it looked like the one everyone else wore. You were seven.' },
  { title: 'A Buried Memory: The Argument', text: 'Raised voices behind a closed door. You turned the music up and decided, quietly, that you would never be angry like that.' },
  { title: 'A Buried Memory: The Drawing', text: 'You drew a circle with a dot in the middle over and over, in the margins of every notebook. You did not know why it comforted you.' },
];

// Pages of the Red Book that come from places and encounters rather than objects.
export const PAGES = {
  self: { title: 'The Self', text: 'The sum total of the psyche, conscious and unconscious together. Both its centre and its circumference. Here the mandala turns in gold.' },
  ego: { title: 'The Ego', text: 'Where conscious awareness lives. Bright, orderly and proud, and only a small island on a very large sea.' },
  personal: { title: 'The Personal Subconscious', text: 'Where you keep the thoughts and experiences you are not aware of: forgotten, repressed or simply not yet noticed.' },
  shadow: { title: 'The Shadow', text: 'Everything you would rather not be. It is not evil. It is only unlit. Jung wrote that one does not become enlightened by imagining figures of light, but by making the darkness conscious.' },
  collective: { title: 'The Collective Unconscious', text: 'Deeper than any personal memory lies an inheritance shared by all humankind: the archetypes, the primordial images that shape every myth and every dream.' },
  philemon: { title: 'Philemon', text: 'The Wise Old Man. A figure of superior insight who appears when the ego cannot find its way alone.' },
  persona: { title: 'The Persona', text: 'The mask of social adaptation. It is needed, but dangerous when you mistake it for your face.' },
  mirrors: { title: 'Shattered Reflections', text: 'Every mirror in the hall lies broken. Underneath the reflection there was only glass, and behind the glass, you.' },
  anima: { title: 'The Anima / Animus', text: 'The contrasexual soul-image, the bridge between the ego and the unconscious. You meet it in moods, in projections and in love.' },
  shadowMet: { title: 'Meeting the Shadow', text: 'It looked exactly like you, only darker, and it smiled as if it knew something you did not.' },
  shadowEmbraced: { title: 'The Shadow Integrated', text: 'You did not defeat it. You recognised it. Now it walks with you, and somehow the world seems less full of enemies.' },
  scarab: { title: 'Synchronicity: The Golden Scarab', text: 'A patient was describing a dream about a golden scarab when a beetle tapped against Jung\'s window. He caught it and handed it to her. Meaningful coincidence: the inner world and the outer world rhyming.' },
  mandala: { title: 'The Mandala', text: 'Jung drew a small mandala every morning, and each one showed him the state of his psyche that day. The centre is always the same, and the circle around it is always different.' },
  complex: { title: 'Integration', text: 'A complex is a knot of emotion with a will of its own. Seen clearly, it loosens into energy you can use.' },
  waking: { title: 'Waking', text: 'You were overwhelmed and woke at the centre. Dreams are rarely gentle, but they are always trying to tell you something.' },
};

// Original exit message from the Java version, shown on the pause screen.
export const QUIT_MESSAGE =
  'You have exited the simulation of Jung\'s model of the psyche, but you are trapped within your own consciousness for eternity.';
