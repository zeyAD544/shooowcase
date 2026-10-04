/* ==========================================================================
   KYN — demo-data.js
   Built-in sample dataset used until a real Firebase project is connected.
   Every entry is a clearly-labelled placeholder: replace it through the admin
   dashboard (Dashboard → New project) once Firebase is configured.
   ========================================================================== */
window.KYN = window.KYN || {};

window.KYN.DEMO_PROJECTS = [
  {
    id: "demo-rangefinder-35",
    slug: "rangefinder-35",
    title: "Rangefinder 35",
    order: 1,
    featured: true,
    published: true,
    year: "2025",
    createdAt: "2025-11-04T10:00:00.000Z",
    updatedAt: "2025-11-04T10:00:00.000Z",
    software: ["Blender", "Substance 3D Painter", "Marmoset Toolbag"],
    tags: ["Hard-surface", "Hero prop", "Product"],
    description: "A worn brass-and-black rangefinder built as a hero prop. Modelled for close-up shots, with the leather wrap, lens engraving and metal edge wear driven by layered procedural masks in Substance.",
    coverImage: "assets/img/work/rangefinder-35-cover.jpg",
    images: [
      { url: "assets/img/work/rangefinder-35-cover.jpg", label: "Beauty render — three-quarter" },
      { url: "assets/img/work/rangefinder-35-map-1.jpg", label: "Base colour" },
      { url: "assets/img/work/rangefinder-35-map-2.jpg", label: "Normal (OpenGL)" },
      { url: "assets/img/work/rangefinder-35-map-3.jpg", label: "Roughness" },
      { url: "assets/img/work/rangefinder-35-map-4.jpg", label: "Metallic" }
    ]
  },
  {
    id: "demo-console-no-01",
    slug: "console-no-01",
    title: "Console No. 01",
    order: 2,
    featured: false,
    published: true,
    year: "2025",
    createdAt: "2025-08-21T10:00:00.000Z",
    updatedAt: "2025-08-21T10:00:00.000Z",
    software: ["Blender", "Substance 3D Painter"],
    tags: ["Furniture", "Woodwork"],
    description: "A mid-century console cabinet. The brief was the surface: open-grain walnut, quarter-sawn figuring and a softly polished sheen that reads at both full width and macro.",
    coverImage: "assets/img/work/console-no-01-cover.jpg",
    images: [
      { url: "assets/img/work/console-no-01-cover.jpg", label: "Beauty render" },
      { url: "assets/img/work/console-no-01-map-1.jpg", label: "Base colour" }
    ]
  },
  {
    id: "demo-storm-lantern",
    slug: "storm-lantern",
    title: "Storm Lantern",
    order: 3,
    featured: false,
    published: true,
    year: "2024",
    createdAt: "2024-12-09T10:00:00.000Z",
    updatedAt: "2024-12-09T10:00:00.000Z",
    software: ["Blender", "Substance 3D Designer"],
    tags: ["Props", "Brass", "Lighting"],
    description: "An aged brass hurricane lantern. Patina, soot at the chimney and pitting around the base were built procedurally so the wear follows the real metal flow.",
    coverImage: "assets/img/work/storm-lantern-cover.jpg",
    images: [
      { url: "assets/img/work/storm-lantern-cover.jpg", label: "Beauty render" },
      { url: "assets/img/work/storm-lantern-map-1.jpg", label: "Brass — base colour" },
      { url: "assets/img/work/storm-lantern-map-2.jpg", label: "Brass — normal (OpenGL)" }
    ]
  },
  {
    id: "demo-cascade-fixture",
    slug: "cascade-fixture",
    title: "Cascade Fixture",
    order: 4,
    featured: false,
    published: true,
    year: "2024",
    createdAt: "2024-07-02T10:00:00.000Z",
    updatedAt: "2024-07-02T10:00:00.000Z",
    software: ["Blender", "Houdini", "Substance 3D Painter"],
    tags: ["Lighting", "Ornate", "Hard-surface"],
    description: "A tiered chandelier with hundreds of repeated arms. The arm and drop were modelled once, then distributed procedurally to keep the silhouette clean and the mesh light.",
    coverImage: "assets/img/work/cascade-fixture-cover.jpg",
    images: [
      { url: "assets/img/work/cascade-fixture-cover.jpg", label: "Beauty render" },
      { url: "assets/img/work/cascade-fixture-map-1.jpg", label: "Base colour" },
      { url: "assets/img/work/cascade-fixture-map-2.jpg", label: "Normal (OpenGL)" }
    ]
  },
  {
    id: "demo-bench-drill-01",
    slug: "bench-drill-01",
    title: "Bench Drill",
    order: 5,
    featured: false,
    published: true,
    year: "2024",
    createdAt: "2024-03-18T10:00:00.000Z",
    updatedAt: "2024-03-18T10:00:00.000Z",
    software: ["Blender", "Substance 3D Painter", "RizomUV"],
    tags: ["Tools", "Industrial"],
    description: "A workshop pillar drill, full of the small mechanical story — chipped enamel, greased threads and a belt that has clearly done some work.",
    coverImage: "assets/img/work/bench-drill-01-cover.jpg",
    images: [
      { url: "assets/img/work/bench-drill-01-cover.jpg", label: "Beauty render" },
      { url: "assets/img/work/bench-drill-01-map-1.jpg", label: "Base colour" }
    ]
  },
  {
    id: "demo-bullhorn-01",
    slug: "bullhorn-01",
    title: "Bullhorn",
    order: 6,
    featured: false,
    published: true,
    year: "2023",
    createdAt: "2023-10-27T10:00:00.000Z",
    updatedAt: "2023-10-27T10:00:00.000Z",
    software: ["Blender", "Substance 3D Painter"],
    tags: ["Props", "Electronics"],
    description: "A handheld megaphone. Strong diagonals, a moulded plastic shell with a soft halftone sheen and a scraped aluminium grip.",
    coverImage: "assets/img/work/bullhorn-01-cover.jpg",
    images: [
      { url: "assets/img/work/bullhorn-01-cover.jpg", label: "Beauty render" },
      { url: "assets/img/work/bullhorn-01-map-1.jpg", label: "Base colour" }
    ]
  },
  {
    id: "demo-concert-uke",
    slug: "concert-uke",
    title: "Concert Uke",
    order: 7,
    featured: false,
    published: true,
    year: "2023",
    createdAt: "2023-06-14T10:00:00.000Z",
    updatedAt: "2023-06-14T10:00:00.000Z",
    software: ["Blender", "Substance 3D Painter"],
    tags: ["Instrument", "Organic"],
    description: "A concert ukulele. This one was about the wood — koa grain, a satin lacquer and the tiny wear around the soundhole and fretboard.",
    coverImage: "assets/img/work/concert-uke-cover.jpg",
    images: [
      { url: "assets/img/work/concert-uke-cover.jpg", label: "Beauty render" },
      { url: "assets/img/work/concert-uke-map-1.jpg", label: "Base colour" },
      { url: "assets/img/work/concert-uke-map-2.jpg", label: "Normal (OpenGL)" }
    ]
  }
];

