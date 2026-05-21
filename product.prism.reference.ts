import { definePrism, f } from "@prism/core";

// ─────────────────────────────────────────────────────────────────────────
// THE SINGLE SOURCE OF TRUTH for Café Nube.
// Edit a value here → it flows to the page, the JSON-LD, the MCP tool, and
// the checkout. No fact lives twice.
// ─────────────────────────────────────────────────────────────────────────
export const ir = definePrism({
  app: { name: "Café Nube", locale: "es-MX", baseUrl: "http://localhost:3000" },

  entities: {
    Product: {
      schemaOrgType: "Product",
      fields: {
        id:          f.string(),
        name:        f.string().display("title").genui("hero").llm("summary"),
        roast:       f.string().facet().filter(),                 // light / medium / dark
        origin:      f.string().facet().filter().llm("keywords"), // Oaxaca, Chiapas...
        price:       f.money().transactable().richSnippet("Offer"),
        stock:       f.int().live(),                              // real-time, never cached
        weightGrams: f.int(),
        image:       f.image().genui("hero"),
        description: f.text().display("body").llm("summary"),
        rating:      f.float().richSnippet("AggregateRating"),
      },
    },
  },

  actions: {
    search:   { input: { query: "string" }, returns: "Product[]", description: "Buscar cafés por texto, origen o tueste." },
    get:      { input: { id: "string" },     returns: "Product",   description: "Ficha completa de un café." },
    check:    { input: { id: "string" },     returns: "Availability", description: "Disponibilidad y stock en tiempo real." },
    purchase: { input: { id: "string", qty: "int" }, returns: "Order", mutates: true, description: "Comprar uno o más bultos de café." },
  },
});
