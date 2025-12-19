// ============================================
// TAXONOMY & DATA
// ============================================
(function() {

const DEFAULT_TAXONOMY = {
  "Design": {
    "Graphic Design": ["Poster", "Book Design", "Magazine", "Editorial", "Packaging", "Logo", "Branding", "UI Design", "Web Design", "Typography", "Album Cover", "Print"],
    "Industrial Design": {
      "Furniture": ["Chair", "Sofa", "Table", "Desk", "Shelving", "Lighting", "Lamp", "Bench", "Cabinet"],
      "Audio Equipment": ["Headphones", "Speakers", "Amplifier", "Turntable", "Earbuds", "DAC", "Receiver"],
      "Consumer Electronics": ["Phone", "Computer", "Camera", "Wearable", "Tablet", "Laptop", "Monitor"],
      "Automotive": ["Car", "Motorcycle", "Concept Car", "Interior", "Electric Vehicle"]
    }
  },
  "Architecture": {
    "Residential": ["House", "Villa", "Apartment", "Loft", "Cabin", "Townhouse"],
    "Commercial": ["Office", "Retail", "Hotel", "Restaurant", "Store"],
    "Institutional": ["Museum", "Library", "School", "Hospital", "Gallery"]
  },
  "Art": {
    "Painting": ["Oil", "Acrylic", "Watercolor", "Abstract", "Portrait"],
    "Sculpture": ["Bronze", "Marble", "Steel", "Wood", "Installation"],
    "Photography": ["Portrait", "Landscape", "Street", "Fashion", "Product", "Architecture", "Editorial"]
  },
  "Style": {
    "Modernism": ["Bauhaus", "De Stijl", "International Style", "Swiss Style"],
    "Contemporary": ["Minimalism", "Brutalism", "Parametric", "Scandinavian"],
    "Historical": ["Art Nouveau", "Art Deco", "Mid-Century Modern", "Victorian", "Retro"],
    "Origin": ["Germany", "Italy", "Japan", "Denmark", "Sweden", "United States", "United Kingdom", "France", "Switzerland", "Finland", "Netherlands"]
  },
  "Brand": {
    "Audio": ["Bang & Olufsen", "Bose", "Sony", "Sennheiser", "Focal", "Beyerdynamic", "Audio-Technica", "Grado", "HiFiMAN", "Audeze", "Master & Dynamic", "KEF", "Bowers & Wilkins", "Teenage Engineering", "Devialet", "Sonos"],
    "Electronics": ["Apple", "Samsung", "Google", "Microsoft", "Sony", "LG", "Nothing", "OnePlus", "Xiaomi"],
    "Camera": ["Canon", "Nikon", "Leica", "Hasselblad", "Fujifilm", "Sony", "DJI", "GoPro"],
    "Automotive": ["BMW", "Mercedes-Benz", "Porsche", "Audi", "Ferrari", "Tesla", "Volvo", "McLaren", "Rivian", "Lucid"],
    "Furniture": ["Herman Miller", "Knoll", "Vitra", "Fritz Hansen", "HAY", "Muuto", "Cassina", "Flos", "Artemide"],
    "Fashion": ["Gucci", "Louis Vuitton", "Chanel", "Hermes", "Prada", "Nike", "Adidas"],
    "Appliances": ["Braun", "Dyson", "Smeg", "Balmuda", "Miele"],
    "Watch": ["Rolex", "Omega", "Patek Philippe", "Cartier", "Grand Seiko"]
  },
  "Creator": {
    "Designer": {
      "Industrial": [],
      "Graphic": [],
      "Fashion": [],
      "Interior": []
    },
    "Architect": [],
    "Artist": [],
    "Photographer": [],
    "Studio": []
  },
  "Product": {
    "Audio": [],
    "Electronics": [],
    "Automotive": [],
    "Furniture": [],
    "Fashion": [],
    "Appliances": [],
    "Watch": [],
    "Camera": []
  },
  "Era": {
    "Pre-War": ["1920s", "1930s"],
    "Mid-Century": ["1940s", "1950s", "1960s"],
    "Late Century": ["1970s", "1980s", "1990s"],
    "Contemporary": ["2000s", "2010s", "2020s"]
  },
  "Material": {
    "Natural": ["Wood", "Leather", "Fabric", "Stone", "Wool", "Cotton", "Linen"],
    "Metal": ["Aluminum", "Steel", "Brass", "Copper", "Chrome", "Titanium", "Gold", "Silver"],
    "Synthetic": ["Plastic", "Carbon Fiber", "Acrylic", "Fiberglass", "Resin", "Rubber"],
    "Mineral": ["Glass", "Ceramic", "Concrete", "Marble", "Granite"]
  },
  "Color": {
    "Neutral": ["Black", "White", "Gray", "Silver", "Beige", "Cream"],
    "Warm": ["Red", "Orange", "Yellow", "Gold", "Brown", "Copper"],
    "Cool": ["Blue", "Green", "Teal", "Purple", "Navy"],
    "Finish": ["Matte", "Glossy", "Satin", "Brushed", "Polished", "Natural"]
  }
};

// Brand database with categories
const BRAND_DATABASE = {
  'Audio': [
    'Bang & Olufsen', 'B&O', 'Beoplay', 'Beosound', 'Beolab', 'Beovision', 'Beolit',
    'Bose', 'Sennheiser', 'Audio-Technica', 'Beyerdynamic', 'AKG', 'Shure',
    'Focal', 'Grado', 'HiFiMAN', 'Audeze', 'Master & Dynamic', 'Meze', 'Campfire Audio',
    'KEF', 'Bowers & Wilkins', 'B&W', 'JBL', 'Harman Kardon', 'Marshall', 'Sonos',
    'Devialet', 'Naim', 'McIntosh', 'Mark Levinson', 'Burmester', 'Technics',
    'Teenage Engineering', 'Native Instruments', 'Ableton', 'Roland', 'Korg', 'Moog',
    'Klipsch', 'Definitive Technology', 'SVS', 'REL', 'MartinLogan', 'Magnepan'
  ],
  'Electronics': [
    'Apple', 'Samsung', 'Google', 'Microsoft', 'Sony', 'LG', 'Dell', 'ASUS', 'Razer',
    'Lenovo', 'HP', 'Acer', 'MSI', 'Alienware', 'Surface', 'ThinkPad',
    'Nothing', 'OnePlus', 'Xiaomi', 'Huawei', 'Oppo', 'Vivo', 'Realme',
    'Nintendo', 'PlayStation', 'Xbox', 'Steam Deck', 'Analogue',
    'Fitbit', 'Garmin', 'Whoop', 'Oura', 'Amazon', 'Echo', 'Kindle',
    'Logitech', 'Razer', 'SteelSeries', 'Corsair', 'HyperX',
    'Anker', 'Belkin', 'Twelve South', 'Nomad', 'Peak Design'
  ],
  'Camera': [
    'Canon', 'Nikon', 'Sony', 'Leica', 'Hasselblad', 'Fujifilm', 'Zeiss',
    'Panasonic', 'Olympus', 'Pentax', 'Sigma', 'Tamron', 'Phase One',
    'RED', 'Blackmagic', 'ARRI', 'DJI', 'GoPro', 'Insta360', 'Ricoh'
  ],
  'Automotive': [
    'BMW', 'Mercedes-Benz', 'Mercedes', 'Porsche', 'Audi', 'Volkswagen', 'Tesla', 'Volvo',
    'Ferrari', 'Lamborghini', 'McLaren', 'Aston Martin', 'Bentley', 'Rolls-Royce',
    'Jaguar', 'Land Rover', 'Range Rover', 'Maserati', 'Alfa Romeo', 'Bugatti',
    'Lexus', 'Infiniti', 'Acura', 'Genesis', 'Cadillac', 'Lincoln',
    'Rivian', 'Lucid', 'Polestar', 'NIO', 'BYD', 'Rimac', 'Koenigsegg', 'Pagani',
    'Toyota', 'Honda', 'Mazda', 'Subaru', 'Nissan', 'Hyundai', 'Kia',
    'Ford', 'Chevrolet', 'Dodge', 'Jeep', 'RAM', 'GMC'
  ],
  'Furniture': [
    'Herman Miller', 'Knoll', 'Vitra', 'Fritz Hansen', 'Cassina', 'HAY', 'Muuto',
    'Artek', 'Carl Hansen', 'PP Mobler', 'Louis Poulsen', 'Flos', 'Artemide',
    'B&B Italia', 'Poltrona Frau', 'Minotti', 'Molteni', 'Flexform', 'Edra',
    'USM', 'String', 'Montana', 'Kartell', 'Magis', 'Alessi', 'Iittala',
    'West Elm', 'CB2', 'Design Within Reach', 'DWR', 'Room & Board',
    'IKEA', 'Article', 'Floyd', 'Hem', 'Menu', 'Normann Copenhagen', 'Gubi'
  ],
  'Fashion': [
    'Gucci', 'Louis Vuitton', 'Chanel', 'Hermes', 'Prada', 'Dior', 'Balenciaga',
    'Saint Laurent', 'Bottega Veneta', 'Celine', 'Loewe', 'Valentino', 'Versace',
    'Burberry', 'Givenchy', 'Fendi', 'Off-White', 'Fear of God', 'Acne Studios',
    'Common Projects', 'Margiela', 'Rick Owens', 'Comme des Garcons', 'Issey Miyake',
    'Nike', 'Adidas', 'New Balance', 'Asics', 'Converse', 'Vans', 'Reebok'
  ],
  'Appliances': [
    'Braun', 'Dyson', 'Philips', 'Panasonic', 'Toshiba', 'Sharp', 'Miele', 'Bosch',
    'Smeg', 'KitchenAid', 'Vitamix', 'Breville', 'De\'Longhi', 'Nespresso',
    'Balmuda', 'Coway', 'Blueair', 'Molekule', 'Roomba', 'iRobot'
  ],
  'Watch': [
    'Rolex', 'Omega', 'Patek Philippe', 'Audemars Piguet', 'Cartier', 'IWC',
    'Jaeger-LeCoultre', 'Vacheron Constantin', 'A. Lange & Sohne', 'Breguet',
    'TAG Heuer', 'Breitling', 'Panerai', 'Hublot', 'Zenith', 'Tudor',
    'Grand Seiko', 'Seiko', 'Citizen', 'Casio', 'G-Shock', 'Swatch',
    'Nomos', 'Junghans', 'Mondaine', 'Braun', 'Uniform Wares'
  ]
};

// Flatten for quick lookup
const KNOWN_BRANDS = Object.values(BRAND_DATABASE).flat().sort((a, b) => b.length - a.length);

// Create brand to category mapping
const BRAND_CATEGORIES = {};
Object.entries(BRAND_DATABASE).forEach(([category, brands]) => {
  brands.forEach(brand => { BRAND_CATEGORIES[brand.toLowerCase()] = category; });
});

// Common artist/designer name patterns (first name + last name style)
const KNOWN_ARTISTS = [
  'Isamu Noguchi', 'Tadao Ando', 'Kengo Kuma', 'Shiro Kuramata', 'Naoto Fukasawa',
  'Dieter Rams', 'Charles Eames', 'Ray Eames', 'Eero Saarinen', 'Arne Jacobsen',
  'Hans Wegner', 'Verner Panton', 'Philippe Starck', 'Marc Newson', 'Jasper Morrison',
  'Konstantin Grcic', 'Patricia Urquiola', 'Ronan Bouroullec', 'Erwan Bouroullec',
  'Zaha Hadid', 'Frank Gehry', 'Norman Foster', 'Renzo Piano', 'Bjarke Ingels',
  'Jonathan Ive', 'Jony Ive', 'Massimo Vignelli', 'Stefan Sagmeister', 'Paula Scher',
  'David Carson', 'Neville Brody', 'Yohji Yamamoto', 'Issey Miyake', 'Rei Kawakubo'
].sort((a, b) => b.length - a.length);

// Designer discipline mapping based on brand associations
const DESIGNER_DISCIPLINES = {
  'Industrial': ['Dieter Rams', 'Charles Eames', 'Ray Eames', 'Eero Saarinen', 'Arne Jacobsen',
    'Hans Wegner', 'Verner Panton', 'Philippe Starck', 'Marc Newson', 'Jasper Morrison',
    'Konstantin Grcic', 'Patricia Urquiola', 'Ronan Bouroullec', 'Erwan Bouroullec',
    'Jonathan Ive', 'Jony Ive', 'Naoto Fukasawa', 'Shiro Kuramata', 'Isamu Noguchi'],
  'Graphic': ['Massimo Vignelli', 'Stefan Sagmeister', 'Paula Scher', 'David Carson', 'Neville Brody',
    'Milton Glaser', 'Saul Bass', 'Paul Rand', 'Josef Muller-Brockmann', 'Jan Tschichold'],
  'Fashion': ['Yohji Yamamoto', 'Issey Miyake', 'Rei Kawakubo', 'Coco Chanel', 'Christian Dior',
    'Vivienne Westwood', 'Alexander McQueen', 'Karl Lagerfeld', 'Tom Ford', 'Virgil Abloh'],
  'Interior': ['Kelly Wearstler', 'Ilse Crawford', 'Axel Vervoordt', 'Jean-Michel Frank']
};

// Architect list
const KNOWN_ARCHITECTS = ['Zaha Hadid', 'Frank Gehry', 'Norman Foster', 'Renzo Piano', 'Bjarke Ingels',
  'Tadao Ando', 'Kengo Kuma', 'Frank Lloyd Wright', 'Le Corbusier', 'Ludwig Mies van der Rohe',
  'Louis Kahn', 'Oscar Niemeyer', 'I. M. Pei', 'Santiago Calatrava', 'Jean Nouvel', 'Peter Zumthor',
  'Rem Koolhaas', 'Herzog & de Meuron', 'SANAA', 'Kazuyo Sejima', 'Ryue Nishizawa', 'Steven Holl'];

// Era period mapping
const ERA_PERIODS = {
  'Pre-War': ['1900s', '1910s', '1920s', '1930s'],
  'Mid-Century': ['1940s', '1950s', '1960s'],
  'Late Century': ['1970s', '1980s', '1990s'],
  'Contemporary': ['2000s', '2010s', '2020s']
};

// Nationality to country mapping
const NATIONALITY_TO_COUNTRY = {
  'german': 'Germany', 'deutsch': 'Germany', 'deutsche': 'Germany',
  'italian': 'Italy', 'italiano': 'Italy', 'italiana': 'Italy',
  'french': 'France', 'francais': 'France', 'francaise': 'France',
  'japanese': 'Japan', 'nippon': 'Japan',
  'british': 'United Kingdom', 'english': 'United Kingdom', 'uk': 'United Kingdom',
  'american': 'United States', 'usa': 'United States', 'us': 'United States',
  'danish': 'Denmark', 'dansk': 'Denmark',
  'swedish': 'Sweden', 'svensk': 'Sweden',
  'norwegian': 'Norway', 'norsk': 'Norway',
  'finnish': 'Finland', 'suomi': 'Finland',
  'dutch': 'Netherlands', 'netherlands': 'Netherlands', 'holland': 'Netherlands',
  'belgian': 'Belgium', 'belge': 'Belgium',
  'swiss': 'Switzerland', 'schweiz': 'Switzerland', 'suisse': 'Switzerland',
  'austrian': 'Austria', 'osterreich': 'Austria',
  'spanish': 'Spain', 'espanol': 'Spain', 'espanola': 'Spain',
  'portuguese': 'Portugal', 'portugues': 'Portugal',
  'brazilian': 'Brazil', 'brasileiro': 'Brazil',
  'mexican': 'Mexico', 'mexicano': 'Mexico',
  'canadian': 'Canada',
  'australian': 'Australia',
  'chinese': 'China', 'zhongguo': 'China',
  'korean': 'South Korea', 'hanguk': 'South Korea',
  'indian': 'India',
  'russian': 'Russia', 'rossiya': 'Russia',
  'polish': 'Poland', 'polski': 'Poland',
  'czech': 'Czech Republic', 'cesky': 'Czech Republic',
  'hungarian': 'Hungary', 'magyar': 'Hungary',
  'greek': 'Greece', 'ellas': 'Greece',
  'turkish': 'Turkey', 'turk': 'Turkey',
  'israeli': 'Israel',
  'south african': 'South Africa',
  'argentinian': 'Argentina', 'argentine': 'Argentina',
  'chilean': 'Chile',
  'colombian': 'Colombia',
  'icelandic': 'Iceland', 'island': 'Iceland',
  'irish': 'Ireland', 'eire': 'Ireland',
  'scottish': 'Scotland', 'welsh': 'Wales'
};

const ROOT_COLORS = {
  'Design': '#a78bfa', 'Architecture': '#f87171', 'Art': '#f472b6', 'Style': '#4ade80',
  'Brand': '#fbbf24', 'Creator': '#c084fc', 'Era': '#fb923c', 'Product': '#60a5fa',
  'Material': '#22d3d1', 'Color': '#94a3b8', 'Custom': '#ec4899'
};

const STORAGE_KEY = 'tagger_memory';
const TAXONOMY_KEY = 'tagger_taxonomy';

// Export for use in other modules
window.TaggerData = {
  DEFAULT_TAXONOMY,
  BRAND_DATABASE,
  KNOWN_BRANDS,
  BRAND_CATEGORIES,
  KNOWN_ARTISTS,
  DESIGNER_DISCIPLINES,
  KNOWN_ARCHITECTS,
  ERA_PERIODS,
  NATIONALITY_TO_COUNTRY,
  ROOT_COLORS,
  STORAGE_KEY,
  TAXONOMY_KEY
};

})();