/* Intrinsic dimensions of the bundled placeholder images, so every <img> can
   declare width/height and the layout never shifts while loading. */
window.KYN.IMG_DIMS = {
  "assets/img/work/rangefinder-35-cover.jpg": [1463, 1200],
  "assets/img/work/rangefinder-35-map-1.jpg": [1024, 1024],
  "assets/img/work/rangefinder-35-map-2.jpg": [1024, 1024],
  "assets/img/work/rangefinder-35-map-3.jpg": [1024, 1024],
  "assets/img/work/rangefinder-35-map-4.jpg": [1024, 1024],
  "assets/img/work/console-no-01-cover.jpg": [1660, 1200],
  "assets/img/work/console-no-01-map-1.jpg": [1024, 1024],
  "assets/img/work/storm-lantern-cover.jpg": [462, 1200],
  "assets/img/work/storm-lantern-map-1.jpg": [1024, 1024],
  "assets/img/work/storm-lantern-map-2.jpg": [1024, 1024],
  "assets/img/work/cascade-fixture-cover.jpg": [886, 1200],
  "assets/img/work/cascade-fixture-map-1.jpg": [1024, 1024],
  "assets/img/work/cascade-fixture-map-2.jpg": [1024, 1024],
  "assets/img/work/bench-drill-01-cover.jpg": [1197, 1200],
  "assets/img/work/bench-drill-01-map-1.jpg": [1024, 1024],
  "assets/img/work/bullhorn-01-cover.jpg": [1697, 1200],
  "assets/img/work/bullhorn-01-map-1.jpg": [1024, 1024],
  "assets/img/work/concert-uke-cover.jpg": [420, 1200],
  "assets/img/work/concert-uke-map-1.jpg": [1024, 1024],
  "assets/img/work/concert-uke-map-2.jpg": [1024, 1024]
};

window.KYN.imgDims = function (url) {
  var d = (window.KYN.IMG_DIMS || {})[url];
  return d || null;
};

/* Static art-direction metadata used to compose the curated homepage grid.
   Kept separate from the project document so uploaded projects fall back to a
   sensible default layout. */
window.KYN.DEMO_LAYOUT = {
  "rangefinder-35": { span: 12, fit: "natural", offset: false },
  "console-no-01": { span: 7, fit: "natural", offset: false },
  "storm-lantern": { span: 5, fit: "contain", offset: false },
  "cascade-fixture": { span: 6, fit: "natural", offset: true },
  "bench-drill-01": { span: 6, fit: "natural", offset: false },
  "bullhorn-01": { span: 7, fit: "natural", offset: true },
  "concert-uke": { span: 5, fit: "contain", offset: false }
};
