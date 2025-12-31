// ============================================
// TAXONOMY & DATA
// ============================================
(function() {

const DEFAULT_TAXONOMY = {
  "Graphic Design": {
    "Print": ["Poster", "Book Design", "Magazine", "Editorial", "Packaging", "Album Cover", "Catalog", "Brochure", "Flyer", "Leaflet", "Annual Report", "Newspaper", "Book Cover", "Book Jacket"],
    "Identity": ["Logo", "Branding", "Corporate Identity", "Visual Identity", "Logotype", "Wordmark", "Brand Identity", "Identity System", "Brand Guidelines"],
    "Typography": ["Typeface", "Font", "Lettering", "Calligraphy", "Type Specimen", "Type Design", "Typographic Poster", "Typographic Layout", "Hand Lettering"],
    "Digital": ["UI Design", "Web Design", "App Design", "Interface", "UX Design", "Icon Design", "Digital Interface", "Website", "Mobile UI"],
    "Illustration": ["Vector", "Digital Art", "Infographic", "Technical Illustration", "Editorial Illustration", "Illustrated Poster"],
    "Signage": ["Wayfinding", "Environmental Graphics", "Sign Design", "Directional Signage"],
    "Packaging": ["Product Packaging", "Label Design", "Box Design", "Package Design"],
    "Misc": []
  },
  "Industrial Design": {
    "Furniture": ["Chair", "Sofa", "Table", "Desk", "Shelving", "Lighting", "Lamp", "Bench", "Cabinet", "Stool", "Bed"],
    "Audio Equipment": ["Headphones", "Speakers", "Amplifier", "Turntable", "Earbuds", "DAC", "Receiver", "Radio", "Soundbar"],
    "Consumer Electronics": ["Phone", "Computer", "Camera", "Wearable", "Tablet", "Laptop", "Monitor", "Television", "Remote"],
    "Automotive": ["Car", "Motorcycle", "Concept Car", "Interior", "Electric Vehicle", "Bicycle", "Scooter"],
    "Appliances": ["Kitchen", "Bathroom", "Vacuum", "Coffee Machine", "Toaster", "Blender", "Fan", "Heater"],
    "Tools": ["Power Tools", "Hand Tools", "Office Equipment", "Medical Device"],
    "Misc": []
  },
  "Interior Design": {
    "Residential": ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Home Office"],
    "Commercial": ["Office", "Retail", "Restaurant", "Hotel Lobby", "Showroom"],
    "Exhibition": ["Gallery", "Museum", "Trade Show", "Installation"],
    "Misc": []
  },
  "Fashion Design": {
    "Apparel": ["Menswear", "Womenswear", "Outerwear", "Sportswear", "Streetwear"],
    "Accessories": ["Bags", "Shoes", "Jewelry", "Eyewear", "Watches"],
    "Textile": ["Fabric", "Pattern", "Print", "Weave"],
    "Misc": []
  },
  "Architecture": {
    "Residential": ["House", "Villa", "Apartment", "Loft", "Cabin", "Townhouse", "Penthouse", "Estate"],
    "Commercial": ["Office", "Retail", "Hotel", "Restaurant", "Store", "Mall", "Tower", "Skyscraper"],
    "Institutional": ["Museum", "Library", "School", "Hospital", "Gallery", "University", "Theater", "Concert Hall"],
    "Religious": ["Church", "Temple", "Mosque", "Chapel", "Shrine"],
    "Industrial": ["Factory", "Warehouse", "Airport", "Station", "Bridge"]
  },
  "Art": {
    "Painting": ["Oil", "Acrylic", "Watercolor", "Abstract", "Portrait", "Landscape", "Still Life", "Contemporary"],
    "Sculpture": ["Bronze", "Marble", "Steel", "Wood", "Installation", "Kinetic", "Ceramic", "Mixed Media"],
    "Digital Art": ["3D Rendering", "CGI", "Motion Graphics", "Generative Art", "Digital Painting"],
    "Ceramics": ["Pottery", "Porcelain", "Stoneware", "Earthenware", "Raku", "Tea Bowl"],
    "Misc": []
  },
  "Photography": {
    "Portrait": ["Studio Portrait", "Environmental Portrait", "Editorial Portrait"],
    "Landscape": ["Nature", "Urban Landscape", "Seascape", "Aerial"],
    "Documentary": ["Street", "Photojournalism", "Travel", "Social Documentary"],
    "Commercial": ["Fashion", "Product", "Architecture", "Food", "Advertising"],
    "Fine Art": ["Conceptual", "Abstract", "Black and White", "Experimental"],
    "Misc": []
  },
  "Style": {
    "Modernism": ["Bauhaus", "De Stijl", "International Style", "Swiss Style", "Functionalism", "Constructivism"],
    "Contemporary": ["Minimalism", "Brutalism", "Parametric", "Scandinavian", "Japanese Minimalism", "Neo-Futurism"],
    "Historical": ["Art Nouveau", "Art Deco", "Mid-Century Modern", "Victorian", "Retro", "Memphis", "Postmodern"],
    "Regional": ["Nordic", "Japanese", "Italian", "German", "American", "British", "French", "Dutch"],
    "Origin": ["Germany", "Italy", "Japan", "Denmark", "Sweden", "United States", "United Kingdom", "France", "Switzerland", "Finland", "Netherlands", "Norway", "Austria", "Belgium", "Spain"]
  },
  "Brand": {
    "Audio": ["Bang & Olufsen", "Bose", "Sony", "Sennheiser", "Focal", "Beyerdynamic", "Audio-Technica", "Grado", "HiFiMAN", "Audeze", "Master & Dynamic", "KEF", "Bowers & Wilkins", "Teenage Engineering", "Devialet", "Sonos"],
    "Electronics": ["Apple", "Samsung", "Google", "Microsoft", "Sony", "LG", "Nothing", "OnePlus", "Xiaomi"],
    "Camera": ["Canon", "Nikon", "Leica", "Hasselblad", "Fujifilm", "Sony", "DJI", "GoPro", "Zeiss", "Phase One"],
    "Automotive": ["BMW", "Mercedes-Benz", "Porsche", "Audi", "Ferrari", "Tesla", "Volvo", "McLaren", "Rivian", "Lucid", "Lamborghini", "Aston Martin"],
    "Furniture": ["Herman Miller", "Knoll", "Vitra", "Fritz Hansen", "HAY", "Muuto", "Cassina", "Flos", "Artemide", "B&B Italia", "Carl Hansen"],
    "Fashion": ["Gucci", "Louis Vuitton", "Chanel", "Hermes", "Prada", "Nike", "Adidas", "Comme des Garcons", "Issey Miyake"],
    "Appliances": ["Braun", "Dyson", "Smeg", "Balmuda", "Miele", "KitchenAid", "Vitamix"],
    "Watch": ["Rolex", "Omega", "Patek Philippe", "Cartier", "Grand Seiko", "Audemars Piguet", "IWC", "Nomos"]
  },
  "Creator": {
    "Designer": {
      "Industrial": [],
      "Graphic": [],
      "Fashion": [],
      "Interior": [],
      "Product": []
    },
    "Architect": {
      "Misc": []
    },
    "Artist": {
      "Painter": [],
      "Sculptor": [],
      "Ceramicist": []
    },
    "Photographer": {
      "Portrait": [],
      "Fashion": [],
      "Architecture": [],
      "Documentary": []
    },
    "Studio": {
      "Design Studio": [],
      "Architecture Firm": [],
      "Creative Agency": []
    }
  },
  "Product": {
    "Audio": {
      "Headphones": [],
      "Speakers": [],
      "Amplifiers": [],
      "Turntables": []
    },
    "Electronics": {
      "Phones": [],
      "Computers": [],
      "Wearables": [],
      "Tablets": []
    },
    "Automotive": {
      "Cars": [],
      "Motorcycles": [],
      "Concepts": []
    },
    "Furniture": {
      "Seating": [],
      "Tables": [],
      "Storage": [],
      "Lighting": []
    },
    "Fashion": {
      "Apparel": [],
      "Accessories": [],
      "Footwear": []
    },
    "Appliances": {
      "Misc": []
    },
    "Watch": {
      "Misc": []
    },
    "Camera": {
      "Cameras": [],
      "Lenses": []
    }
  },
  "Era": {
    "Pre-War": ["1900s", "1910s", "1920s", "1930s"],
    "Mid-Century": ["1940s", "1950s", "1960s"],
    "Late Century": ["1970s", "1980s", "1990s"],
    "Contemporary": ["2000s", "2010s", "2020s"]
  },
  "Material": {
    "Natural": ["Wood", "Leather", "Fabric", "Stone", "Wool", "Cotton", "Linen", "Cork", "Bamboo", "Rattan"],
    "Metal": ["Aluminum", "Steel", "Brass", "Copper", "Chrome", "Titanium", "Gold", "Silver", "Bronze", "Iron"],
    "Synthetic": ["Plastic", "Carbon Fiber", "Acrylic", "Fiberglass", "Resin", "Rubber", "Silicone", "Nylon"],
    "Mineral": ["Glass", "Ceramic", "Concrete", "Marble", "Granite", "Porcelain", "Quartz", "Terrazzo"]
  },
  "Color": {
    "Neutral": ["Black", "White", "Gray", "Silver", "Beige", "Cream", "Ivory", "Charcoal"],
    "Warm": ["Red", "Orange", "Yellow", "Gold", "Brown", "Copper", "Terracotta", "Burgundy", "Tan"],
    "Cool": ["Blue", "Green", "Teal", "Purple", "Navy", "Cyan", "Turquoise", "Indigo", "Violet"],
    "Finish": ["Matte", "Glossy", "Satin", "Brushed", "Polished", "Natural", "Textured", "Patina"]
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
  'Graphic Design': '#CCCCCC', 'Industrial Design': '#CCCCCC', 'Interior Design': '#CCCCCC', 'Fashion Design': '#CCCCCC',
  'Architecture': '#CCCCCC', 'Art': '#CCCCCC', 'Photography': '#CCCCCC',
  'Style': '#CCCCCC', 'Brand': '#CCCCCC', 'Creator': '#CCCCCC', 'Era': '#CCCCCC', 'Product': '#CCCCCC',
  'Material': '#CCCCCC', 'Color': '#CCCCCC', 'Custom': '#CCCCCC', 'Uncategorized': '#CCCCCC'
};

const STORAGE_KEY = 'tagger_memory';
const TAXONOMY_KEY = 'tagger_taxonomy';
const ANALYSIS_CACHE_KEY = 'tagger_analysis_cache';

// Required top-level categories - every image MUST have at least one
const REQUIRED_CATEGORIES = [
  'Industrial Design',
  'Graphic Design',
  'Art',
  'Photography',
  'Architecture'
];

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
  TAXONOMY_KEY,
  ANALYSIS_CACHE_KEY,
  REQUIRED_CATEGORIES
};

})();
