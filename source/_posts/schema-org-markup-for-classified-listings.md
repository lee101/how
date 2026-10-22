title: Schema.org Markup for Classified Listings, A Developer Tutorial
date: 2026-10-22 09:00:00
tags: [SEO, Tutorial, Marketplace, JSON-LD, Web Development]
description: Add JSON-LD structured data to rentals, equipment, services and job listings so search engines understand your marketplace pages, with examples for each type.
---

Marketplace pages carry rich information: a price, a place, dates, photos and a seller. Structured data tells search engines exactly what each of those fields means. This tutorial shows how to describe four common New Zealand classified types with JSON-LD, the format Google recommends. The examples follow the kinds of listings you find on [hires.nz](https://hires.nz), where people list stays, services, equipment and jobs.

## Where JSON-LD lives

Add one `<script type="application/ld+json">` block to the page head or body. It sits beside your normal HTML and does not change the layout. Generate it on the server from the same data that renders the page, so the markup always matches what visitors see.

## Equipment for hire

Equipment fits the `Product` type with an `Offer`.

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Concrete mixer, 140 litre",
  "description": "Electric mixer available by the day or weekend, pick up in Hamilton.",
  "image": ["https://example.nz/photos/mixer-1.jpg"],
  "offers": {
    "@type": "Offer",
    "price": "45.00",
    "priceCurrency": "NZD",
    "availability": "https://schema.org/InStock",
    "url": "https://example.nz/ads/1234"
  }
}
```

Use real photos, a real price and the current availability. When an item is on hire, switch availability to `https://schema.org/OutOfStock` or remove the offer.

## Short term rentals and stays

For holiday stays, `LodgingBusiness` or its more specific subtype `VacationRental` fits well. Include the address, photos and amenities that guests care about.

```json
{
  "@context": "https://schema.org",
  "@type": "VacationRental",
  "name": "Garden cottage near the beach",
  "image": ["https://example.nz/photos/cottage-1.jpg"],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Raglan",
    "addressCountry": "NZ"
  },
  "numberOfRooms": 2,
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Wifi", "value": true }
  ]
}
```

Google lists specific required fields for rich results on vacation rentals, so check the current documentation for the full set before launch.

## Services

A tradie or local service provider is a `Service` or a `LocalBusiness` subtype, with an `areaServed`.

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Deck building and repairs",
  "serviceType": "Carpentry",
  "areaServed": { "@type": "AdministrativeArea", "name": "Waikato" },
  "provider": { "@type": "Person", "name": "Alex Smith" },
  "offers": { "@type": "Offer", "priceCurrency": "NZD", "price": "70.00" }
}
```

Describe the work in the same words a customer would search for, such as "deck repairs" or "fence installation".

## Jobs

The `JobPosting` type has the most detailed requirements, and it is worth getting each one right.

```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Farm hand",
  "description": "<p>Seasonal dairy support, accommodation available.</p>",
  "datePosted": "2026-10-20",
  "validThrough": "2026-12-01T00:00",
  "employmentType": "FULL_TIME",
  "hiringOrganization": { "@type": "Organization", "name": "Green Valley Dairy" },
  "jobLocation": {
    "@type": "Place",
    "address": { "@type": "PostalAddress", "addressLocality": "Te Awamutu", "addressCountry": "NZ" }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "NZD",
    "value": { "@type": "QuantitativeValue", "value": 28, "unitText": "HOUR" }
  }
}
```

Keep `validThrough` accurate and remove expired postings from your sitemap so searchers see current roles.

## Build it in your server code

Create one function per type that takes your database row and returns a Go struct or Python dict, then serialise it. Escape the output with your language's JSON encoder, and replace `<` with `<` inside the script block so descriptions can contain any text safely.

## Test before you ship

1. Paste a live URL into Google's Rich Results Test and the Schema Markup Validator.
2. Fix warnings for recommended fields when you have the data.
3. Add the listing URLs to your sitemap with a `lastmod` date that matches the real update time.
4. Check Search Console after a few days for enhancement reports.

## Keep it honest

Markup should describe what is visibly on the page. Prices, availability and dates should match the listing exactly. That consistency earns trust from search engines and from visitors.

If you would like to see a marketplace for rentals, services, equipment and jobs in action, browse [hires.nz](https://hires.nz) and list your own item for free. I am Lee Penkman, and you can find more practical development tutorials on [How.nz](/). The post on [streaming LLM responses](/2026/10/20/streaming-llm-responses-fast-ux/) is a good next read.
