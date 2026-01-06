// ============================================
// COMPREHENSIVE CATEGORIZATION DATABASES
// ============================================
// This file contains extensive databases for automatic keyword categorization
// Used by smartCategorize in utils.js

(function() {

// ====================
// BRANDS DATABASE
// ====================

const BRAND_DATABASE = {
  // Furniture Brands (100+ brands)
  'furniture': [
    'kartell', 'cassina', 'b&b italia', 'vitra', 'herman miller', 'knoll', 'fritz hansen',
    'hay', 'muuto', 'artek', 'thonet', 'poltrona frau', 'zanotta', 'moroso', 'cappellini',
    'minotti', 'flexform', 'molteni', 'driade', 'magis', 'alias', 'emeco', 'carl hansen',
    'fredericia', 'gubi', 'menu', 'tradition', 'andtradition', '&tradition', 'normann copenhagen',
    'ligne roset', 'roche bobois', 'living divani', 'de padova', 'edra', 'gervasoni',
    'established & sons', 'moooi', 'artifort', 'montis', 'leolux', 'cor', 'walter knoll',
    'interprofil', 'brunner', 'wilkhahn', 'vs', 'draenert', 'rolf benz', 'koinor',
    'ekornes', 'stressless', 'bo concept', 'eilersen', 'erik jorgensen', 'getama',
    'paustian', 'erik joergensen', 'innovator', 'skovby', 'skagerak', 'frama',
    'kristalia', 'pedrali', 'midj', 'emu', 'nardi', 'fiam', 'glas italia',
    'fontana arte', 'b-line', 'porro', 'mdf italia', 'desalto', 'bonaldo', 'calligaris',
    'riva 1920', 'tonin casa', 'porada', 'cattelan italia', 'miniforms', 'bontempi',
    'ethnicraft', 'zeitraum', 'jan kurtz', 'more'
  ],

  // Lighting Brands (80+ brands)
  'lighting': [
    'artemide', 'flos', 'louis poulsen', 'foscarini', 'fontana arte', 'gubi', 'marset', 'vibia',
    'oluce', 'luceplan', 'nemo', 'astep', 'santa & cole', 'dcw éditions', 'northern',
    'wastberg', 'wastberg', 'le klint', 'lightyears', '&tradition', 'menu', 'muuto',
    'tradition', 'ingo maurer', 'catellani & smith', 'davide groppi', 'martinelli luce',
    'fabbian', 'leucos', 'vistosi', 'venini', 'axo light', 'panzeri', 'lumen center',
    'linea light', 'metal lux', 'masiero', 'il fanale', 'karman', 'slamp', 'kundalini',
    'kartell', 'foscarini', 'tom dixon', 'moooi', 'bomma', 'lasvit', 'brokis', 'preciosa',
    'michael anastassiades', 'apparatus', 'roll & hill', 'lindsey adelman', 'workstead',
    'cto lighting', 'bert frank', 'tech lighting', 'visual comfort', 'hudson valley',
    'hinkley', 'kichler', 'progress lighting', 'sea gull lighting', 'toltec', 'troy',
    'philips', 'osram', 'ge lighting', 'sylvania', 'cree', 'acuity brands', 'signify'
  ],

  // Audio Brands (60+ brands)
  'audio': [
    'bang & olufsen', 'b&o', 'bose', 'sennheiser', 'sony', 'kef', 'sonos', 'jbl',
    'harman kardon', 'bowers & wilkins', 'b&w', 'klipsch', 'focal', 'denon', 'marantz',
    'yamaha', 'pioneer', 'onkyo', 'audio-technica', 'shure', 'akg', 'beyerdynamic',
    'grado', 'audeze', 'hifiman', 'dali', 'dynaudio', 'elac', 'definitive technology',
    'polk audio', 'monitor audio', 'quad', 'tannoy', 'wharfedale', 'cambridge audio',
    'nad', 'rotel', 'arcam', 'musical fidelity', 'rega', 'pro-ject', 'clearaudio',
    'thorens', 'acoustic research', 'jamo', 'paradigm', 'pmc', 'focal', 'naim',
    'linn', 'meridian', 'devialet', 'mcintosh', 'mark levinson', 'audio research',
    'conrad-johnson', 'pass labs', 'classe', 'krell', 'jeff rowland'
  ],

  // Automotive Brands (70+ brands)
  'automotive': [
    'porsche', 'bmw', 'mercedes', 'mercedes-benz', 'audi', 'volkswagen', 'vw', 'volvo',
    'ferrari', 'lamborghini', 'maserati', 'alfa romeo', 'lancia', 'fiat', 'jaguar',
    'land rover', 'bentley', 'rolls-royce', 'aston martin', 'mclaren', 'lotus',
    'bugatti', 'koenigsegg', 'pagani', 'toyota', 'honda', 'mazda', 'nissan', 'subaru',
    'mitsubishi', 'suzuki', 'lexus', 'infiniti', 'acura', 'hyundai', 'kia', 'genesis',
    'ford', 'chevrolet', 'dodge', 'chrysler', 'jeep', 'ram', 'gmc', 'cadillac', 'lincoln',
    'tesla', 'rivian', 'lucid', 'polestar', 'mini', 'smart', 'saab', 'peugeot', 'renault',
    'citroen', 'ds', 'opel', 'seat', 'skoda', 'dacia', 'lada', 'pontiac', 'plymouth',
    'mercury', 'oldsmobile', 'saturn', 'hummer', 'scion', 'maybach', 'spyker'
  ],

  // Camera Brands (40+ brands)
  'camera': [
    'canon', 'nikon', 'sony', 'fujifilm', 'olympus', 'panasonic', 'leica', 'hasselblad',
    'phase one', 'pentax', 'ricoh', 'mamiya', 'contax', 'rollei', 'zeiss', 'voigtlander',
    'minolta', 'yashica', 'konica', 'bronica', 'zenza', 'polaroid', 'kodak', 'agfa',
    'ilford', 'lomography', 'holga', 'diana', 'blackmagic', 'red', 'arri', 'gopro',
    'dji', 'insta360', 'sigma', 'tamron', 'tokina', 'samyang', 'rokinon', 'vivitar'
  ],

  // Electronics Brands (50+ brands)
  'electronics': [
    'apple', 'samsung', 'google', 'microsoft', 'hp', 'dell', 'asus', 'lenovo', 'acer',
    'lg', 'philips', 'panasonic', 'toshiba', 'sharp', 'hitachi', 'xiaomi', 'huawei',
    'oneplus', 'nokia', 'motorola', 'htc', 'blackberry', 'palm', 'compaq', 'gateway',
    'packard bell', 'emachines', 'nec', 'fujitsu', 'vaio', 'msi', 'gigabyte', 'asrock',
    'intel', 'amd', 'nvidia', 'qualcomm', 'broadcom', 'texas instruments', 'analog devices',
    'corsair', 'razer', 'logitech', 'steelseries', 'hyperx', 'creative', 'plantronics',
    'jabra', 'alienware', 'predator'
  ],

  // Watch Brands (50+ brands)
  'watch': [
    'rolex', 'omega', 'patek philippe', 'audemars piguet', 'vacheron constantin',
    'iwc', 'jaeger-lecoultre', 'cartier', 'breguet', 'blancpain', 'girard-perregaux',
    'panerai', 'hublot', 'tag heuer', 'breitling', 'longines', 'tudor', 'oris',
    'ball', 'tissot', 'hamilton', 'mido', 'certina', 'rado', 'movado', 'raymond weil',
    'seiko', 'citizen', 'casio', 'orient', 'grand seiko', 'spring drive', 'timex',
    'swatch', 'fossil', 'michael kors', 'diesel', 'guess', 'armani', 'bulova',
    'waltham', 'elgin', 'gruen', 'zenith', 'chopard', 'richard mille', 'f.p. journe',
    'a. lange & söhne', 'glashutte original', 'nomos'
  ],

  // Fashion Brands (60+ brands)
  'fashion': [
    'gucci', 'louis vuitton', 'chanel', 'hermes', 'hermès', 'prada', 'dior', 'fendi',
    'versace', 'armani', 'burberry', 'givenchy', 'balenciaga', 'saint laurent', 'ysl',
    'valentino', 'bottega veneta', 'loewe', 'celine', 'céline', 'chloe', 'alexander mcqueen',
    'stella mccartney', 'marc jacobs', 'michael kors', 'coach', 'kate spade', 'tory burch',
    'nike', 'adidas', 'puma', 'reebok', 'new balance', 'asics', 'under armour', 'the north face',
    'patagonia', 'arc\'teryx', 'supreme', 'off-white', 'stone island', 'acne studios',
    'comme des garçons', 'yohji yamamoto', 'issey miyake', 'rei kawakubo', 'junya watanabe',
    'rick owens', 'raf simons', 'helmut lang', 'ann demeulemeester', 'dries van noten',
    'haider ackermann', 'maison margiela', 'martin margiela', 'vetements', 'y-3'
  ],

  // Appliances/Kitchenware Brands (50+ brands)
  'appliances': [
    'alessi', 'bodum', 'braun', 'smeg', 'balmuda', 'miele', 'kitchenaid', 'electrolux',
    'dyson', 'de\'longhi', 'delonghi', 'breville', 'cuisinart', 'vitamix', 'chemex',
    'hario', 'fellow', 'staub', 'le creuset', 'wmf', 'fissler', 'zwilling', 'wusthof',
    'global', 'shun', 'henckels', 'victorinox', 'oxo', 'joseph joseph', 'eva solo',
    'stelton', 'georg jensen', 'rosendahl', 'ittala', 'iittala', 'arabia', 'marimekko',
    'royal copenhagen', 'wedgwood', 'rosenthal', 'villeroy & boch', 'bernardaud',
    'richard ginori', 'boffi', 'bulthaup', 'arclinea', 'poliform', 'modulnova', 'varenna'
  ],

  // Stationery Brands (40+ brands)
  'stationery': [
    'moleskine', 'leuchtturm1917', 'rhodia', 'midori', 'muji', 'traveler\'s company',
    'hobonichi', 'clairefontaine', 'maruman', 'kokuyo', 'pilot', 'pentel', 'uni',
    'sailor', 'platinum', 'lamy', 'montblanc', 'parker', 'waterman', 'sheaffer',
    'cross', 'kaweco', 'faber-castell', 'staedtler', 'tombow', 'copic', 'winsor & newton',
    'sakura', 'prismacolor', 'caran d\'ache', 'rotring', 'stabilo', 'sharpie',
    'ticonderoga', 'penco', 'field notes', 'baron fig', 'blackwing', 'palomino'
  ]
};

// ====================
// DESIGNERS DATABASE
// ====================

const DESIGNER_DATABASE = {
  // Industrial Designers (200+ names)
  'industrial': [
    'dieter rams', 'philippe starck', 'jasper morrison', 'konstantin grcic', 'naoto fukasawa',
    'marc newson', 'ross lovegrove', 'karim rashid', 'tom dixon', 'michael young',
    'patricia urquiola', 'nendo', 'oki sato', 'piero lissoni', 'antonio citterio',
    'achille castiglioni', 'pier giacomo castiglioni', 'vico magistretti', 'gio ponti',
    'ettore sottsass', 'joe colombo', 'gaetano pesce', 'enzo mari', 'bruno munari',
    'verner panton', 'arne jacobsen', 'hans wegner', 'hans j. wegner', 'finn juhl',
    'borge mogensen', 'kaare klint', 'poul henningsen', 'poul kjaerholm', 'nanna ditzel',
    'eero saarinen', 'charles eames', 'ray eames', 'charles and ray eames', 'george nelson',
    'isamu noguchi', 'harry bertoia', 'warren platner', 'eero aarnio', 'jens risom',
    'edward barber', 'jay osgerby', 'barber & osgerby', 'ronan bouroullec', 'erwan bouroullec',
    'ronan & erwan bouroullec', 'hella jongerius', 'maarten baas', 'marcel wanders',
    'bertjan pot', 'studio job', 'scholten & baijings', 'formafantasma', 'studio formafantasma',
    'sebastian wrong', 'sam hecht', 'industrial facility', 'benjamin hubert', 'layer',
    'faye toogood', 'michael anastassiades', 'lee broom', 'tom dixon', 'paul smith',
    'robin day', 'ernest race', 'lucienne day', 'terence conran', 'eileen gray',
    'charlotte perriand', 'pierre jeanneret', 'jean prouvé', 'le corbusier', 'pierre chareau',
    'eileen gray', 'carlo mollino', 'ico parisi', 'franco albini', 'ignazio gardella',
    'osvaldo borsani', 'mario bellini', 'giovanni giugiaro', 'giorgetto giugiaro', 'pininfarina',
    'sergio pininfarina', 'leonardo fioravanti', 'marcello gandini', 'nuccio bertone',
    'ital design', 'italdesign', 'bertone', 'giugiaro', 'zagato', 'touring superleggera',
    'piero fornasetti', 'fornasetti', 'gae aulenti', 'cini boeri', 'anna castelli ferrieri',
    'vico magistretti', 'tobia scarpa', 'afra scarpa', 'afra and tobia scarpa',
    'richard sapper', 'marco zanuso', 'rodolfo dordoni', 'ludovica palomba', 'roberto palomba',
    'ludovica + roberto palomba', 'paola navone', 'michele de lucchi', 'denis santachiara',
    'massimo iosa ghini', 'matteo thun', 'stefano giovannoni', 'guido venturini',
    'patrick jouin', 'mathieu lehanneur', 'matali crasset', 'martin szekely', 'philippe nigro',
    'ronan bouroullec', 'erwan bouroullec', 'noé duchaufour-lawrance', 'india mahdavi',
    'pierre yovanovitch', 'joseph dirand', 'bruno moinard', 'jacques grange', 'peter marino',
    'axel vervoordt', 'vincent van duysen', 'piet boon', 'ilse crawford', 'andree putman',
    'andrée putman', 'christian liaigre', 'chahan minassian', 'charles zana', 'joseph achkar',
    'michel boyd', 'kelly wearstler', 'david collins', 'david rockwell', 'marcel wanders',
    'mies van der rohe', 'ludwig mies van der rohe', 'walter gropius', 'herbert bayer',
    'josef albers', 'marcel breuer', 'laszlo moholy-nagy', 'marianne brandt',
    'wilhelm wagenfeld', 'josef hoffmann', 'koloman moser', 'otto wagner', 'adolf loos',
    'gerrit rietveld', 'mart stam', 'theo van doesburg', 'alvar aalto', 'aino aalto',
    'tapio wirkkala', 'timo sarpaneva', 'kaj franck', 'oiva toikka', 'ilmari tapiovaara',
    'eero aarnio', 'yrjo kukkapuro', 'antti nurmesniemi', 'vuokko nurmesniemi',
    'harri koskinen', 'sami kallio', 'mikko laakkonen', 'simo heikkila', 'stefano giovannoni',
    'george sowden', 'matteo thun', 'aldo rossi', 'alessandro mendini', 'andrea branzi',
    'michele de lucchi', 'marco zanini', 'denis santachiara', 'javier mariscal',
    'shiro kuramata', 'sori yanagi', 'isamu kenmochi', 'kazuhide takahama', 'shigeru ban',
    'tokujin yoshioka', 'naoto fukasawa', 'jasper morrison', 'hiroshi sugimoto',
    'tadao ando', 'kengo kuma', 'terunobu fujimori', 'toyo ito', 'kazuyo sejima',
    'ryue nishizawa', 'sanaa', 'fumihiko maki', 'arata isozaki', 'kenzo tange'
  ],

  // Graphic Designers (100+ names)
  'graphic': [
    'paul rand', 'saul bass', 'milton glaser', 'massimo vignelli', 'lella vignelli',
    'paula scher', 'stefan sagmeister', 'jessica walsh', 'michael bierut', 'pentagram',
    'tibor kalman', 'neville brody', 'david carson', 'erik spiekermann', 'wim crouwel',
    'josef müller-brockmann', 'armin hofmann', 'emil ruder', 'max bill', 'otl aicher',
    'adrian frutiger', 'hermann zapf', 'matthew carter', 'tobias frere-jones', 'erik van blokland',
    'zuzana licko', 'rudy vanderlans', 'emigre', 'experimental jetset', 'mevis & van deursen',
    'irma boom', 'jop van bennekom', 'peter saville', 'malcolm garrett', 'vaughan oliver',
    'jonathan barnbrook', 'david rudnick', 'zak kyes', 'fraser muggeridge', 'studio dumbar',
    'total design', 'anthon beeke', 'gert dumbar', 'studio boot', 'experimental jetset',
    'alan fletcher', 'colin forbes', 'bob gill', 'fletcher/forbes/gill', 'wolff olins',
    'michael wolff', 'wally olins', 'landor', 'walter landor', 'chermayeff & geismar',
    'ivan chermayeff', 'tom geismar', 'sagi haviv', 'steff geissbuhler', 'lippincott',
    'paula scher', 'seymour chwast', 'pushpin studios', 'herb lubalin', 'tom carnase',
    'ralph ginzburg', 'george lois', 'helmut krone', 'mary wells lawrence', 'bill bernbach',
    'ed benguiat', 'louise fili', 'carin goldberg', 'april greiman', 'dan friedman',
    'katherine mccoy', 'michael mccoy', 'cranbrook', 'jeffrey keedy', 'barry deck',
    'jonathan hoefler', 'tobias frere-jones', 'hoefler & co', 'font bureau', 'christian schwartz',
    'paul barnes', 'commercial type', 'kris sowersby', 'klim type foundry', 'berton hasebe',
    'radim pesko', 'grilli type', 'toshi omagari', 'dinamo', 'lineto', 'the designers republic',
    'designers republic', 'ian anderson', 'non-format', 'build', 'hi-res', 'north', 'build'
  ],

  // Architects (100+ names)
  'architect': [
    'frank lloyd wright', 'le corbusier', 'mies van der rohe', 'ludwig mies van der rohe',
    'walter gropius', 'alvar aalto', 'frank gehry', 'rem koolhaas', 'zaha hadid',
    'norman foster', 'richard rogers', 'renzo piano', 'jean nouvel', 'herzog & de meuron',
    'jacques herzog', 'pierre de meuron', 'tadao ando', 'kengo kuma', 'shigeru ban',
    'toyo ito', 'kazuyo sejima', 'ryue nishizawa', 'sanaa', 'bjarke ingels', 'big',
    'snohetta', 'steven holl', 'thom mayne', 'morphosis', 'eric owen moss',
    'wolf prix', 'coop himmelb(l)au', 'peter zumthor', 'david chipperfield', 'john pawson',
    'eduardo souto de moura', 'alvaro siza', 'oscar niemeyer', 'affonso eduardo reidy',
    'lina bo bardi', 'paulo mendes da rocha', 'joao batista vilanova artigas',
    'louis kahn', 'philip johnson', 'i.m. pei', 'eero saarinen', 'paul rudolph',
    'richard meier', 'peter eisenman', 'michael graves', 'robert venturi', 'denise scott brown',
    'charles moore', 'james stirling', 'aldo rossi', 'mario botta', 'renzo piano',
    'richard rogers', 'gae aulenti', 'vittorio gregotti', 'gio ponti', 'carlo scarpa',
    'carlo mollino', 'giuseppe terragni', 'pier luigi nervi', 'aldo van eyck', 'herman hertzberger',
    'john lautner', 'craig ellwood', 'pierre koenig', 'raphael soriano', 'rudolf schindler',
    'richard neutra', 'charles and ray eames', 'alden dow', 'bruce goff', 'fay jones',
    'glenn murcutt', 'sean godsell', 'kerstin thompson', 'peter stutchbury',
    'antoni gaudi', 'josep maria jujol', 'lluís domènech i montaner', 'otto wagner',
    'josef hoffmann', 'joseph maria olbrich', 'charles rennie mackintosh',
    'victor horta', 'hector guimard', 'hendrik petrus berlage', 'gerrit rietveld',
    'jacobus oud', 'mart stam', 'theo van doesburg', 'eileen gray', 'charlotte perriand',
    'pierre jeanneret', 'jean prouvé', 'marcel breuer', 'arne jacobsen', 'jørn utzon',
    'sigurd lewerentz', 'gunnar asplund', 'erik gunnar asplund', 'alvar aalto', 'aino aalto'
  ]
};

// ====================
// ADDITIONAL PATTERN DATABASES
// ====================

// More designers and brands that appear in Misc
const ADDITIONAL_DESIGNERS = [
  'angelo mangiarotti', 'antti lovag', 'matteo tronti architetto', 'mette ditmer',
  'michel charriere', 'mingwang cao', 'minoru hayashi', 'moritz plattner',
  'nils holger moormann', 'raphael navot', 'rashid', 'reinhold weiss',
  'rge mogensen', 'rgen gammelgaard', 'rgen greubel', 'rgensen', 'ridley scott',
  'rodolphe parente', 'ruoyu tang', 'taiga takahashi', 'thierry lemaire',
  'tove kindt-larsen', 'travis scott', 'valerio olgiati', 'verner', 'wanders',
  'wegner', 'yibei chen', 'yokoyama taikan', 'luigi colani', 'luciano kruk',
  'lucie kaas', 'luis laplace', 'luke slater', 'ivaro siza', 'maarten baas',
  'marc deschamps', 'marcel wanders', 'mario bellini', 'masakazu hayashi',
  'mathieu lehanneur', 'pierre yovanovitch', 'piet mondrian', 'poul henningsen',
  'poul kjaerholm', 'ross lovegrove', 'igaard-nielsen', 'jaime hayon',
  'jean-louis deniot', 'jean-philippe nuel', 'jimin hur', 'jonathan ive',
  'jony ive', 'joseph achkar', 'justine frischman', 'kaare klint',
  'kakha kakhadzen', 'katherine gray', 'kazuo shinohara', 'koyama kiyoko',
  'kristina dam studio', 'kruppa horsk', 'kurutoga', 'lara trump', 'loos',
  'lissoni', 'helmut lang', 'hella jongerius', 'ikutaro kakehashi',
  'ignazio gardella', 'ingo maurer', 'frank gehry', 'frank lloyd wright',
  'floria sigismondi', 'ettore sottsass'
];

const ADDITIONAL_BRANDS = [
  // Lighting
  'nemo lighting', 'tail light', 'stage lighting',

  // Furniture & Design
  'de sede', 'dedon', 'e15', 'established & sons', 'molteni&c', 'usm haller',
  'vitra', 'zanotta', 'magis', 'driade', 'secund projects',

  // Automotive
  'land cruiser', 'mustang', 'roadrunner', 'skyline r33', 'skyline super silhouette',

  // Audio & Music
  'tape reel', 'reel-to-reel', 'reel-to-reel tape', 'reel-to-reel tape recorder',
  'telefunken', 'walkman', 'radio', 'receiver', 'music gear', 'mixing console',
  'modular synthesizer', 'synth', 'synthesiser', 'synthesizer',

  // Electronics
  'typewriter', 'calculator', 'adding machine', 'timer', 'toggle switch',
  'lcd display', 'mobile device', 'mobile ui', 'smartwatch',

  // Fashion & Accessories
  'sneaker', 'sneakers', 'watch', 'watches', 'wristwatch', 'men\'s watch',

  // Toys & Models
  'tamiya', 'lego', 'model kit',

  // Camera & Photo
  'contax', 'nikon', 'olympus', 'pentax',

  // Kitchenware
  'kettal', 'royal botania', 'staub',

  // Stationery & Art Supplies
  'nine inch nails', 'skrillex',

  // Tech Products
  'vst', 'server racks', 'o equipment',

  // Misc Brands
  'muthesius', 'okrm', 'ora ito', 'oury', 'paf', 'testarossa',
  'vipp', 'venturi', 'verpan', 'vitsoe', 'voga di sopra', 'wellco',
  'wilde + spieth', 'wittmann', 'wormley'
];

// Product categories and types
const PRODUCT_CATEGORIES = {
  // Architecture/Buildings
  'architecture': [
    'monastery', 'museum', 'library', 'office', 'hotel', 'hotel lobby',
    'restaurant', 'church', 'chapel', 'apartment', 'apartment building',
    'penthouse', 'loft', 'mansion', 'villa', 'house', 'cabin', 'staircase',
    'living room', 'bedroom', 'bathroom', 'kitchen', 'home office'
  ],

  // Automotive parts/features
  'automotive': [
    'spoiler', 'rear spoiler', 'hood scoop', 'headlights', 'tail light',
    'gear shift', 'instrument panel', 'dashboard', 'car interior', 'car body panel',
    'car wheel', 'rim', 'brake caliper', 'hatchback', 'tractor', 'truck', 'van',
    'military vehicle', 'tank', 'armored car', 'space ship', 'aircraft', 'drone'
  ],

  // Graphic Design
  'graphic': [
    'book cover', 'book jacket', 'poster', 'leaflet', 'brochure', 'flyer',
    'business card', 'letterhead', 'vinyl record', 'record sleeve', 'album cover',
    'magazine cover', 'newspaper', 'packaging', 'label', 'logo', 'icon', 'icons',
    'iconography', 'typography', 'lettering', 'hand lettering', 'calligraphy',
    'monogram', 'identity system', 'brand guidelines', 'sketch', 'tags',
    'print ad', 'print design', 'print', 'editorial', 'editorial portrait',
    'data visualization', 'infographic', 'flowchart', 'flowcharts', 'diagram'
  ],

  // Industrial Design Products
  'industrial': [
    'typewriter', 'calculator', 'telephone', 'radio', 'clock', 'timer', 'watch',
    'headphones', 'earbuds', 'speaker', 'loudspeaker', 'amplifier', 'turntable',
    'cassette player', 'cassette deck', 'cd player', 'sound system', 'hi-fi',
    'camera', 'lens', 'tripod', 'light fixture', 'lamp', 'flashlight', 'spotlight',
    'candle', 'lighter', 'ashtray', 'vase', 'bowl', 'plate', 'cup', 'mug',
    'glass', 'glass bottle', 'bottle', 'can', 'jar', 'container', 'box',
    'knife', 'fork', 'spoon', 'cutlery', 'utensil', 'kitchen tool', 'gadget',
    'coffee machine', 'espresso machine', 'kettle', 'toaster', 'blender',
    'food processor', 'mixer', 'grinder', 'scale', 'measuring cup',
    'pen', 'pencil', 'marker', 'highlighter', 'eraser', 'ruler', 'compass',
    'stapler', 'hole punch', 'tape dispenser', 'scissors', 'cutter', 'knife',
    'screwdriver', 'wrench', 'pliers', 'hammer', 'drill', 'saw', 'tool',
    'fastener', 'screw', 'bolt', 'nut', 'connector', 'plug', 'socket', 'switch',
    'toggle switch', 'power switch', 'button', 'knob', 'knobs', 'knurled knob',
    'handle', 'grip', 'lever', 'hinge', 'latch', 'lock', 'key',
    'helmet', 'mask', 'goggles', 'glasses', 'eyewear', 'sunglasses',
    'bag', 'backpack', 'luggage', 'suitcase', 'briefcase', 'wallet', 'purse',
    'umbrella', 'cane', 'walking stick', 'wheelchair', 'crutch',
    'toy', 'puzzle', 'game', 'dice', 'cards', 'chess', 'board game',
    'furniture', 'chair', 'bench', 'stool', 'sofa', 'table', 'desk',
    'cabinet', 'shelf', 'shelving', 'storage', 'drawer', 'closet', 'wardrobe',
    'bed', 'mattress', 'pillow', 'blanket', 'rug', 'carpet', 'curtain',
    'cushion', 'throw', 'textile', 'fabric', 'upholstery'
  ],

  // Fashion & Apparel
  'fashion': [
    't-shirt', 'shirt', 'jacket', 'coat', 'sweater', 'hoodie', 'pants',
    'jeans', 'shorts', 'skirt', 'dress', 'suit', 'tie', 'scarf', 'hat',
    'cap', 'beanie', 'gloves', 'belt', 'socks', 'shoes', 'boots', 'sneakers',
    'sandals', 'slippers', 'heels', 'jewelry', 'necklace', 'bracelet',
    'ring', 'earrings', 'brooch', 'cufflinks', 'watch band', 'strap'
  ],

  // Misc products
  'misc': [
    'gift set', 'specimen', 'prototype', 'mockup', 'model', 'mock-up',
    'sample', 'swatch', 'catalog', 'brochure', 'manual', 'guide', 'document',
    'certificate', 'diploma', 'award', 'trophy', 'medal', 'badge', 'patch',
    'sticker', 'decal', 'sign', 'banner', 'flag', 'pennant'
  ]
};

// Design movements and styles
const DESIGN_STYLES = {
  'art deco': ['art deco', 'art nouveau', 'arts and crafts', 'bauhaus'],
  'modernism': ['modernism', 'modernist', 'modern', 'international style', 'functionalism'],
  'postmodern': ['postmodern', 'postmodernism', 'memphis', 'memphis group'],
  'brutalism': ['brutalism', 'brutalist', 'constructivism', 'constructivist'],
  'minimalism': ['minimalism', 'minimalist', 'minimal', 'reductivism'],
  'organic': ['organic', 'organic modernism', 'biomimicry', 'biomorphic'],
  'japanese': ['japanese minimalism', 'wabi-sabi', 'zen'],
  'scandinavian': ['scandinavian', 'nordic', 'danish modern', 'swedish modern'],
  'mid-century': ['mid-century', 'mid-century modern', '50s', '60s'],
  'retro': ['retro', 'vintage', 'nostalgic', 'throwback'],
  'futurism': ['futurism', 'futuristic', 'sci-fi', 'science fiction', 'cyberpunk'],
  'industrial': ['industrial', 'industrial chic', 'steampunk'],
  'pop art': ['pop art', 'pop', 'op art', 'kinetic art'],
  'punk': ['punk', 'punk rock', 'grunge', 'new wave']
};

// Origin/nationality styles
const ORIGIN_STYLES = [
  'american', 'british', 'italian', 'french', 'german', 'dutch', 'swiss',
  'scandinavian', 'danish', 'swedish', 'norwegian', 'finnish', 'icelandic',
  'japanese', 'chinese', 'korean', 'taiwanese', 'indian', 'brazilian',
  'mexican', 'canadian', 'australian', 'austrian', 'belgian', 'spanish',
  'portuguese', 'russian', 'polish', 'czech', 'hungarian', 'greek',
  'turkish', 'israeli', 'south african', 'new zealand', 'irish', 'scottish',
  'welsh', 'english', 'england', 'french', 'german', 'italian'
];

// Export to global scope
window.TaggerDatabases = {
  BRAND_DATABASE,
  DESIGNER_DATABASE,
  ADDITIONAL_DESIGNERS,
  ADDITIONAL_BRANDS,
  PRODUCT_CATEGORIES,
  DESIGN_STYLES,
  ORIGIN_STYLES
};

})();
